import { redirect } from 'next/navigation'
import { AdminChrome } from '@/components/admin/AdminChrome'
import { CreateWizard } from '@/components/admin/CreateWizard'
import { getOperatorSession } from '@/lib/admin/session'

export const dynamic = 'force-dynamic'

export default async function NewCataloguePage() {
  const session = await getOperatorSession()
  if (!session) redirect('/admin/login')

  return (
    <AdminChrome operatorName={session.operator.name}>
      <h1 className="mb-6 text-[24px] font-bold">New catalogue</h1>
      <CreateWizard />
    </AdminChrome>
  )
}
