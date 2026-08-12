import { z } from 'zod'
import { localisedStringSchema } from '@/lib/schema'

/**
 * `randomiser` — "Date Night Planner", shuffle from a list (doc 14 §3, f21).
 *
 * The one module with no persistence at all. A suggestion is meant to be taken or re-rolled, and
 * remembering the last one across visits would make it a to-do list instead of a game.
 */
export const optionSchema = z.object({
  id: z.string().min(1),
  text: localisedStringSchema.default({ en: '' }),
})

export type RandomiserOption = z.infer<typeof optionSchema>

export const configSchema = z.object({
  options: z.array(optionSchema).default([]),
  /** The button. Operator-authored, because "Pick one" and "Spin" are different products. */
  cta: localisedStringSchema.default({ en: 'Pick one for us' }),
})

export type RandomiserConfig = z.infer<typeof configSchema>
