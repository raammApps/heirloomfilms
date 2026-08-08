'use client'

import { useEffect, useRef, useState } from 'react'
import { resolveLocalised } from '@/lib/i18n'
import type { GuestProps } from '../contract'
import type { LetterConfig } from './schema'

/**
 * Paragraphs fade in as they scroll into view — one at a time, slowly. Disabled entirely under
 * reduced motion, where every paragraph is simply present (doc 04 §5, doc 08).
 *
 * The body renders as text nodes, split on blank lines. Never `dangerouslySetInnerHTML`, even
 * here, where an operator might reasonably want italics (doc 08 shared rules).
 */
export default function Guest({ config, ctx }: GuestProps<LetterConfig>) {
  const body = resolveLocalised(config.body, ctx.locale).trim()
  const signature = resolveLocalised(config.signature, ctx.locale).trim()
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  if (paragraphs.length === 0) return null

  return (
    <section
      className="gutter-x py-12 md:py-20"
      data-testid="letter-module"
      aria-labelledby={`letter-${ctx.instanceId}`}
    >
      <div
        className={
          config.theme === 'framed'
            ? 'edge mx-auto max-w-[70ch] rounded-[var(--radius-modal)] bg-surface-1 px-6 py-10 md:px-12 md:py-14'
            : 'mx-auto max-w-[70ch]'
        }
      >
        {ctx.heading ? (
          <h2 id={`letter-${ctx.instanceId}`} className="type-display-lg mb-8">
            {ctx.heading}
          </h2>
        ) : (
          <span id={`letter-${ctx.instanceId}`} className="sr-only">
            {ctx.t('letter.signature')}
          </span>
        )}

        {paragraphs.map((paragraph, index) => (
          <Paragraph key={index} text={paragraph} delayMs={index * 60} />
        ))}

        {signature ? (
          <p className="type-display-lg mt-10 text-text-hi" style={{ fontSize: 'var(--text-title)' }}>
            {signature}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function Paragraph({ text, delayMs }: { text: string; delayMs: number }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <p
      ref={ref}
      className="type-body-lg mb-6 whitespace-pre-line text-text-mid transition-all duration-[600ms] ease-[var(--ease-in-modal)]"
      style={{
        transitionDelay: `${delayMs}ms`,
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'none' : 'translateY(12px)',
      }}
    >
      {text}
    </p>
  )
}
