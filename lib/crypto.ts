import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Password and passcode hashing.
 *
 * Split out from `lib/auth.ts` because this half needs no configuration: `lib/auth` reads
 * `SESSION_SECRET` and is therefore `server-only`, which makes it unimportable from a plain
 * Node script. Hashing is pure, so scripts and seeds can use it directly.
 *
 * Scrypt rather than bcrypt: no native dependency to build in a container.
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
