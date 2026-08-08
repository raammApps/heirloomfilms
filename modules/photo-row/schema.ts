import { z } from 'zod'

/** `photo_row` — a horizontal row of photographs that opens a lightbox (doc 14 §3, frame f09). */
export const configSchema = z.object({
  albumId: z.string().nullable().default(null),
  layout: z.enum(['4:3', '1:1']).default('4:3'),
  limit: z.number().int().min(1).max(30).default(12),
})

export type PhotoRowConfig = z.infer<typeof configSchema>
