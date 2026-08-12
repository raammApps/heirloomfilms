import type { CatalogueCounts } from '@/lib/db/repository'
import type { Catalogue } from '@/lib/schema'

/**
 * What is left before this wedding is finished.
 *
 * The wizard ends by handing an operator the customizer, and nothing anywhere said whether they
 * were done. "Done" here is a real definition rather than a feeling: a guest opening the link
 * finds a published page with something to watch on it.
 *
 * Pure, and separate from the page, so the definition is testable — the value of a checklist is
 * entirely in it agreeing with reality, and a checklist that lies is worse than none.
 */

export type ChecklistItem = {
  id: string
  label: string
  /** What to do about it, shown only when the item is outstanding. */
  detail: string
  done: boolean
  href: string
  /** Everything else can ship without it; a wedding with no films cannot. */
  required: boolean
}

export function setupChecklist(
  catalogue: Catalogue,
  counts: CatalogueCounts,
): { items: ChecklistItem[]; done: number; total: number; ready: boolean } {
  const base = `/admin/c/${catalogue.id}`
  const branded = Boolean(catalogue.branding.logoUrl || catalogue.branding.accent)

  const items: ChecklistItem[] = [
    {
      id: 'films',
      label: 'Films uploaded',
      detail: 'Drop the films in. They upload straight to the video service and survive a refresh.',
      done: counts.titles > 0,
      href: `${base}/titles`,
      required: true,
    },
    {
      id: 'processed',
      label: 'Films finished processing',
      detail:
        counts.failed > 0
          ? `${counts.failed} failed. Open Films to see why and retry.`
          : 'Still transcoding. Nothing to do — this finishes on its own.',
      done: counts.titles > 0 && counts.ready === counts.titles,
      href: `${base}/titles`,
      required: true,
    },
    {
      id: 'published-titles',
      label: 'At least one film shown to guests',
      detail: 'A film has to be marked ready before guests can see it, even on a live page.',
      done: counts.published > 0,
      href: `${base}/titles`,
      required: true,
    },
    {
      id: 'photos',
      label: 'Photographs added',
      detail: 'Optional, but the album is half of what a couple shows their family.',
      done: counts.photos > 0,
      href: `${base}/photos`,
      required: false,
    },
    {
      id: 'branding',
      label: 'Their colour and logo',
      detail: 'A default-red page looks like a template. This is the minute that stops it.',
      done: branded,
      href: `${base}/customizer`,
      required: false,
    },
    {
      id: 'published',
      label: 'Published',
      detail: 'Until this, the link resolves but shows guests a "not yet available" screen.',
      done: catalogue.status === 'published',
      href: `${base}/customizer`,
      required: true,
    },
  ]

  return {
    items,
    done: items.filter((item) => item.done).length,
    total: items.length,
    // "Ready" is about guests, not about completeness: the optional two do not gate it.
    ready: items.every((item) => item.done || !item.required),
  }
}
