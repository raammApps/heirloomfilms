import { z } from 'zod'

/**
 * What a catalogue is allowed to hold (doc 15 §3).
 *
 * `MAX_TITLES = 15` and `MAX_PHOTOS = 60` were constants. The moment a partner buys more space,
 * or a couple upgrades after the handover, a constant is the wrong shape — so the numbers move
 * behind a resolver and every caller asks rather than imports.
 *
 * **The defaults stay low on purpose.** Doc 05 §2 is explicit that the 15-title cap is a curation
 * requirement first and a cost ceiling second: if planners routinely push past it, the product
 * has drifted into being an archive. Storage is sellable; turning this into Google Drive with a
 * nicer player is not the goal.
 */

export const DEFAULT_LIMITS = {
  maxTitles: 15,
  maxPhotos: 60,
  storageGb: 20,
} as const

export const limitsSchema = z.object({
  maxTitles: z.number().int().positive(),
  maxPhotos: z.number().int().positive(),
  storageGb: z.number().int().positive(),
})

export type Limits = z.infer<typeof limitsSchema>

/** A row from `entitlements`, which may set any subset of the limits. */
export const entitlementSchema = z.object({
  id: z.string().uuid(),
  /** Exactly one of these is set; the check constraint in the migration is the enforcement. */
  orgId: z.string().uuid().nullable().default(null),
  catalogueId: z.string().uuid().nullable().default(null),
  planId: z.string().nullable().default(null),
  maxTitles: z.number().int().positive().nullable().default(null),
  maxPhotos: z.number().int().positive().nullable().default(null),
  storageGb: z.number().int().positive().nullable().default(null),
  /** An expired entitlement is inert rather than deleted, so the history survives a lapse. */
  validUntil: z.string().nullable().default(null),
  createdAt: z.string(),
})

export type Entitlement = z.infer<typeof entitlementSchema>

/**
 * Catalogue entitlement → org entitlement → default. The order is the substance.
 *
 * A couple who buys storage must not be silently capped by their partner's tier, because by then
 * the partner is out of the relationship entirely — they cannot see the catalogue and cannot be
 * asked to upgrade. So the catalogue's own grant wins, per field, over the org's.
 *
 * Per *field* rather than per row: an entitlement that sets only `storageGb` should not drop the
 * catalogue's title cap back to the default as a side effect.
 */
export function resolveLimits(
  catalogueEntitlement: Entitlement | null,
  orgEntitlement: Entitlement | null,
  now: Date = new Date(),
): Limits {
  const live = (entitlement: Entitlement | null): Entitlement | null => {
    if (!entitlement) return null
    if (!entitlement.validUntil) return entitlement
    return new Date(entitlement.validUntil).getTime() > now.getTime() ? entitlement : null
  }

  const first = live(catalogueEntitlement)
  const second = live(orgEntitlement)

  const pick = (field: 'maxTitles' | 'maxPhotos' | 'storageGb'): number =>
    first?.[field] ?? second?.[field] ?? DEFAULT_LIMITS[field]

  return {
    maxTitles: pick('maxTitles'),
    maxPhotos: pick('maxPhotos'),
    storageGb: pick('storageGb'),
  }
}
