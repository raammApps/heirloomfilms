'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconSend } from './icons'

/**
 * N-18 — the partner's end of the handover (doc 15 §2).
 *
 * The API and the couple's claim page have been live and verified for a while; a partner simply
 * had no way to start one. This is only the surface.
 *
 * Two things shape it:
 *
 *  - **The link is shown exactly once.** Only the SHA-256 of the token is stored, so there is no
 *    "show it again" to build. The panel says so before the partner clicks, and keeps the link
 *    on screen with a copy button until they dismiss it.
 *  - **One live handover per catalogue**, enforced server-side. A second attempt is refused by
 *    design, and a partner *will* forget they issued the first — so the outstanding one is shown
 *    with the address it went to, and cancelling is the way to reissue.
 */
export function HandoverPanel({
  catalogueId,
  outstanding,
}: {
  catalogueId: string
  outstanding: { toEmail: string; expiresAtLabel: string } | null
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [claimUrl, setClaimUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const issue = async () => {
    setBusy(true)
    setError(null)

    const response = await fetch(`/api/admin/catalogues/${catalogueId}/transfer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      setError(body?.error?.message ?? 'Could not create the handover link')
      setBusy(false)
      return
    }

    const body = (await response.json()) as { claimUrl: string }
    setClaimUrl(body.claimUrl)
    setEmail('')
    setBusy(false)
    router.refresh()
  }

  const cancel = async () => {
    if (!window.confirm('Cancel the handover? The link already sent stops working immediately.')) {
      return
    }
    setBusy(true)
    await fetch(`/api/admin/catalogues/${catalogueId}/transfer`, { method: 'DELETE' })
    setClaimUrl(null)
    setBusy(false)
    router.refresh()
  }

  const copy = async () => {
    if (!claimUrl) return
    try {
      await navigator.clipboard.writeText(claimUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Permission-gated in some browsers. The link is on screen and selectable regardless.
    }
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
      <h2 className="text-[15px] font-semibold">Hand this over to the couple</h2>
      <p className="mb-3 mt-1 text-[13px] text-[var(--color-l-text-mid)]">
        They set their own password and the wedding moves to them — they can add films, renew and
        buy storage without you. You keep the credit for building it, and lose access to the
        catalogue entirely.
      </p>

      {claimUrl ? (
        <div className="mb-3 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--color-ok)_35%,white)] bg-[color-mix(in_srgb,var(--color-ok)_8%,white)] p-3">
          <p className="text-[13px] font-semibold">Send them this link</p>
          <p className="mb-2 mt-0.5 text-[12px] text-[var(--color-l-text-mid)]">
            Shown once — only a hash of it is stored, so it cannot be shown again. Anyone who
            opens it can claim the wedding, so send it to them and nobody else.
          </p>
          <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-white px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{claimUrl}</span>
            <button
              type="button"
              onClick={() => void copy()}
              aria-live="polite"
              className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-2.5 py-1 text-[12px] font-medium"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setClaimUrl(null)}
            className="mt-2 text-[12px] text-[var(--color-l-text-mid)] underline underline-offset-4"
          >
            I have sent it — hide the link
          </button>
        </div>
      ) : null}

      {outstanding ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-[var(--color-l-surface-2)] px-3 py-2.5">
          <p className="text-[13px]">
            Waiting to be accepted by{' '}
            <strong className="font-semibold">{outstanding.toEmail}</strong>
            <span className="block text-[12px] text-[var(--color-l-text-mid)]">
              Expires {outstanding.expiresAtLabel}. Only one link can be live at a time.
            </span>
          </p>
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={busy}
            className="h-9 shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] bg-white px-3.5 text-[13px] font-semibold disabled:opacity-50"
          >
            Cancel it
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void issue()
          }}
          className="flex flex-wrap items-start gap-2"
        >
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[13px] font-semibold">The couple&rsquo;s email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="aanya@example.com"
              autoCapitalize="none"
              spellCheck={false}
              className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 text-[14px]"
            />
          </label>
          <button
            type="submit"
            disabled={busy || email.trim().length === 0}
            className="mt-[26px] inline-flex h-11 items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold disabled:opacity-50"
          >
            <span aria-hidden>
              <IconSend />
            </span>
            {busy ? 'Creating…' : 'Create handover link'}
          </button>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}

      {/*
        No email is sent. Partner and couple are already talking on WhatsApp, which is where a
        wedding is actually organised in this market — a link the partner forwards arrives, and
        an automated mail lands in spam or waits on SMTP nobody configured (N-17).
      */}
      <p className="mt-2 text-[12px] text-[var(--color-l-text-mid)]">
        We do not email them. You send the link yourself, so you can see what you are sending.
      </p>
    </section>
  )
}
