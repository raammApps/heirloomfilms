'use client'

import { useState } from 'react'

/**
 * The address an operator actually came here for.
 *
 * This is the one string the whole product exists to produce — the link a planner sends to a
 * couple, and a couple to two hundred guests. It was 12px grey truncated text, neither
 * clickable nor selectable in one gesture, which made the primary output of the tool its least
 * visible element.
 *
 * Copy rather than "select and drag": this gets pasted into WhatsApp on a phone, where dragging
 * a text selection across a truncated string is close to impossible.
 */
export function PublicLink({
  url,
  status,
  compact = false,
}: {
  url: string
  /** A draft address resolves, but shows guests the not-published screen — worth saying. */
  status?: 'draft' | 'published' | 'archived'
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is permission-gated and refuses outside a user gesture in some browsers.
      // The link is still visible and selectable, so this fails quietly rather than alarming.
    }
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-[var(--color-l-surface-2)] ${
        compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
      }`}
    >
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`min-w-0 flex-1 truncate font-mono text-[var(--color-l-text-hi)] underline-offset-4 hover:underline ${
          compact ? 'text-[12px]' : 'text-[13px]'
        }`}
        // The full address, for the truncated case and for a screen reader.
        title={url}
      >
        {url.replace(/^https?:\/\//, '')}
      </a>

      {status === 'draft' ? (
        <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-l-surface-1)] px-2 py-0.5 text-[11px] text-[var(--color-l-text-mid)]">
          not live yet
        </span>
      ) : null}

      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] bg-white px-2.5 py-1 text-[12px] font-medium"
        aria-live="polite"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
