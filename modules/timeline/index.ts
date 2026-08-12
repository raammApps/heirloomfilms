import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type TimelineConfig } from './schema'

export default defineModule<TimelineConfig>({
  meta: {
    type: 'timeline',
    label: 'Our story',
    description: 'Dated moments down the page, each with an optional photograph.',
    icon: 'GitCommitVertical',
    occasions: ['wedding', 'anniversary', 'proposal', 'engagement'],
    phase: 1,
    content: 'text',
    shape: 'prose',
  },

  schema: configSchema,

  Guest,
  /**
   * Lazy, because the editor is admin-only and the registry is imported by the guest page.
   *
   * Every module's `index.ts` is one import away from `ModuleRenderer`, so a statically imported
   * Editor put the admin's form fields and icon set into the bundle of every guest on a phone.
   * `pnpm check:bundle` caught it when the Phase 1 modules made it four editors worse.
   */
  Editor: dynamic(() => import('./Editor')),

  // Empty rather than pre-filled with placeholder moments: a template that arrives with
  // "Moment 1 — replace this" published on somebody's wedding page is worse than an empty one,
  // and this module renders nothing until it has real content.
  defaults: () => ({ entries: [] }),

  advise: (config) => {
    const notes: string[] = []
    const written = config.entries.filter((entry) => (entry.what.en ?? '').trim().length > 0)

    if (config.entries.length === 0) {
      notes.push('No moments yet, so guests will not see this section at all.')
      return notes
    }
    if (written.length < config.entries.length) {
      notes.push(
        `${config.entries.length - written.length} moment(s) have no text and will be skipped.`,
      )
    }
    if (written.length > 8) {
      notes.push('Past eight moments this reads as a list rather than a story. The films are the long version.')
    }
    return notes
  },
})
