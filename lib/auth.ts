import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { env } from './env'

/**
 * Operator sessions and passcode secrets.
 *
 * Scrypt rather than bcrypt so there is no native dependency to build in a container, and
 * HMAC-signed stateless cookies rather than a session table so a Vercel edge deploy does not
 * need a round trip to verify a request. Both are standard-library only.
 */

const SCRYPT_KEYLEN = 32

export function hashSecret(plain: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(plain.normalize('NFKC'), salt, SCRYPT_KEYLEN)
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

/** Constant-time verification. Returns false rather than throwing on a malformed stored hash. */
export function verifySecret(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [scheme, saltB64, keyB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false
  try {
    const expected = Buffer.from(keyB64, 'base64url')
    const actual = scryptSync(plain.normalize('NFKC'), Buffer.from(saltB64, 'base64url'), expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

// ── Signed, stateless tokens ──────────────────────────────────────────────────

export type SessionPayload = {
  /** Operator id. */
  sub: string
  orgId: string
  /** Expiry, epoch seconds. */
  exp: number
}

function sign(body: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(body).digest('base64url')
}

export function encodeToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function decodeToken<T>(token: string | null | undefined): T | null {
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'mehfil_session'
export const SESSION_TTL_S = 12 * 60 * 60

export function createSession(operatorId: string, orgId: string): string {
  return encodeToken({
    sub: operatorId,
    orgId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
  } satisfies SessionPayload)
}

export function readSession(token: string | null | undefined): SessionPayload | null {
  const payload = decodeToken<SessionPayload>(token)
  if (!payload || typeof payload.exp !== 'number') return null
  if (payload.exp * 1000 < Date.now()) return null
  return payload
}

/** Cookie options shared by the session and passcode cookies. */
export function cookieOptions(maxAgeS: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeS,
  }
}

// ── Passcode gate (doc 05 §4) ─────────────────────────────────────────────────

export const PASSCODE_COOKIE_PREFIX = 'mehfil_pc_'
export const PASSCODE_TTL_S = 30 * 24 * 60 * 60

export function passcodeCookieName(catalogueSlug: string): string {
  return `${PASSCODE_COOKIE_PREFIX}${catalogueSlug}`
}

export function createPasscodeGrant(catalogueId: string): string {
  return encodeToken({ cid: catalogueId, exp: Math.floor(Date.now() / 1000) + PASSCODE_TTL_S })
}

export function verifyPasscodeGrant(token: string | null | undefined, catalogueId: string): boolean {
  const payload = decodeToken<{ cid: string; exp: number }>(token)
  return !!payload && payload.cid === catalogueId && payload.exp * 1000 > Date.now()
}
