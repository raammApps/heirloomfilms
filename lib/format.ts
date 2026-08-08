import { resolveLocalised } from './i18n'
import type { Locale, LocalisedString } from './schema'

/** `1284` → `21:24`; `428` → `7:08`. Used in the player, on cards, and in share text. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Card badge duration — minutes only, because a badge reading `4:07` implies precision. */
export function formatDurationBadge(totalSeconds: number | null): string | null {
  if (!totalSeconds || totalSeconds <= 0) return null
  const minutes = Math.max(1, Math.round(totalSeconds / 60))
  return `${minutes}m`
}

export function formatWeddingDate(iso: string, locale: Locale): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

/** A URL-safe slug from a display name, used for title slugs and slug suggestions. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** "Aanya & Vikram" → "aanya-vikram". Falls back to a stable suffix when nothing survives. */
export function suggestSlug(coupleName: LocalisedString | string): string {
  const base = slugify(resolveLocalised(coupleName, 'en'))
  return base.length >= 3 ? base : `wedding-${Math.random().toString(36).slice(2, 6)}`
}

/** Strip an extension and de-noise a videographer's filename into a first-draft title. */
export function titleFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[a-z0-9]+$/i, '')
  return (
    withoutExtension
      .replace(/[_\-.]+/g, ' ')
      // Drop the delivery cruft every studio adds: v3, final, FINAL2, 4k, h264, color.
      .replace(/\b(final|fin|v\d+|ver\d+|copy|export|render|4k|1080p?|720p?|h26[45]|prores|color|colour|graded|master)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      // Studios deliver WED_FINAL_V3.mp4 as often as they deliver sangeet.mp4, so shouting
      // filenames are normalised rather than passed through to a guest-visible title.
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled'
  )
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}
