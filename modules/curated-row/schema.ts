import { z } from 'zod'

/**
 * `curated_row` — the anchor module (doc 14 §3).
 *
 * An ordered list of hand-picked title ids with an operator-written heading. Deliberately not
 * a category filter: at 8–12 titles, auto-grouping produces six rows of one card.
 */
export const configSchema = z.object({
  titleIds: z.array(z.string()).default([]),
  aspect: z.enum(['2:3', '16:9']).default('2:3'),
  /** P1 surfaces resume progress on the cards; the flag exists now so the config is stable. */
  showProgress: z.boolean().default(false),
})

export type CuratedRowConfig = z.infer<typeof configSchema>
