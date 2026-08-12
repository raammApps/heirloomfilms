import dynamic from 'next/dynamic'
import { defineModule } from '../contract'
import Guest from './Guest'
import { configSchema, type PhotoRowConfig } from './schema'

export default defineModule<PhotoRowConfig>({
  meta: {
    type: 'photo_row',
    label: 'Photo row',
    description: 'A scrolling row of photographs that opens full screen.',
    icon: 'Images',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
    content: 'photo',
    shape: 'row',
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

  defaults: (_catalogue, _titles, albums) => ({
    albumId: albums[0]?.id ?? null,
    layout: '4:3',
    limit: 12,
  }),

  advise: (config, ctx) => {
    const count = ctx.photos.filter((p) => (config.albumId ? p.albumId === config.albumId : true)).length
    if (count === 0)
      return ['No photographs uploaded yet, so this row stays hidden. Add some under Photographs.']
    return []
  },
})
