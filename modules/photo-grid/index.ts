import { defineModule } from '../contract'
import Editor from './Editor'
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
  Editor,

  defaults: (_catalogue, _titles, albums) => ({ albumId: albums[0]?.id ?? null, columns: 3 }),

  advise: (config, ctx) => {
    const count = ctx.photos.filter((p) => (config.albumId ? p.albumId === config.albumId : true)).length
    if (count === 0)
      return ['No photographs uploaded yet, so this gallery stays hidden. Add some under Photographs.']
    if (count > 60) return [`${count} photographs is past the keepsake cap. Guests scroll past long galleries.`]
    return []
  },
})
