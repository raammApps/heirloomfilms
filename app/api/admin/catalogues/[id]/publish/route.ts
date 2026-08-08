import { revalidatePath } from 'next/cache'
import { requireOwnedCatalogue } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'
import { noStore, route } from '@/lib/http/handler'
import { log } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * `POST /api/admin/catalogues/:id/publish` (doc 07, doc 09 P0-26).
 *
 * Copies `draft_modules` → `modules`, sets `published_at`, and revalidates ISR. This is the
 * only path that writes `modules`, which is what makes "the published page matches the preview
 * exactly" (doc 14 §7) a property of the system rather than a hope.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:publish', async () => {
    const { id } = await params
    const { session, catalogue } = await requireOwnedCatalogue(id)

    const modules = catalogue.draftModules ?? catalogue.modules
    const now = new Date().toISOString()

    const published = await getRepository().updateCatalogue(id, session.orgId, {
      modules,
      // The draft is cleared so "unpublished changes" means something afterwards.
      draftModules: null,
      status: 'published',
      publishedAt: catalogue.publishedAt ?? now,
    })

    revalidatePath(`/c/${published.slug}`, 'page')
    revalidatePath(`/c/${published.slug}`, 'layout')
    log.info('catalogue published', { catalogueId: id, sections: modules.length })

    return noStore({ catalogue: published })
  })
}

/** Unpublish. Guests get "not yet available", never a 404 (doc 02 §5). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return route('admin/catalogue:unpublish', async () => {
    const { id } = await params
    const { session, catalogue } = await requireOwnedCatalogue(id)
    const updated = await getRepository().updateCatalogue(id, session.orgId, { status: 'draft' })
    revalidatePath(`/c/${catalogue.slug}`, 'page')
    return noStore({ catalogue: updated })
  })
}
