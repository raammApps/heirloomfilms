import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRepository, emptySnapshot } from '@/lib/db/memory-repository'
import { catalogueSchema, orgSchema, transferSchema, type Catalogue } from '@/lib/schema'

/**
 * Handing a wedding to the couple who own it.
 *
 * The property under test is what the **partner loses**. A handover that leaves the studio able
 * to edit a couple's films is not a handover, and doc 15 §2 is explicit that "transfer
 * permanently" means the couple can remove them from their own wedding.
 */

const PARTNER = 'aaaaaaaa-1111-4111-8111-111111111111'
const COUPLE = 'bbbbbbbb-1111-4111-8111-111111111111'
const OTHER = 'cccccccc-1111-4111-8111-111111111111'
const CAT = 'dddddddd-2222-4222-8222-222222222222'

let repository: MemoryRepository

const org = (id: string, slug: string, kind: 'partner' | 'couple') =>
  orgSchema.parse({ id, name: slug, slug, kind, createdAt: new Date().toISOString() })

function catalogue(orgId: string): Catalogue {
  return catalogueSchema.parse({
    id: CAT,
    orgId,
    originOrgId: PARTNER,
    slug: 'a-client',
    coupleName: { en: 'A & B' },
    appName: { en: 'A & B Originals' },
    weddingDate: '2026-12-01',
    includedUntil: '2027-12-01',
    template: 'films-only',
    createdAt: new Date().toISOString(),
  })
}

beforeEach(async () => {
  repository = new MemoryRepository(emptySnapshot())
  await repository.createOrg(org(PARTNER, 'lensa', 'partner'))
  await repository.createOrg(org(OTHER, 'rival', 'partner'))
  await repository.createCatalogue(catalogue(PARTNER))
})

describe('transferCatalogue', () => {
  it('moves it, and the partner loses it entirely', async () => {
    await repository.createOrg(org(COUPLE, 'a-and-b', 'couple'))
    await repository.transferCatalogue(CAT, PARTNER, COUPLE)

    expect(await repository.listCatalogues({ orgId: PARTNER })).toHaveLength(0)
    expect(await repository.listCatalogues({ orgId: COUPLE })).toHaveLength(1)
    // Not merely absent from their list: unreachable by id, which is what stops the partner's
    // existing links and bookmarks from still working.
    expect(await repository.getCatalogue(CAT, PARTNER)).toBeNull()
    expect(await repository.getCatalogue(CAT, COUPLE)).not.toBeNull()
  })

  it('keeps the builder on record after the owner changes', async () => {
    await repository.createOrg(org(COUPLE, 'a-and-b', 'couple'))
    await repository.transferCatalogue(CAT, PARTNER, COUPLE)

    const moved = await repository.getCatalogue(CAT, COUPLE)
    // The one thing that survives to credit the partner: they lose every other trace.
    expect(moved?.originOrgId).toBe(PARTNER)
    expect(moved?.orgId).toBe(COUPLE)
  })

  it('refuses to move a catalogue the claimed owner never held', async () => {
    // A tampered transfer naming somebody else's org must not reach their wedding.
    await expect(repository.transferCatalogue(CAT, OTHER, COUPLE)).rejects.toThrow(/not found/i)
    expect(await repository.getCatalogue(CAT, PARTNER)).not.toBeNull()
  })
})

describe('the handover record', () => {
  const transfer = (id: string) =>
    transferSchema.parse({
      id,
      catalogueId: CAT,
      fromOrgId: PARTNER,
      toEmail: 'couple@example.com',
      tokenHash: `hash-${id}`,
      expiresAt: new Date(Date.now() + 864e5).toISOString(),
      createdAt: new Date().toISOString(),
    })

  it('allows only one live handover per catalogue', async () => {
    await repository.createTransfer(transfer('11111111-3333-4333-8333-333333333333'))
    // Two outstanding links is a way to hand a wedding to the wrong household.
    await expect(
      repository.createTransfer(transfer('22222222-3333-4333-8333-333333333333')),
    ).rejects.toThrow(/already in progress/i)
  })

  it('frees the catalogue for a new link once claimed', async () => {
    const first = transfer('11111111-3333-4333-8333-333333333333')
    await repository.createTransfer(first)
    await repository.markTransferClaimed(first.id, COUPLE)

    await expect(
      repository.createTransfer(transfer('22222222-3333-4333-8333-333333333333')),
    ).resolves.toBeDefined()
  })

  it('is found by hash, never by the token itself', async () => {
    const t = transfer('11111111-3333-4333-8333-333333333333')
    await repository.createTransfer(t)
    expect(await repository.getTransferByTokenHash(t.tokenHash)).not.toBeNull()
    expect(await repository.getTransferByTokenHash('not-the-hash')).toBeNull()
  })

  it('cancelling removes it, so the link stops working', async () => {
    const t = transfer('11111111-3333-4333-8333-333333333333')
    await repository.createTransfer(t)
    await repository.cancelTransfer(t.id)
    expect(await repository.getTransferByTokenHash(t.tokenHash)).toBeNull()
  })
})
