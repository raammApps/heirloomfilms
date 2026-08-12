import { expect, test } from '@playwright/test'
import { createCatalogue, signIn } from './helpers'

/**
 * The console's own surfaces: the list a partner works from, the create flow, and the handover.
 *
 * `operator.spec.ts` covers the customizer. This covers everything around it — the parts that
 * were rebuilt, and the parts that had no coverage at all, which is how the customizer once got
 * replaced wholesale with a green suite.
 */
test.describe('the admin console', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the list can be searched and filtered down to one wedding', async ({ page }) => {
    const created = await createCatalogue(page, 'search')
    await page.goto('/admin')

    // Scoped to the grid: the rail's own nav is a list too, and every test in this file
    // creates a catalogue with the same couple name, so the slug is the only unique handle.
    const cards = page.getByRole('list', { name: 'Catalogues' }).getByRole('listitem')
    await expect(cards.filter({ hasText: 'Aanya & Vikram' })).toBeVisible()
    await expect(cards.filter({ hasText: created.slug })).toBeVisible()

    await page.getByLabel('Search catalogues').fill(created.slug)
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText('E2E & Fixture')

    // A filter that matches nothing must offer a way back out of itself.
    await page.getByLabel('Search catalogues').fill('no-such-wedding')
    await expect(cards).toHaveCount(0)
    await page.getByRole('button', { name: /clear the filters/i }).click()
    await expect(cards.filter({ hasText: 'Aanya & Vikram' })).toBeVisible()
  })

  /**
   * The checklist is the only place that distinguishes "a catalogue exists" from "a guest can
   * watch something", and those looked identical everywhere else in the console.
   */
  test('a fresh catalogue is honest about not being ready', async ({ page }) => {
    const created = await createCatalogue(page, 'checklist')
    await page.goto(`/admin/c/${created.id}`)

    const checklist = page.getByRole('complementary', { name: 'Setup' })
    await expect(checklist).toContainText('Films uploaded')
    await expect(checklist).toContainText('Published')
    // The detail line only appears while an item is outstanding, so its presence is the
    // assertion that the item is genuinely unticked — not a percentage that moves whenever the
    // creation route picks a default.
    await expect(checklist).toContainText('Drop the films in')
    await expect(checklist).toContainText('the link resolves but shows guests')

    await expect(page.getByText('No films yet')).toBeVisible()
  })

  test('the wizard shows the address it is about to create', async ({ page }) => {
    await page.getByRole('link', { name: 'New catalogue' }).first().click()

    await page.getByLabel('Couple').fill('Nikita & Rohan')
    // The slug is suggested from the names until the operator edits it themselves.
    await expect(page.getByLabel('Web address')).toHaveValue('nikita-and-rohan')
    await expect(page.getByText('Available')).toBeVisible()

    // The wizard never showed the resulting address, which is the one thing about a catalogue an
    // operator cannot casually change later.
    await expect(page.getByText(/nikita-and-rohan/).first()).toBeVisible()
  })

  test('a taken address is refused before anything is created', async ({ page }) => {
    await page.getByRole('link', { name: 'New catalogue' }).first().click()

    await page.getByLabel('Couple').fill('Someone Else')
    await page.getByLabel('Web address').fill('aanya-vikram')

    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  /**
   * N-18. The transfer API and the claim page were verified on production months before a
   * partner had any way to reach them.
   */
  test('a partner can issue a handover link, and is refused a second one', async ({ page }) => {
    const created = await createCatalogue(page, 'handover')
    await page.goto(`/admin/c/${created.id}`)

    await page.getByLabel(/couple.s email/i).fill('couple@example.com')
    await page.getByRole('button', { name: 'Create handover link' }).click()

    // Shown once, because only its hash is stored — so the link must actually be on screen.
    const link = page.getByText(/\/claim\//)
    await expect(link).toBeVisible()
    await expect(page.getByText(/shown once/i)).toBeVisible()

    // And the outstanding handover is now named, so a partner who forgets does not re-issue
    // into a refusal they cannot explain.
    await expect(page.getByText('couple@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel it' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create handover link' })).toHaveCount(0)
  })

  test('the claim link a partner sends actually opens', async ({ page, browser }) => {
    const created = await createCatalogue(page, 'claimlink')
    await page.goto(`/admin/c/${created.id}`)

    await page.getByLabel(/couple.s email/i).fill('opens@example.com')
    await page.getByRole('button', { name: 'Create handover link' }).click()

    const claimUrl = await page.getByText(/\/claim\//).textContent()
    expect(claimUrl).toBeTruthy()

    // As the couple: a different browser context, with no operator session at all.
    const anonymous = await browser.newContext()
    const couple = await anonymous.newPage()
    await couple.goto(claimUrl!.trim())

    // They are shown what they are being given, and by whom, before being asked for anything —
    // this arrives forwarded over WhatsApp with no sender they can check.
    await expect(couple.getByRole('heading', { name: 'E2E & Fixture' })).toBeVisible()
    await expect(couple.getByLabel('Your account')).toHaveValue('opens@example.com')
    await expect(couple.getByRole('button', { name: 'Take ownership' })).toBeVisible()
    await anonymous.close()
  })
})
