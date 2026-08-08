'use client'

import { X } from 'lucide-react'
import { useRef } from 'react'
import { useFocusTrap } from '@/components/streaming/useFocusTrap'
import type { Album, Catalogue, ModuleInstance, Photo, Title } from '@/lib/schema'
import { getModule } from '@/modules/registry'
import { LocalisedField } from './fields'

type Props = {
  instance: ModuleInstance
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  onChange: (next: ModuleInstance) => void
  onClose: () => void
}

/**
 * The gear opens that module's own `Editor` in a side sheet (doc 14 §5.3).
 *
 * The sheet supplies the heading field — every section has one — and hands the rest to the
 * module. Nothing here knows what any specific module's config looks like.
 */
export function ModuleEditorSheet({
  instance,
  catalogue,
  titles,
  albums,
  photos,
  onChange,
  onClose,
}: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useFocusTrap(panel, onClose)

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
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-editor-heading"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="h-full w-full max-w-[460px] overflow-y-auto bg-[var(--color-l-surface-1)] p-5 shadow-2xl"
        style={{ colorScheme: 'light' }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="module-editor-heading" className="text-[18px] font-bold">
              {definition.meta.label}
            </h2>
            <p className="text-[13px] text-[var(--color-l-text-mid)]">
              {definition.meta.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--color-l-surface-2)]"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

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
      </div>
    </div>
  )
}
