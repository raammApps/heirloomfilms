'use client'

import { useEffect, useRef, type RefObject } from 'react'

const HEARTBEAT_MS = 10_000

type Options = {
  video: RefObject<HTMLVideoElement | null>
  catalogueSlug: string
  titleId: string
  profileId: string | null
  playing: boolean
}

/**
 * `POST /api/progress` every 10s while playing, on pause, and on unload via `sendBeacon`
 * (doc 07, doc 09 P0-18).
 *
 * Fire-and-forget by design: a failed heartbeat must never interrupt playback. `deltaS` is the
 * seconds actually watched in this window, not wall-clock time, so seeking around does not
 * inflate the analytics a planner shows the couple.
 */
export function useProgressHeartbeat({ video, catalogueSlug, titleId, profileId, playing }: Options) {
  const lastReported = useRef(0)
  const watchedSinceReport = useRef(0)
  const lastTick = useRef<number | null>(null)

  // Accumulate watched time from timeupdate rather than from a wall clock.
  useEffect(() => {
    const el = video.current
    if (!el) return

    const onTimeUpdate = () => {
      const now = el.currentTime
      const previous = lastTick.current
      lastTick.current = now
      if (previous === null) return
      const delta = now - previous
      // A jump means a seek, not watched time.
      if (delta > 0 && delta < 2) watchedSinceReport.current += delta
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    return () => el.removeEventListener('timeupdate', onTimeUpdate)
  }, [video])

  useEffect(() => {
    if (!profileId || profileId === 'skipped') return

    const send = (useBeacon: boolean) => {
      const el = video.current
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return

      const positionS = Math.floor(el.currentTime)
      const deltaS = Math.round(watchedSinceReport.current)
      if (positionS === lastReported.current && deltaS === 0) return

      lastReported.current = positionS
      watchedSinceReport.current = 0

      const payload = JSON.stringify({
        catalogue: catalogueSlug,
        profileId,
        titleId,
        positionS,
        deltaS,
        durationS: Math.floor(el.duration),
      })

      if (useBeacon && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/progress', new Blob([payload], { type: 'application/json' }))
        return
      }

      void fetch('/api/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }

    const interval = playing ? window.setInterval(() => send(false), HEARTBEAT_MS) : null
    if (!playing) send(false)

    const onHide = () => send(true)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      if (interval) window.clearInterval(interval)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
      send(true)
    }
  }, [playing, profileId, catalogueSlug, titleId, video])
}
