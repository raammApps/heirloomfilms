'use client'

import type { Album, Catalogue, ModuleInstance, Photo, Title } from '@/lib/schema'
import { getModule } from '@/modules/registry'
import { LocalisedField } from './fields'

/**
 * The fields of the selected section, beside the preview rather than on top of it.
 *
 * This replaces a modal sheet that slid over the preview. Editing a heading while the thing
 * being edited is hidden behind the editor is the core complaint the redesign exists to fix:
 * an operator changed a value in one panel and went looking for it in another.
 *
 * No focus trap and no `aria-modal`, deliberately. It is a panel, not a dialog — Escape should
 * not be needed to get out, and tabbing past the last field should reach the preview rather
 * than cycle. That is the difference between something that covers the screen and something
 * that shares it.
 */
export function SectionInspector({
  instance,
  catalogue,
  titles,
  albums,
  photos,
  onChange,
}: {
  instance: ModuleInstance | null
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  onChange: (next: ModuleInstance) => void
}) {
  if (!instance) {
    return (
      <aside
        aria-label="Section editor"
        className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-l-line)] p-5"
      >
        <p className="text-[14px] font-medium">Nothing selected</p>
        <p className="mt-1 text-[13px] text-[var(--color-l-text-mid)]">
          Click a section in the preview — or in the list — to edit it here.
        </p>
      </aside>
    )
  }

  const definition = getModule(instance.type)
  if (!definition) return null

  const parsed = definition.schema.safeParse(instance.config)
  const config = parsed.success ? parsed.data : definition.defaults(catalogue, titles, albums)

  const Editor = definition.Editor as React.ComponentType<{
    value: unknown
    onChange: (next: unknown) => void
    catalogue: Catalogue
    titles: Title[]
    albums: Album[]
    photos: Photo[]
  }>

  return (
    <aside
      aria-label="Section editor"
      className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-[var(--color-l-surface-1)] p-5"
    >
      <h2 className="text-[16px] font-bold">{definition.meta.label}</h2>
      <p className="mb-4 text-[13px] text-[var(--color-l-text-mid)]">
        {definition.meta.description}
      </p>

      <LocalisedField
        label="Section heading"
        hint="Guests read this above the row. Write it like a person, not like a category."
        value={instance.title}
        onChange={(title) => onChange({ ...instance, title })}
      />

      <Editor
        value={config}
        onChange={(next) => onChange({ ...instance, config: next as Record<string, unknown> })}
        catalogue={catalogue}
        titles={titles}
        albums={albums}
        photos={photos}
      />

      <p className="mt-4 text-[12px] text-[var(--color-l-text-mid)]">
        Changes save as you make them. Publish when you want guests to see them.
      </p>
    </aside>
  )
}
