import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  cookieOptions,
  createPasscodeGrant,
  passcodeCookieName,
  PASSCODE_TTL_S,
  verifySecret,
} from '@/lib/auth'
import { getRepository } from '@/lib/db'
import { ApiError } from '@/lib/http/errors'
import { readJson, route } from '@/lib/http/handler'
import { clientIp, consume, reset } from '@/lib/http/rate-limit'
import { log } from '@/lib/log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Five attempts, then a 15-minute lockout per IP (doc 05 §4). */
const MAX_ATTEMPTS = 5
const LOCKOUT_S = 15 * 60

const bodySchema = z.object({ catalogue: z.string().min(1), passcode: z.string().min(1).max(64) })

export async function POST(request: Request) {
  return route('passcode', async () => {
    const body = await readJson(request, bodySchema)
    const bucket = `passcode:${clientIp(request)}:${body.catalogue}`

    const limit = consume(bucket, MAX_ATTEMPTS, LOCKOUT_S)
    if (!limit.allowed) {
      throw new ApiError('RATE_LIMITED', 'Too many attempts', { retryAfterS: limit.retryAfterS })
    }

    const catalogue = await getRepository().getCatalogueBySlug(body.catalogue)
    // A generic failure either way: whether a catalogue exists is not something an attacker
    // gets to learn from this endpoint.
    if (!catalogue || !verifySecret(body.passcode, catalogue.passcodeHash)) {
      log.warn('passcode: rejected', { catalogue: body.catalogue, remaining: limit.remaining })
      throw new ApiError('PASSCODE_REQUIRED', 'That passcode did not work')
    }

    reset(bucket)

    const response = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
    response.cookies.set(
      passcodeCookieName(catalogue.slug),
      createPasscodeGrant(catalogue.id),
      cookieOptions(PASSCODE_TTL_S),
    )
    return response
  })
}
