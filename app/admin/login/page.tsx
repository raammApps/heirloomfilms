import { redirect } from 'next/navigation'
import { getOperatorSession } from '@/lib/admin/session'
import { LoginForm } from '@/components/admin/LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  if (await getOperatorSession()) redirect('/admin')

  /**
   * Prefilled after a handover (N-32 §2), so the button that said "Sign in with priya@…"
   * actually lands on a form addressed to Priya. Only ever a convenience: it fills a field the
   * visitor can edit, and grants nothing on its own.
   */
  const { email } = await searchParams
  return <LoginForm initialEmail={typeof email === 'string' ? email : ''} />
}
