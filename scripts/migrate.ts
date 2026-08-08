#!/usr/bin/env tsx
/**
 * Apply the SQL migrations in order.
 *
 * Deliberately dumb: it prints what to run rather than executing DDL with a service-role key
 * from a developer laptop. Schema changes to a database holding weddings should go through
 * `supabase db push` or a reviewed migration, not through a convenience script.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'supabase/migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

console.log('Migrations, in order:\n')
for (const file of files) console.log(`  supabase/migrations/${file}`)

console.log('\nApply with either:')
console.log('  supabase db push')
console.log('  psql "$DATABASE_URL" -f supabase/migrations/<file>   # one at a time, in order')
console.log('\nThen create the first org and operator (see README, "First run against Supabase").')
