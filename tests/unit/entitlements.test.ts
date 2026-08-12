import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIMITS,
  entitlementSchema,
  resolveLimits,
  type Entitlement,
} from '@/lib/entitlements'

/**
 * doc 15 §3 — the resolution order is the product decision, so it is what gets tested.
 *
 * "Catalogue beats org beats default" reads as an implementation detail and is not one: it is
 * the difference between a couple keeping the storage they paid for and silently losing it to
 * the tier of a partner who is no longer in the relationship.
 */

function grant(over: Partial<Entitlement> = {}): Entitlement {
  return entitlementSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  })
}

describe('resolveLimits', () => {
  it('falls back to the defaults when nothing has been bought', () => {
    expect(resolveLimits(null, null)).toEqual(DEFAULT_LIMITS)
  })

  it('lets an org grant raise the caps for its catalogues', () => {
    const limits = resolveLimits(null, grant({ maxTitles: 40, storageGb: 200 }))
    expect(limits.maxTitles).toBe(40)
    expect(limits.storageGb).toBe(200)
    // Untouched fields still come from the default rather than being reset.
    expect(limits.maxPhotos).toBe(DEFAULT_LIMITS.maxPhotos)
  })

  /**
   * The case doc 15 §3 singles out. After a handover the partner cannot see the catalogue and
   * cannot be asked to upgrade, so their tier must not be able to cap what the couple bought.
   */
  it('lets a catalogue grant beat its org, not the other way round', () => {
    const limits = resolveLimits(grant({ maxPhotos: 500 }), grant({ maxPhotos: 60 }))
    expect(limits.maxPhotos).toBe(500)
  })

  /**
   * Per field, not per row. A grant that buys storage should not drag the title cap back down
   * to the default as a side effect — which is what a whole-row precedence would do.
   */
  it('merges field by field rather than picking one winning row', () => {
    const limits = resolveLimits(grant({ storageGb: 500 }), grant({ maxTitles: 40, maxPhotos: 300 }))
    expect(limits).toEqual({ maxTitles: 40, maxPhotos: 300, storageGb: 500 })
  })

  it('ignores an expired grant and falls through to the next source', () => {
    const now = new Date('2026-08-01T00:00:00.000Z')
    const limits = resolveLimits(
      grant({ maxTitles: 99, validUntil: '2026-07-01T00:00:00.000Z' }),
      grant({ maxTitles: 40 }),
      now,
    )
    expect(limits.maxTitles).toBe(40)
  })

  it('honours a grant that has not expired yet', () => {
    const now = new Date('2026-08-01T00:00:00.000Z')
    const limits = resolveLimits(grant({ maxTitles: 99, validUntil: '2026-09-01T00:00:00.000Z' }), null, now)
    expect(limits.maxTitles).toBe(99)
  })

  it('treats a grant with no expiry as permanent', () => {
    const limits = resolveLimits(grant({ maxTitles: 99, validUntil: null }), null)
    expect(limits.maxTitles).toBe(99)
  })

  /**
   * Everything above is about granting *more*. This is the one that would cost money if it were
   * wrong: an absent or unreadable entitlement must resolve to the low cap, never to no cap.
   * `getEntitlements` on the Supabase driver returns nulls on error for exactly this reason.
   */
  it('never resolves to an unbounded limit', () => {
    for (const [a, b] of [
      [null, null],
      [grant(), null],
      [null, grant()],
      [grant(), grant()],
    ] as const) {
      const limits = resolveLimits(a, b)
      expect(limits.maxTitles).toBe(DEFAULT_LIMITS.maxTitles)
      expect(limits.maxPhotos).toBe(DEFAULT_LIMITS.maxPhotos)
      expect(Number.isFinite(limits.maxTitles)).toBe(true)
    }
  })

  it('keeps the defaults low, because the cap is curation before cost', () => {
    // Doc 05 §2: "if planners routinely push past it, the product has drifted into being an
    // archive". A future change that quietly raises these should have to change this line.
    expect(DEFAULT_LIMITS.maxTitles).toBe(15)
    expect(DEFAULT_LIMITS.maxPhotos).toBe(60)
  })
})

describe('entitlementSchema', () => {
  it('refuses a non-positive cap, which would lock a catalogue out of itself', () => {
    expect(() => grant({ maxTitles: 0 })).toThrow()
    expect(() => grant({ maxPhotos: -1 })).toThrow()
  })
})
