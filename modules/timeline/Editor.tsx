'use client'

import { LocalisedField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { TimelineConfig, TimelineEntry } from './schema'

/**
 * Hand-written rather than schema-generated, which doc 14 §5.8 reserves for config that is
 * "genuinely spatial" and names the timeline as the example. A list of ordered moments, each
 * with three localised fields, is not something a generic form renders well.
 */
export default function Editor({ value, onChange, photos }: EditorProps<TimelineConfig>) {
  const entries = value.entries

  const update = (index: number, patch: Partial<TimelineEntry>) => {
    onChange({
      ...value,
      entries: entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    })
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= entries.length) return
    const next = [...entries]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onChange({ ...value, entries: next })
  }

  const add = () => {
    onChange({
      ...value,
      entries: [
        ...entries,
        {
          // Stable within the session and unique across instances; the guest tree keys on it.
          id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          when: { en: '' },
          what: { en: '' },
          detail: { en: '' },
          photoId: null,
        },
      ],
    })
  }

  return (
    <>
      <p className="mb-3 text-[13px] text-[var(--color-l-text-mid)]">
        Five to eight moments reads best. Past that it stops being a story and becomes a list —
        the films are already the detailed version.
      </p>

      <ol className="space-y-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="rounded-[var(--radius-card)] border border-[var(--color-l-line)] p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="type-label text-[var(--color-l-text-mid)]">Moment {index + 1}</span>
              <span className="flex items-center gap-1">
                <SmallButton onClick={() => move(index, index - 1)} disabled={index === 0}>
                  ↑<span className="sr-only"> Move moment {index + 1} up</span>
                </SmallButton>
                <SmallButton
                  onClick={() => move(index, index + 1)}
                  disabled={index === entries.length - 1}
                >
                  ↓<span className="sr-only"> Move moment {index + 1} down</span>
                </SmallButton>
                <SmallButton
                  onClick={() =>
                    onChange({ ...value, entries: entries.filter((_, i) => i !== index) })
                  }
                >
                  ✕<span className="sr-only"> Remove moment {index + 1}</span>
                </SmallButton>
              </span>
            </div>

            <LocalisedField
              label="When"
              hint='Free text — "Winter 2019" and "The morning of" are both real answers.'
              value={entry.when}
              onChange={(when) => update(index, { when })}
            />
            <LocalisedField
              label="What happened"
              value={entry.what}
              onChange={(what) => update(index, { what })}
            />
            <LocalisedField
              label="A little more"
              multiline
              value={entry.detail}
              onChange={(detail) => update(index, { detail })}
            />

            <label className="mt-2 block">
              <span className="mb-1 block text-[13px] font-semibold">Photograph</span>
              <select
                value={entry.photoId ?? ''}
                onChange={(event) => update(index, { photoId: event.target.value || null })}
                className="h-10 w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-white px-2 text-[14px]"
              >
                <option value="">No photograph</option>
                {photos.map((photo, n) => (
                  <option key={photo.id} value={photo.id}>
                    Photograph {n + 1}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className="mt-3 h-10 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold"
      >
        Add a moment
      </button>
    </>
  )
}

function SmallButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 rounded border border-[var(--color-l-line)] text-[12px] disabled:opacity-30"
    >
      {children}
    </button>
  )
}
