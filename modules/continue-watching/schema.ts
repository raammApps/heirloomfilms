import { z } from 'zod'

/**
 * `continue_watching` — the auto-computed resume row (doc 14 §3).
 *
 * Doc 14 §2 dropped this to Phase 1 with a specific reason: most items here are under five
 * minutes and get finished, so the row is usually empty. It "earns its place only because of the
 * one long ceremony film" — which is exactly why `minSeconds` exists. A guest who watched forty
 * seconds of a highlights reel has not left anything unfinished.
 */
export const configSchema = z.object({
  /**
   * Below this, a resume point is an accident rather than an intention. Two minutes is long
   * enough to exclude a mis-tap and short enough to catch someone interrupted early in the
   * ceremony film.
   */
  minSeconds: z.number().int().nonnegative().default(120),
  maxItems: z.number().int().positive().max(12).default(6),
})

export type ContinueWatchingConfig = z.infer<typeof configSchema>
