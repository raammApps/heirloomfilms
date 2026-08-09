import { existsSync, readFileSync } from 'node:fs'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Load `.env.local` if it exists, so `tests/integration` picks up real credentials without
 * any extra ceremony. Absent — which is the case in CI — the integration suites skip.
 */
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2]!.trim().replace(/^["']|["']$/g, '')
    if (value) process.env[match[1]!] ??= value
  }
}

process.env.SESSION_SECRET ??= 'test-session-secret-0123456789abcdefghijklmnop'
process.env.ROOT_DOMAIN ??= 'mehfil.app'
process.env.DATA_DRIVER ??= 'memory'
process.env.VIDEO_DRIVER ??= 'fake'

// jsdom implements neither of these and several components probe them.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: readonly number[] = []
  } as unknown as typeof IntersectionObserver
}

Element.prototype.scrollTo ??= function scrollTo() {}
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

afterEach(() => cleanup())
