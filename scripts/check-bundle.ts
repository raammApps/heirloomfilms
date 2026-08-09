#!/usr/bin/env tsx
/**
 * Fail the build when the guest routes outgrow their JavaScript budget (doc 05 §6).
 *
 * The browse page is what ~90% of guests land on, from a WhatsApp link, on a mid-range Android.
 * Doc 05 puts 150KB gzip on its first load and the last measurement was 146KB — four kilobytes
 * of headroom, with nothing watching. One careless import moves that, and the symptom is a
 * slower first paint that nobody attributes to the commit that caused it.
 *
 * Sizes are computed from `.next/app-build-manifest.json` and gzipping the referenced chunks,
 * rather than scraped from `next build` output, so this does not break on a Next.js version
 * that reformats its table.
 *
 *   pnpm build && pnpm check:bundle
 */
import { gzipSync } from 'node:zlib'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BROWSE_FIRST_LOAD_KB } from '../lib/budgets'

type Manifest = { pages: Record<string, string[]> }

const NEXT_DIR = '.next'
const MANIFEST = join(NEXT_DIR, 'app-build-manifest.json')

/**
 * Routes with a budget. The player deliberately is not one of them: it is a separate route
 * precisely so its weight never lands on browse, and it is allowed to be heavy.
 */
const BUDGETS: { route: string; kb: number; why: string }[] = [
  { route: '/c/[slug]/page', kb: BROWSE_FIRST_LOAD_KB, why: 'the page every guest lands on' },
]

if (!existsSync(MANIFEST)) {
  console.error(`${MANIFEST} not found. Run \`pnpm build\` first.`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest

/** Gzipped bytes of a chunk, which is what actually crosses the network. */
function gzipBytes(file: string): number {
  const path = join(NEXT_DIR, file)
  if (!existsSync(path) || !statSync(path).isFile()) return 0
  return gzipSync(readFileSync(path), { level: 9 }).byteLength
}

/**
 * First-load JS: every chunk the route pulls plus the shared layout chunks, deduplicated. The
 * browser fetches each file once, so counting a shared chunk twice would overstate the number
 * and counting it zero times would understate it.
 */
function firstLoadBytes(route: string): { bytes: number; files: number } | null {
  const own = manifest.pages[route]
  if (!own) return null

  const shared = manifest.pages['/layout'] ?? manifest.pages['/_app'] ?? []
  const files = [...new Set([...shared, ...own])].filter((f) => f.endsWith('.js'))

  return { bytes: files.reduce((total, file) => total + gzipBytes(file), 0), files: files.length }
}

let failed = 0
console.log()

for (const budget of BUDGETS) {
  const measured = firstLoadBytes(budget.route)

  if (!measured) {
    console.error(`✗ ${budget.route} is not in the manifest — did the route move?`)
    console.error(`  known routes: ${Object.keys(manifest.pages).slice(0, 8).join(', ')}…`)
    failed += 1
    continue
  }

  const kb = measured.bytes / 1024
  const ok = kb <= budget.kb
  const headroom = budget.kb - kb
  if (!ok) failed += 1

  console.log(
    `${ok ? '✓' : '✗'} ${budget.route.padEnd(22)} ${kb.toFixed(1).padStart(6)}KB gzip ` +
      `/ ${budget.kb}KB  (${headroom >= 0 ? '+' : ''}${headroom.toFixed(1)}KB, ${measured.files} chunks)`,
  )
  console.log(`  ${budget.why}`)

  // A budget met by a hair is a budget about to break; say so before it does.
  if (ok && headroom < budget.kb * 0.05) {
    console.log(`  ⚠ under 5% headroom — the next import will break this`)
  }
}

console.log()
if (failed > 0) {
  console.error(`${failed} route(s) over budget.`)
  console.error('The player is lazy-loaded on its own route; check what else was pulled into')
  console.error('the browse tree — a client component importing a server-side module is the')
  console.error('usual cause, and `pnpm build` prints the per-route table.')
  process.exit(1)
}

console.log('Within budget.')
