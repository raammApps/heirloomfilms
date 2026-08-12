import { describe, expect, it } from 'vitest'
import { setupChecklist } from '@/lib/admin/setup-checklist'
import type { CatalogueCounts } from '@/lib/db/repository'
import { catalogueSchema, type Catalogue } from '@/lib/schema'

/**
 * A checklist that lies is worse than no checklist.
 *
 * Its whole value is telling an operator whether a guest opening the link right now finds
 * something to watch — so what is tested is that `ready` means exactly that, and nothing softer.
 */

function catalogue(over: Partial<Catalogue> = {}): Catalogue {
  return catalogueSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    orgId: '22222222-2222-4222-8222-222222222222',
    slug: 'aanya-vikram',
    coupleName: { en: 'Aanya & Vikram' },
    appName: { en: 'Aanya & Vikram Originals' },
    weddingDate: '2026-02-14',
    includedUntil: '2026-06-14',
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: '2025-11-01T00:00:00.000Z',
    ...over,
  })
}

function counts(over: Partial<CatalogueCounts> = {}): CatalogueCounts {
  return { titles: 3, ready: 3, published: 3, failed: 0, photos: 0, ...over }
}

describe('setupChecklist', () => {
  it('is not ready while anything required is outstanding', () => {
    const { ready } = setupChecklist(catalogue({ status: 'draft' }), counts())
    expect(ready).toBe(false)
  })

  it('is ready once every required item is done, with the optional ones untouched', () => {
    const result = setupChecklist(
      catalogue({ status: 'published' }),
      counts({ photos: 0 }),
    )

    expect(result.ready).toBe(true)
    // Photographs and branding are deliberately not gates — plenty of real deliveries are films
    // only — but they must still be visibly incomplete rather than quietly dropped.
    expect(result.done).toBeLessThan(result.total)
    expect(result.items.filter((item) => !item.done).map((item) => item.id)).toEqual([
      'photos',
      'branding',
    ])
  })

  /**
   * The state the checklist exists for: everything uploaded, everything transcoded, page live —
   * and not one film marked ready, so a guest finds an empty catalogue.
   */
  it('is not ready when the page is live but no film is shown to guests', () => {
    const result = setupChecklist(
      catalogue({ status: 'published' }),
      counts({ published: 0 }),
    )
    expect(result.ready).toBe(false)
    expect(result.items.find((item) => item.id === 'published-titles')?.done).toBe(false)
  })

  it('does not call processing complete when there are no films at all', () => {
    // `ready === titles` is true of 0 and 0, which would tick "finished processing" for a
    // catalogue that has never had a film in it.
    const result = setupChecklist(catalogue(), counts({ titles: 0, ready: 0, published: 0 }))
    expect(result.items.find((item) => item.id === 'processed')?.done).toBe(false)
  })

  it('names the failure count in the processing step rather than a generic nudge', () => {
    const result = setupChecklist(catalogue(), counts({ titles: 4, ready: 3, failed: 1 }))
    expect(result.items.find((item) => item.id === 'processed')?.detail).toContain('1 failed')
  })

  it('counts either a logo or an accent as branded', () => {
    const accent = setupChecklist(catalogue({ branding: { accent: '#2f6f4e' } }), counts())
    expect(accent.items.find((item) => item.id === 'branding')?.done).toBe(true)

    const bare = setupChecklist(catalogue({ branding: {} }), counts())
    expect(bare.items.find((item) => item.id === 'branding')?.done).toBe(false)
  })

  it('points every item at a page that exists under this catalogue', () => {
    const subject = catalogue()
    const { items } = setupChecklist(subject, counts())
    for (const item of items) {
      expect(item.href.startsWith(`/admin/c/${subject.id}`)).toBe(true)
    }
  })
})
