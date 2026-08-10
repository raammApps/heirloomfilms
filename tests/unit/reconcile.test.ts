import { describe, expect, it } from 'vitest'
import { emptySnapshot, MemoryRepository } from '@/lib/db/memory-repository'
import { titleSchema, type Title } from '@/lib/schema'

/**
 * The reconcile job is the only thing standing between a lost webhook and a film that never
 * appears. These tests exist because it had a hole exactly where the risk was.
 *
 * A title is created `uploading`, and it is the provider's webhook that moves it on. So the
 * failure the job is built for — the webhook never arrives — leaves the row in `uploading`.
 * `listStalledTitles` used to select `processing` only, which made the one state a lost webhook
 * actually produces the one state the safety net could not see. Found by uploading a real film
 * to Bunny against the production database: Bunny reported finished, the row said `uploading`,
 * and the job reported `examined: 0`.
 */

const STALL_MINUTES = 120
const CATALOGUE_ID = '33333333-3333-4333-8333-333333333333'

const ago = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

function title(id: string, status: Title['status'], createdAt: string): Title {
  return titleSchema.parse({
    id,
    catalogueId: CATALOGUE_ID,
    slug: `t-${id.slice(0, 4)}`,
    name: { en: 'The Ceremony' },
    category: 'ceremony',
    providerId: `provider-${id.slice(0, 4)}`,
    status,
    createdAt,
  })
}

function repositoryWith(...titles: Title[]): MemoryRepository {
  return new MemoryRepository({ ...emptySnapshot(), titles })
}

const id = (n: number): string => `1111111${n}-1111-4111-8111-111111111111`

describe('listStalledTitles', () => {
  it('sees a title stranded in `uploading` by a lost webhook', async () => {
    const repository = repositoryWith(title(id(1), 'uploading', ago(3)))
    const stalled = await repository.listStalledTitles(STALL_MINUTES)
    expect(stalled.map((t) => t.id)).toEqual([id(1)])
  })

  it('still sees a title stuck in `processing`', async () => {
    const repository = repositoryWith(title(id(2), 'processing', ago(3)))
    const stalled = await repository.listStalledTitles(STALL_MINUTES)
    expect(stalled.map((t) => t.id)).toEqual([id(2)])
  })

  it('leaves a recent upload alone — it is simply still going', async () => {
    const repository = repositoryWith(title(id(3), 'uploading', ago(0)))
    expect(await repository.listStalledTitles(STALL_MINUTES)).toEqual([])
  })

  it('never reopens a title that already has a verdict', async () => {
    const repository = repositoryWith(
      title(id(4), 'ready', ago(3)),
      title(id(5), 'failed', ago(3)),
    )
    expect(await repository.listStalledTitles(STALL_MINUTES)).toEqual([])
  })
})
