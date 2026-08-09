import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The production drivers, against the real services.
 *
 * Everything else in the suite runs on `fake` + `memory`, which is what makes it fast and
 * hermetic — and also means the Bunny and Supabase code paths are otherwise never executed.
 * Doc 09's sequencing rationale is blunt about that being the risk worth retiring first.
 *
 * These skip cleanly when credentials are absent, so CI stays green and offline development is
 * unaffected. They run the moment `.env.local` has real keys:
 *
 *   pnpm test tests/integration
 *
 * Everything created here is torn down in `afterAll`. Nothing touches a catalogue that is not
 * prefixed `itest-`.
 */

const hasBunny = Boolean(
  process.env.BUNNY_API_KEY && process.env.BUNNY_LIBRARY_ID && process.env.BUNNY_CDN_HOSTNAME,
)
const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
)

describe.skipIf(!hasBunny)('Bunny Stream, for real', () => {
  const created: string[] = []

  afterAll(async () => {
    if (created.length === 0) return
    const { BunnyProvider } = await import('@/lib/video/bunny')
    const provider = new BunnyProvider()
    for (const id of created) await provider.deleteAsset(id).catch(() => {})
  })

  it('creates an upload and hands back a usable TUS ticket', async () => {
    const { BunnyProvider } = await import('@/lib/video/bunny')
    const provider = new BunnyProvider()

    const ticket = await provider.createUpload({
      title: `itest-${randomUUID().slice(0, 8)}`,
      sizeBytes: 1024 * 1024,
    })
    created.push(ticket.providerId)

    expect(ticket.providerId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(ticket.tusEndpoint).toContain('tusupload')
    // These four are exactly what Bunny validates on the TUS creation request; a missing one
    // fails at 0% with an opaque error, which is the worst possible time to find out.
    expect(ticket.headers.AuthorizationSignature).toMatch(/^[0-9a-f]{64}$/)
    expect(Number(ticket.headers.AuthorizationExpire)).toBeGreaterThan(Date.now() / 1000)
    expect(ticket.headers.VideoId).toBe(ticket.providerId)
    expect(ticket.headers.LibraryId).toBeTruthy()
  })

  it('reports status for an asset that has not been uploaded to yet', async () => {
    const { BunnyProvider } = await import('@/lib/video/bunny')
    const provider = new BunnyProvider()

    const ticket = await provider.createUpload({ title: `itest-status`, sizeBytes: 1024 })
    created.push(ticket.providerId)

    const status = await provider.getStatus(ticket.providerId)
    expect(['uploading', 'processing', 'ready', 'failed']).toContain(status.state)
  })

  it('signs a playback URL against the real CDN hostname', async () => {
    const { BunnyProvider } = await import('@/lib/video/bunny')
    const provider = new BunnyProvider()

    const ticket = await provider.getPlaybackToken({
      providerId: randomUUID(),
      scope: { catalogueId: randomUUID(), titleId: randomUUID() },
      ttlS: 3600,
    })

    const url = new URL(ticket.playbackUrl)
    expect(url.hostname).toBe(process.env.BUNNY_CDN_HOSTNAME)
    expect(url.pathname).toMatch(/\/playlist\.m3u8$/)
    expect(url.searchParams.get('token')).toBeTruthy()
    expect(Number(url.searchParams.get('expires'))).toBeGreaterThan(Date.now() / 1000)
  })

  it('reports an unknown asset as an error rather than inventing a status', async () => {
    const { BunnyProvider } = await import('@/lib/video/bunny')
    const provider = new BunnyProvider()
    await expect(provider.getStatus(randomUUID())).rejects.toThrow()
  })
})

/**
 * Every call here is a network round trip to a remote database, so the default 5s budget is not
 * a meaningful assertion about anything — it just makes the suite flaky. 30s per test.
 */
const REMOTE_TIMEOUT = 30_000

describe.skipIf(!hasSupabase)('Supabase Postgres, for real', () => {
  const createdCatalogues: string[] = []
  let orgId: string

  /**
   * Resolved once, up front, rather than as a side effect of the first test. It used to be
   * assigned inside "has the schema applied", so a timeout there cascaded into three unrelated
   * failures with a misleading message — the tests were coupled through mutable state.
   */
  beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
      { auth: { persistSession: false } },
    )
    const { data, error } = await db.from('orgs').select('id').limit(1)
    if (error) throw new Error(`cannot reach Supabase: ${error.message}`)
    if (!data?.length) throw new Error('no org exists — run `pnpm bootstrap:sql`')
    orgId = data[0]!.id
  }, REMOTE_TIMEOUT)

  afterAll(async () => {
    if (createdCatalogues.length === 0) return
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
      { auth: { persistSession: false } },
    )
    // Titles, albums and photos cascade from the catalogue.
    for (const id of createdCatalogues) await db.from('catalogues').delete().eq('id', id)
  }, REMOTE_TIMEOUT)

  it(
    'has the schema applied',
    async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
        { auth: { persistSession: false } },
      )

      const tables = ['orgs', 'operators', 'catalogues', 'titles', 'albums', 'photos', 'profiles']
      // In parallel: six sequential round trips to a remote database is latency, not coverage.
      const results = await Promise.all(
        tables.map(async (table) => ({
          table,
          error: (await db.from(table).select('*', { head: true, count: 'exact' })).error,
        })),
      )

      const missing = results.filter((r) => r.error).map((r) => r.table)
      expect(missing, 'run `pnpm bootstrap:sql` and apply it in the SQL editor').toEqual([])
      expect(orgId).toBeTruthy()
    },
    REMOTE_TIMEOUT,
  )

  it(
    'round-trips a catalogue through the repository, scoped to its org',
    async () => {
      const { SupabaseRepository } = await import('@/lib/db/supabase-repository')
      const repository = new SupabaseRepository()

      const id = randomUUID()
      const slug = `itest-${Date.now().toString(36)}`

      const created = await repository.createCatalogue({
        id,
        orgId,
        slug,
        customDomain: null,
        coupleName: { en: 'Integration & Test' },
        appName: { en: 'Integration Originals' },
        weddingDate: '2026-12-01',
        occasion: 'wedding',
        branding: {},
        featuredTitleId: null,
        modules: [],
        draftModules: null,
        template: 'films-only',
        status: 'draft',
        privacy: 'unlisted',
        passcodeHash: null,
        includedUntil: new Date(Date.now() + 90 * 864e5).toISOString(),
        subStatus: 'included',
        subPlan: null,
        subUntil: null,
        createdAt: new Date().toISOString(),
        publishedAt: null,
      })
      createdCatalogues.push(id)

      // The jsonb round-trip is the part most likely to be wrong: localised strings and the
      // module array both go through it.
      expect(created.coupleName).toEqual({ en: 'Integration & Test' })
      expect(created.modules).toEqual([])

      const fetched = await repository.getCatalogue(id, orgId)
      expect(fetched?.slug).toBe(slug)

      // Another org must not see it. This is the isolation claim, tested rather than asserted.
      expect(await repository.getCatalogue(id, randomUUID())).toBeNull()
    },
    REMOTE_TIMEOUT,
  )

  it('round-trips a title, including the arrays and the nullable columns', async () => {
    const { SupabaseRepository } = await import('@/lib/db/supabase-repository')
    const repository = new SupabaseRepository()

    const catalogueId = createdCatalogues[0]
    expect(catalogueId, 'the catalogue test must run first').toBeTruthy()

    const title = await repository.createTitle({
      id: randomUUID(),
      catalogueId: catalogueId!,
      slug: 'itest-film',
      name: { en: 'Integration Film', hi: 'परीक्षण' },
      category: 'highlights',
      credits: [{ role: 'Cinematography', name: 'Nobody' }],
      provider: 'bunny',
      providerId: null,
      durationS: null,
      posterUrl: null,
      posterCandidates: [],
      posterSource: 'generated',
      thumbnailsUrl: null,
      trailerUrl: null,
      captions: [],
      status: 'uploading',
      errorMessage: null,
      published: false,
      sortOrder: 0,
    })

    expect(title.name.hi).toBe('परीक्षण')
    expect(title.credits).toHaveLength(1)
    expect(title.durationS).toBeNull()

    const updated = await repository.updateTitle(title.id, { status: 'ready', durationS: 244 })
    expect(updated.status).toBe('ready')
    expect(updated.durationS).toBe(244)

    // publishedOnly must filter on both flags, which is what keeps a processing title off a
    // guest's page.
    expect(await repository.listTitles(catalogueId!, { publishedOnly: true })).toHaveLength(0)
  })

  /**
   * doc 10 §1 test 12 and §5's pre-launch checklist — the single most important assertion in
   * this file.
   *
   * It needs a positive control. "anon sees nothing" also happens when the request errored, the
   * key was wrong, or the table name was misspelled, and a security test that passes because
   * the query broke is worse than no test at all. So: prove anon *can* read a published
   * catalogue, then prove it cannot read the draft.
   */
  it(
    'enforces RLS: anon reads a published catalogue but never a draft one',
    async () => {
      const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      expect(anonKey, 'the publishable key is required to test RLS').toBeTruthy()

      const { createClient } = await import('@supabase/supabase-js')
      const { SupabaseRepository } = await import('@/lib/db/supabase-repository')
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey!, {
        auth: { persistSession: false },
      })

      const draftId = createdCatalogues[0]
      expect(draftId, 'the catalogue test must run first').toBeTruthy()

      // Positive control: publish a second catalogue and confirm anon can see it.
      const repository = new SupabaseRepository()
      const publishedId = randomUUID()
      const publishedSlug = `itest-pub-${Date.now().toString(36)}`
      await repository.createCatalogue({
        id: publishedId,
        orgId,
        slug: publishedSlug,
        customDomain: null,
        coupleName: { en: 'Published & Visible' },
        appName: { en: 'Published Originals' },
        weddingDate: '2026-12-02',
        occasion: 'wedding',
        branding: {},
        featuredTitleId: null,
        modules: [],
        draftModules: null,
        template: 'films-only',
        status: 'published',
        privacy: 'unlisted',
        passcodeHash: null,
        includedUntil: new Date(Date.now() + 90 * 864e5).toISOString(),
        subStatus: 'included',
        subPlan: null,
        subUntil: null,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      })
      createdCatalogues.push(publishedId)

      const visible = await anon.from('catalogues').select('id').eq('id', publishedId)
      expect(visible.error, 'the anon query itself must work').toBeNull()
      expect(visible.data ?? [], 'anon must see a published catalogue').toHaveLength(1)

      // The actual assertion, now meaningful: same client, same query shape, draft row.
      const hidden = await anon.from('catalogues').select('id').eq('id', draftId!)
      expect(hidden.error).toBeNull()
      expect(hidden.data ?? [], 'anon must NOT see a draft catalogue').toHaveLength(0)
    },
    REMOTE_TIMEOUT,
  )

  it('enforces RLS: anon cannot write, only read', async () => {
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const { createClient } = await import('@supabase/supabase-js')
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey!, {
      auth: { persistSession: false },
    })

    // There is no anon insert policy on catalogues, so this must be refused outright.
    const { error } = await anon
      .from('catalogues')
      .insert({ slug: `itest-evil-${Date.now()}`, org_id: orgId })
    expect(error, 'anon must not be able to create a catalogue').not.toBeNull()
  })
})

describe('driver integration coverage', () => {
  it('reports which drivers were exercised', () => {
    // Not an assertion so much as a visible record: a run where both skipped should not look
    // the same as a run where both passed.
    // eslint-disable-next-line no-console
    console.log(
      `  integration: bunny=${hasBunny ? 'RUN' : 'skipped (no credentials)'} · supabase=${
        hasSupabase ? 'RUN' : 'skipped (no credentials)'
      }`,
    )
    expect(true).toBe(true)
  })
})
