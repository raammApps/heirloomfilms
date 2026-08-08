import { z } from 'zod'

/**
 * `billboard` — the hero (doc 14 §3, doc 04 §1b mechanics 2 and 3).
 *
 * Carries proportionally more weight here than in a real streaming app: with eight items it is
 * a third of the experience (doc 01 VE-2).
 */
export const configSchema = z.object({
  /** Title id. Null falls back to the catalogue's `featuredTitleId`, then to the first film. */
  featuredRef: z.string().nullable().default(null),
  /** Muted autoplay trailer. Falls back to the still under reduced-motion or Save-Data. */
  useTrailer: z.boolean().default(true),
  /** Show the couple's name rather than the film's name as the hero headline. */
  showCoupleName: z.boolean().default(true),
})

export type BillboardConfig = z.infer<typeof configSchema>
