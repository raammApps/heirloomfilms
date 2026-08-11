import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { getOperatorSession } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const repository = getRepository()
  const catalogue = await repository.getCatalogue(id, session.orgId)
  if (!catalogue) notFound()

  const photos = await repository.listPhotosForCatalogue(catalogue.id)

  return (
    <AdminChrome
      operatorName={session.operator.name}
      catalogue={{
        id: catalogue.id,
        name: catalogue.coupleName.en,
        slug: catalogue.slug,
        status: catalogue.status,
      }}
    >
      <PhotoManager catalogueId={catalogue.id} initialPhotos={photos} />
    </AdminChrome>
  )
}
