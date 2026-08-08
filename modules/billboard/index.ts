import { defineModule } from '../contract'
import Editor from './Editor'
import Guest from './Guest'
import { configSchema, type BillboardConfig } from './schema'

/** How long a billboard film can be before the customizer suggests a shorter opener. */
const LONG_OPENER_S = 5 * 60

export default defineModule<BillboardConfig>({
  meta: {
    type: 'billboard',
    label: 'Billboard',
    description: 'The full-screen opener: one featured film, a line of copy, Play and More Info.',
    icon: 'MonitorPlay',
    occasions: ['wedding', 'anniversary', 'proposal', 'birthday', 'engagement'],
    phase: 0,
    singleton: true,
  },

  schema: configSchema,

  Guest,
  Editor,

  defaults: (catalogue, titles) => ({
    featuredRef: catalogue.featuredTitleId ?? titles[0]?.id ?? null,
    useTrailer: true,
    showCoupleName: true,
  }),

  advise: (config, ctx) => {
    const notes: string[] = []
    const featured =
      ctx.titles.find((t) => t.id === config.featuredRef) ??
      ctx.titles.find((t) => t.id === ctx.catalogue.featuredTitleId)

    if (!featured) {
      notes.push('No featured film is set, so the billboard will not appear.')
      return notes
    }

    if ((featured.durationS ?? 0) > LONG_OPENER_S) {
      const minutes = Math.round((featured.durationS ?? 0) / 60)
      notes.push(
        `Your billboard film is ${minutes} minutes long — consider a shorter opener and move this one into a row.`,
      )
    }

    if (!featured.posterUrl) {
      notes.push('The featured film has no poster art. The hero still is the first thing a guest sees.')
    }

    return notes
  },
})
