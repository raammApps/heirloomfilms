'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { createTranslator } from '@/lib/i18n'
import type { Locale } from '@/lib/schema'
import { PROFILE_STORAGE_PREFIX } from './CatalogueProvider'

/**
 * The player chunk must not sit in the browse route's initial bundle (doc 05 §6 — 150KB), so
 * it is imported here, on its own route, with SSR off: there is nothing meaningful to render
 * server-side for a `<video>` that needs a token anyway.
 */
const Player = dynamic(() => import('./Player').then((m) => m.Player), {
  ssr: false,
  loading: () => <div className="h-svh w-full bg-black" />,
})

type Props = {
  catalogueSlug: string
  titleSlug: string
  titleId: string
  titleName: string
  posterUrl: string
  locale: Locale
  startAtS: number | null
}

export function WatchScreen(props: Props) {
  const [profileId, setProfileId] = useState<string | null>(null)
  const t = createTranslator(props.locale)

  useEffect(() => {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_PREFIX + props.catalogueSlug)
    setProfileId(stored && stored !== 'skipped' ? stored : null)
  }, [props.catalogueSlug])

  return (
    <>
      <noscript>
        <p className="gutter-x py-10 text-text-mid">{t('player.needsJs')}</p>
      </noscript>
      <Player {...props} profileId={profileId} t={t} />
    </>
  )
}
