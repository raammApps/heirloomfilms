import type { CatalogueCounts } from '@/lib/db/repository'
import type { CatalogueStatus, SubStatus } from '@/lib/schema'

/**
 * The one line a catalogue card says about itself.
 *
 * A partner's list is where they decide what to do next, and every card looked identical whether
 * it held fifteen finished films or nothing at all. This turns the row into a decision.
 *
 * Pure and separate from the component so the ordering of the rules — which is the whole
 * substance of it — can be tested without rendering anything.
 */

export type Attention = {
  /** `warn` is something wrong; `act` is something waiting on the operator; `ok` is done. */
  tone: 'warn' | 'act' | 'ok'
  label: string
}

export function catalogueAttention(input: {
  status: CatalogueStatus
  subStatus: SubStatus
  counts: CatalogueCounts
}): Attention {
  const { counts } = input

  // Ordered by what would embarrass us first. A lapsed wedding is showing guests a renewal
  // screen right now, which beats anything the operator has left half-done.
  if (input.subStatus === 'lapsed' || input.subStatus === 'cold') {
    return { tone: 'warn', label: 'Subscription lapsed' }
  }
  if (counts.failed > 0) {
    return {
      tone: 'warn',
      label: `${counts.failed} film${counts.failed > 1 ? 's' : ''} failed`,
    }
  }
  if (input.subStatus === 'grace') return { tone: 'warn', label: 'Renewal due' }

  const processing = counts.titles - counts.ready - counts.failed
  if (processing > 0) return { tone: 'act', label: `${processing} still processing` }

  if (counts.titles === 0) return { tone: 'act', label: 'No films yet' }

  if (input.status === 'draft') {
    return counts.published > 0
      ? { tone: 'act', label: 'Ready to publish' }
      : { tone: 'act', label: 'Nothing shown to guests yet' }
  }

  if (counts.published === 0) return { tone: 'warn', label: 'Live, but nothing to watch' }

  return { tone: 'ok', label: 'Live and complete' }
}

/**
 * "in 12 days" / "3 weeks ago", for the wedding date.
 *
 * Days, not months or years: a planner's horizon is the next few weeks, and "in 8 months" is
 * both less useful and more likely to be wrong about the boundary than the plain date already
 * printed beside it.
 */
export function weddingProximity(iso: string, now: Date = new Date()): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  // Compare calendar days in UTC, so a wedding "today" does not become "in 0 days" or "yesterday"
  // depending on what time the operator opens the page.
  const day = 864e5
  const toDay = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / day)
  const diff = toDay(date) - toDay(now)

  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 0) return diff < 14 ? `in ${diff} days` : `in ${Math.round(diff / 7)} weeks`
  const ago = -diff
  if (ago < 14) return `${ago} days ago`
  if (ago < 60) return `${Math.round(ago / 7)} weeks ago`
  return null
}
