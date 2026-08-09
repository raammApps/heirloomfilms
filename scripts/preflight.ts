#!/usr/bin/env tsx
/**
 * Check that the external services are actually ready, and say precisely what is missing.
 *
 * Written because diagnosing this by hand took a dozen curl commands: is the key valid, is it
 * the account key or a library key, does the schema exist, is token authentication on. Those
 * questions recur on every new environment, and the answers are the difference between a
 * deploy that works and one that 500s on the first guest.
 *
 *   pnpm preflight
 *
 * Read-only. Creates nothing, changes nothing. Exits non-zero if the configured drivers are
 * not ready, so it can gate a deploy.
 */
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2]!.trim().replace(/^["']|["']$/g, '')
    if (value) process.env[match[1]!] ??= value
  }
}

type Result = { ok: boolean; label: string; detail: string; fix?: string }
const results: Result[] = []
const pass = (label: string, detail: string) => results.push({ ok: true, label, detail })
const fail = (label: string, detail: string, fix?: string) =>
  results.push({ ok: false, label, detail, fix })

const env = process.env
const dataDriver = env.DATA_DRIVER ?? 'memory'
const videoDriver = env.VIDEO_DRIVER ?? 'fake'

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseSecret = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY

// ── Supabase ──────────────────────────────────────────────────────────────────
async function checkSupabase(): Promise<void> {
  if (!supabaseUrl) {
    fail('Supabase URL', 'not set', 'NEXT_PUBLIC_SUPABASE_URL from Project Settings → API')
    return
  }
  pass('Supabase URL', new URL(supabaseUrl).hostname)

  if (!supabaseAnon) {
    fail('Publishable key', 'not set', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)')
  } else {
    pass('Publishable key', `${supabaseAnon.slice(0, 14)}…`)
  }

  if (!supabaseSecret) {
    fail(
      'Secret key',
      'not set — the repository cannot run without it',
      'SUPABASE_SECRET_KEY (sb_secret_…) from Project Settings → API Keys',
    )
  } else {
    pass('Secret key', `${supabaseSecret.slice(0, 10)}…`)
  }

  const key = supabaseSecret ?? supabaseAnon
  if (!key) return

  const tables = ['orgs', 'operators', 'catalogues', 'titles', 'albums', 'photos', 'profiles']
  const missing: string[] = []

  for (const table of tables) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => null)
    if (!response || response.status === 404) missing.push(table)
  }

  if (missing.length === tables.length) {
    fail('Schema', 'no tables found', 'pnpm bootstrap:sql, then paste into the SQL editor')
  } else if (missing.length > 0) {
    fail('Schema', `missing: ${missing.join(', ')}`, 'the migrations are only partly applied')
  } else {
    pass('Schema', `all ${tables.length} tables present`)

    if (supabaseSecret) {
      const response = await fetch(`${supabaseUrl}/rest/v1/orgs?select=id,slug&limit=1`, {
        headers: { apikey: supabaseSecret, Authorization: `Bearer ${supabaseSecret}` },
      })
      const rows = (await response.json().catch(() => [])) as { slug?: string }[]
      if (rows.length > 0) pass('First org', rows[0]!.slug ?? 'present')
      else fail('First org', 'none', 'the insert at the end of the bootstrap script')
    }
  }
}

// ── Bunny ─────────────────────────────────────────────────────────────────────
async function checkBunny(): Promise<void> {
  const apiKey = env.BUNNY_API_KEY
  if (!apiKey) {
    fail('Bunny key', 'not set', 'BUNNY_API_KEY')
    return
  }

  const account = await fetch('https://api.bunny.net/videolibrary?page=1&perPage=50', {
    headers: { AccessKey: apiKey, accept: 'application/json' },
  }).catch(() => null)

  if (!account) {
    fail('Bunny key', 'could not reach api.bunny.net')
    return
  }

  if (account.status === 401) {
    // Worth distinguishing: a library key authenticates against video.bunnycdn.com but not
    // against the account API, and the failure looks identical from the outside.
    fail(
      'Bunny key',
      'rejected by the account API (401)',
      'this may be a per-library key rather than the account key — Account Settings → API',
    )
    return
  }

  pass('Bunny key', 'valid account key')

  const body = (await account.json()) as { Items?: { Id: number; Name: string }[] }
  const libraries = body.Items ?? []

  if (libraries.length === 0) {
    // Bunny refuses zone creation at zero balance, which is the most likely reason a fresh
    // account has none. Reported here so it is not rediscovered as a 400 mid-setup.
    const billing = await fetch('https://api.bunny.net/billing', {
      headers: { AccessKey: apiKey, accept: 'application/json' },
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ Balance?: number }>) : null))
      .catch(() => null)

    const balance = billing?.Balance ?? 0
    fail(
      'Stream library',
      'the account has none',
      balance <= 0
        ? `account balance is ${balance} — Bunny refuses to create zones until the account is topped up`
        : 'create one in the Bunny dashboard → Stream',
    )
    return
  }

  pass('Stream library', `${libraries.length} found: ${libraries.map((l) => l.Name).join(', ')}`)

  const libraryId = env.BUNNY_LIBRARY_ID
  if (!libraryId) {
    fail(
      'BUNNY_LIBRARY_ID',
      'not set',
      `pick one of: ${libraries.map((l) => `${l.Id} (${l.Name})`).join(', ')}`,
    )
    return
  }

  // The per-library key, not the account key, is what the Stream endpoints accept.
  const videos = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=1`,
    {
      headers: { AccessKey: apiKey, accept: 'application/json' },
    },
  ).catch(() => null)

  if (!videos || !videos.ok) {
    fail(
      'Library API access',
      `HTTP ${videos?.status ?? 'unreachable'}`,
      'BUNNY_API_KEY must be the library key (Stream → your library → API) for these endpoints',
    )
  } else {
    pass('Library API access', `library ${libraryId} reachable`)
  }

  if (!env.BUNNY_CDN_HOSTNAME) {
    fail('BUNNY_CDN_HOSTNAME', 'not set', 'the vz-….b-cdn.net hostname from the library')
  } else {
    pass('BUNNY_CDN_HOSTNAME', env.BUNNY_CDN_HOSTNAME)
  }

  if (!env.BUNNY_TOKEN_AUTH_KEY) {
    fail(
      'BUNNY_TOKEN_AUTH_KEY',
      'not set — playback URLs would be unsigned',
      'library → Security → Token Authentication Key, and turn token authentication ON',
    )
  } else {
    pass('BUNNY_TOKEN_AUTH_KEY', 'set')
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`\nDrivers: data=${dataDriver} video=${videoDriver}\n`)

  await checkSupabase()
  await checkBunny()

  const width = Math.max(...results.map((r) => r.label.length))
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.label.padEnd(width)}  ${r.detail}`)
    if (r.fix) console.log(`${' '.repeat(width + 3)}→ ${r.fix}`)
  }

  const blocking = results.filter((r) => !r.ok)
  const needsSupabase = dataDriver === 'supabase'
  const needsBunny = videoDriver === 'bunny'

  console.log()
  if (blocking.length === 0) {
    console.log(
      'Ready. Flip DATA_DRIVER=supabase and VIDEO_DRIVER=bunny, then `pnpm test:integration`.',
    )
  } else if (!needsSupabase && !needsBunny) {
    console.log(
      `${blocking.length} item(s) outstanding, but the configured drivers are local (${dataDriver}/${videoDriver}),\nso nothing is broken right now. The list above is what remains before switching over.`,
    )
  } else {
    console.log(`${blocking.length} item(s) block the configured drivers.`)
    process.exit(1)
  }
}

void main()
