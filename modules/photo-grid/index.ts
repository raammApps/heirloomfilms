import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type PhotoGridConfig } from './schema'

export default defineModule<PhotoGridConfig>({
  meta: {
    type: 'photo_grid',
    label: 'Photo gallery',
    description: 'A full gallery of photographs, opening full screen on tap.',
    icon: 'LayoutGrid',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
    content: 'photo',
    shape: 'grid',
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

  defaults: (_catalogue, _titles, albums) => ({ albumId: albums[0]?.id ?? null, columns: 3 }),

  advise: (config, ctx) => {
    const count = ctx.photos.filter((p) => (config.albumId ? p.albumId === config.albumId : true)).length
    if (count === 0)
      return ['No photographs uploaded yet, so this gallery stays hidden. Add some under Photographs.']
    if (count > 60) return [`${count} photographs is past the keepsake cap. Guests scroll past long galleries.`]
    return []
  },
})
