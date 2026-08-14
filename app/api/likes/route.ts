import { requireServableCatalogue } from '@/lib/catalogue-access'
import { getRepository } from '@/lib/db'
import { noStore, readJson, route } from '@/lib/http/handler'
import { likeSubjectSchema } from '@/lib/schema'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Likes on films and photographs — counted across guests and shown to all of them (N-31).
 *
 * `requireServableCatalogue` is the gate, exactly as it is for progress and playback: a draft, a
 * lapsed subscription or an unmet passcode must refuse a like for the same reasons it refuses
 * everything else, and there is one place that decides.
 *
 * The guest key is a string the browser holds and nothing else. It is not an identity claim and
 * is not treated as one — worth stating plainly, because "counted and shown" invites reading the
 * number as a headcount. It is a count of devices that tapped, which for a wedding gallery is
 * the honest and sufficient thing.
 */
const GUEST_KEY = z.string().min(8).max(100)

const postSchema = z.object({
  catalogue: z.string().min(1),
  guestKey: GUEST_KEY,
  subject: likeSubjectSchema,
  subjectId: z.string().uuid(),
})

export async function POST(request: Request) {
  return route('likes:toggle', async () => {
    const body = await readJson(request, postSchema)
    const catalogue = await requireServableCatalogue(body.catalogue)

    const result = await getRepository().toggleLike(
      catalogue.id,
      body.guestKey,
      body.subject,
      body.subjectId,
    )
    return noStore(result)
  })
}

export async function GET(request: Request) {
  return route('likes:list', async () => {
    const url = new URL(request.url)
    const slug = url.searchParams.get('catalogue') ?? ''
    const guestKey = url.searchParams.get('guestKey')

    const catalogue = await requireServableCatalogue(slug)
    const likes = await getRepository().listLikes(
      catalogue.id,
      GUEST_KEY.safeParse(guestKey).success ? guestKey : null,
    )
    return noStore(likes)
  })
}
