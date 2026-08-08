'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Catalogue, Privacy } from '@/lib/schema'

/** AE-10 — unlisted by default, optional passcode (doc 01 §5.2, doc 05 §4). */
export function CatalogueSettings({ catalogue }: { catalogue: Catalogue }) {
  const router = useRouter()
  const [privacy, setPrivacy] = useState<Privacy>(catalogue.privacy)
  const [passcode, setPasscode] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const save = async () => {
    const response = await fetch(`/api/admin/catalogues/${catalogue.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        privacy,
        // Only send a passcode when one was typed; an empty box must not wipe a working one.
        ...(privacy === 'passcode' && passcode ? { passcode } : {}),
        ...(privacy === 'unlisted' ? { passcode: null } : {}),
      }),
    })
    setStatus(response.ok ? 'Saved' : 'Could not save')
    setPasscode('')
    router.refresh()
  }

  const unpublish = async () => {
    if (!window.confirm('Take this catalogue offline? Guests will see "not yet available".')) return
    await fetch(`/api/admin/catalogues/${catalogue.id}/publish`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="max-w-[560px]">
      <section className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
        <h2 className="mb-3 text-[15px] font-semibold">Who can watch</h2>

        <label className="mb-3 flex items-start gap-3">
          <input
            type="radio"
            name="privacy"
            checked={privacy === 'unlisted'}
            onChange={() => setPrivacy('unlisted')}
            className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-[14px]">
            Unlisted link
            <span className="block text-[13px] text-[var(--color-l-text-mid)]">
              Anyone with the link. Never indexed, never listed anywhere. The default.
            </span>
          </span>
        </label>

        <label className="mb-3 flex items-start gap-3">
          <input
            type="radio"
            name="privacy"
            checked={privacy === 'passcode'}
            onChange={() => setPrivacy('passcode')}
            className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span className="text-[14px]">
            Passcode
            <span className="block text-[13px] text-[var(--color-l-text-mid)]">
              Guests type a code from the invitation. Five wrong tries locks the address out for
              fifteen minutes.
            </span>
          </span>
        </label>

        {privacy === 'passcode' ? (
          <label className="mb-3 block">
            <span className="mb-1 block text-[13px] font-semibold">
              {catalogue.passcodeHash ? 'New passcode (leave blank to keep the current one)' : 'Passcode'}
            </span>
            <input
              type="text"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="off"
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] px-3 py-2 text-[15px]"
            />
          </label>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            className="h-10 rounded-[var(--radius-pill)] bg-accent px-4 text-[14px] font-semibold text-accent-ink"
          >
            Save
          </button>
          <span aria-live="polite" className="text-[13px] text-[var(--color-l-text-mid)]">
            {status}
          </span>
        </div>
      </section>

      {catalogue.status === 'published' ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
          <h2 className="mb-1 text-[15px] font-semibold">Take offline</h2>
          <p className="mb-3 text-[13px] text-[var(--color-l-text-mid)]">
            Nothing is deleted. Guests see a neutral &ldquo;not yet available&rdquo; page and the
            films stay exactly where they are.
          </p>
          <button
            type="button"
            onClick={() => void unpublish()}
            className="h-10 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold"
          >
            Unpublish
          </button>
        </section>
      ) : null}
    </div>
  )
}
