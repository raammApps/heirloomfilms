import { z } from 'zod'
import { localisedStringSchema } from '@/lib/schema'

/**
 * `letter` — the long-form personal message (doc 14 §3).
 *
 * The most emotionally effective screen in the reference has no video in it. Its typography
 * gets the same care as the player's performance (doc 08).
 */
export const configSchema = z.object({
  body: localisedStringSchema.default({ en: '' }),
  signature: localisedStringSchema.default({ en: '' }),
  theme: z.enum(['plain', 'framed']).default('plain'),
})

export type LetterConfig = z.infer<typeof configSchema>
