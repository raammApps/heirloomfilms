import type { ComponentType } from 'react'
import type { z } from 'zod'
import type { Translator } from '@/lib/i18n'
import type { Album, Catalogue, Locale, ModuleInstance, Photo, Title } from '@/lib/schema'

/**
 * The module contract (doc 14 §4).
 *
 * A module is a folder that implements this interface and one line in `registry.ts`. If adding
 * a module forces a change to the browse page, the customizer, the schema, or the admin, the
 * abstraction has leaked — `tests/unit/registry.test.ts` asserts that it has not.
 */

export type ModulePhase = 0 | 1 | 2

export type ModuleMeta = {
  type: string
  /** Shown in the customizer's "add section" picker. */
  label: string
  description: string
  /** Lucide icon name — resolved by the picker, so a module never imports React icons here. */
  icon: string
  occasions: readonly string[]
  phase: ModulePhase
  /**
   * What the section is made of. Lets catalogue-level checks reason about a page ("this is all
   * video") without naming a module type, which would put a switch back in the customizer.
   */
  content: 'video' | 'photo' | 'text'
  /** Some modules (the billboard) may only appear once in a catalogue. */
  singleton?: boolean
}

/**
 * Everything a guest module may read. Assembled once per request by the route — modules never
 * fetch (CLAUDE.md working agreements), which is also what makes the customizer's live preview
 * able to render the real component tree against draft data.
 */
export type GuestContext = {
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  locale: Locale
  t: Translator
  profileId: string | null
  /** The section heading the operator wrote, already locale-resolved. May be empty. */
  heading: string
  instanceId: string
}

export type GuestProps<C> = { config: C; ctx: GuestContext }

export type EditorProps<C> = {
  value: C
  onChange: (next: C) => void
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
}

export interface ModuleDefinition<C = unknown> {
  meta: ModuleMeta
  /**
   * Input is `unknown` rather than `C`: configs come off a jsonb column and out of the
   * customizer's editor, and `.default()` means the parsed output is wider than the input.
   */
  schema: z.ZodType<C, z.ZodTypeDef, unknown>
  Guest: ComponentType<GuestProps<C>>
  Editor: ComponentType<EditorProps<C>>
  defaults: (catalogue: Catalogue, titles: Title[], albums: Album[]) => C
  /**
   * Curation nudges for this instance, surfaced in the customizer (doc 14 §5.9).
   * Suggestions with a dismiss — never blockers.
   */
  advise?: (config: C, ctx: Omit<GuestContext, 't' | 'locale' | 'heading' | 'instanceId'>) => string[]
}

/** Helper so a module file can stay strongly typed without repeating the generic. */
export function defineModule<C>(definition: ModuleDefinition<C>): ModuleDefinition<C> {
  return definition
}

export type ValidatedInstance<C = unknown> = {
  instance: ModuleInstance
  definition: ModuleDefinition<C>
  config: C
}
