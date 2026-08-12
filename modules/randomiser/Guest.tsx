'use client'

import { useState } from 'react'
import { resolveLocalised } from '@/lib/i18n'
import type { GuestProps } from '../contract'
import type { RandomiserConfig } from './schema'

/**
 * Shuffle one option out of a list, with a short reveal (doc 14 §3, f21).
 *
 * **Nothing is persisted, deliberately.** The point is to be re-rolled; a remembered answer turns
 * a game into an obligation.
 *
 * The reveal respects `prefers-reduced-motion` by simply not animating — the result appears
 * immediately, which is the same feature without the vestibular cost.
 */
export default function Guest({ config, ctx }: GuestProps<RandomiserConfig>) {
  const options = config.options.filter(
    (option) => resolveLocalised(option.text, ctx.locale).trim().length > 0,
  )

  const [picked, setPicked] = useState<string | null>(null)
  const [rolling, setRolling] = useState(false)

  if (options.length === 0) return null

  const pick = () => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Never hand back the same answer twice in a row — with four options, chance alone repeats
    // often enough to read as broken.
    const candidates = options.length > 1 ? options.filter((o) => o.id !== picked) : options
    const next = candidates[Math.floor(Math.random() * candidates.length)]!

    if (reduced) {
      setPicked(next.id)
      return
    }

    setRolling(true)
    window.setTimeout(() => {
      setPicked(next.id)
      setRolling(false)
    }, 420)
  }

  const chosen = options.find((option) => option.id === picked) ?? null

  return (
    <section
      className="gutter-x py-12 md:py-20"
      data-testid="randomiser-module"
      aria-labelledby={`randomiser-${ctx.instanceId}`}
    >
      <div className="mx-auto max-w-[60ch] text-center">
        <h2 id={`randomiser-${ctx.instanceId}`} className="type-display-lg mb-6">
          {ctx.heading}
        </h2>

        <p
          // Announced when it settles, not while it flickers.
          aria-live="polite"
          className={`edge mx-auto mb-6 flex min-h-[104px] items-center justify-center rounded-[var(--radius-modal)] bg-surface-1 px-6 py-8 text-[19px] text-text-hi transition-opacity duration-200 ${
            rolling ? 'opacity-40' : 'opacity-100'
          }`}
        >
          {chosen
            ? resolveLocalised(chosen.text, ctx.locale)
            : ctx.t('randomiser.waiting', { count: options.length })}
        </p>

        <button
          type="button"
          onClick={pick}
          disabled={rolling}
          className="inline-flex h-12 items-center rounded-[var(--radius-pill)] bg-accent px-6 font-semibold text-accent-ink transition-colors hover:bg-accent-hi disabled:opacity-70"
        >
          {picked ? ctx.t('randomiser.again') : resolveLocalised(config.cta, ctx.locale)}
        </button>
      </div>
    </section>
  )
}
