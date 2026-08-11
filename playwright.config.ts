import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

/**
 * Playwright drives the six critical journeys from doc 10 §2.
 *
 * Mobile first, because ~90% of traffic is a mid-range Android arriving from a WhatsApp link.
 * The desktop project exists to catch the enhancement layer, not the other way round.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'mobile',
      // Doc 04 §1 and CLAUDE.md constraint 2: design and test at 360×800 first.
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command: 'pnpm build && pnpm start',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    // A cold `next build` on a loaded machine exceeds three minutes. The suite itself runs in
    // well under a minute, so a generous boot budget costs nothing and removes a CI failure
    // that says "timed out" when nothing is actually wrong.
    timeout: 420_000,
    env: {
      PORT: String(PORT),
      NODE_ENV: 'production',
      DATA_DRIVER: 'memory',
      // Explicit opt-in: a production build normally refuses an ephemeral store.
      ALLOW_EPHEMERAL_DATA: '1',
      VIDEO_DRIVER: 'fake',
      ROOT_DOMAIN: 'mehfil.localhost:3000',
      SESSION_SECRET: 'e2e-session-secret-0123456789abcdefghijklmnop',
      DEV_OPERATOR_EMAIL: 'operator@mehfil.test',
      // Not the repo's published default: the production guard refuses that, and this suite
      // deliberately boots with NODE_ENV=production. Fixed rather than random so specs can
      // sign in without threading a secret through them.
      DEV_OPERATOR_PASSWORD: 'e2e-operator-password',
    },
  },
})
