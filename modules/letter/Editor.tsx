'use client'

import { LocalisedField, SelectField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { LetterConfig } from './schema'

export default function Editor({ value, onChange }: EditorProps<LetterConfig>) {
  return (
    <>
      <LocalisedField
        label="The message"
        multiline
        hint="Leave a blank line between paragraphs. They fade in one at a time as a guest scrolls."
        value={value.body}
        onChange={(body) => onChange({ ...value, body })}
      />

      <LocalisedField
        label="Signed"
        value={value.signature}
        onChange={(signature) => onChange({ ...value, signature })}
      />

      <SelectField
        label="Style"
        value={value.theme}
        onChange={(theme) => onChange({ ...value, theme })}
        options={[
          { value: 'plain', label: 'Plain — type on black' },
          { value: 'framed', label: 'Framed — a raised card' },
        ]}
      />
    </>
  )
}
