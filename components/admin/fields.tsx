'use client'

import { GripVertical, X } from 'lucide-react'
import { useId } from 'react'
import type { LocalisedString, Title } from '@/lib/schema'

/**
 * The form kit module Editors are generated from (doc 08 `<ModuleEditor>`).
 *
 * Kept deliberately small — string, localised string, number, boolean, enum, media-ref and
 * ordered arrays cover every Phase 0 module config. A module needing more than this is a
 * signal that its config is genuinely spatial and wants a hand-written editor.
 *
 * The admin runs on the light set (doc 04 §2); the guest surface stays near-black.
 */

const inputClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-white px-3 py-2 text-[15px] text-[var(--color-l-text-hi)] outline-none focus-visible:border-accent'

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  htmlFor?: string
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[13px] font-semibold text-[var(--color-l-text-hi)]"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[12px] text-[var(--color-l-text-mid)]">{hint}</p> : null}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  hint?: string
  placeholder?: string
  multiline?: boolean
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      {multiline ? (
        <textarea
          id={id}
          rows={6}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </Field>
  )
}

/**
 * English is required; Hindi is an optional overlay. Both are edited side by side rather than
 * behind a language switch, because an operator who has to hunt for the Hindi field will not
 * fill it in.
 */
export function LocalisedField({
  label,
  value,
  onChange,
  multiline,
  hint,
}: {
  label: string
  value: LocalisedString
  onChange: (next: LocalisedString) => void
  multiline?: boolean
  hint?: string
}) {
  return (
    // A fieldset, not a div with a paragraph: the two inputs are labelled only "English" and
    // "हिंदी", so without a legend tying them to this group a screen reader announces "English"
    // with no indication of English *what* — and the page has several such pairs.
    <fieldset className="mb-4 rounded-[var(--radius-input)] border border-[var(--color-l-line)] p-3">
      <legend className="px-1 text-[13px] font-semibold text-[var(--color-l-text-hi)]">
        {label}
      </legend>
      <TextField
        label="English"
        value={value.en}
        multiline={multiline}
        onChange={(en) => onChange({ ...value, en })}
      />
      <TextField
        label="हिंदी"
        value={value.hi ?? ''}
        multiline={multiline}
        hint={hint ?? 'Optional. Guests see the English text when this is empty.'}
        onChange={(hi) => onChange({ ...value, hi: hi || undefined })}
      />
    </fieldset>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (next: T) => void
  hint?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  hint?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
    </Field>
  )
}

export function ToggleField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="mb-4 flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-[var(--color-accent)]"
      />
      <label htmlFor={id} className="text-[14px] text-[var(--color-l-text-hi)]">
        {label}
        {hint ? (
          <span className="block text-[12px] text-[var(--color-l-text-mid)]">{hint}</span>
        ) : null}
      </label>
    </div>
  )
}

/**
 * Pick one title. A `<select>` rather than a gallery: a catalogue holds at most fifteen items,
 * so a picker with thumbnails would be more chrome than content.
 */
export function TitleRefField({
  label,
  value,
  titles,
  onChange,
  hint,
  allowEmpty,
}: {
  label: string
  value: string | null
  titles: Title[]
  onChange: (next: string | null) => void
  hint?: string
  allowEmpty?: boolean
}) {
  return (
    <SelectField
      label={label}
      hint={hint}
      value={value ?? ''}
      onChange={(next) => onChange(next || null)}
      options={[
        ...(allowEmpty || !value ? [{ value: '', label: '— none —' }] : []),
        ...titles.map((title) => ({ value: title.id, label: title.name.en })),
      ]}
    />
  )
}

/**
 * An ordered, hand-picked list of titles — the config behind `curated_row`, and the single
 * most-used editor control in the product.
 */
export function TitleListField({
  label,
  value,
  titles,
  onChange,
  hint,
}: {
  label: string
  value: string[]
  titles: Title[]
  onChange: (next: string[]) => void
  hint?: string
}) {
  const byId = new Map(titles.map((t) => [t.id, t]))
  const remaining = titles.filter((t) => !value.includes(t.id))

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    onChange(next)
  }

  return (
    <Field label={label} hint={hint}>
      <ul className="mb-2 space-y-1">
        {value.map((id, index) => {
          const title = byId.get(id)
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--color-l-line)] bg-white px-2 py-1.5"
            >
              <GripVertical size={16} aria-hidden className="text-[var(--color-l-text-mid)]" />
              <span className="flex-1 truncate text-[14px] text-[var(--color-l-text-hi)]">
                {title ? title.name.en : `Removed title (${id.slice(0, 8)})`}
              </span>
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={`Move ${title?.name.en ?? 'item'} up`}
                className="rounded px-2 py-1 text-[13px] disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === value.length - 1}
                aria-label={`Move ${title?.name.en ?? 'item'} down`}
                className="rounded px-2 py-1 text-[13px] disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                aria-label={`Remove ${title?.name.en ?? 'item'}`}
                className="rounded px-1 py-1 text-[var(--color-l-text-mid)] hover:text-[var(--color-error)]"
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>

      {remaining.length > 0 ? (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          className={inputClass}
          aria-label={`Add a film to ${label}`}
        >
          <option value="">+ Add a film…</option>
          {remaining.map((title) => (
            <option key={title.id} value={title.id}>
              {title.name.en}
            </option>
          ))}
        </select>
      ) : null}
    </Field>
  )
}
