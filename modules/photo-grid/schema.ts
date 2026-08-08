import { z } from 'zod'

/** `photo_grid` — the "Memory Vault" masonry gallery (doc 14 §3). */
export const configSchema = z.object({
  albumId: z.string().nullable().default(null),
  columns: z.number().int().min(2).max(4).default(3),
})

export type PhotoGridConfig = z.infer<typeof configSchema>
