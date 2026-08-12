import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type LetterConfig } from './schema'

export default defineModule<LetterConfig>({
  meta: {
    type: 'letter',
    label: 'A message',
    description: 'A long-form personal note, set as type. No video, and often the best screen.',
    icon: 'PenLine',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
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

  defaults: () => ({ body: { en: '' }, signature: { en: '' }, theme: 'plain' }),

  advise: (config) => {
    const words = config.body.en.trim().split(/\s+/).filter(Boolean).length
    if (words === 0) return ['This message is empty, so guests will not see it at all.']
    if (words < 25) return ['A very short message reads as a caption. Two or three paragraphs land better.']
    return []
  },
})
