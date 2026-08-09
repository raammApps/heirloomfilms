import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    /**
     * Playwright owns e2e/. `tests/integration` is opt-in via `pnpm test:integration`: it talks
     * to real Bunny and Supabase, so letting it into the default run would make `pnpm test`
     * depend on someone else's uptime and on a schema being applied.
     */
    exclude: [
      'node_modules',
      '.next',
      'e2e',
      ...(process.env.RUN_INTEGRATION === '1' ? [] : ['tests/integration/**']),
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['lib/**', 'modules/**', 'components/**'],
    },
  },
})
