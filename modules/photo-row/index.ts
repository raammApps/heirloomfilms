import { defineModule } from '../contract'
import Editor from './Editor'
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
  },

  schema: configSchema,

  Guest,
  Editor,

  defaults: (_catalogue, _titles, albums) => ({
    albumId: albums[0]?.id ?? null,
    layout: '4:3',
    limit: 12,
  }),

  advise: (config, ctx) => {
    const count = ctx.photos.filter((p) => (config.albumId ? p.albumId === config.albumId : true)).length
    if (count === 0) return ['There are no photographs in this album yet, so the row is hidden.']
    return []
  },
})
