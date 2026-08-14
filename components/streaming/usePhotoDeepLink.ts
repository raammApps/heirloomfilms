'use client'

import { useEffect, useState } from 'react'
import type { Photo } from '@/lib/schema'

/** The query key a shared photograph carries. Also read by `photoShareUrl`. */
export const PHOTO_PARAM = 'photo'

/**
 * A photograph's own address (N-31).
 *
 * Built from the page the guest is already on rather than from a `shareBaseUrl` threaded through
 * the module contract. A photograph is only ever viewed *inside* its catalogue, so the current
 * URL is by definition the right base — and it stays correct in both tenancy modes, on a custom
 * domain, and in the customizer's preview, none of which this needs to know about.
 *
 * Deliberately not a route of its own. `/c/<slug>/photo/<id>` would be a second page that has to
 * re-resolve access, re-render the gallery behind it and handle a missing photograph — for a
 * link whose entire job is to reopen a lightbox that already exists.
 */
export function photoShareUrl(photo: Photo): string {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set(PHOTO_PARAM, photo.id)
  url.hash = ''
  return url.toString()
}

/**
 * Opens the lightbox when the page is reached through a shared photograph link, and keeps the
 * address bar honest while the guest swipes.
 *
 * Shared by both photo modules so a link behaves identically whichever section it came from —
 * the alternative is two copies of the same URL parsing, and they drift.
 *
 * `replaceState` rather than a router push: swiping through thirty photographs must not leave
 * thirty entries in history, or Back stops meaning "leave the gallery" — which is the only thing
 * a guest ever wants it to mean.
 */
export function usePhotoDeepLink(
  photos: Photo[],
): [number | null, (next: number | null) => void] {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get(PHOTO_PARAM)
    if (!wanted) return
    const index = photos.findIndex((photo) => photo.id === wanted)
    // A page can carry several photo sections; the one that does not hold this photograph must
    // stay shut rather than open something arbitrary.
    if (index !== -1) setOpenIndex(index)
  }, [photos])

  const change = (next: number | null) => {
    setOpenIndex(next)

    const url = new URL(window.location.href)
    const photo = next === null ? null : photos[next]
    if (photo) url.searchParams.set(PHOTO_PARAM, photo.id)
    else url.searchParams.delete(PHOTO_PARAM)
    window.history.replaceState(null, '', url.toString())
  }

  return [openIndex, change]
}
