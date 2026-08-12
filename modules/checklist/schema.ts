import { z } from 'zod'
import { localisedStringSchema } from '@/lib/schema'

/**
 * `checklist` — the bucket list a guest can tick (doc 14 §3, f19).
 *
 * The first module whose state belongs to the *guest* rather than the operator, which is what
 * `module_state` and `/api/module-state` were built for in Phase 0.
 */
export const itemSchema = z.object({
  id: z.string().min(1),
  text: localisedStringSchema.default({ en: '' }),
})

export type ChecklistItem = z.infer<typeof itemSchema>

export const configSchema = z.object({
  items: z.array(itemSchema).default([]),
  /** A progress bar turns a list into a game. Off for lists that are not meant to be completed. */
  showProgress: z.boolean().default(true),
})

export type ChecklistConfig = z.infer<typeof configSchema>
