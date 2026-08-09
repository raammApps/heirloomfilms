'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'

/**
 * Measure what doc 05 §6 calls the metric the product lives or dies on.
 *
 * Playback start is **press play → first frame**, not "the page loaded" and not "the manifest
 * arrived". The clock starts when the guest expresses intent and stops when they see a picture,
 * because that is the interval they actually experience.
 *
 * Rebuffering is measured the same way: seconds the picture was frozen while the guest wanted
 * it to move, over seconds watched.
 *
 * Beacons carry no identity — a catalogue, a title, a duration, a coarse connection label. Doc
 * 06 §5 keeps the viewer side free of personal data, and telemetry does not get an exemption.
 */

type Options = {
  video: RefObject<HTMLVideoElement | null>
  catalogueSlug: string
  titleId: string
}

function connectionLabel(): string {
  const connection = (
    navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }
  ).connection
  return connection?.effectiveType ?? connection?.type ?? 'unknown'
}

export function useQoe({ video, catalogueSlug, titleId }: Options) {
  const intentAt = useRef<number | null>(null)
  const startReported = useRef(false)

  const stalledSince = useRef<number | null>(null)
  const stalledS = useRef(0)
  const watchedS = useRef(0)
  const lastTick = useRef<number | null>(null)

  const send = useCallback(
    (payload: Record<string, unknown>) => {
      const body = JSON.stringify({ catalogue: catalogueSlug, titleId, ...payload })
      // Fire-and-forget: a beacon must never interfere with playback (doc 07's rule for the
      // progress heartbeat, and the same reasoning applies here).
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon('/api/qoe', new Blob([body], { type: 'application/json' }))
        return
      }
      void fetch('/api/qoe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    },
    [catalogueSlug, titleId],
  )

  /** Called the moment the guest asks for playback — the start of the interval that matters. */
  const markIntent = useCallback(() => {
    if (startReported.current) return
    intentAt.current = performance.now()
  }, [])

  useEffect(() => {
    const el = video.current
    if (!el) return

    // First frame. `playing` is the honest signal: `canplay` fires before anything is painted.
    const onPlaying = () => {
      if (!startReported.current && intentAt.current !== null) {
        startReported.current = true
        send({
          event: 'start',
          startMs: Math.round(performance.now() - intentAt.current),
          connection: connectionLabel(),
        })
      }
      // Leaving a stall counts the frozen time against the rebuffer ratio.
      if (stalledSince.current !== null) {
        stalledS.current += (performance.now() - stalledSince.current) / 1000
        stalledSince.current = null
      }
    }

    // `waiting` is the buffer running dry mid-playback; a seek also fires it, which is why the
    // clock only runs while the element is not paused.
    const onWaiting = () => {
      if (!el.paused && stalledSince.current === null) stalledSince.current = performance.now()
    }

    const onTimeUpdate = () => {
      const now = el.currentTime
      const previous = lastTick.current
      lastTick.current = now
      // A jump is a seek, not watched time.
      if (previous !== null && now > previous && now - previous < 2) {
        watchedS.current += now - previous
      }
    }

    const onError = () => {
      send({
        event: 'error',
        reason: el.error ? `media_${el.error.code}` : 'unknown',
        connection: connectionLabel(),
      })
    }

    el.addEventListener('playing', onPlaying)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('error', onError)

    return () => {
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('error', onError)
    }
  }, [video, send])

  /** One rebuffer summary per visit, on the way out — not a beacon per stall. */
  useEffect(() => {
    const report = () => {
      if (watchedS.current < 5) return
      send({
        event: 'rebuffer',
        stalledS: Number(stalledS.current.toFixed(2)),
        watchedS: Number(watchedS.current.toFixed(2)),
        connection: connectionLabel(),
      })
      watchedS.current = 0
      stalledS.current = 0
    }

    window.addEventListener('pagehide', report)
    return () => {
      window.removeEventListener('pagehide', report)
      report()
    }
  }, [send])

  return { markIntent }
}
