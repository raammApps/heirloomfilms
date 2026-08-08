import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookieOptions, createSession, SESSION_COOKIE, SESSION_TTL_S, verifySecret } from '@/lib/auth'
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

    const operator = await getRepository().getOperatorByEmail(body.email)
    // One generic failure for both branches, and `verifySecret` is constant-time, so this does
    // not become an account-enumeration oracle.
    if (!operator || !verifySecret(body.password, operator.passwordHash)) {
      log.warn('admin login: rejected', { email: body.email })
      throw new ApiError('UNAUTHORIZED', 'Those details did not work')
    }

    reset(bucket)
    log.info('admin login: ok', { operatorId: operator.id })

    const response = NextResponse.json(
      { operator: { id: operator.id, name: operator.name, email: operator.email } },
      { headers: { 'cache-control': 'no-store' } },
    )
    response.cookies.set(
      SESSION_COOKIE,
      createSession(operator.id, operator.orgId),
      cookieOptions(SESSION_TTL_S),
    )
    return response
  })
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0))
  return response
}
