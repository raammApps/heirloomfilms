import { z } from 'zod'
import { localisedStringSchema } from '@/lib/schema'

/**
 * `timeline` — "Our Story", dated milestones down the page (doc 14 §3).
 *
 * The narrative spine: the thing that turns a folder of films into a story with a beginning.
 * Doc 11 §4 lists "a timeline of 5–8 moments" as one of three things that make a launch feel
 * finished, so the editor nudges toward that count rather than toward completeness.
 */
export const entrySchema = z.object({
  id: z.string().min(1),
  /** Free text, not a date. "Winter 2019" and "The morning of" are both real answers. */
  when: localisedStringSchema.default({ en: '' }),
  what: localisedStringSchema.default({ en: '' }),
  detail: localisedStringSchema.default({ en: '' }),
  /** A photograph already in the catalogue. Optional — a timeline of text is a real timeline. */
  photoId: z.string().uuid().nullable().default(null),
})

export type TimelineEntry = z.infer<typeof entrySchema>

export const configSchema = z.object({
  entries: z.array(entrySchema).default([]),
})

export type TimelineConfig = z.infer<typeof configSchema>
