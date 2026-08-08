import { defineModule } from '../contract'
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
  },

  schema: configSchema,

  Guest,
  Editor,

  defaults: (catalogue, titles) => ({
    // Everything except the billboard's featured film, so a freshly added row is never empty.
    titleIds: titles
      .filter((t) => t.id !== catalogue.featuredTitleId)
      .slice(0, 5)
      .map((t) => t.id),
    aspect: '2:3',
    showProgress: false,
  }),

  advise: (config, ctx) => {
    const notes: string[] = []
    const present = new Set(ctx.titles.map((t) => t.id))
    const missing = config.titleIds.filter((id) => !present.has(id)).length

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
