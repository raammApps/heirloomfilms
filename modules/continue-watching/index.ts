import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type ContinueWatchingConfig } from './schema'

export default defineModule<ContinueWatchingConfig>({
  meta: {
    type: 'continue_watching',
    label: 'Keep watching',
    description: 'Films this guest started and has not finished. Fills itself; hidden when empty.',
    icon: 'History',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 1,
    content: 'video',
    shape: 'row',
    // One resume row. Two would compete for the same films and disagree about the order.
    singleton: true,
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

  defaults: () => ({ minSeconds: 120, maxItems: 6 }),

  /**
   * Deliberately no `consumes`. A film that is half-watched should still appear in the row it
   * belongs to — being interrupted is not a reason to disappear from "The films".
   */
  advise: (_config, ctx) => {
    const longest = Math.max(0, ...ctx.titles.map((title) => title.durationS ?? 0))
    if (ctx.titles.length === 0) return []
    if (longest < 300) {
      return [
        'Every film here is under five minutes, so guests will finish them and this row will almost always be empty.',
      ]
    }
    return []
  },
})
