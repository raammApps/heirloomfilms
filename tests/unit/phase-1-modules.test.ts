import { describe, expect, it } from 'vitest'
import { getModule } from '@/modules/registry'

/**
 * doc 14 §3's rule, which is the only thing all four of these share:
 *
 *   > A module never assumes another module exists. Every module handles its own empty state by
 *   > disappearing, not by showing a placeholder.
 *
 * A new module is otherwise its own folder's business. What is worth asserting centrally is that
 * each one is *safe to add to a template* — that a freshly instantiated instance on a catalogue
 * with no content parses, and describes itself as empty rather than rendering a heading over
 * nothing.
 */

const PHASE_1 = ['continue_watching', 'timeline', 'checklist', 'randomiser'] as const

describe('the Phase 1 modules', () => {
  it.each(PHASE_1)('%s parses its own defaults', (type) => {
    const definition = getModule(type)!
    expect(definition).toBeTruthy()

    // `defaults` runs against an empty catalogue, which is what a template application looks
    // like: the operator picks the shape before any content exists.
    const defaults = definition.defaults(
      { branding: {} } as never,
      [],
      [],
    )
    expect(definition.schema.safeParse(defaults).success).toBe(true)
  })

  it.each(PHASE_1)('%s declares a shape and a phase', (type) => {
    const meta = getModule(type)!.meta
    expect(meta.phase).toBe(1)
    expect(['hero', 'row', 'grid', 'prose']).toContain(meta.shape)
    expect(meta.occasions.length).toBeGreaterThan(0)
  })

  /**
   * The empty-state rule, checked through `advise` rather than by rendering: each module tells
   * the operator it will be invisible, which is the honest version of "handles its own empty
   * state by disappearing".
   */
  it.each(['timeline', 'checklist', 'randomiser'] as const)(
    '%s warns that it is invisible while empty',
    (type) => {
      const definition = getModule(type)!
      const defaults = definition.defaults({ branding: {} } as never, [], [])
      const notes = definition.advise!(defaults, {
        catalogue: { branding: {} } as never,
        titles: [],
        albums: [],
        photos: [],
        profileId: null,
      })
      expect(notes.join(' ')).toMatch(/will not see/i)
    },
  )

  it('continue_watching stays quiet rather than warning about an empty catalogue', () => {
    // It is *supposed* to be empty for a first-time guest, so an advisory here would be noise
    // on every catalogue rather than a signal on any.
    const definition = getModule('continue_watching')!
    const notes = definition.advise!(definition.defaults({ branding: {} } as never, [], []), {
      catalogue: { branding: {} } as never,
      titles: [],
      albums: [],
      photos: [],
      profileId: null,
    })
    expect(notes).toEqual([])
  })

  it('continue_watching says so when every film is too short to resume', () => {
    const definition = getModule('continue_watching')!
    const notes = definition.advise!(definition.defaults({ branding: {} } as never, [], []), {
      catalogue: { branding: {} } as never,
      titles: [{ id: 'a', durationS: 90 }, { id: 'b', durationS: 120 }] as never,
      albums: [],
      photos: [],
      profileId: null,
    })
    // Doc 14 §2's whole reservation about this module, surfaced where an operator will see it.
    expect(notes.join(' ')).toMatch(/under five minutes/i)
  })

  it('only continue_watching is a singleton, because only it computes itself', () => {
    expect(getModule('continue_watching')!.meta.singleton).toBe(true)
    for (const type of ['timeline', 'checklist', 'randomiser'] as const) {
      expect(getModule(type)!.meta.singleton).toBeFalsy()
    }
  })

  it('rejects configs that would render nonsense', () => {
    const timeline = getModule('timeline')!
    expect(timeline.schema.safeParse({ entries: 'not an array' }).success).toBe(
      false,
    )

    const checklist = getModule('checklist')!
    expect(checklist.schema.safeParse({ items: [{ id: '' }] }).success).toBe(
      false,
    )

    const randomiser = getModule('randomiser')!
    expect(randomiser.schema.safeParse({ options: [{}] }).success).toBe(false)

    const resume = getModule('continue_watching')!
    expect(
      resume.schema.safeParse({ minSeconds: -1, maxItems: 6 }).success,
    ).toBe(false)
    expect(
      resume.schema.safeParse({ minSeconds: 60, maxItems: 99 }).success,
    ).toBe(false)
  })
})
