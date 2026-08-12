import 'server-only'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { cookieOptions, createSession, readSession, SESSION_COOKIE, SESSION_TTL_S, verifySecret } from '@/lib/auth'
import { getRepository } from '@/lib/db'
import type { AuthenticatedUser, AuthProvider } from './auth-provider'

/**
 * The signed cookie over a scrypt hash the app stores itself.
 *
 * This is what shipped, and it stays for the paths that have no Supabase: the Playwright suite,
 * CI, `pnpm dev` on the file driver, and an offline demo. A test suite that needs a hosted auth
 * service is a test suite nobody runs — the same argument that put `Repository` in front of
 * Postgres (CLAUDE.md, deviation 2).
 *
 * It is not what production should use. It cannot verify an email address, cannot reset a
 * password, and stores a credential this application had no business holding.
 */
export class LocalAuthProvider implements AuthProvider {
  readonly name = 'local'

  async currentUser(): Promise<AuthenticatedUser | null> {
    const payload = readSession((await cookies()).get(SESSION_COOKIE)?.value)
    if (!payload) return null
    const operator = await getRepository().getOperator(payload.sub)
    return operator ? { id: operator.id, email: operator.email } : null
  }

  async signIn(
    email: string,
    password: string,
    response: NextResponse,
  ): Promise<AuthenticatedUser | null> {
    const operator = await getRepository().getOperatorByEmail(email)
    // One generic outcome for both branches, and `verifySecret` is constant-time, so this never
    // becomes an account-enumeration oracle.
    if (!operator || !verifySecret(password, operator.passwordHash)) return null

    response.cookies.set(
      SESSION_COOKIE,
      createSession(operator.id, operator.orgId),
      cookieOptions(SESSION_TTL_S),
    )
    return { id: operator.id, email: operator.email }
  }

  async signOut(response: NextResponse): Promise<void> {
    response.cookies.set(SESSION_COOKIE, '', cookieOptions(0))
  }
}
