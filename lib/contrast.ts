/**
 * WCAG 2.1 relative luminance and contrast, used in three places for one reason:
 * the same computation must run in CI (`scripts/check-contrast.ts`), in the customizer's
 * accent picker at pick time, and in tests. A planner's brand pink has to be rejected in the
 * UI while they can still change it — not by a build log they never see (doc 04 §2).
 */

export type Rgb = { r: number; g: number; b: number }

export function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim())
  if (!match) return null
  let body = match[1]!
  if (body.length === 3) body = body.split('').map((c) => c + c).join('')
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  }
}

function channelLuminance(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(colour: Rgb): number {
  return (
    0.2126 * channelLuminance(colour.r) +
    0.7152 * channelLuminance(colour.g) +
    0.0722 * channelLuminance(colour.b)
  )
}

/** Contrast ratio between two hex colours, 1–21. Throws on unparseable input. */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  if (!fg || !bg) throw new Error(`Unparseable colour: ${!fg ? foreground : background}`)
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (light + 0.05) / (dark + 0.05)
}

export const SURFACE_0 = '#0c0c0d'
export const ACCENT_INK = '#ffffff'

/** Minimums from doc 04 §2. UI/large text is the 3:1 bucket; body copy is 4.5:1. */
export const MIN_UI_CONTRAST = 3
export const MIN_TEXT_CONTRAST = 4.5

export type AccentVerdict = {
  /** Accent against the near-black page surface — governs buttons, icons, large text. */
  onSurface: number
  /** White text on the accent fill — governs the primary button's label. */
  inkOnAccent: number
  ok: boolean
  /** Present when `ok` is false. Written for an operator, not a developer. */
  warning?: string
}

export function judgeAccent(accent: string, surface: string = SURFACE_0): AccentVerdict {
  const onSurface = contrastRatio(accent, surface)
  const inkOnAccent = contrastRatio(ACCENT_INK, accent)

  if (onSurface < MIN_UI_CONTRAST) {
    return {
      onSurface,
      inkOnAccent,
      ok: false,
      warning:
        'This colour is too dark against the black background — buttons and icons will be hard to see. Try a brighter shade.',
    }
  }

  if (inkOnAccent < MIN_TEXT_CONTRAST) {
    return {
      onSurface,
      inkOnAccent,
      ok: false,
      warning:
        'White button text will be hard to read on this colour. Try a deeper shade of the same hue.',
    }
  }

  return { onSurface, inkOnAccent, ok: true }
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`
}
