import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAuthProvider } from '@/lib/admin/auth'
import { hashSecret } from '@/lib/crypto'
import { getRepository } from '@/lib/db'
import { suggestSlug } from '@/lib/format'
import { ApiError } from '@/lib/http/errors'
import { readJson, route } from '@/lib/http/handler'
import { clientIp, consume } from '@/lib/http/rate-limit'
import { log } from '@/lib/log'
import { orgSchema, partnerRegistrationSchema, RESERVED_SUBDOMAINS } from '@/lib/schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Partner self-registration (doc 15 §6, step 5).
 *
 * **The first endpoint on this platform that an unauthenticated stranger may write through**,
 * which is most of what is interesting about it. Everything else either requires a session or
 * belongs to a catalogue somebody already holds a link to.
 *
 * Creates three things in a deliberate order: the credential, the org, the operator row. The
 * credential is worthless without the row — a Supabase user with no `operators` record
 * authenticates and is still refused — so a failure partway leaves an account that can do
 * nothing rather than an org nobody can reach.
 */

/** Slow enough that a script gains nothing, generous enough that a real business never sees it. */
const MAX_PER_IP = 3
const WINDOW_S = 60 * 60

/** Distinct businesses can share a name; they cannot share an address. */
async function availableSlug(businessName: string): Promise<string> {
  const repository = getRepository()
  const base = suggestSlug(businessName) || 'studio'

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
    if ((RESERVED_SUBDOMAINS as readonly string[]).includes(slug)) continue
    if (!(await repository.getOrgBySlug(slug))) return slug
  }
  // Not a failure worth showing a business: give them something unique and let them rename it.
  return `${base}-${randomUUID().slice(0, 6)}`
}

export async function POST(request: Request) {
  return route('partners:register', async () => {
    const limit = consume(`register:${clientIp(request)}`, MAX_PER_IP, WINDOW_S)
    if (!limit.allowed) {
      throw new ApiError('RATE_LIMITED', 'Too many attempts', { retryAfterS: limit.retryAfterS })
    }

    const body = await readJson(request, partnerRegistrationSchema)
    const repository = getRepository()

    // The credential first: if this fails there is nothing to unwind, and it is the only step
    // that can tell us the address is already taken.
    const user = await getAuthProvider().signUp(body.email, body.password)
    if (!user) {
      // Same message whether the address is registered or the provider refused. An honest
      // "already registered" here would turn this endpoint into a list of every partner.
      log.warn('partner registration: refused', { email: body.email })
      throw new ApiError('VALIDATION_FAILED', 'That did not work. Try a different email address.', {
        fields: { email: 'This address cannot be used' },
      })
    }

    const org = orgSchema.parse({
      id: randomUUID(),
      name: body.businessName,
      slug: await availableSlug(body.businessName),
      kind: 'partner',
      branding: { presentedBy: body.businessName },
      createdAt: new Date().toISOString(),
    })
    await repository.createOrg(org)

    await repository.createOperator({
      id: user.id,
      orgId: org.id,
      email: body.email,
      name: body.contactName,
      role: 'admin',
      // Only the local driver reads this; under Supabase Auth the credential lives there and
      // this column stays empty.
      passwordHash: getAuthProvider().name === 'local' ? hashSecret(body.password) : '',
      createdAt: new Date().toISOString(),
    })

    log.info('partner registered', { orgId: org.id, slug: org.slug })

    // No session is issued. Signing in is a separate, deliberate step — and under Supabase Auth
    // the address may still need confirming, which this endpoint has no way to know.
    return NextResponse.json(
      { org: { id: org.id, name: org.name, slug: org.slug } },
      { status: 201, headers: { 'cache-control': 'no-store' } },
    )
  })
}
