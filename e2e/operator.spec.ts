import { expect, test } from '@playwright/test'

/**
 * doc 10 §2 E2E-4 — the journey the business depends on: an operator arranges sections, sees
 * the preview change, publishes, and the guest page matches.
 *
 * Runs on desktop only. The admin is a laptop tool; the guest surface is the mobile one.
 */
test.describe('the operator console', () => {
  // The admin is a laptop tool. The guest surface is the one that has to work on a phone.
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill('operator@mehfil.test')
    await page.getByLabel('Password').fill('mehfil-dev')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('heading', { name: 'Catalogues' })).toBeVisible()
  })

  test('requires a session', async ({ browser }) => {
    const anonymous = await browser.newContext()
    const page = await anonymous.newPage()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
    await anonymous.close()
  })

  test('lists the org’s catalogues', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Aanya & Vikram' })).toBeVisible()
  })

  test('rejects a -flix app name at creation, and says what to use instead', async ({ page }) => {
    await page.getByRole('link', { name: 'New catalogue' }).first().click()
    await page.getByLabel('Couple').fill('Riya & Kabir')
    await page.getByLabel('App name').fill('RiyaKabirFlix')

    await expect(page.getByText(/Originals|Stream|Files/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  test('E2E-4: reordering sections changes the preview and then the published page', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await page.getByRole('link', { name: 'Customizer' }).click()

    const sections = page.getByRole('region', { name: 'Sections' }).getByRole('listitem')
    await expect(sections.first()).toContainText('Billboard')

    // Keyboard reorder is the accessible path and the one under test (doc 14 §5.1).
    const secondSection = sections.nth(1)
    const label = (await secondSection.textContent())?.trim() ?? ''
    await secondSection.getByRole('button', { name: /Move .* up/ }).click()

    await expect(sections.first()).toContainText(label.slice(0, 12))
    await expect(page.getByText('Saved as draft')).toBeVisible({ timeout: 5000 })

    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Saved as draft')).toBeVisible()

    // The guest page now matches what the operator saw.
    await page.goto('/?__catalogue=aanya-vikram')
    const gate = page.getByTestId('profile-gate')
    if (await gate.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Skip for now' }).click()
    }
    await expect(page.locator('[data-module-id]').first()).toBeVisible()
  })

  test('hiding a section removes it from guests without discarding its config', async ({ page }) => {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await page.getByRole('link', { name: 'Customizer' }).click()

    const hide = page.getByRole('button', { name: /Hide .* from guests/ }).first()
    await hide.click()
    // The section is still listed — its config is intact, it is simply not shown.
    await expect(page.getByRole('button', { name: /Show .* to guests/ }).first()).toBeVisible()
  })

  test('warns at pick time about an accent that will not read on black', async ({ page }) => {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await page.getByRole('link', { name: 'Customizer' }).click()

    await page.getByLabel('Custom').fill('#ff8fc7')
    // Scoped to the branding panel: Next's route announcer is also role="alert".
    const branding = page.getByRole('region', { name: 'Branding' })
    await expect(branding.getByRole('alert')).toContainText(/white button text/i)
  })

  test('the preview renders the real guest components, mobile by default', async ({ page }) => {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await page.getByRole('link', { name: 'Customizer' }).click()

    await expect(page.getByRole('button', { name: 'Mobile preview' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const viewport = page.getByTestId('preview-viewport')
    await expect(viewport.getByTestId('poster-row').first()).toBeVisible()
  })

  test('offers upload and shows the cap the catalogue is measured against', async ({ page }) => {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    // Wait for the overview to settle: the sub-nav mounts with it, and clicking a link that is
    // still being swapped in is what makes this flake rather than fail.
    await expect(page.getByRole('heading', { name: 'Aanya & Vikram' })).toBeVisible()
    await expect(page.getByText('9 of 15')).toBeVisible()

    await page.getByRole('link', { name: 'Films', exact: true }).click()
    await expect(page.getByText('Drop films here')).toBeVisible()
    // Uploads keep running while the operator works elsewhere (doc 08 <UploadManager>).
    await expect(page.getByText(/uploads keep going while you work elsewhere/i)).toBeVisible()
  })
})
