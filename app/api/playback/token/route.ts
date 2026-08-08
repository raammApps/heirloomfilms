import { z } from 'zod'
import { requireServableCatalogue } from '@/lib/catalogue-access'
import { getRepository } from '@/lib/db'
import { env } from '@/lib/env'
import { ApiError } from '@/lib/http/errors'
import { noStore, readJson, route } from '@/lib/http/handler'
import { clientIp, enforce } from '@/lib/http/rate-limit'
import { getVideoProvider } from '@/lib/video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  catalogue: z.string().min(1),
  titleSlug: z.string().min(1),
  profileId: z.string().uuid().nullish(),
})

/**
 * `POST /api/playback/token` — the endpoint the core metric runs through (doc 07).
 *
 * Target p99 under 120ms, so it does exactly three things: authorise, mint, and look up the
 * resume position. Nothing else belongs here.
 */
export async function POST(request: Request) {
  return route('playback/token', async () => {
    const body = await readJson(request, bodySchema)

    enforce(`playback:${clientIp(request)}:${body.catalogue}`, 60, 60)

    const catalogue = await requireServableCatalogue(body.catalogue)
    const repository = getRepository()

    const title = await repository.getTitleBySlug(catalogue.id, body.titleSlug)
    if (!title || !title.published) {
      // An unpublished title is indistinguishable from a missing one to a guest.
      throw new ApiError('CATALOGUE_NOT_FOUND', 'No such film')
    }
    if (title.status !== 'ready' || !title.providerId) {
      throw new ApiError('TITLE_NOT_READY', 'This film is still being prepared')
    }

    const ticket = await getVideoProvider().getPlaybackToken({
      providerId: title.providerId,
      // Bound to catalogue AND title, so one leaked token does not unlock the library.
      scope: { catalogueId: catalogue.id, titleId: title.id },
      ttlS: env.PLAYBACK_TOKEN_TTL_S,
    })

    let resumeAtS = 0
    if (body.profileId) {
      const progress = await repository.getProgress(body.profileId, title.id)
      if (progress && !progress.completed) resumeAtS = progress.positionS
    }

    return noStore({
      playbackUrl: ticket.playbackUrl,
      thumbnailsUrl: ticket.thumbnailsUrl ?? title.thumbnailsUrl,
      durationS: title.durationS,
      resumeAtS,
      expiresAt: ticket.expiresAt,
      captions: title.captions,
    })
  })
}
