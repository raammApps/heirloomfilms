'use client'

import { LocalisedField, ToggleField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { ChecklistConfig } from './schema'

export default function Editor({ value, onChange }: EditorProps<ChecklistConfig>) {
  const items = value.items

  const add = () =>
    onChange({
      ...value,
      items: [
        ...items,
        { id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, text: { en: '' } },
      ],
    })

  return (
    <>
      <p className="mb-3 text-[13px] text-[var(--color-l-text-mid)]">
        Guests tick these on their own phone and the ticks stay put. Nobody else sees them — this
        is a keepsake, not a shared board.
      </p>

      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <LocalisedField
                label={`Item ${index + 1}`}
                value={item.text}
                onChange={(text) =>
                  onChange({
                    ...value,
                    items: items.map((existing, i) => (i === index ? { ...existing, text } : existing)),
                  })
                }
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...value, items: items.filter((_, i) => i !== index) })}
              className="mt-6 h-7 w-7 shrink-0 rounded border border-[var(--color-l-line)] text-[12px]"
            >
              ✕<span className="sr-only"> Remove item {index + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        className="mt-2 h-10 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold"
      >
        Add an item
      </button>

      <div className="mt-4">
        <ToggleField
          label="Show progress"
          hint="A count turns the list into something to finish. Off for a list that is just a list."
          value={value.showProgress}
          onChange={(showProgress) => onChange({ ...value, showProgress })}
        />
      </div>
    </>
  )
}
