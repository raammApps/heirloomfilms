'use client'

import { useState } from 'react'
import { Lightbox } from '@/components/streaming/Lightbox'
import { resolveLocalised } from '@/lib/i18n'
import type { GuestProps } from '../contract'
import type { PhotoGridConfig } from './schema'

/** Lazy beyond the first twelve; a catalogue caps at ~60 photos so no virtualisation is needed. */
const EAGER_COUNT = 12

export default function Guest({ config, ctx }: GuestProps<PhotoGridConfig>) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const photos = ctx.photos.filter((photo) =>
    config.albumId ? photo.albumId === config.albumId : true,
  )

  if (photos.length === 0) return null

  return (
    <section className="gutter-x py-8 md:py-12" data-testid="photo-grid-module">
      {ctx.heading ? <h2 className="type-label mb-4 text-text-lo">{ctx.heading}</h2> : null}

      <div
        className="[column-fill:_balance] gap-3"
        style={{ columnCount: config.columns, columnGap: '12px' }}
      >
        {photos.map((photo, index) => {
          const caption = resolveLocalised(photo.caption, ctx.locale)
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={caption || ctx.t('photo.open')}
              className="mb-3 block w-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 transition-transform duration-[180ms] ease-[var(--ease-lift)] [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02]"
              style={{ breakInside: 'avoid' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- see PosterCard */}
              <img
                src={photo.url}
                alt={caption}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
                decoding="async"
                className="block w-full"
                style={photo.lqip ? { backgroundImage: `url(${photo.lqip})`, backgroundSize: 'cover' } : undefined}
              />
            </button>
          )
        })}
      </div>

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          locale={ctx.locale}
          t={ctx.t}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </section>
  )
}
