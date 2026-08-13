#!/usr/bin/env tsx
/**
 * Fill in `titles.size_bytes` for films uploaded before storage was metered (N-28).
 *
 * Needed because `reconcile` only examines titles in a **non-terminal** state — that is its whole
 * job, settling rows a lost webhook stranded. A film that reached `ready` before migration 0007
 * is never revisited, so its size stays null, the catalogue reads 0.0 GB forever, and the storage
 * cap silently never bites.
 *
 * Reads the real figure from Bunny — the encoded ladder, which is what we are billed for — rather
 * than anything the browser once declared.
 *
 *   pnpm backfill:sizes           # report only
 *   pnpm backfill:sizes --write   # save the figures
 *
 * Talks to Supabase and Bunny directly, like `preflight`, because the app's data modules are
 * `server-only` and a maintenance script is not a server component.
 *
 * Safe to re-run: only touches rows where `size_bytes` is null.
 */
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const [, key, raw] = match
    if (!process.env[key!]) process.env[key!] = raw!.trim().replace(/^["']|["']$/g, '')
  }
}

const WRITE = process.argv.includes('--write')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID
const BUNNY_KEY = process.env.BUNNY_API_KEY

const GB = 1024 ** 3

type TitleRow = {
  id: string
  slug: string
  catalogue_id: string
  provider_id: string | null
  size_bytes: number | null
  status: string
}

function requireEnv(): void {
  const missing = [
    ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_KEY],
    ['BUNNY_LIBRARY_ID', LIBRARY_ID],
    ['BUNNY_API_KEY', BUNNY_KEY],
  ].filter(([, value]) => !value)

  if (missing.length > 0) {
    console.error('Missing configuration:')
    for (const [name] of missing) console.error(`  ${name}`)
    console.error('\nThis reads production data — run it with the deployment’s .env.local.')
    process.exit(1)
  }
}

async function supabase<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY!,
      Authorization: `Bearer ${SUPABASE_KEY!}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`)
  return response.status === 204 ? (null as T) : ((await response.json()) as T)
}

/** Bunny reports `storageSize` — every rendition together, which is what the bill is for. */
async function storedBytes(providerId: string): Promise<number | null> {
  const response = await fetch(
    `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${providerId}`,
    { headers: { AccessKey: BUNNY_KEY! } },
  )
  if (!response.ok) return null
  const video = (await response.json()) as { storageSize?: number }
  return typeof video.storageSize === 'number' && video.storageSize > 0 ? video.storageSize : null
}

async function main(): Promise<void> {
  requireEnv()

  const catalogues = await supabase<{ id: string; slug: string }[]>(
    'catalogues?select=id,slug&order=created_at',
  )
  console.log(`${catalogues.length} catalogue(s)${WRITE ? '' : '  — dry run'}\n`)

  let sized = 0
  let skipped = 0
  let totalBytes = 0

  for (const catalogue of catalogues) {
    const titles = await supabase<TitleRow[]>(
      `titles?catalogue_id=eq.${catalogue.id}&select=id,slug,catalogue_id,provider_id,size_bytes,status`,
    )

    let catalogueBytes = titles.reduce((sum, t) => sum + Number(t.size_bytes ?? 0), 0)
    const missing = titles.filter((t) => t.size_bytes === null && t.provider_id)

    if (missing.length === 0) {
      console.log(
        `  ${catalogue.slug}: ${titles.length} film(s), ${(catalogueBytes / GB).toFixed(2)} GB — nothing to do`,
      )
      totalBytes += catalogueBytes
      continue
    }

    console.log(`  ${catalogue.slug}: ${missing.length} of ${titles.length} film(s) unsized`)

    for (const title of missing) {
      const bytes = await storedBytes(title.provider_id!)

      if (bytes === null) {
        // Still encoding, or the provider has no record. Leaving it null is correct — the webhook
        // or reconcile will set it once there is an answer.
        console.log(`      ${title.slug}: no size from the provider yet, left alone`)
        skipped += 1
        continue
      }

      console.log(`      ${title.slug}: ${(bytes / GB).toFixed(2)} GB`)
      catalogueBytes += bytes
      sized += 1

      if (WRITE) {
        await supabase(`titles?id=eq.${title.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ size_bytes: bytes }),
        })
      }
    }

    console.log(`    → ${catalogue.slug} totals ${(catalogueBytes / GB).toFixed(2)} GB`)
    totalBytes += catalogueBytes
  }

  console.log()
  console.log(`  sized ${sized} · skipped ${skipped} · total ${(totalBytes / GB).toFixed(2)} GB`)
  if (!WRITE && sized > 0) console.log('\n  Dry run. Re-run with --write to save.')

  /**
   * `docs/PRICING.md` §1 estimates 2.15 GB per finished hour at 720p and 4.29 at 1080p, both
   * derived from Bunny's published bitrates rather than measured. This is the measurement.
   */
  console.log('\n  Divide by the finished runtime and correct the table in docs/PRICING.md §1.')
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
