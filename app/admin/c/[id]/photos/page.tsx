import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { getOperatorSession, getSessionOrg } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const repository = getRepository()
  const catalogue = await repository.getCatalogue(id, session.orgId)
  if (!catalogue) notFound()

  const org = await getSessionOrg(session)

  const photos = await repository.listPhotosForCatalogue(catalogue.id)

  return (
    <AdminChrome
      operatorName={session.operator.name}
      operatorEmail={session.operator.email}
      orgName={org?.name}
      catalogue={{
        id: catalogue.id,
        name: catalogue.coupleName.en,
        slug: catalogue.slug,
        status: catalogue.status,
      }}
    >
      <div className="mb-5">
        <h2 className="text-[19px] font-bold tracking-[-0.01em]">Photographs</h2>
        <p className="mt-0.5 text-[14px] text-[var(--color-l-text-mid)]">
          Resized in the browser before upload, so a 40MB frame from a DSLR does not have to travel.
        </p>
      </div>

      <PhotoManager catalogueId={catalogue.id} initialPhotos={photos} />
    </AdminChrome>
  )
}
