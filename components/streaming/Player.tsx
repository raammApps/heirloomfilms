'use client'

import {
  ArrowLeft,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatClock } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { useHlsPlayback, type PlaybackTicketResponse } from './useHlsPlayback'
import { useProgressHeartbeat } from './useProgressHeartbeat'

type Props = {
  catalogueSlug: string
  titleSlug: string
  titleId: string
  titleName: string
  posterUrl: string
  profileId: string | null
  /** `?t=` deep link — "watch from 7:08, that's my dad crying" (doc 02 §6). */
  startAtS: number | null
  t: Translator
}

const CONTROLS_HIDE_MS = 3000
const RESUME_NOTICE_MS = 6000

/**
 * The player (doc 08 `<Player>`, doc 03 screen 04).
 *
 * Poster paints immediately, the ladder starts at 480p and steps up, a 403 mid-playback
 * refreshes the token silently and continues at the same second, and every control is
 * keyboard-mapped with a ≥44px target.
 */
export function Player({
  catalogueSlug,
  titleSlug,
  titleId,
  titleName,
  posterUrl,
  profileId,
  startAtS,
  t,
}: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const shell = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [resumeNotice, setResumeNotice] = useState<number | null>(null)

  const onTicket = useCallback(
    (ticket: PlaybackTicketResponse) => {
      const resumeAt = startAtS ?? (ticket.resumeAtS > 5 ? ticket.resumeAtS : null)
      if (resumeAt) {
        const el = video.current
        if (el) el.currentTime = resumeAt
        setResumeNotice(resumeAt)
        window.setTimeout(() => setResumeNotice(null), RESUME_NOTICE_MS)
      }
    },
    [startAtS],
  )

  const { error, ticket, retry } = useHlsPlayback({
    video,
    catalogueSlug,
    titleSlug,
    profileId,
    onTicket,
  })

  useProgressHeartbeat({ video, catalogueSlug, titleId, profileId, playing })

  // ── Element events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = video.current
    if (!el) return

    const onTimeUpdate = () => setPosition(el.currentTime)
    const onDurationChange = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => setMuted(el.muted)

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDurationChange)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('volumechange', onVolumeChange)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDurationChange)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('volumechange', onVolumeChange)
    }
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  const hideTimer = useRef<number | null>(null)
  const wake = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      // Never auto-hide while a control has focus (doc 08).
      const focusInControls = shell.current?.querySelector('[data-controls]')?.contains(document.activeElement)
      if (!focusInControls && !video.current?.paused) setControlsVisible(false)
    }, CONTROLS_HIDE_MS)
  }, [])

  useEffect(() => {
    wake()
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [wake, playing])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const el = video.current
    if (!el) return
    if (el.paused) void el.play().catch(() => {})
    else el.pause()
  }, [])

  const seekBy = useCallback((delta: number) => {
    const el = video.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + delta))
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void shell.current?.requestFullscreen?.().catch(() => {})
  }, [])

  const togglePip = useCallback(() => {
    const el = video.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }) | null
    if (!el?.requestPictureInPicture) return
    if (document.pictureInPictureElement) void document.exitPictureInPicture()
    else void el.requestPictureInPicture().catch(() => {})
  }, [])

  // ── Keyboard map (doc 02 §4) ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          event.preventDefault()
          seekBy(10)
          break
        case 'ArrowLeft':
          event.preventDefault()
          seekBy(-10)
          break
        case 'f':
          toggleFullscreen()
          break
        case 'm': {
          const el = video.current
          if (el) el.muted = !el.muted
          break
        }
        case 'Escape':
          if (!document.fullscreenElement) history.back()
          break
        default:
          return
      }
      wake()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, seekBy, toggleFullscreen, wake])

  const progressPercent = duration > 0 ? (position / duration) * 100 : 0

  return (
    <div
      ref={shell}
      className="relative h-svh w-full bg-black"
      onMouseMove={wake}
      onTouchStart={wake}
      data-testid="player"
    >
      <video
        ref={video}
        poster={posterUrl}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onClick={togglePlay}
        aria-label={titleName}
      />

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface-0/90 px-6 text-center">
          <p className="type-body-lg text-text-hi">{t(error)}</p>
          <button
            type="button"
            onClick={retry}
            className="h-12 rounded-[var(--radius-pill)] bg-accent px-6 font-semibold text-accent-ink"
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {resumeNotice !== null ? (
        <div className="absolute inset-x-0 top-20 flex justify-center px-4">
          <div className="edge flex items-center gap-3 rounded-[var(--radius-pill)] bg-surface-1/90 px-4 py-2 backdrop-blur-sm">
            <span className="type-meta text-text-hi">
              {t('player.resumingFrom', { time: formatClock(resumeNotice) })}
            </span>
            <button
              type="button"
              onClick={() => {
                const el = video.current
                if (el) el.currentTime = 0
                setResumeNotice(null)
              }}
              className="type-meta h-9 rounded-[var(--radius-pill)] px-3 text-accent"
            >
              {t('player.startOver')}
            </button>
          </div>
        </div>
      ) : null}

      <div
        data-controls
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.6), transparent 22%, transparent 62%, rgba(0,0,0,.75))' }}
      >
        <div className="flex items-center gap-3 p-3">
          <IconButton label={t('player.back')} onClick={() => history.back()}>
            <ArrowLeft size={22} strokeWidth={1.5} aria-hidden />
          </IconButton>
          <p className="type-title truncate text-text-hi">{titleName}</p>
        </div>

        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            <span className="type-meta w-14 shrink-0 tabular-nums text-text-hi">
              {formatClock(position)}
            </span>

            <label className="relative flex-1">
              <span className="sr-only">{t('player.seek')}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={position}
                onChange={(event) => {
                  const el = video.current
                  if (el) el.currentTime = Number(event.target.value)
                }}
                className="h-11 w-full cursor-pointer accent-[var(--color-accent)]"
                style={{ ['--pct' as string]: `${progressPercent}%` }}
              />
            </label>

            <span className="type-meta w-14 shrink-0 text-end tabular-nums text-text-hi">
              {formatClock(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <IconButton label={t('player.playPause')} onClick={togglePlay}>
              {playing ? (
                <Pause size={24} fill="currentColor" strokeWidth={0} aria-hidden />
              ) : (
                <Play size={24} fill="currentColor" strokeWidth={0} aria-hidden />
              )}
            </IconButton>

            <IconButton label={t('player.rewind')} onClick={() => seekBy(-10)}>
              <RotateCcw size={22} strokeWidth={1.5} aria-hidden />
            </IconButton>

            <IconButton label={t('player.forward')} onClick={() => seekBy(10)}>
              <RotateCw size={22} strokeWidth={1.5} aria-hidden />
            </IconButton>

            <IconButton
              label={muted ? t('player.unmute') : t('player.mute')}
              onClick={() => {
                const el = video.current
                if (el) el.muted = !el.muted
              }}
            >
              {muted ? (
                <VolumeX size={22} strokeWidth={1.5} aria-hidden />
              ) : (
                <Volume2 size={22} strokeWidth={1.5} aria-hidden />
              )}
            </IconButton>

            <div className="flex-1" />

            {ticket?.qualityLabel ? (
              <span className="type-label rounded bg-surface-2/80 px-2 py-1 text-text-mid">
                {ticket.qualityLabel}
              </span>
            ) : null}

            <IconButton label={t('player.pip')} onClick={togglePip}>
              <PictureInPicture2 size={22} strokeWidth={1.5} aria-hidden />
            </IconButton>

            <IconButton label={t('player.fullscreen')} onClick={toggleFullscreen}>
              {fullscreen ? (
                <Minimize size={22} strokeWidth={1.5} aria-hidden />
              ) : (
                <Maximize size={22} strokeWidth={1.5} aria-hidden />
              )}
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Every control is ≥44px and labelled (doc 10 §4). */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-text-hi transition-colors hover:bg-white/10"
    >
      {children}
    </button>
  )
}
