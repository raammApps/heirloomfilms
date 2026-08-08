// `server-only` throws when a bundler resolves its browser entry. Vitest runs server modules
// in a jsdom environment, so the guard is stubbed here — the real guard still applies to the
// Next.js client bundle, which is where it matters.
export {}
