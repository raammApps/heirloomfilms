import { requireOperator } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { noStore, route } from '@/lib/http/handler'
import { slugSchema } from '@/lib/schema'
import { disambiguate } from '@/lib/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Live availability check behind step 1 of the wizard (doc 02 §3). */
export async function GET(request: Request) {
  return route('admin/slug-check', async () => {
    await requireOperator()
    const candidate = new URL(request.url).searchParams.get('slug') ?? ''

    const parsed = slugSchema.safeParse(candidate)
    if (!parsed.success) {
      return noStore({ available: false, reason: parsed.error.issues[0]?.message ?? 'Not usable' })
    }

    const repository = getRepository()
    const available = await repository.slugAvailable(parsed.data)
    if (available) return noStore({ available, slug: parsed.data })

    /**
     * A refusal with no way out is the actual complaint (N-32). The address may be held by a
     * catalogue belonging to a studio this operator cannot see, so "already in use" is all we can
     * honestly say about it — but we can always hand them one that is free.
     *
     * Bounded rather than looped forever: three attempts over ~46,000 candidates each, so
     * exhausting it means something is wrong that another spin will not fix.
     */
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidate = disambiguate(parsed.data)
      if (await repository.slugAvailable(candidate)) {
        return noStore({
          available: false,
          slug: parsed.data,
          reason: 'That address is already taken',
          suggestion: candidate,
        })
      }
    }

    return noStore({ available: false, slug: parsed.data, reason: 'That address is already taken' })
  })
}
