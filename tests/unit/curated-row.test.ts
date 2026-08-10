import { describe, expect, it } from 'vitest'
import { configSchema } from '@/modules/curated-row/schema'
import { selectRowTitles } from '@/modules/curated-row/select'
import { titleSchema, type Title } from '@/lib/schema'

/**
 * A row that can never fill itself.
 *
 * A template is applied at creation, before a single film is uploaded — the create route seeds
 * sections with empty arrays and says so in a comment. `titleIds` therefore came out `[]`, and
 * nothing back-filled it, so every row in every new catalogue stayed blank no matter how many
 * films were added. The operator's report was "I uploaded films and nothing shows up", and the
 * customizer's own advice agreed with them: "This row is empty".
 */

const CATALOGUE_ID = '33333333-3333-4333-8333-333333333333'
const id = (n: number): string => `2222222${n}-2222-4222-8222-222222222222`

function title(n: number): Title {
  return titleSchema.parse({
    id: id(n),
    catalogueId: CATALOGUE_ID,
    slug: `film-${n}`,
    name: { en: `Film ${n}` },
    category: 'highlights',
    status: 'ready',
    published: true,
    createdAt: new Date(2026, 0, n).toISOString(),
  })
}

const films = [title(1), title(2), title(3)]

describe('a row created by a template, before any film exists', () => {
  it('fills itself once films arrive', () => {
    // Exactly what `defaults()` produces at catalogue creation: no picks, nothing to pick from.
    const config = configSchema.parse({ source: 'auto', titleIds: [] })
    expect(selectRowTitles(config, films, []).map((t) => t.slug)).toEqual([
      'film-1',
      'film-2',
      'film-3',
    ])
  })

  it('does not repeat what the sections above it already showed', () => {
    const config = configSchema.parse({ source: 'auto', titleIds: [] })
    // The billboard spent film-1, so the first row below it opens on film-2.
    expect(selectRowTitles(config, films, [id(1)]).map((t) => t.slug)).toEqual(['film-2', 'film-3'])
  })

  it('stops at its limit rather than printing the whole catalogue', () => {
    const config = configSchema.parse({ source: 'auto', autoLimit: 2 })
    expect(selectRowTitles(config, films, [])).toHaveLength(2)
  })
})

describe('a row an operator has actually curated', () => {
  it('shows exactly their picks, in their order', () => {
    const config = configSchema.parse({ source: 'manual', titleIds: [id(3), id(1)] })
    expect(selectRowTitles(config, films, []).map((t) => t.slug)).toEqual(['film-3', 'film-1'])
  })

  it('keeps their picks even when a section above showed the same film', () => {
    // Deliberate repetition is a curation decision; only `auto` defers to what came before.
    const config = configSchema.parse({ source: 'manual', titleIds: [id(1)] })
    expect(selectRowTitles(config, films, [id(1)]).map((t) => t.slug)).toEqual(['film-1'])
  })

  it('shrinks rather than erroring when a pick is gone', () => {
    const config = configSchema.parse({ source: 'manual', titleIds: [id(1), 'deleted-id'] })
    expect(selectRowTitles(config, films, [])).toHaveLength(1)
  })
})

describe('rows written before `source` existed', () => {
  /**
   * Inferred, not assumed: picks mean somebody curated and must be preserved; no picks means
   * nobody ever could, and the row should start filling itself.
   */
  it('treats existing picks as curation', () => {
    expect(configSchema.parse({ titleIds: [id(2)] }).source).toBe('manual')
  })

  it('treats an empty row as never curated', () => {
    expect(configSchema.parse({ titleIds: [] }).source).toBe('auto')
  })
})
