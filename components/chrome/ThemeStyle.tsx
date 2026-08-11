import { judgeAccent } from '@/lib/contrast'
import type { Branding } from '@/lib/schema'

/**
 * Per-tenant theming (CLAUDE.md constraint 4 — every colour comes from tenant config).
 *
 * Only the accent varies. The near-black surface is the product identity and is deliberately
 * not customer-configurable: letting a planner ship a pastel-yellow streaming site destroys
 * the thing they are buying (doc 14 §5).
 *
 * An accent that fails contrast is dropped here rather than rendered — the customizer warns
 * the operator at pick time, and this is the backstop for anything that got saved before that
 * check existed.
 */
/** Only faces the app actually loads. Anything else is ignored rather than trusted into CSS. */
const FONT_STACKS: Record<string, string> = {
  archivo: "var(--font-archivo), 'Archivo', Impact, sans-serif",
  mukta: "var(--font-mukta), 'Mukta', 'Noto Sans Devanagari', sans-serif",
  inter: "var(--font-inter), 'Inter', system-ui, sans-serif",
}

export function ThemeStyle({
  branding,
  scope = ':root',
}: {
  branding: Branding
  /**
   * Where the variables land. `:root` on a guest page; the preview passes its own container so
   * a tenant's accent cannot repaint the admin chrome around it.
   */
  scope?: string
}) {
  const accent = branding.accent && judgeAccent(branding.accent).ok ? branding.accent : null

  // Looked up rather than interpolated: `displayFont` comes from the database, and a font-family
  // is a place CSS would happily accept whatever it was handed.
  const display = branding.displayFont ? FONT_STACKS[branding.displayFont] : undefined

  if (!accent && !display) return null

  // A style element built only from validated hex and a stack chosen from the map above —
  // never interpolated user text.
  const rules = [
    accent &&
      `--color-accent:${accent};--color-accent-hi:color-mix(in srgb, ${accent} 78%, white);--color-accent-dim:color-mix(in srgb, ${accent} 66%, black);`,
    display && `--font-display:${display};`,
  ]
    .filter(Boolean)
    .join('')

  return <style data-tenant-theme>{`${scope}{${rules}}`}</style>
}
