import { redirect } from 'next/navigation'
import { getOperatorSession } from '@/lib/admin/session'
import { LoginForm } from '@/components/admin/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getOperatorSession()) redirect('/admin')
  return <LoginForm />
}
