import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRepository } from '@/lib/db'
import { route } from '@/lib/http/handler'
import { log } from '@/lib/log'
import { getVideoProvider } from '@/lib/video'

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

    // Idempotency: a repeat of a state we already recorded is a no-op.
    if (title.status === verified.state && verified.state !== 'ready') {
      return new NextResponse(null, { status: 204 })
    }

    if (verified.state === 'ready') {
      if (title.status === 'ready' && title.durationS !== null) {
        return new NextResponse(null, { status: 204 })
      }

      const status = await getVideoProvider().getStatus(verified.providerId)
      await repository.updateTitle(title.id, {
        status: 'ready',
        durationS: status.durationS ?? title.durationS,
        posterCandidates: status.posterCandidates,
        // Only auto-assign a poster when the operator has not chosen one.
        posterUrl:
          title.posterSource === 'custom' ? title.posterUrl : (status.posterCandidates[0] ?? title.posterUrl),
        posterSource: title.posterSource === 'custom' ? 'custom' : 'auto',
        thumbnailsUrl: status.thumbnailsUrl,
        errorMessage: null,
      })

      const catalogue = await repository.getCatalogueById(title.catalogueId)
      if (catalogue) revalidatePath(`/c/${catalogue.slug}`, 'page')
      log.info('bunny webhook: title ready', { titleId: title.id })
    } else if (verified.state === 'failed') {
      await repository.updateTitle(title.id, {
        status: 'failed',
        errorMessage: verified.errorMessage ?? 'The provider could not encode this file',
      })
      log.warn('bunny webhook: transcode failed', { titleId: title.id })
    } else {
      await repository.updateTitle(title.id, { status: 'processing' })
    }

    return new NextResponse(null, { status: 204 })
  })
}
