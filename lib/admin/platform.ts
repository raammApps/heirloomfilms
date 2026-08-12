import 'server-only'
import { getRepository } from '@/lib/db'
import { getAuthProvider } from './auth'
import type { PlatformAdmin } from '@/lib/schema'

/**
 * Whoever runs the platform (doc 15 §1) — the counterpart of `lib/admin/session.ts`.
 *
 * Deliberately a **separate file with a separate function**, not a flag on `OperatorSession`.
 * A boolean on the session would mean every org-scoped query could, in principle, be asked to
 * skip its scope, and the only thing standing between a tenant's data and everyone else's would
 * be that no route forgot to check it. Doc 15 §1 chose the other trade: a platform admin has no
 * org at all, no scoped query changes, and platform-wide views get written one at a time.
 *
 * The practical consequence, and it is the point: **there is no way to widen an operator into an
 * admin.** `getOperatorSession` reads the `operators` row; this reads `platform_admins`. Nothing
 * converts between them, in either direction.
 *
 * There is no `requirePlatformAdmin` throwing counterpart yet, because no API route is
 * platform-scoped — the two pages call this and answer `notFound()`. A 404 rather than a refusal
 * is deliberate: an operator poking at `/admin/platform` should not learn the surface exists.
 */

export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  // Identity from the authenticated user, exactly as the operator path does — and then a second
  // lookup that decides what they may see. Authentication is swappable; this is not.
  const user = await getAuthProvider().currentUser()
  if (!user) return null
  return getRepository().getPlatformAdmin(user.id)
}
