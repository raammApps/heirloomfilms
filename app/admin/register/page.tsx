import type { Metadata } from 'next'
import { RegisterForm } from '@/components/admin/RegisterForm'

export const dynamic = 'force-dynamic'

/** Public: this is the one admin page a stranger is meant to reach. */
export const metadata: Metadata = { title: 'Create a partner account', robots: { index: false } }

export default function RegisterPage() {
  return <RegisterForm />
}
