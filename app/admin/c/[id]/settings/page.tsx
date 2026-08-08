import { notFound, redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { CatalogueSettings } from '@/components/admin/CatalogueSettings'
import { getOperatorSession } from '@/lib/admin/session'
import { getRepository } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  const { id } = await params
  const catalogue = await getRepository().getCatalogue(id, session.orgId)
  if (!catalogue) notFound()

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
      <CatalogueSettings catalogue={catalogue} />
    </AdminChrome>
  )
}
