import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIMITS,
  bytesToGb,
  entitlementSchema,
  resolveLimits,
  storageCheck,
  type Entitlement,
} from '@/lib/entitlements'

/**
 * doc 15 §3 — the resolution order is the product decision, so it is what gets tested.
 *
 * "Catalogue beats org beats default" reads as an implementation detail and is not one: it is
 * the difference between a couple keeping the storage they paid for and silently losing it to
 * the tier of a partner who is no longer in the relationship.
 *
 * **Storage is now the only limit** (N-28). The count caps are gone from `Limits` because the
 * plans sell gigabytes; the columns survive on the entitlement row and must stay unresolved.
 */

const GB = 1024 ** 3

function grant(over: Partial<Entitlement> = {}): Entitlement {
  return entitlementSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  })
}

describe('resolveLimits', () => {
  it('falls back to the default when nothing has been bought', () => {
    expect(resolveLimits(null, null)).toEqual(DEFAULT_LIMITS)
  })

  it('lets an org grant raise storage for its catalogues', () => {
    expect(resolveLimits(null, grant({ storageGb: 80 })).storageGb).toBe(80)
  })

  /**
   * The one that matters after a handover. A couple who buys storage must not be capped by the
   * tier of a partner who can no longer see the catalogue, let alone be asked to upgrade.
   */
  it('lets a catalogue grant beat its org', () => {
    expect(resolveLimits(grant({ storageGb: 100 }), grant({ storageGb: 20 })).storageGb).toBe(100)
  })

  it('ignores an expired grant and falls through to the next one', () => {
    const expired = grant({ storageGb: 100, validUntil: '2020-01-01T00:00:00.000Z' })
    expect(resolveLimits(expired, grant({ storageGb: 40 })).storageGb).toBe(40)
  })

  it('treats a grant with no expiry as permanent', () => {
    expect(resolveLimits(grant({ storageGb: 60, validUntil: null }), null).storageGb).toBe(60)
  })

  /**
   * `max_titles` and `max_photos` still exist on the row — they hold grants written before
   * storage became the only limit. Resolving them would reinstate a cap we decided not to sell.
   */
  it('does not resolve the superseded count caps', () => {
    const limits = resolveLimits(grant({ maxTitles: 3, maxPhotos: 5, storageGb: 40 }), null)
    expect(limits).toEqual({ storageGb: 40 })
    expect(Object.keys(limits)).toEqual(['storageGb'])
  })
})

describe('storageCheck', () => {
  const limits = { storageGb: 10 }

  it('allows an upload that fits', () => {
    expect(storageCheck(4 * GB, 2 * GB, limits).fits).toBe(true)
  })

  it('refuses one that does not', () => {
    expect(storageCheck(9 * GB, 2 * GB, limits).fits).toBe(false)
  })

  it('allows an upload that exactly fills the plan', () => {
    // Refusing at precisely the limit would make a 10 GB plan hold 9.99 GB, which is the kind of
    // thing a customer notices and nobody can explain.
    expect(storageCheck(8 * GB, 2 * GB, limits).fits).toBe(true)
  })

  it('reports what is used and what is allowed, for the error message', () => {
    const room = storageCheck(3.5 * GB, 1 * GB, limits)
    expect(room.usedGb).toBeCloseTo(3.5, 5)
    expect(room.limitGb).toBe(10)
  })

  /**
   * A film still transcoding has not reported what it occupies. Blocking a second upload on a
   * number we do not have yet would refuse legitimate content while the first file is processing
   * — so unknown sizes count as zero, erring toward letting a wedding in.
   */
  it('counts an unknown size as zero rather than refusing', () => {
    expect(storageCheck(0, 1 * GB, limits).fits).toBe(true)
  })
})

describe('bytesToGb', () => {
  it('uses binary gigabytes, so the console and the guard never disagree', () => {
    expect(bytesToGb(GB)).toBe(1)
    expect(bytesToGb(1_000_000_000)).toBeCloseTo(0.931, 3)
  })
})
