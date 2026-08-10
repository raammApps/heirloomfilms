import type { Title } from '@/lib/schema'

/**
 * The featured film: the section's own ref, then the catalogue's, then simply the first film.
 *
 * Shared so `Guest`, `consumes` and `advise` cannot disagree — they did, and the customizer
 * told operators the billboard would not appear while rendering one next to the message.
 */
export function resolveFeatured(
  featuredRef: string | null,
  catalogueFeaturedId: string | null,
  titles: Title[],
): Title | undefined {
  return (
    titles.find((t) => t.id === featuredRef) ??
    titles.find((t) => t.id === catalogueFeaturedId) ??
    titles[0]
  )
}
