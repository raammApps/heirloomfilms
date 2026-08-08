import { requireOperator } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { noStore, route } from '@/lib/http/handler'
import { slugSchema } from '@/lib/schema'

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

    const available = await getRepository().slugAvailable(parsed.data)
    return noStore({
      available,
      slug: parsed.data,
      ...(available ? {} : { reason: 'That address is already in use' }),
    })
  })
}
