import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRepository } from '@/lib/db'
import { route } from '@/lib/http/handler'
import { log } from '@/lib/log'
import { getVideoProvider, posterRoute } from '@/lib/video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * `POST /api/webhooks/bunny` (doc 07 webhooks).
 *
 * Verify the signature before anything else, and be idempotent — the provider retries, and a
 * replayed "finished" must not double-count or re-revalidate a wedding page into a loop.
 */
export async function POST(request: Request) {
  return route('webhooks/bunny', async () => {
    const rawBody = await request.text()

    const verified = getVideoProvider().verifyWebhook(rawBody, request.headers)
    if (!verified) {
      log.warn('bunny webhook: rejected unsigned or malformed payload')
      // 401 rather than 400: an unsigned payload is an authentication failure, and the provider
      // should not treat it as a permanent delivery success.
      return new NextResponse(null, { status: 401 })
    }

    const repository = getRepository()
    const title = await repository.getTitleByProviderId(verified.providerId)
    if (!title) {
      // Acknowledge unknown assets. Retrying forever helps nobody.
      log.warn('bunny webhook: no title for provider id', { providerId: verified.providerId })
      return new NextResponse(null, { status: 204 })
    }

    /**
     * The webhook says *something changed*; the API says *what*. Bunny's webhook `Status` enum
     * differs from the video object's (the webhook calls Finished 3, the API calls it 4), so
     * trusting the payload would have left every title stuck in `processing` — visible only as
     * a wedding that never appears, hours later, when the nightly reconciliation caught it.
     */
    const status = await getVideoProvider().getStatus(verified.providerId)

    // Idempotent: re-delivering a state we already recorded changes nothing.
    if (title.status === status.state && (status.state !== 'ready' || title.durationS !== null)) {
      return new NextResponse(null, { status: 204 })
    }

    if (status.state === 'ready') {
      const candidates = status.posterCandidates.map((file) => posterRoute(title.id, file))
      await repository.updateTitle(title.id, {
        status: 'ready',
        durationS: status.durationS ?? title.durationS,
        posterCandidates: candidates,
        // Only auto-assign a poster when the operator has not chosen one.
        posterUrl:
          title.posterSource === 'custom' ? title.posterUrl : (candidates[0] ?? title.posterUrl),
        posterSource: title.posterSource === 'custom' ? 'custom' : 'auto',
        thumbnailsUrl: status.thumbnailsUrl,
        errorMessage: null,
      })

      const catalogue = await repository.getCatalogueById(title.catalogueId)
      if (catalogue) revalidatePath(`/c/${catalogue.slug}`, 'page')
      log.info('bunny webhook: title ready', { titleId: title.id })
    } else if (status.state === 'failed') {
      await repository.updateTitle(title.id, {
        status: 'failed',
        errorMessage: status.errorMessage ?? 'The provider could not encode this file',
      })
      log.warn('bunny webhook: transcode failed', { titleId: title.id })
    } else {
      await repository.updateTitle(title.id, { status: status.state })
    }

    return new NextResponse(null, { status: 204 })
  })
}
