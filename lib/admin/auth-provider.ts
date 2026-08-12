import 'server-only'
import type { NextResponse } from 'next/server'

/**
 * Who is signed in, and how they proved it.
 *
 * The narrow interface over authentication, mirroring `lib/video/provider.ts` and
 * `lib/photos/provider.ts` for the same reason: the suite, CI and an offline demo have to run
 * without a Supabase project, and an auth layer that demands one is an auth layer no test
 * exercises. E2E boots on `DATA_DRIVER=file` with no network.
 *
 * **This interface answers only "which user is this".** Which org they belong to, and therefore
 * what they may see, is resolved from the `operators` row afterwards, in `session.ts` — the one
 * place `org_id` enters a query (doc 07). Keeping authorisation out of here means swapping the
 * authenticator can never widen what somebody can reach.
 */

export type AuthenticatedUser = {
  /** Matches `operators.id`, which references `auth.users.id`. */
  id: string
  email: string
}

export interface AuthProvider {
  readonly name: string

  /** The signed-in user, or null. Reads whatever cookie the driver owns. */
  currentUser(): Promise<AuthenticatedUser | null>

  /**
   * Verify credentials and attach whatever the driver needs to keep the session.
   *
   * Takes the response so a driver can set its own cookies on it — Supabase issues a pair it
   * refreshes, and a driver that could only return a token could not express that.
   */
  signIn(email: string, password: string, response: NextResponse): Promise<AuthenticatedUser | null>

  /** Clear the session. */
  signOut(response: NextResponse): Promise<void>
}
