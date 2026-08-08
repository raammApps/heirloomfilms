'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { MessageKey } from '@/lib/i18n'

export type PlaybackTicketResponse = {
  playbackUrl: string
  thumbnailsUrl: string | null
  durationS: number | null
  resumeAtS: number
  expiresAt: string
  captions: { lang: string; url: string }[]
  qualityLabel?: string
}

/** Never start at 1080p — it looks better for two seconds and then stalls (doc 05 §6). */
const START_LEVEL_HEIGHT = 480

type Options = {
  video: RefObject<HTMLVideoElement | null>
  catalogueSlug: string
  titleSlug: string
  profileId: string | null
  onTicket?: (ticket: PlaybackTicketResponse) => void
}

/**
 * Token fetch, HLS attach, and the silent 403 refresh.
 *
 * Extracted from `<Player>` so the token lifecycle can be reasoned about (and tested) on its
 * own: a token expiring mid-film must resume at the same second, never restart (doc 05 §8).
 */
export function useHlsPlayback({ video, catalogueSlug, titleSlug, profileId, onTicket }: Options) {
  const [ticket, setTicket] = useState<PlaybackTicketResponse | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [attempt, setAttempt] = useState(0)
  const destroyRef = useRef<(() => void) | null>(null)

  const fetchTicket = useCallback(async (): Promise<PlaybackTicketResponse | null> => {
    const response = await fetch('/api/playback/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ catalogue: catalogueSlug, titleSlug, profileId }),
    })

    if (response.ok) return (await response.json()) as PlaybackTicketResponse

    const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null
    // Honest and actionable: "still processing" is a different message from "went wrong".
    setError(body?.error?.code === 'TITLE_NOT_READY' ? 'player.error.notReady' : 'player.error.unavailable')
    return null
  }, [catalogueSlug, titleSlug, profileId])

  useEffect(() => {
    let cancelled = false

    async function attach() {
      const el = video.current
      if (!el) return

      const fresh = await fetchTicket()
      if (!fresh || cancelled) return

      setTicket(fresh)
      setError(null)

      const nativeHls = el.canPlayType('application/vnd.apple.mpegurl') !== ''

      if (nativeHls) {
        // Safari and most Android browsers play HLS natively; hls.js would be dead weight.
        el.src = fresh.playbackUrl
        onTicket?.(fresh)
        return
      }

      const { default: Hls } = await import('hls.js')
      if (cancelled) return

      if (!Hls.isSupported()) {
        el.src = fresh.playbackUrl
        onTicket?.(fresh)
        return
      }

      const hls = new Hls({
        // Short segments and a modest buffer: the first segment has to arrive fast, and a
        // mid-range Android on 4G is memory-constrained.
        maxBufferLength: 20,
        maxMaxBufferLength: 60,
        startLevel: -1,
        capLevelToPlayerSize: true,
        lowLatencyMode: false,
        // Ask for a fresh token instead of failing when Bunny rejects an expired one.
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        // Start the ladder at 480p and step up from there.
        const index = data.levels.findIndex((level) => (level.height ?? 0) >= START_LEVEL_HEIGHT)
        hls.startLevel = index >= 0 ? index : 0
        onTicket?.(fresh)
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return

        const isAuth =
          data.type === 'networkError' &&
          (data.response?.code === 403 || data.response?.code === 401)

        if (isAuth) {
          // Silent refresh: keep the position, swap the URL, carry on (doc 07 guest rules).
          const at = el.currentTime
          void fetchTicket().then((refreshed) => {
            if (!refreshed || cancelled) return
            setTicket(refreshed)
            hls.loadSource(refreshed.playbackUrl)
            hls.once(Hls.Events.MANIFEST_PARSED, () => {
              el.currentTime = at
              void el.play().catch(() => {})
            })
          })
          return
        }

        if (data.type === 'networkError') {
          setError('player.error.network')
          hls.startLoad()
          return
        }

        hls.recoverMediaError()
      })

      hls.loadSource(fresh.playbackUrl)
      hls.attachMedia(el)
      destroyRef.current = () => hls.destroy()
    }

    void attach()

    return () => {
      cancelled = true
      destroyRef.current?.()
      destroyRef.current = null
    }
    // `onTicket` is stable via useCallback at the call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTicket, video, attempt])

  const retry = useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  return { ticket, error, retry }
}
