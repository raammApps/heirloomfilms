import { describe, expect, it } from 'vitest'
import { catalogueAttention, weddingProximity } from '@/lib/admin/catalogue-health'
import type { CatalogueCounts } from '@/lib/db/repository'

/**
 * The one line each card says about itself.
 *
 * This is a *ranking*, not a set of independent rules — a catalogue can be lapsed and have a
 * failed film and be an unpublished draft all at once, and only one of those is worth saying.
 * The order is the whole substance, so it is what is tested.
 */

function counts(over: Partial<CatalogueCounts> = {}): CatalogueCounts {
  return { titles: 5, ready: 5, published: 5, failed: 0, photos: 0, ...over }
}

describe('catalogueAttention', () => {
  it('puts a lapsed subscription above everything else', () => {
    // Guests are being shown a renewal screen right now. That beats anything the operator has
    // left half-finished.
    const attention = catalogueAttention({
      status: 'draft',
      subStatus: 'lapsed',
      counts: counts({ titles: 0, ready: 0, published: 0, failed: 3 }),
    })
    expect(attention).toEqual({ tone: 'warn', label: 'Subscription lapsed' })
  })

  it('reports failed films ahead of anything still processing', () => {
    const attention = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ titles: 5, ready: 2, published: 0, failed: 2 }),
    })
    expect(attention.tone).toBe('warn')
    expect(attention.label).toBe('2 films failed')
  })

  it('says one film, not one films', () => {
    const attention = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ failed: 1 }),
    })
    expect(attention.label).toBe('1 film failed')
  })

  it('counts anything neither ready nor failed as still processing', () => {
    const attention = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ titles: 5, ready: 3, published: 0, failed: 0 }),
    })
    expect(attention).toEqual({ tone: 'act', label: '2 still processing' })
  })

  it('asks for films before it asks for anything else', () => {
    const attention = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ titles: 0, ready: 0, published: 0 }),
    })
    expect(attention).toEqual({ tone: 'act', label: 'No films yet' })
  })

  it('distinguishes a draft ready to publish from one with nothing to show', () => {
    const ready = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ published: 3 }),
    })
    expect(ready.label).toBe('Ready to publish')

    const nothing = catalogueAttention({
      status: 'draft',
      subStatus: 'included',
      counts: counts({ published: 0 }),
    })
    expect(nothing.label).toBe('Nothing shown to guests yet')
  })

  /**
   * The worst state in the product and the least visible: the link works, the page loads, and a
   * guest finds an empty catalogue. It is a warning, not a nudge.
   */
  it('warns about a live catalogue with nothing published', () => {
    const attention = catalogueAttention({
      status: 'published',
      subStatus: 'included',
      counts: counts({ published: 0 }),
    })
    expect(attention).toEqual({ tone: 'warn', label: 'Live, but nothing to watch' })
  })

  it('is only ok when a guest would actually find something', () => {
    const attention = catalogueAttention({
      status: 'published',
      subStatus: 'included',
      counts: counts(),
    })
    expect(attention).toEqual({ tone: 'ok', label: 'Live and complete' })
  })
})

describe('weddingProximity', () => {
  const now = new Date('2026-06-15T09:00:00Z')

  it('names today, tomorrow and yesterday rather than counting them', () => {
    expect(weddingProximity('2026-06-15', now)).toBe('today')
    expect(weddingProximity('2026-06-16', now)).toBe('tomorrow')
    expect(weddingProximity('2026-06-14', now)).toBe('yesterday')
  })

  /**
   * Compared as calendar days in UTC. Doing it in elapsed milliseconds makes a wedding "today"
   * become "yesterday" purely because the operator opened the console after lunch.
   */
  it('does not drift with the time of day', () => {
    const morning = new Date('2026-06-15T00:30:00Z')
    const night = new Date('2026-06-15T23:30:00Z')
    expect(weddingProximity('2026-06-20', morning)).toBe(weddingProximity('2026-06-20', night))
  })

  it('switches to weeks past a fortnight, and gives up beyond two months', () => {
    expect(weddingProximity('2026-06-25', now)).toBe('in 10 days')
    expect(weddingProximity('2026-07-20', now)).toBe('in 5 weeks')
    expect(weddingProximity('2026-06-05', now)).toBe('10 days ago')
    // A fortnight is the boundary: 14 days reads as weeks, 13 still as days.
    expect(weddingProximity('2026-06-02', now)).toBe('13 days ago')
    expect(weddingProximity('2026-06-01', now)).toBe('2 weeks ago')
    // Far enough back that the plain date beside it is the more useful thing.
    expect(weddingProximity('2025-01-01', now)).toBeNull()
  })

  it('returns nothing for a date it cannot read', () => {
    expect(weddingProximity('not-a-date', now)).toBeNull()
  })
})
