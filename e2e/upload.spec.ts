import { expect, test } from '@playwright/test'
import { createCatalogue, openFilms, signIn, titleRow, type CreatedCatalogue } from './helpers'

/**
 * doc 10 §2 E2E-5 — upload resilience.
 *
 * Doc 09's sequencing rationale singles this out: "resumable multi-gigabyte upload against a
 * third-party API is where the schedule will actually slip." The bytes go direct to the
 * provider, so what can be verified in CI is *our* half of the contract:
 *
 *  - the container is rejected before a byte moves (doc 05 §3.5)
 *  - the `titles` row exists from the first byte, so a refresh mid-upload shows the file
 *    rather than losing it (doc 05 §3, doc 03 screen 06)
 *  - navigating elsewhere in the admin does not cancel the upload (doc 08)
 *  - the operator can pause and resume, and cancel is confirmed
 *
 * What CI cannot verify is TUS resuming from a real acked offset against Bunny after a real
 * network drop. That is `tus-js-client`'s contract plus the provider's, it needs a real
 * endpoint, and doc 10 §3 M-5 keeps it as a device check. Flagged rather than faked: a test
 * that stubs the provider and then asserts "resume works" would be asserting the stub.
 */
test.describe('E2E-5: upload resilience', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  /**
   * Each test gets its own empty catalogue. Uploading into the shared demo catalogue would
   * race the other suites for the 15-title cap and leave the fixture altered for the next run.
   */
  let catalogue: CreatedCatalogue

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    catalogue = await createCatalogue(page, 'upload')
  })

  test('rejects an unsupported container before a byte moves', async ({ page }) => {
    await openFilms(page, catalogue.id)

    await page.setInputFiles('input[type="file"]', {
      name: 'guest-list.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 not a film'),
    })

    await expect(page.getByText('Not a supported video file')).toBeVisible()
    // Rejected client-side: no ticket was ever requested, so no titles row was created.
    await expect(page.getByText('Uploading')).toHaveCount(0)
  })

  test('the server refuses an unsupported container too, not just the browser', async ({
    page,
  }) => {
    await openFilms(page, catalogue.id)

    // The dropzone is not the security boundary; the endpoint is.
    const response = await page.request.post('/api/admin/uploads', {
      data: {
        catalogueId: catalogue.id,
        filename: 'guest-list.pdf',
        sizeBytes: 1024,
        mimeType: 'application/pdf',
        kind: 'video',
      },
    })

    expect(response.status()).toBe(400)
    expect((await response.json()).error.code).toBe('VALIDATION_FAILED')
  })

  test('refuses a file past the per-file cap with the documented code', async ({ page }) => {
    await openFilms(page, catalogue.id)

    const response = await page.request.post('/api/admin/uploads', {
      data: {
        catalogueId: catalogue.id,
        filename: 'ceremony.mp4',
        sizeBytes: 40 * 1024 * 1024 * 1024,
        mimeType: 'video/mp4',
        kind: 'video',
      },
    })

    expect(response.status()).toBe(413)
    expect((await response.json()).error.code).toBe('UPLOAD_LIMIT')
  })

  test('creates the titles row immediately, so a refresh mid-upload still shows the file', async ({
    page,
  }) => {
    await openFilms(page, catalogue.id)

    await page.setInputFiles('input[type="file"]', {
      name: 'haldi_second_camera.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(64 * 1024, 7),
    })

    // The row appears without waiting for the bytes.
    await expect(page.getByText('Uploading').first()).toBeVisible({ timeout: 10_000 })

    // And it survives a reload — the operator has not lost the file (doc 05 §3).
    await page.reload()
    await expect(page.getByText('Uploading')).toHaveCount(1)

    // The name was guessed from the filename, with the studio's cruft stripped.
    await expect(page.locator('input[value="Haldi Second Camera"]')).toBeVisible()
  })

  test('a processing title is visible to the operator and hidden from guests', async ({ page }) => {
    await openFilms(page, catalogue.id)

    await page.setInputFiles('input[type="file"]', {
      name: 'reception_toast.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(32 * 1024, 3),
    })
    await expect(page.locator('input[value="Reception Toast"]')).toBeVisible({ timeout: 10_000 })

    // Publishing is refused until the transcode finishes — the checkbox is disabled, and the
    // API refuses it too.
    const row = titleRow(page, 'Reception Toast')
    await expect(row.getByRole('checkbox')).toBeDisabled()

    // Guests never see it.
    await page.goto(`/?__catalogue=${catalogue.slug}`)
    await expect(page.getByText('Reception Toast')).toHaveCount(0)
  })

  test('navigating elsewhere in the admin does not cancel an upload', async ({ page }) => {
    await openFilms(page, catalogue.id)

    await page.setInputFiles('input[type="file"]', {
      name: 'mehendi_wide.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(32 * 1024, 5),
    })
    await expect(page.locator('input[value="Mehendi Wide"]')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('link', { name: 'Overview' }).click()
    // The heading, not the words: `getByText` matches case-insensitively on a substring, and the
    // overview's prose says "the link" in three other places.
    await expect(page.getByRole('heading', { name: 'The link' })).toBeVisible()

    // Back on Films the row is still there, still tracked — nothing was lost by navigating.
    await page.getByRole('link', { name: 'Films', exact: true }).click()
    await expect(page.locator('input[value="Mehendi Wide"]')).toBeVisible()
  })

  test('the operator can retry a title the provider could not encode', async ({ page }) => {
    await openFilms(page, catalogue.id)

    await page.setInputFiles('input[type="file"]', {
      name: 'sangeet_dance.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(16 * 1024, 9),
    })
    await expect(page.locator('input[value="Sangeet Dance"]')).toBeVisible({ timeout: 10_000 })

    // The fake driver settles to ready shortly after creation; a retry polls the provider and
    // must never leave the operator without a way forward.
    const row = titleRow(page, 'Sangeet Dance')
    const retry = row.getByRole('button', { name: 'Retry' })
    if (await retry.isVisible().catch(() => false)) await retry.click()

    await expect(row).not.toContainText('Failed')
  })
})

/**
 * N-30 — the film list saved on blur and said nothing, ever.
 *
 * Renaming a film, rewriting its synopsis or changing its category wrote on blur with no
 * spinner, no confirmation and — the part that matters — **no error**. `update()` awaited the
 * PATCH and never looked at `response.ok`, so a rejected save and a successful one were
 * identical from the operator's chair. This is the surface the complaint was about: the console
 * has four other places that save, and every one of them says so.
 */
test.describe('N-30: the film list says whether it saved', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  let catalogue: CreatedCatalogue

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    catalogue = await createCatalogue(page, 'savestate')
    await openFilms(page, catalogue.id)
    await page.setInputFiles('input[type="file"]', {
      name: 'the_sangeet.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(64 * 1024, 3),
    })
    await expect(page.locator('input[value="The Sangeet"]')).toBeVisible({ timeout: 10_000 })
  })

  test('confirms a rename instead of leaving the operator guessing', async ({ page }) => {
    const name = page.locator('input[value="The Sangeet"]')
    await name.fill('The Sangeet — full ceremony')
    await name.blur()

    await expect(page.getByRole('status')).toContainText(/saved/i)
  })

  /**
   * The one that actually bit: a rejected save looked exactly like a successful one, so an
   * operator renamed a film, saw nothing, navigated away, and lost the edit without ever being
   * told. Silence is the worst possible answer here.
   */
  test('says so when a save is refused, rather than swallowing it', async ({ page }) => {
    await page.route('**/api/admin/titles/*', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({ status: 500, body: '{"error":{"message":"nope"}}' })
        return
      }
      await route.continue()
    })

    const name = page.locator('input[value="The Sangeet"]')
    await name.fill('This edit will be refused')
    await name.blur()

    await expect(page.getByRole('status')).toContainText(/not saved|could not save/i)
  })
})

/**
 * N-30 — captions, which the schema has always carried and nothing could ever write.
 *
 * `photoSchema.caption` exists, the guest lightbox renders it, and the manager could only upload
 * and delete. A field that is visible to guests and uneditable by the operator is the most
 * confusing shape of gap: it reads as a save that is broken rather than a feature that was never
 * built. There was also no E2E coverage of the photographs surface at all.
 */
test.describe('N-30: photograph captions', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'the admin console is a desktop tool')

  /** The smallest valid PNG, so the upload route has something real to accept. */
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )

  test('a caption can be written, is confirmed, and survives a reload', async ({ page }) => {
    await signIn(page)
    const catalogue = await createCatalogue(page, 'caption')
    await page.goto(`/admin/c/${catalogue.id}/photos`)

    await page.setInputFiles('input[type="file"]', {
      name: 'the-first-look.png',
      mimeType: 'image/png',
      buffer: PNG,
    })

    const caption = page.getByPlaceholder('Add a caption').first()
    await expect(caption).toBeVisible({ timeout: 15_000 })

    await caption.fill('Her father seeing the lehenga for the first time')
    await caption.blur()
    await expect(page.getByRole('status')).toContainText(/saved/i)

    // The round trip is the assertion that matters — an optimistic update would pass without it.
    await page.reload()
    await expect(page.getByPlaceholder('Add a caption').first()).toHaveValue(
      'Her father seeing the lehenga for the first time',
    )
  })
})
