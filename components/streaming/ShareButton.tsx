'use client'

import { Check, Copy, Share2 } from 'lucide-react'
import { useState } from 'react'
import type { Translator } from '@/lib/i18n'

/**
 * VE-6 — the flaunt mechanic, and the reason it is P0 rather than polish (doc 01 §5.1).
 *
 * `navigator.share` where available (which on a phone is the WhatsApp share sheet, i.e. the
 * actual distribution channel), falling back to copy-link plus a prefilled WhatsApp text.
 */
type Props = {
  url: string
  text: string
  t: Translator
  compact?: boolean
}

export function ShareButton({ url, text, t, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const share = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, text, url })
        return
      } catch {
        // A dismissed share sheet is not an error; fall through to the manual affordances.
      }
    }
    setExpanded(true)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={share}
        className={
          compact
            ? 'inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] px-3 text-text-hi hover:bg-surface-3'
            : 'edge inline-flex h-12 items-center gap-2 rounded-[var(--radius-pill)] px-5 font-semibold text-text-hi hover:bg-surface-3 md:h-11'
        }
      >
        <Share2 size={20} strokeWidth={1.5} aria-hidden />
        {t('title.share')}
      </button>

      {expanded ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="edge inline-flex h-11 items-center rounded-[var(--radius-pill)] px-4 text-text-hi hover:bg-surface-3"
          >
            {t('title.shareWhatsapp')}
          </a>
          <button
            type="button"
            onClick={copy}
            className="edge inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] px-4 text-text-hi hover:bg-surface-3"
          >
            {copied ? <Check size={18} aria-hidden /> : <Copy size={18} strokeWidth={1.5} aria-hidden />}
            {copied ? t('title.shareCopied') : t('title.shareCopy')}
          </button>
        </div>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {copied ? t('title.shareCopied') : ''}
      </span>
    </div>
  )
}
