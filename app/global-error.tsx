'use client'

import { useEffect } from 'react'

/**
 * The last line of defence: a crash in the root layout itself.
 *
 * Without this a guest sees Next's unstyled default error page, on their own wedding, and we
 * never hear about it. The report goes through the same endpoint as playback telemetry so
 * there is one place to look.
 *
 * Deliberately plain: this renders when the app is already broken, so it must depend on
 * nothing — no theme provider, no i18n dictionary, no fonts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    const body = JSON.stringify({
      kind: 'client_crash',
      message: error.message?.slice(0, 300),
      digest: error.digest,
      path: window.location.pathname,
    })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }))
    } else {
      void fetch('/api/client-error', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          background: '#0c0c0d',
          color: '#f5f5f6',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          margin: 0,
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: '#c4c4c8', lineHeight: 1.6, marginBottom: 24 }}>
            Nothing has been lost. Try again, and if it keeps happening the person who sent you
            this link can get in touch with us.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#d11a2a',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
