'use client'

import { useState } from 'react'
import { Lightbox } from '@/components/streaming/Lightbox'
import { PosterRow } from '@/components/streaming/PosterRow'
import { resolveLocalised } from '@/lib/i18n'
import type { GuestProps } from '../contract'
import type { PhotoRowConfig } from './schema'

export default function Guest({ config, ctx }: GuestProps<PhotoRowConfig>) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const photos = ctx.photos
    .filter((photo) => (config.albumId ? photo.albumId === config.albumId : true))
    .slice(0, config.limit)

  if (photos.length === 0) return null

  const items = photos.map((photo, index) => ({
    id: photo.id,
    key: String(index),
    label: resolveLocalised(photo.caption, ctx.locale),
    posterUrl: photo.url,
    alt: resolveLocalised(photo.caption, ctx.locale),
  }))

  return (
    <>
      <PosterRow
        heading={ctx.heading}
        items={items}
        aspect={config.layout}
        onOpen={(item) => setOpenIndex(Number(item.key))}
        t={ctx.t}
      />

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
    </>
  )
}
