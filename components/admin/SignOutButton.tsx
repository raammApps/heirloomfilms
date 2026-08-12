'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { IconExit } from './icons'

/**
 * There was no way to sign out of the console at all.
 *
 * `router.refresh()` after the redirect matters: the admin pages are server-rendered against the
 * session cookie, and without it a back-button press can paint a cached page belonging to the
 * operator who just left.
 */
export function SignOutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    setBusy(true)
    await fetch('/api/admin/session', { method: 'DELETE' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-input)] px-3 py-2 text-[13px] text-[var(--color-l-text-mid)] transition-colors hover:bg-[var(--color-l-surface-2)] hover:text-[var(--color-l-text-hi)] disabled:opacity-50"
    >
      <span aria-hidden className="shrink-0 opacity-80">
        <IconExit />
      </span>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
