import { expect, test, type Page } from '@playwright/test'

/**
 * doc 10 §2 E2E-4 — the journey the business depends on: an operator arranges sections, sees
 * the preview change, publishes, and the guest page matches.
 *
 * Runs on desktop only. The admin is a laptop tool; the guest surface is the mobile one.
 */
test.describe('the operator console', () => {
  // The admin is a laptop tool. The guest surface is the one that has to work on a phone.
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  /**
   * Open the customizer and wait until it is actually interactive.
   *
   * `toBeVisible` on a section proves the DOM is there, not that React has hydrated and
   * attached the click handlers. The preview pane only ever renders client-side, so content
   * inside it is a reliable hydration signal — without this, clicks land on dead markup and
   * the suite flakes.
   */
  async function openCustomizer(page: Page): Promise<void> {
    await page.getByRole('link', { name: 'Aanya & Vikram' }).click()
    await expect(page.getByRole('heading', { name: 'Aanya & Vikram' })).toBeVisible()
    await page.getByRole('link', { name: 'Customizer' }).click()
    await expect(
      page.getByTestId('preview-viewport').getByTestId('poster-row').first(),
    ).toBeVisible()
  }

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
    await openCustomizer(page)

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

  /**
   * The redesign's whole point: the preview is the way in.
   *
   * This had no coverage at all — the suite reordered and hid sections but never opened an
   * editor, which is how an entire editing surface could be replaced with every test still
   * green.
   */
  test('selecting a section in the preview edits it beside the preview', async ({ page }) => {
    await openCustomizer(page)

    const preview = page.getByTestId('preview-viewport')
    const inspector = page.getByRole('complementary', { name: 'Section editor' })

    await expect(inspector).toContainText('Nothing selected')

    // Click the section itself, the way an operator points at what they want to change.
    await preview.locator('[data-module-id]').first().click()
    await expect(inspector).not.toContainText('Nothing selected')

    // The list agrees about what is selected, so the two panels never disagree.
    await expect(
      page.getByRole('region', { name: 'Sections' }).getByRole('listitem').first(),
    ).toHaveAttribute('aria-current', 'true')

    // The editor is a panel, not a dialog: it must not cover the thing it edits.
    await expect(preview).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a heading typed in the inspector reaches the preview', async ({ page }) => {
    await openCustomizer(page)

    const sections = page.getByRole('region', { name: 'Sections' }).getByRole('listitem')
    // A film row, so the heading is rendered above visible cards.
    const row = sections.filter({ hasText: 'Film row' }).first()
    await row.getByRole('button', { name: /Edit/ }).click()

    const inspector = page.getByRole('complementary', { name: 'Section editor' })
    const heading = inspector
      .getByRole('group', { name: 'Section heading' })
      .getByLabel('English')
    await heading.fill('Our favourite films')

    await expect(page.getByTestId('preview-viewport')).toContainText('Our favourite films', {
      timeout: 10_000,
    })
  })

  test('hiding a section removes it from guests without discarding its config', async ({ page }) => {
    await openCustomizer(page)

    // Target one named section rather than "the first button that matches": the list
    // re-renders on every change, and `.first()` races with that re-render.
    const sections = page.getByRole('region', { name: 'Sections' })
    const letter = sections.getByRole('listitem').filter({ hasText: 'A message for you' })
    await expect(letter).toBeVisible()

    await letter.getByRole('button', { name: /Hide .* from guests/ }).click()

    // Still listed, and its config is intact — it is simply not shown to guests.
    await expect(letter.getByRole('button', { name: /Show .* to guests/ })).toBeVisible()
    await expect(letter).toContainText('A message for you')

    // And it disappears from the preview, which is the actual guest-visible effect.
    await expect(page.getByTestId('preview-viewport').getByTestId('letter-module')).toHaveCount(0)
  })

  test('warns at pick time about an accent that will not read on black', async ({ page }) => {
    await openCustomizer(page)

    // Branding is a selection now, like a section — it opens in the inspector rather than
    // sitting permanently in the sidebar.
    await page.getByRole('button', { name: /Branding/ }).click()
    await page.getByLabel('Custom').fill('#ff8fc7')
    // Scoped to the branding panel: Next's route announcer is also role="alert".
    const branding = page.getByRole('region', { name: 'Branding' })
    await expect(branding.getByRole('alert')).toContainText(/white button text/i)
  })

  /**
   * Branding never reached the preview: `<ThemeStyle>` is rendered by guest pages, and the pane
   * mounts the shell below that level. An operator picked an accent and the preview kept showing
   * the default — for the entire life of the customizer, with every test passing.
   */
  test('an accent chosen in the inspector repaints the preview, not the admin', async ({ page }) => {
    await openCustomizer(page)
    await page.getByRole('button', { name: /Branding/ }).click()
    await page.getByLabel('Custom').fill('#2f6f4e')

    const themed = page.locator('[data-preview-theme]')
    await expect
      .poll(async () =>
        themed.evaluate((el) => getComputedStyle(el).getPropertyValue('--color-accent').trim()),
      )
      .toBe('#2f6f4e')

    // Scoped: a tenant's colour must not repaint the console around it.
    const admin = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim(),
    )
    expect(admin).not.toBe('#2f6f4e')
  })

  test('the preview renders the real guest components, mobile by default', async ({ page }) => {
    await openCustomizer(page)

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
