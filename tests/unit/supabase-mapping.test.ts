import { describe, expect, it } from 'vitest'
import { PHOTO_COLUMNS, TITLE_COLUMNS } from '@/lib/db/supabase-repository'
import { photoSchema, titleSchema } from '@/lib/schema'

/**
 * The Supabase driver writes by field → column map. A field missing from that map is dropped
 * **silently**: the insert succeeds, the read returns whatever the column defaults to, and
 * nothing anywhere throws.
 *
 * That is not hypothetical. `size_bytes` was absent from the title map for the whole life of
 * migration 0007, so `catalogueStorageBytes` summed a column nothing ever wrote, every catalogue
 * in production reported 0 GB, and the 20 GB storage cap never once refused an upload — a partner
 * could have put two hundred gigabytes on a twenty gigabyte plan. `createPhoto` had the same gap.
 *
 * **No behavioural test could have caught it**, which is the point of this file. Every unit and
 * component test runs against `MemoryRepository`, which stores whole objects and is therefore
 * structurally incapable of losing a column; the E2E suite runs against the same driver. The
 * asymmetry only exists in the driver nothing tests, so the map itself has to be the thing under
 * test.
 */
describe('the Supabase column maps cover their schemas', () => {
  /** Derived from the schema, so adding a field to `titleSchema` fails here until it is mapped. */
  const titleFields = Object.keys(titleSchema.shape)
  const photoFields = Object.keys(photoSchema.shape)

  it.each(titleFields)('titles.%s has a column', (field) => {
    expect(TITLE_COLUMNS[field], `${field} is in titleSchema but not TITLE_COLUMNS`).toBeDefined()
  })

  it.each(photoFields)('photos.%s has a column', (field) => {
    expect(PHOTO_COLUMNS[field], `${field} is in photoSchema but not PHOTO_COLUMNS`).toBeDefined()
  })

  /**
   * The reverse direction too: a column mapped from a field that no longer exists writes a key
   * PostgREST will reject, and the failure surfaces as a generic insert error at runtime rather
   * than here.
   */
  it('maps nothing that is not in the schema', () => {
    expect(Object.keys(TITLE_COLUMNS).filter((k) => !titleFields.includes(k))).toEqual([])
    expect(Object.keys(PHOTO_COLUMNS).filter((k) => !photoFields.includes(k))).toEqual([])
  })

  /** Column names are snake_case in Postgres; a camelCase one here is a typo that would insert. */
  it('uses snake_case column names throughout', () => {
    for (const column of [...Object.values(TITLE_COLUMNS), ...Object.values(PHOTO_COLUMNS)]) {
      expect(column, `${column} is not snake_case`).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })
})
