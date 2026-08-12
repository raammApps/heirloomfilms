import { defineModule } from '../contract'
import { resolveFeatured } from './resolve'
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
    content: 'video',
    shape: 'hero',
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

  consumes: (config, ctx) => {
    const featured = resolveFeatured(config.featuredRef, ctx.catalogue.featuredTitleId, ctx.titles)
    return featured ? [featured.id] : []
  },

  advise: (config, ctx) => {
    const notes: string[] = []
    // Same fallback chain Guest renders. Reading only the two explicit refs made this claim a
    // billboard would not appear while the preview beside it was showing one.
    const featured = resolveFeatured(config.featuredRef, ctx.catalogue.featuredTitleId, ctx.titles)

    if (!featured) {
      notes.push('There are no published films yet, so the billboard has nothing to feature.')
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
