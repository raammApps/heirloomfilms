import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type RandomiserConfig } from './schema'

export default defineModule<RandomiserConfig>({
  meta: {
    type: 'randomiser',
    label: 'Pick one for us',
    description: 'Shuffles one suggestion out of a list. Nothing is remembered between visits.',
    icon: 'Shuffle',
    occasions: ['wedding', 'anniversary', 'engagement', 'birthday'],
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

  defaults: () => ({ options: [], cta: { en: 'Pick one for us' } }),

  advise: (config) => {
    const written = config.options.filter((option) => (option.text.en ?? '').trim().length > 0)
    if (written.length === 0) return ['No options yet, so guests will not see this section.']
    if (written.length < 4) {
      return ['With fewer than four options this repeats itself quickly and reads as broken.']
    }
    return []
  },
})
