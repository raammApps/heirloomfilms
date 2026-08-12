import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthProvider } from '@/lib/admin/auth'
import { getRepository } from '@/lib/db'
import { ApiError } from '@/lib/http/errors'
import { readJson, route } from '@/lib/http/handler'
import { clientIp, consume, reset } from '@/lib/http/rate-limit'
import { log } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1).max(200) })

/** Operator login (P0-04). Email + password; magic links are a Phase 1 nicety. */
export async function POST(request: Request) {
  return route('admin/session', async () => {
    const body = await readJson(request, bodySchema)
    const bucket = `login:${clientIp(request)}`

    const limit = consume(bucket, 10, 15 * 60)
    if (!limit.allowed) {
      throw new ApiError('RATE_LIMITED', 'Too many attempts', { retryAfterS: limit.retryAfterS })
    }

    // A carrier, because a driver keeps its session by setting cookies on a response, and the
    // real body is not known until the operator row has been read. Supabase sets an access and
    // a refresh cookie, so every cookie is copied across rather than one `set-cookie` header.
    const carrier = new NextResponse(null)
    const user = await getAuthProvider().signIn(body.email, body.password, carrier)

    // Authenticating is not the same as being allowed in. Under Supabase Auth anyone can hold a
    // valid account; only an `operators` row grants access to an org, and the two failures are
    // reported identically so neither becomes an account-enumeration oracle.
    const operator = user ? await getRepository().getOperator(user.id) : null
    if (!user || !operator) {
      log.warn('admin login: rejected', { email: body.email })
      throw new ApiError('UNAUTHORIZED', 'Those details did not work')
    }

    reset(bucket)
    log.info('admin login: ok', { operatorId: operator.id, driver: getAuthProvider().name })

    const response = NextResponse.json(
      { operator: { id: operator.id, name: operator.name, email: operator.email } },
      { headers: { 'cache-control': 'no-store' } },
    )
    for (const cookie of carrier.cookies.getAll()) response.cookies.set(cookie)
    return response
  })
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 })
  await getAuthProvider().signOut(response)
  return response
}
