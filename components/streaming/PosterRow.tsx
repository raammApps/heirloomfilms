'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Translator } from '@/lib/i18n'
import { PosterCard, type Aspect, type RowItem } from './PosterCard'

/** Card widths from doc 03. `wide` is the stepped-up size used by the 2–3 card layout. */
const CARD_WIDTH: Record<Aspect, { mobile: number; desktop: number; wide: number }> = {
  '2:3': { mobile: 132, desktop: 200, wide: 260 },
  '16:9': { mobile: 240, desktop: 300, wide: 400 },
  '1:1': { mobile: 108, desktop: 140, wide: 200 },
  '4:3': { mobile: 200, desktop: 260, wide: 340 },
}

/**
 * At or below this count the row stops being a scroller (doc 02 §5, doc 08 `<PosterRow>`).
 * This is the common case in a curated catalogue, not an edge case — three cards rendered at
 * library scale reads as a loading error, and that is an acceptance criterion.
 */
export const COMPACT_ROW_THRESHOLD = 3

type Props = {
  heading: string
  items: RowItem[]
  aspect?: Aspect
  onOpen: (item: RowItem) => void
  t: Translator
  /** Only the first row of the page passes this; it eager-loads its first two cards. */
  eagerFirstCards?: boolean
}

export function PosterRow({
  heading,
  items,
  aspect = '2:3',
  onOpen,
  t,
  eagerFirstCards = false,
}: Props) {
  const scroller = useRef<HTMLUListElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const compact = items.length <= COMPACT_ROW_THRESHOLD
  const width = CARD_WIDTH[aspect]

  const syncArrows = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    syncArrows()
    const el = scroller.current
    if (!el) return
    el.addEventListener('scroll', syncArrows, { passive: true })
    window.addEventListener('resize', syncArrows)
    return () => {
      el.removeEventListener('scroll', syncArrows)
      window.removeEventListener('resize', syncArrows)
    }
  }, [syncArrows, items.length])

  /** Scroll by whole cards — never a fractional offset (doc 08). */
  const page = (direction: -1 | 1) => {
    const el = scroller.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-testid="poster-card"]')
    const cardWidth = (card?.offsetWidth ?? width.mobile) + 12
    const wholeCards = Math.max(1, Math.floor(el.clientWidth / cardWidth))
    el.scrollBy({ left: direction * wholeCards * cardWidth, behavior: 'smooth' })
  }

  /** ←/→ move focus between cards without trapping Tab (doc 10 §4). */
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const cards = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-testid="poster-card"]'),
    )
    const index = cards.indexOf(document.activeElement as HTMLButtonElement)
    if (index === -1) return
    const next = cards[index + (event.key === 'ArrowRight' ? 1 : -1)]
    if (!next) return
    event.preventDefault()
    next.focus()
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  // Never a heading over nothing (doc 02 §2).
  if (items.length === 0) return null

  return (
    <section
      className="relative py-4 md:py-6"
      data-testid="poster-row"
      data-compact={compact ? 'true' : 'false'}
      style={
        {
          '--card-w': `${width.mobile}px`,
          '--card-w-md': `${width.desktop}px`,
          '--card-w-wide': `min(${width.wide}px, 42vw)`,
        } as React.CSSProperties
      }
    >
      {heading ? <h2 className="type-label gutter-x mb-3 text-text-lo">{heading}</h2> : null}

      <div className="group/row relative">
        {!compact ? (
          <>
            <RowArrow side="left" visible={canScrollLeft} onClick={() => page(-1)} label={t('row.scrollLeft')} />
            <RowArrow side="right" visible={canScrollRight} onClick={() => page(1)} label={t('row.scrollRight')} />
          </>
        ) : null}

        <ul
          ref={scroller}
          role="list"
          onKeyDown={onKeyDown}
          className={[
            'no-scrollbar flex gap-3',
            compact
              ? 'gutter-x flex-wrap'
              : // Breaks the right margin so the next card peeks — that is the affordance.
                'gutter-l overflow-x-auto pe-6 [scroll-padding-inline-start:var(--gutter)] [scroll-snap-type:x_mandatory]',
          ].join(' ')}
        >
          {items.map((item, index) => (
            <li key={item.id} className="contents">
              <PosterCard
                item={item}
                aspect={aspect}
                onOpen={onOpen}
                eager={eagerFirstCards && index < 2}
                wide={compact}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function RowArrow({
  side,
  visible,
  onClick,
  label,
}: {
  side: 'left' | 'right'
  visible: boolean
  onClick: () => void
  label: string
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // The row is fully operable by ←/→ on the cards themselves; the arrows are a pointer
      // affordance and would otherwise add two tab stops per row for no keyboard benefit.
      tabIndex={-1}
      aria-hidden={!visible}
      disabled={!visible}
      className={[
        'absolute bottom-10 top-0 z-20 hidden w-12 items-center justify-center',
        'bg-surface-0/70 text-text-hi backdrop-blur-sm transition-opacity duration-200',
        '[@media(hover:hover)and(pointer:fine)]:flex',
        side === 'left' ? 'start-0' : 'end-0',
        visible ? 'opacity-0 group-hover/row:opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <Icon size={28} strokeWidth={1.5} aria-hidden />
    </button>
  )
}
