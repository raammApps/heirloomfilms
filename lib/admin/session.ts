import 'server-only'
import { cookies } from 'next/headers'
import { readSession, SESSION_COOKIE } from '@/lib/auth'
import { getRepository } from '@/lib/db'
import { ApiError } from '@/lib/http/errors'
import type { Catalogue, Operator } from '@/lib/schema'

/**
 * Operator identity, and the single place `org_id` enters a query.
 *
 * doc 07: "every query is scoped to `org_id` from the session, never from the request body".
 * Enforcing that here rather than per-route is what makes the rule auditable — a route that
 * does not call one of these functions is visibly unscoped.
 */

export type OperatorSession = { operator: Operator; orgId: string }

export async function getOperatorSession(): Promise<OperatorSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const payload = readSession(token)
  if (!payload) return null

  const operator = await getRepository().getOperator(payload.sub)
  // A session whose org no longer matches the operator record is stale, not merely wrong.
  if (!operator || operator.orgId !== payload.orgId) return null

  return { operator, orgId: operator.orgId }
}

export async function requireOperator(): Promise<OperatorSession> {
  const session = await getOperatorSession()
  if (!session) throw new ApiError('UNAUTHORIZED', 'Sign in to continue')
  return session
}

/** Load a catalogue that belongs to the session's org, or 404. Never trusts a body `orgId`. */
export async function requireOwnedCatalogue(catalogueId: string): Promise<{
  session: OperatorSession
  catalogue: Catalogue
}> {
  const session = await requireOperator()
  const catalogue = await getRepository().getCatalogue(catalogueId, session.orgId)
  // 404 rather than 403: another org's catalogue should not be confirmed to exist.
  if (!catalogue) throw new ApiError('NOT_FOUND', 'Catalogue not found')
  return { session, catalogue }
}
