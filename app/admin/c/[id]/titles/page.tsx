import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { TitleList } from '@/components/admin/TitleList'
import { getOperatorSession } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function TitlesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const repository = getRepository()
  const catalogue = await repository.getCatalogue(id, session.orgId)
  if (!catalogue) notFound()

  const titles = await repository.listTitles(catalogue.id)

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
      <TitleList catalogueId={catalogue.id} titles={titles} />
    </AdminChrome>
  )
}
