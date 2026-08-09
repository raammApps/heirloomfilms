import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { OG_MAX_BYTES, OG_SIZE } from '../lib/budgets'
import { openAsReturningGuest, signIn, DEMO_CATALOGUE } from './helpers'

/**
 * Budget and accessibility gates.
 *
 * Both are named as pass/fail criteria in the specs and neither had teeth until now: doc 10 §1
 * test 11 (the OG image is ≤300KB) and doc 10 §4 (zero axe violations on every page state).
 */

test.describe('doc 10 §1 test 11 — the WhatsApp preview stays inside its budget', () => {
  test(`the OG image is at most ${OG_MAX_BYTES / 1024}KB and the right dimensions`, async ({
    page,
  }) => {
    const response = await page.request.get(`/api/og?catalogue=${DEMO_CATALOGUE}`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')

    const body = await response.body()
    // ~90% of guests arrive from a WhatsApp link; an oversized card is a grey box on a slow
    // connection, which costs more opens than any amount of on-page polish saves.
    expect(
      body.byteLength,
      `OG image is ${(body.byteLength / 1024).toFixed(0)}KB, budget is ${OG_MAX_BYTES / 1024}KB`,
    ).toBeLessThanOrEqual(OG_MAX_BYTES)

    // PNG header carries the dimensions at a fixed offset — no decoder needed.
    expect(body.subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(body.readUInt32BE(16)).toBe(OG_SIZE.width)
    expect(body.readUInt32BE(20)).toBe(OG_SIZE.height)
  })

  test('the browse page points at an OG image and declares no-index', async ({ page }) => {
    await openAsReturningGuest(page)

    const ogImage = page.locator('meta[property="og:image"]')
    await expect(ogImage).toHaveCount(1)
    expect(await ogImage.getAttribute('content')).toContain('/api/og')

    // doc 01 US-5: never findable by anyone without the link.
    const robots = page.locator('meta[name="robots"]')
    expect((await robots.getAttribute('content')) ?? '').toMatch(/noindex/)
  })

  test('an unknown catalogue does not render an OG card for a wedding that is not there', async ({
    page,
  }) => {
    const response = await page.request.get('/api/og?catalogue=not-a-wedding')
    expect(response.status()).toBe(404)
  })
})

/**
 * doc 10 §4 — WCAG 2.1 AA, "zero violations gate".
 *
 * `color-contrast` is included deliberately: the palette is the thing most likely to regress,
 * and `pnpm check:contrast` only covers the tokens, not what they compose into on a page.
 */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function audit(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
}

function describeViolations(results: Awaited<ReturnType<typeof audit>>): string {
  return results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
    .join('\n  ')
}

test.describe('doc 10 §4 — accessibility, zero violations', () => {
  test('the profile gate', async ({ page }) => {
    await page.goto(`/?__catalogue=${DEMO_CATALOGUE}`)
    await expect(page.getByTestId('profile-gate')).toBeVisible()

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the browse page', async ({ page }) => {
    await openAsReturningGuest(page)
    await expect(page.getByTestId('poster-row').first()).toBeVisible()

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the title modal', async ({ page }) => {
    await openAsReturningGuest(page, DEMO_CATALOGUE, '&title=the-ceremony')
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the browse page in Hindi', async ({ page }) => {
    await openAsReturningGuest(page)
    await page.getByRole('button', { name: 'हिं' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi')

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the player', async ({ page }) => {
    await openAsReturningGuest(page)
    await page.goto('/watch/the-ceremony')
    await expect(page.getByTestId('player')).toBeVisible()

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the renewal screen and the passcode gate are reachable states too', async ({ page }) => {
    await page.goto(`/?__catalogue=${DEMO_CATALOGUE}`)
    await page.goto('/renew')
    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the admin catalogue list', async ({ page }) => {
    test.skip(Boolean(test.info().project.use.isMobile), 'the admin is a desktop tool')
    await signIn(page)

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })

  test('the customizer', async ({ page }) => {
    test.skip(Boolean(test.info().project.use.isMobile), 'the admin is a desktop tool')
    await signIn(page)
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await page.getByRole('link', { name: 'Customizer' }).click()
    await expect(page.getByTestId('preview-viewport').getByTestId('poster-row').first()).toBeVisible()

    const results = await audit(page)
    expect(describeViolations(results)).toBe('')
  })
})
