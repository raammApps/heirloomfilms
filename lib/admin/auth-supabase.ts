import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import type { AuthenticatedUser, AuthProvider } from './auth-provider'

/**
 * Supabase Auth: it owns the credential, we own the authorisation.
 *
 * Uses the **publishable** key, not the secret one. This client acts as the person signing in,
 * so it must be subject to RLS like any other visitor; the service-role key would make every
 * login omnipotent and turn a stolen session into a database.
 *
 * What this buys over the local driver is the reason doc 15 puts it before partner
 * registration: a verified email address, a password this application never sees or stores, and
 * a reset flow that does not involve an operator emailing us.
 */
export class SupabaseAuthProvider implements AuthProvider {
  readonly name = 'supabase'

  /**
   * A client bound to this request's cookies.
   *
   * `setAll` is a no-op when no response is available: Next forbids writing cookies while
   * rendering, and Supabase's refresh will try. Swallowing it there is the documented shape —
   * the refreshed pair is written on the next route handler that passes a response.
   */
  private client(response?: NextResponse) {
    const store = cookies()
    return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: async () => (await store).getAll(),
        setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          if (!response) return
          for (const { name, value, options } of list) {
            response.cookies.set({ name, value, ...(options ?? {}) })
          }
        },
      },
    })
  }

  async currentUser(): Promise<AuthenticatedUser | null> {
    // `getUser` revalidates against the auth server rather than trusting the cookie's contents,
    // which is the difference between a session and a claim.
    const { data, error } = await this.client().auth.getUser()
    if (error || !data.user?.email) return null
    return { id: data.user.id, email: data.user.email }
  }

  async signIn(
    email: string,
    password: string,
    response: NextResponse,
  ): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.client(response).auth.signInWithPassword({ email, password })
    if (error || !data.user?.email) return null
    return { id: data.user.id, email: data.user.email }
  }

  /**
   * Supabase owns the credential and, if the project requires it, sends the confirmation email.
   *
   * A repeat address comes back looking like a success — Supabase deliberately does not confirm
   * whether an account exists — so the absence of an identity is the only reliable signal, and
   * the caller reports one outcome either way.
   */
  async signUp(email: string, password: string): Promise<AuthenticatedUser | null> {
    const { data, error } = await this.client().auth.signUp({ email, password })
    if (error || !data.user?.email) return null
    // An existing address returns a user with no identities rather than an error.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) return null
    return { id: data.user.id, email: data.user.email }
  }

  async signOut(response: NextResponse): Promise<void> {
    await this.client(response).auth.signOut()
  }
}
