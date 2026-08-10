import type { Title } from '@/lib/schema'
import type { CuratedRowConfig } from './schema'

/**
 * Which films this row shows — the single rule, read by both `Guest` and `consumes`.
 *
 * Two copies of this logic would drift, and the failure would be silent: a row rendering one
 * set of films while telling the page it had spent another, so the row below repeats them.
 */
export function selectRowTitles(
  config: CuratedRowConfig,
  titles: Title[],
  consumedTitleIds: readonly string[],
): Title[] {
  if (config.source === 'manual') {
    // The operator's order is the authority, not the titles table. A film that was deleted or
    // unpublished drops out and the row shrinks, rather than erroring.
    const byId = new Map(titles.map((title) => [title.id, title]))
    return config.titleIds.flatMap((id) => {
      const title = byId.get(id)
      return title ? [title] : []
    })
  }

  // `auto`: everything published that the page has not already spent, oldest first, so the row
  // reads as a catalogue in the order the films were added rather than a shuffled bag.
  const spent = new Set(consumedTitleIds)
  return titles.filter((title) => !spent.has(title.id)).slice(0, config.autoLimit)
}
