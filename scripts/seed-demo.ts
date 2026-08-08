#!/usr/bin/env tsx
/**
 * Write the demo catalogue into whichever store `DATA_DRIVER` points at.
 *
 * For `file`, this is what makes an offline planner demo possible — the store lives in
 * `.data/store.json` and survives a restart on venue wifi. For `supabase`, it prints the SQL
 * path instead: seeding a real database is a deliberate act, not a side effect of a script run.
 */
import { defaultStorePath, FileRepository } from '../lib/db/file-repository'
import { demoSnapshot } from '../lib/db/seed-data'
import { env } from '../lib/env'

if (env.DATA_DRIVER === 'supabase') {
  console.error('DATA_DRIVER=supabase. Apply supabase/migrations/*.sql, then seed through the admin.')
  process.exit(1)
}

const path = defaultStorePath()
const repository = new FileRepository(path)
repository.load(demoSnapshot())

const snapshot = repository.snapshot()
console.log(`Seeded ${path}`)
console.log(
  `  ${snapshot.catalogues.length} catalogue · ${snapshot.titles.length} titles · ${snapshot.photos.length} photos`,
)
console.log(`  operator: ${env.DEV_OPERATOR_EMAIL} / ${env.DEV_OPERATOR_PASSWORD}`)
console.log(`  guest:    http://localhost:3000/?__catalogue=${snapshot.catalogues[0]?.slug}`)
