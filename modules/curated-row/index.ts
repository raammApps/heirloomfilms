import { defineModule } from '../contract'
import { selectRowTitles } from './select'
import Editor from './Editor'
import Guest from './Guest'
import { configSchema, type CuratedRowConfig } from './schema'

export default defineModule<CuratedRowConfig>({
  meta: {
    type: 'curated_row',
    label: 'Film row',
    description: 'A hand-picked row of films with a heading you write.',
    icon: 'Rows3',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
    content: 'video',
    shape: 'row',
  },

  schema: configSchema,

  Guest,
  Editor,

  defaults: () => ({
    // `auto`, deliberately. A template is applied before any film is uploaded, so picking ids
    // here can only ever produce an empty list — which is precisely how every row in every new
    // catalogue ended up permanently blank. The row fills itself until somebody curates it.
    source: 'auto' as const,
    autoLimit: 12,
    titleIds: [],
    aspect: '2:3' as const,
    showProgress: false,
  }),

  consumes: (config, ctx) =>
    selectRowTitles(config, ctx.titles, ctx.consumedTitleIds).map((title) => title.id),

  advise: (config, ctx) => {
    const notes: string[] = []
    const present = new Set(ctx.titles.map((t) => t.id))
    const missing = config.titleIds.filter((id) => !present.has(id)).length

    if (config.source === 'auto') {
      // An auto row cannot be "empty" through neglect — only through having no films at all,
      // or having none left after the rows above it.
      if (ctx.titles.length === 0) {
        notes.push('No films are published yet, so this row is hidden until one is.')
      }
      return notes
    }

    if (config.titleIds.length === 0) {
      notes.push('This row is empty, so guests will not see it at all.')
    } else if (config.titleIds.length === 1) {
      notes.push('A row of one film reads as a mistake. Add another, or move it to the billboard.')
    }

    if (missing > 0) {
      notes.push(`${missing} film${missing > 1 ? 's are' : ' is'} no longer published and will be skipped.`)
    }

    return notes
  },
})
