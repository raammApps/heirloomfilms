import { z } from 'zod'

/**
 * `curated_row` — the anchor module (doc 14 §3).
 *
 * An ordered list of hand-picked title ids with an operator-written heading. Deliberately not
 * a category filter: at 8–12 titles, auto-grouping produces six rows of one card.
 */
export const configSchema = z.object({
  /**
   * `auto` shows every published film the page has not already spent, in upload order.
   * `manual` shows exactly `titleIds`, in the operator's order.
   *
   * Rows are born `auto` because a template is applied before a single film exists — the
   * create route seeds sections with empty arrays and says so. Hand-picking into a catalogue
   * with no content is impossible, so `manual` was unreachable and every row stayed empty
   * forever, however many films were uploaded afterwards. Choosing films in the editor is what
   * flips a row to `manual`, which is the only moment an operator has actually curated.
   */
  source: z.enum(['auto', 'manual']).optional(),
  /** How many films an `auto` row will show before it stops. Ignored when `manual`. */
  autoLimit: z.number().int().positive().default(12),
  titleIds: z.array(z.string()).default([]),
  aspect: z.enum(['2:3', '16:9']).default('2:3'),
  /** P1 surfaces resume progress on the cards; the flag exists now so the config is stable. */
  showProgress: z.boolean().default(false),
})
  // An absent `source` is inferred rather than assumed, so rows written before this field
  // existed keep behaving correctly: picks mean somebody curated, no picks means nobody could.
  .transform((config) => ({
    ...config,
    source: config.source ?? (config.titleIds.length > 0 ? ('manual' as const) : ('auto' as const)),
  }))

export type CuratedRowConfig = z.infer<typeof configSchema>
