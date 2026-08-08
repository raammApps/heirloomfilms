'use client'

import { useEffect, useState } from 'react'
import { formatRatio, judgeAccent } from '@/lib/contrast'
import type { Catalogue } from '@/lib/schema'

/** Five curated presets plus a custom picker. Most operators will use a preset (doc 14 §5). */
const PRESETS = [
  { value: '#d11a2a', label: 'Marquee red' },
  { value: '#c2410c', label: 'Ember' },
  { value: '#b8860b', label: 'Old gold' },
  { value: '#9d174d', label: 'Deep rose' },
  { value: '#1d6f5c', label: 'Emerald' },
] as const

/**
 * Contrast is validated **at pick time, in the UI** (doc 08 `<ThemePicker>`).
 *
 * A planner will hand over a brand pink that is unreadable on black. They have to be told
 * while they can still change it — not by a build log they never see.
 */
export function ThemePicker({ catalogue }: { catalogue: Catalogue }) {
  const [accent, setAccent] = useState(catalogue.branding.accent ?? '#d11a2a')
  const [presentedBy, setPresentedBy] = useState(catalogue.branding.presentedBy ?? '')
  const [logoUrl, setLogoUrl] = useState(catalogue.branding.logoUrl ?? '')
  const [saved, setSaved] = useState(false)

  const verdict = judgeAccent(accent)

  useEffect(() => {
    setSaved(false)
  }, [accent, presentedBy, logoUrl])

  const save = async () => {
    await fetch(`/api/admin/catalogues/${catalogue.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        branding: { accent, presentedBy: presentedBy || undefined, logoUrl: logoUrl || undefined },
      }),
    })
    setSaved(true)
  }

  return (
    <section
      aria-label="Branding"
      className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4"
    >
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.09em] text-[var(--color-l-text-mid)]">
        Branding
      </h2>

      <fieldset className="mb-3">
        <legend className="mb-2 text-[13px] font-semibold">Accent colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setAccent(preset.value)}
              aria-label={preset.label}
              aria-pressed={accent.toLowerCase() === preset.value}
              className={`h-9 w-9 rounded-full border-2 ${
                accent.toLowerCase() === preset.value
                  ? 'border-[var(--color-l-text-hi)]'
                  : 'border-transparent'
              }`}
              style={{ background: preset.value }}
            />
          ))}

          <label className="ms-2 inline-flex items-center gap-2 text-[13px]">
            Custom
            <input
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-[var(--color-l-line)]"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-input)] bg-[#0c0c0d] p-3">
          <span
            className="inline-flex h-9 items-center rounded-[var(--radius-pill)] px-4 text-[14px] font-semibold text-white"
            style={{ background: accent }}
          >
            Play
          </span>
          <span className="text-[12px]" style={{ color: '#93939a' }}>
            {formatRatio(verdict.onSurface)} on black · {formatRatio(verdict.inkOnAccent)} for
            button text
          </span>
        </div>

        {verdict.warning ? (
          <p role="alert" className="mt-2 text-[13px] text-[#a15c00]">
            {verdict.warning}
          </p>
        ) : null}
      </fieldset>

      <label className="mb-1 block text-[13px] font-semibold" htmlFor="presented-by">
        Presented by
      </label>
      <input
        id="presented-by"
        type="text"
        value={presentedBy}
        placeholder="Your company name"
        onChange={(event) => setPresentedBy(event.target.value)}
        className="mb-3 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 py-2 text-[15px]"
      />

      <label className="mb-1 block text-[13px] font-semibold" htmlFor="logo-url">
        Logo URL
      </label>
      <input
        id="logo-url"
        type="url"
        value={logoUrl}
        placeholder="https://…"
        onChange={(event) => setLogoUrl(event.target.value)}
        className="mb-4 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 py-2 text-[15px]"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          className="h-10 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold"
        >
          Save branding
        </button>
        <span aria-live="polite" className="text-[13px] text-[var(--color-l-text-mid)]">
          {saved ? 'Saved' : ''}
        </span>
      </div>

      <p className="mt-3 text-[12px] text-[var(--color-l-text-mid)]">
        The near-black background is fixed across every catalogue. It is the thing being bought.
      </p>
    </section>
  )
}
