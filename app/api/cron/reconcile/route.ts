import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { route } from '@/lib/http/handler'
import { log } from '@/lib/log'
import { getVideoProvider, posterRoute } from '@/lib/video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Anything still `processing` after this long is presumed to have lost its webhook. */
const STALL_MINUTES = 120

/**
 * Nightly reconciliation (doc 05 §8, doc 07 webhooks).
 *
 * Webhooks get lost. A title silently missing from a couple's wedding catalogue is not
 * acceptable, so this polls the provider for anything stuck and settles it either way.
 */
export async function GET(request: Request) {
  return route('cron/reconcile', async () => {
    // Vercel signs cron invocations; anything else is rejected rather than left open.
    const secret = request.headers.get('authorization')
    if (env.NODE_ENV === 'production' && secret !== `Bearer ${env.SESSION_SECRET}`) {
      return new NextResponse(null, { status: 401 })
    }

    const repository = getRepository()
    const provider = getVideoProvider()
    const stalled = await repository.listStalledTitles(STALL_MINUTES)

    let settled = 0
    let failed = 0

    for (const title of stalled) {
      if (!title.providerId) {
        await repository.updateTitle(title.id, {
          status: 'failed',
          errorMessage: 'The upload never reached the video provider. Upload this film again.',
        })
        failed += 1
        continue
      }

      try {
        const status = await provider.getStatus(title.providerId)
        if (status.state === 'processing') continue

        const candidates = status.posterCandidates.map((file) => posterRoute(title.id, file))

        await repository.updateTitle(title.id, {
          status: status.state,
          durationS: status.durationS ?? title.durationS,
          posterCandidates: candidates.length ? candidates : title.posterCandidates,
          posterUrl:
            title.posterSource === 'custom' ? title.posterUrl : (candidates[0] ?? title.posterUrl),
          thumbnailsUrl: status.thumbnailsUrl ?? title.thumbnailsUrl,
          errorMessage: status.errorMessage,
        })

        if (status.state === 'ready') {
          settled += 1
          const catalogue = await repository.getCatalogueById(title.catalogueId)
          if (catalogue) revalidatePath(`/c/${catalogue.slug}`, 'page')
        } else {
          failed += 1
        }
      } catch (error) {
        // One unreachable asset must not stop the job settling the others.
        log.error('reconcile: provider poll failed', {
          titleId: title.id,
          reason: (error as Error).message,
        })
      }
    }

    log.info('reconcile: complete', { examined: stalled.length, settled, failed })
    return NextResponse.json(
      { examined: stalled.length, settled, failed },
      { headers: { 'cache-control': 'no-store' } },
    )
  })
}
