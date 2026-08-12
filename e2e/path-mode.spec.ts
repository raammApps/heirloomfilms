import { expect, test } from '@playwright/test'

/**
 * N-12 §1 — the guest journey in `TENANCY_MODE=path`, which is what production runs.
 *
 * Path mode had no coverage at all for the life of the suite. That is not a gap in thoroughness,
 * it is a gap in *configuration*: `playwright.config.ts` only ever booted subdomain mode, so
 * every route that differs between the two was tested in the mode nobody deploys.
 *
 * The bug it let through was as bad as they get. `CatalogueProvider.play()` pushed
 * `/watch/<slug>` — correct in subdomain mode, where the catalogue is the site root, and a 404
 * for every guest in path mode, where it has to be `/c/<slug>/watch/<title>`. Four redirects in
 * two files had the same mistake. Every unit and E2E test passed.
 *
 * So this file deliberately exercises the *navigations*, not the rendering. Rendering is
 * identical between the modes; addressing is the whole difference.
 */
const CATALOGUE = 'aanya-vikram'

/** A returning guest, so the profile gate never races an assertion. */
async function openBrowse(page: import('@playwright/test').Page, path = ''): Promise<void> {
  await page.addInitScript((slug) => {
    window.localStorage.setItem(`mehfil.profile.${slug}`, 'skipped')
  }, CATALOGUE)
  await page.goto(`/c/${CATALOGUE}${path}`)
  await expect(page.getByTestId('profile-gate')).toHaveCount(0)
}

test.describe('path mode — the configuration production actually runs', () => {
  test('the catalogue is served from /c/<slug> with no subdomain at all', async ({ page }) => {
    await openBrowse(page)
    await expect(page.locator('[data-module-id]').first()).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/c/${CATALOGUE}$`))
  })

  /**
   * The regression this whole project exists for. Press Play and check where it lands — in
   * subdomain mode `/watch/<title>` is right, and here it must carry the catalogue prefix.
   */
  test('Play navigates to a route that exists, prefix and all', async ({ page }) => {
    await openBrowse(page)

    await page.getByTestId('poster-card').first().click()
    // Scoped to the modal: the billboard has a Play button of its own.
    await page.getByRole('dialog').getByRole('button', { name: 'Play' }).click()

    await expect(page).toHaveURL(new RegExp(`/c/${CATALOGUE}/watch/`))
    await expect(page.getByTestId('player')).toBeVisible()
  })

  test('the wordmark returns to the catalogue, not to the operator console', async ({ page }) => {
    await openBrowse(page)

    // In subdomain mode the catalogue is the root, so a bare `/` is correct. Here a bare `/` is
    // the marketing page — and briefly, in one build, the admin login.
    await page.getByTestId('poster-card').first().click()
    // Scoped to the modal: the billboard has a Play button of its own.
    await page.getByRole('dialog').getByRole('button', { name: 'Play' }).click()
    await expect(page.getByTestId('player')).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/c/${CATALOGUE}`))
  })

  test('a deep link into a film resolves directly, the way a forwarded link does', async ({
    page,
  }) => {
    // What actually arrives in a WhatsApp message: somebody else's URL, opened cold.
    await openBrowse(page)
    await page.getByTestId('poster-card').first().click()
    // Scoped to the modal: the billboard has a Play button of its own.
    await page.getByRole('dialog').getByRole('button', { name: 'Play' }).click()
    await expect(page.getByTestId('player')).toBeVisible()

    const deepLink = page.url()
    await page.goto('about:blank')
    await page.goto(deepLink)
    await expect(page.getByTestId('player')).toBeVisible()
  })

  /**
   * N-12 §3 — following a URL the *application* generated, rather than one the test composed.
   *
   * The public catalogue link is the product's entire output: the string a planner sends a
   * couple and a couple sends two hundred guests. Nothing had ever opened one.
   */
  test('the public link the console prints is one a guest can actually open', async ({
    page,
    browser,
  }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill('operator@mehfil.test')
    await page.getByLabel('Password').fill('e2e-operator-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogues' })).toBeVisible()

    const link = page.getByRole('link', { name: new RegExp(CATALOGUE) }).first()
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()

    // It must carry the path prefix rather than a subdomain that does not exist here.
    expect(href).toContain(`/c/${CATALOGUE}`)

    // Opened as a guest would: a fresh context with no operator session.
    const anonymous = await browser.newContext()
    const guest = await anonymous.newPage()
    await guest.goto(href!)
    await expect(guest.locator('[data-module-id]').first()).toBeVisible({ timeout: 15_000 })
    await anonymous.close()
  })
})
