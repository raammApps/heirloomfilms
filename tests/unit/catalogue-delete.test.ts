import { describe, expect, it } from 'vitest'
import { MemoryRepository, emptySnapshot } from '@/lib/db/memory-repository'
import { catalogueSchema, titleSchema, albumSchema, photoSchema, type Catalogue } from '@/lib/schema'

/**
 * Deleting a catalogue must leave nothing behind, in either driver.
 *
 * Postgres does this with `on delete cascade`; the memory driver has to mirror it by hand, and
 * a mismatch would mean the suite passes while production strands rows — or the reverse, which
 * is how a test suite stops being evidence.
 */

const ORG = '12577076-df04-4680-8298-f8ebcb33f424'
const OTHER_ORG = '99999999-9999-4999-8999-999999999999'
const CAT = '79594419-9452-406b-9510-2b75c925919b'
const ALBUM = 'be54435f-cf54-5e89-adea-12c4cd1cb81e'

function catalogue(id: string, orgId: string): Catalogue {
  return catalogueSchema.parse({
    id,
    orgId,
    slug: `c-${id.slice(0, 6)}`,
    coupleName: { en: 'A & B' },
    appName: { en: 'A & B Originals' },
    weddingDate: '2026-12-01',
    includedUntil: '2027-12-01',
    createdAt: new Date().toISOString(),
  })
}

function populated(): MemoryRepository {
  return new MemoryRepository({
    ...emptySnapshot(),
    catalogues: [catalogue(CAT, ORG), catalogue('11111111-1111-4111-8111-111111111111', OTHER_ORG)],
    titles: [
      titleSchema.parse({
        id: '22222222-2222-4222-8222-222222222222',
        catalogueId: CAT,
        slug: 'film',
        name: { en: 'Film' },
        category: 'highlights',
        status: 'ready',
        createdAt: new Date().toISOString(),
      }),
    ],
    albums: [
      albumSchema.parse({
        id: ALBUM,
        catalogueId: CAT,
        name: { en: 'Photographs' },
        createdAt: new Date().toISOString(),
      }),
    ],
    photos: [
      photoSchema.parse({
        id: '33333333-3333-4333-8333-333333333333',
        albumId: ALBUM,
        url: 'https://cdn.example.net/c/x/w2048/p.jpg',
      }),
    ],
  })
}

describe('deleteCatalogue', () => {
  it('takes the films, albums and photographs with it', async () => {
    const repository = populated()
    await repository.deleteCatalogue(CAT, ORG)

    const snapshot = repository.snapshot()
    expect(snapshot.catalogues.map((c) => c.id)).not.toContain(CAT)
    expect(snapshot.titles).toEqual([])
    expect(snapshot.albums).toEqual([])
    // The cascade runs through albums, so a photograph must not survive its album.
    expect(snapshot.photos).toEqual([])
  })

  it("leaves another operator's catalogue alone", async () => {
    const repository = populated()
    await repository.deleteCatalogue(CAT, ORG)
    expect(repository.snapshot().catalogues).toHaveLength(1)
  })

  it('refuses a catalogue belonging to another org', async () => {
    const repository = populated()
    // 404 rather than 403: another org's catalogue is not confirmed to exist.
    await expect(repository.deleteCatalogue(CAT, OTHER_ORG)).rejects.toThrow(/not found/i)
    expect(repository.snapshot().catalogues).toHaveLength(2)
  })
})
