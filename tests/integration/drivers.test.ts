import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'

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

describe.skipIf(!hasSupabase)('Supabase Postgres, for real', () => {
  const createdCatalogues: string[] = []
  let orgId: string

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
  })

  it('has the schema applied', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
      { auth: { persistSession: false } },
    )

    for (const table of ['orgs', 'operators', 'catalogues', 'titles', 'albums', 'photos']) {
      const { error } = await db.from(table).select('*', { head: true, count: 'exact' })
      expect(error, `table "${table}" is missing — run \`pnpm bootstrap:sql\``).toBeNull()
    }

    const { data } = await db.from('orgs').select('id').limit(1)
    expect(data?.length, 'no org exists — run the bootstrap script').toBeGreaterThan(0)
    orgId = data![0]!.id
  })

  it('round-trips a catalogue through the repository, scoped to its org', async () => {
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
  })

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

  it('enforces RLS: the anon key cannot read a draft catalogue', async () => {
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!anonKey) return

    const { createClient } = await import('@supabase/supabase-js')
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
      auth: { persistSession: false },
    })

    // doc 10 §1 test 12 and §5's pre-launch checklist. The catalogue created above is `draft`.
    const { data } = await anon.from('catalogues').select('id').eq('id', createdCatalogues[0]!)
    expect(data ?? [], 'anon must not see a draft catalogue').toHaveLength(0)
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
