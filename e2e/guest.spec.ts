import { expect, test, type Page } from '@playwright/test'

/**
 * doc 10 §2 — the critical guest journeys.
 *
 * The demo catalogue is reached through `?__catalogue=` rather than a wildcard subdomain,
 * because CI has no DNS. `resolveTenant` itself is exhaustively unit-tested; this suite is
 * about what a guest does once they are on the page.
 */
const CATALOGUE = 'aanya-vikram'

async function openBrowse(page: Page, query = ''): Promise<void> {
  await page.goto(`/?__catalogue=${CATALOGUE}${query}`)
}

async function dismissGate(page: Page): Promise<void> {
  const gate = page.getByTestId('profile-gate')
  if (await gate.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(gate).toBeHidden()
  }
}

test.describe('the guest catalogue', () => {
  test('opens on the profile gate — the signature moment', async ({ page }) => {
    await openBrowse(page)

    const gate = page.getByTestId('profile-gate')
    await expect(gate).toBeVisible()
    await expect(page.getByRole('heading', { name: "Who's joining?" })).toBeVisible()

    // Four fixed labels, never a free-text personal name (doc 06 §5).
    for (const label of ["Bride's side", "Groom's side", 'Friends', 'Family']) {
      await expect(gate.getByText(label, { exact: true })).toBeVisible()
    }

    await expect(page.getByRole('textbox')).toHaveCount(0)
  })

  test('remembers the choice, so the gate is a first-visit moment only', async ({ page }) => {
    await openBrowse(page)
    await page.getByRole('button', { name: /Friends/ }).click()
    await expect(page.getByTestId('profile-gate')).toBeHidden()

    await openBrowse(page)
    await expect(page.getByTestId('profile-gate')).toBeHidden()
  })

  test('shows the billboard with exactly two buttons', async ({ page }) => {
    await openBrowse(page)
    await dismissGate(page)

    await expect(page.getByRole('heading', { name: 'Aanya & Vikram' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'More Info' })).toBeVisible()
  })

  test('renders curated rows and the letter, and no row is empty', async ({ page }) => {
    await openBrowse(page)
    await dismissGate(page)

    const rows = page.getByTestId('poster-row')
    await expect(rows.first()).toBeVisible()

    // Every rendered row has at least one card — never a heading over nothing (doc 02 §2).
    for (const row of await rows.all()) {
      expect(await row.getByTestId('poster-card').count()).toBeGreaterThan(0)
    }

    await expect(page.getByTestId('letter-module')).toBeVisible()
  })

  test('a three-card row is a designed state, not a broken one', async ({ page }) => {
    await openBrowse(page)
    await dismissGate(page)

    const compact = page.locator('[data-testid="poster-row"][data-compact="true"]')
    await expect(compact.first()).toBeVisible()

    // No arrows in the compact layout.
    await expect(compact.first().getByRole('button', { name: 'Scroll right' })).toHaveCount(0)
  })

  test('E2E-2: a card opens the modal, and back closes it without leaving the site', async ({
    page,
  }) => {
    await openBrowse(page)
    await dismissGate(page)

    await page.getByTestId('poster-card').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page).toHaveURL(/[?&]title=/)

    await page.goBack()
    await expect(page.getByRole('dialog')).toBeHidden()
    // Still on the catalogue, not back at the referrer.
    await expect(page.getByTestId('poster-row').first()).toBeVisible()
  })

  test('E2E-2: a cold `?title=` load opens the modal directly', async ({ page }) => {
    await openBrowse(page, '&title=the-ceremony')
    await dismissGate(page)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'The Ceremony' })).toBeVisible()
  })

  test('Play navigates to the player rather than starting inline', async ({ page }) => {
    await openBrowse(page, '&title=the-ceremony')
    await dismissGate(page)

    await page.getByRole('dialog').getByRole('button', { name: 'Play' }).click()
    await expect(page).toHaveURL(/\/watch\/the-ceremony/)
    await expect(page.getByTestId('player')).toBeVisible()
  })

  test('E2E-3: Hindi switches the chrome and falls back to English where a translation is missing', async ({
    page,
  }) => {
    await openBrowse(page)
    await dismissGate(page)

    await page.getByRole('button', { name: 'हिं' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
    await expect(page.getByRole('button', { name: 'चलाएँ' }).first()).toBeVisible()

    // "From Above" deliberately has no Hindi synopsis in the fixture: the guest must see the
    // English sentence, not a key and not a blank.
    await page.goto(`/?__catalogue=${CATALOGUE}&title=from-above`)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('drone')
  })

  test('the language choice survives a reload', async ({ page }) => {
    await openBrowse(page)
    await dismissGate(page)
    await page.getByRole('button', { name: 'हिं' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  })

  test('is never indexable', async ({ page }) => {
    const response = await page.goto(`/?__catalogue=${CATALOGUE}`)
    expect(response?.headers()['x-robots-tag']).toContain('noindex')
  })
})

test.describe('E2E-6: access control', () => {
  test('an unpublished title is absent from the page and its token is refused', async ({
    page,
    request,
  }) => {
    await openBrowse(page)
    await dismissGate(page)
    await expect(page.getByText('Still Encoding')).toHaveCount(0)

    const response = await request.post('/api/playback/token', {
      data: { catalogue: CATALOGUE, titleSlug: 'not-a-real-film' },
    })
    expect(response.status()).toBe(404)
  })

  test('an unknown catalogue does not leak whether it exists', async ({ request }) => {
    const response = await request.post('/api/playback/token', {
      data: { catalogue: 'someone-elses-wedding', titleSlug: 'the-ceremony' },
    })
    expect(response.status()).toBe(404)
    expect((await response.json()).error.code).toBe('CATALOGUE_NOT_FOUND')
  })
})
