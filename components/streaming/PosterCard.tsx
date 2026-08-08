'use client'

import { memo } from 'react'
import { posterDataUri } from '@/lib/poster'

export type Aspect = '2:3' | '16:9' | '1:1' | '4:3'

export type RowItem = {
  id: string
  /** Deep-link key: `?title=<slug>` for films, a photo id for photo rows. */
  key: string
  label: string
  eyebrow?: string
  posterUrl?: string | null
  durationBadge?: string | null
  /** 0–1. Renders the accent progress bar across the bottom of the card. */
  progress?: number
  alt?: string
}

const ASPECT_CLASS: Record<Aspect, string> = {
  '2:3': 'aspect-[2/3]',
  '16:9': 'aspect-video',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
}

type Props = {
  item: RowItem
  aspect: Aspect
  onOpen: (item: RowItem) => void
  /** First two cards of the first row load eagerly; the rest are lazy (doc 08). */
  eager?: boolean
  /** Set when the row is in its stepped-up 2–3 card layout. */
  wide?: boolean
}

function PosterCardImpl({ item, aspect, onOpen, eager = false, wide = false }: Props) {
  /**
   * Generated artwork carries no type on a card.
   *
   * Doc 04 §6 sets the event name into the artwork, which is right when the poster is the only
   * surface showing it. The card also renders the name and category underneath — and it has to,
   * because a real photographic poster has no text baked in — so keeping both printed the title
   * twice. The DOM label is the single source: it truncates, it localises, and a screen reader
   * can read it.
   */
  const src = item.posterUrl || posterDataUri({ slug: item.key, label: '' })

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      data-testid="poster-card"
      data-key={item.key}
      className={[
        'group relative shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)]',
        'text-left transition-transform duration-[180ms] ease-[var(--ease-lift)]',
        // :hover sticks after a tap on Android, so the lift is pointer-device only (doc 08).
        '[@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.03] [@media(hover:hover)_and_(pointer:fine)]:hover:z-10',
        wide ? 'w-[var(--card-w-wide)]' : 'w-[var(--card-w)] md:w-[var(--card-w-md)]',
      ].join(' ')}
    >
      <span
        className={`relative block ${ASPECT_CLASS[aspect]} w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- posters are provider URLs or
            generated data: URIs; the image optimiser adds a hop for no benefit here. */}
        <img
          src={src}
          alt={item.alt ?? ''}
          loading={eager ? 'eager' : 'lazy'}
          decoding={eager ? 'sync' : 'async'}
          fetchPriority={eager ? 'high' : 'auto'}
          className="h-full w-full object-cover"
          draggable={false}
        />

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100"
          style={{
            boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent)',
          }}
        />

        {item.durationBadge ? (
          <span className="type-label absolute end-2 top-2 rounded bg-surface-0/75 px-1.5 py-1 text-text-hi backdrop-blur-sm">
            {item.durationBadge}
          </span>
        ) : null}

        {item.progress !== undefined && item.progress > 0 ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-surface-3">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.min(100, Math.round(item.progress * 100))}%` }}
            />
          </span>
        ) : null}
      </span>

      <span className="block px-1 pb-1 pt-2">
        <span className="type-body block truncate font-medium text-text-hi">{item.label}</span>
        {item.eyebrow ? <span className="type-meta block truncate">{item.eyebrow}</span> : null}
      </span>
    </button>
  )
}

export const PosterCard = memo(PosterCardImpl)
