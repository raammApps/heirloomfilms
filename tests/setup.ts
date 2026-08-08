import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

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
