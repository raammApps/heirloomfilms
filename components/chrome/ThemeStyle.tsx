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
export function ThemeStyle({ branding }: { branding: Branding }) {
  const accent = branding.accent && judgeAccent(branding.accent).ok ? branding.accent : null
  if (!accent) return null

  // A style element with a static, validated hex — never interpolated user text.
  const css = `:root{--color-accent:${accent};--color-accent-hi:color-mix(in srgb, ${accent} 78%, white);--color-accent-dim:color-mix(in srgb, ${accent} 66%, black);}`

  return <style data-tenant-theme>{css}</style>
}
