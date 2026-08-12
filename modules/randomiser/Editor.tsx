'use client'

import { LocalisedField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { RandomiserConfig } from './schema'

export default function Editor({ value, onChange }: EditorProps<RandomiserConfig>) {
  const options = value.options

  return (
    <>
      <LocalisedField
        label="Button"
        value={value.cta}
        onChange={(cta) => onChange({ ...value, cta })}
      />

      <p className="mb-3 mt-1 text-[13px] text-[var(--color-l-text-mid)]">
        Nothing is remembered between visits — it is meant to be re-rolled. Six or more options
        keeps it from repeating itself.
      </p>

      <ol className="space-y-2">
        {options.map((option, index) => (
          <li key={option.id} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <LocalisedField
                label={`Option ${index + 1}`}
                value={option.text}
                onChange={(text) =>
                  onChange({
                    ...value,
                    options: options.map((existing, i) =>
                      i === index ? { ...existing, text } : existing,
                    ),
                  })
                }
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...value, options: options.filter((_, i) => i !== index) })}
              className="mt-6 h-7 w-7 shrink-0 rounded border border-[var(--color-l-line)] text-[12px]"
            >
              ✕<span className="sr-only"> Remove option {index + 1}</span>
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            options: [
              ...options,
              {
                id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
                text: { en: '' },
              },
            ],
          })
        }
        className="mt-2 h-10 rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 text-[14px] font-semibold"
      >
        Add an option
      </button>
    </>
  )
}
