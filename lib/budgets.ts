/**
 * The performance and size budgets from doc 05 §6, in one dependency-free place.
 *
 * Here rather than beside the code they constrain, so a test, a CI script and a route handler
 * can all read the same number without dragging server-only modules into a test process. A
 * budget that lives in three files is a budget that drifts.
 */

/** doc 07 `/api/og`: "≤300KB — assert this in a test." */
export const OG_MAX_BYTES = 300 * 1024
export const OG_SIZE = { width: 1200, height: 630 } as const

/**
 * Browse first-load JS, gzipped. The player is lazy-loaded on its own route and must not
 * appear in this number.
 */
export const BROWSE_FIRST_LOAD_KB = 150

/** Press play → first frame, p75 on 4G. The metric the product lives or dies on. */
export const PLAYBACK_START_MS = 1500

/** Rebuffer ratio across a full playthrough. */
export const REBUFFER_RATIO = 0.01

export const BROWSE_LCP_MS = 2500
export const CLS = 0.05
