'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * A couple accepting their wedding.
 *
 * Says what is being handed over, and by whom, **before** asking for a password. This link
 * arrives forwarded through WhatsApp with no sender anyone can verify, so a page that opened
 * with a password field and no context would be indistinguishable from a phishing attempt — and
 * teaching couples to type passwords into forwarded links is a bad habit to create.
 */
export function ClaimForm({
  token,
  coupleName,
  partnerName,
  email,
}: {
  token: string
  coupleName: string
  partnerName: string
  email: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        coupleName: form.get('coupleName'),
        password: form.get('password'),
      }),
    })

    const body = (await response.json().catch(() => null)) as {
      catalogue?: { slug: string }
      error?: { message?: string }
    } | null

    setBusy(false)
    if (!response.ok || !body?.catalogue) {
      setError(body?.error?.message ?? 'Could not complete the handover')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[460px] py-16">
        <h1 className="text-[24px] font-bold">It is yours</h1>
        <p className="mt-2 text-[15px] text-[var(--color-l-text-mid)]">
          {coupleName} is now under your control. You can add films and photographs, change how it
          looks, and keep it going for as long as you like.
        </p>
        <button
          type="button"
          onClick={() => router.push('/admin/login')}
          className="mt-6 h-11 rounded-[var(--radius-pill)] bg-accent px-5 text-[14px] font-semibold text-accent-ink"
        >
          Sign in with {email}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[460px] py-12">
      <p className="text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--color-l-text-mid)]">
        {partnerName} is handing over
      </p>
      <h1 className="mt-1 text-[26px] font-bold">{coupleName}</h1>
      <p className="mb-6 mt-2 text-[15px] text-[var(--color-l-text-mid)]">
        Set a password and it becomes yours: your films, your photographs, yours to keep going.
        {' '}
        {partnerName} will no longer be able to change it.
      </p>

      {error ? (
        <p role="alert" className="mb-4 rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--color-error)_10%,white)] px-3 py-2 text-[14px]">
          {error}
        </p>
      ) : null}

      <label className="mb-4 block">
        <span className="mb-1 block text-[13px] font-semibold">Your account</span>
        <input
          value={email}
          readOnly
          // Fixed, because the link was issued to this address. Letting it be edited would make
          // a forwarded link a way to claim somebody else's wedding under your own address.
          className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-[var(--color-l-surface-2)] px-3 text-[15px] text-[var(--color-l-text-mid)]"
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-[13px] font-semibold">Name this belongs to</span>
        <input
          name="coupleName"
          defaultValue={coupleName}
          required
          maxLength={80}
          className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 text-[15px]"
        />
      </label>

      <label className="mb-5 block">
        <span className="mb-1 block text-[13px] font-semibold">Choose a password</span>
        <input
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 text-[15px]"
        />
        <span className="mt-1 block text-[12px] text-[var(--color-l-text-mid)]">
          At least 12 characters.
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-[var(--radius-pill)] bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-60"
      >
        {busy ? 'Setting up…' : 'Take ownership'}
      </button>
    </form>
  )
}
