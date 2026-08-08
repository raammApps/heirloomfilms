import { z } from 'zod'
import { requireOwnedCatalogue } from '@/lib/admin/session'
import { hashSecret } from '@/lib/auth'
import { getRepository } from '@/lib/db'
import { ApiError } from '@/lib/http/errors'
import { noStore, readJson, route } from '@/lib/http/handler'
import {
  brandingSchema,
  localisedRequiredSchema,
  localisedStringSchema,
  privacySchema,
  slugSchema,
} from '@/lib/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  coupleName: localisedRequiredSchema.optional(),
  city: localisedStringSchema.optional(),
  synopsis: localisedStringSchema.optional(),
  weddingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slug: slugSchema.optional(),
  branding: brandingSchema.optional(),
  featuredTitleId: z.string().uuid().nullable().optional(),
  privacy: privacySchema.optional(),
  /** Empty string clears the passcode; anything else is hashed before it touches the row. */
  passcode: z.string().max(64).nullable().optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:get', async () => {
    const { id } = await params
    const { catalogue } = await requireOwnedCatalogue(id)
    const repository = getRepository()
    const [titles, albums, photos] = await Promise.all([
      repository.listTitles(catalogue.id),
      repository.listAlbums(catalogue.id),
      repository.listPhotosForCatalogue(catalogue.id),
    ])
    return noStore({ catalogue, titles, albums, photos })
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:patch', async () => {
    const { id } = await params
    const { session, catalogue } = await requireOwnedCatalogue(id)
    const body = await readJson(request, patchSchema)
    const repository = getRepository()

    if (body.slug && body.slug !== catalogue.slug && !(await repository.slugAvailable(body.slug))) {
      throw new ApiError('VALIDATION_FAILED', 'That address is taken', {
        fields: { slug: 'That address is already in use' },
      })
    }

    const { passcode, ...rest } = body
    const patch: Parameters<typeof repository.updateCatalogue>[2] = { ...rest }

    if (passcode !== undefined) {
      patch.passcodeHash = passcode ? hashSecret(passcode) : null
    }
    // Switching privacy back to unlisted must not leave a live passcode hash behind.
    if (body.privacy === 'unlisted') patch.passcodeHash = null

    return noStore({ catalogue: await repository.updateCatalogue(id, session.orgId, patch) })
  })
}
