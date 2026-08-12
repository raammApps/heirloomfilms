import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type ChecklistConfig } from './schema'

export default defineModule<ChecklistConfig>({
  meta: {
    type: 'checklist',
    label: 'Bucket list',
    description: 'Tickable items that each guest keeps on their own phone.',
    icon: 'ListChecks',
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

  defaults: () => ({ items: [], showProgress: true }),

  advise: (config) => {
    const written = config.items.filter((item) => (item.text.en ?? '').trim().length > 0)
    if (config.items.length === 0) return ['No items yet, so guests will not see this section.']
    if (written.length < config.items.length) {
      return [`${config.items.length - written.length} empty item(s) will be skipped.`]
    }
    return []
  },
})
