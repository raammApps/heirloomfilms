'use client'

import { SelectField, TitleListField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { CuratedRowConfig } from './schema'

export default function Editor({ value, onChange, titles }: EditorProps<CuratedRowConfig>) {
  return (
    <>
      <TitleListField
        label="Films in this row"
        hint="Drag order is the order guests see. Two or three films is normal — the row is designed for it."
        value={value.titleIds}
        titles={titles}
        onChange={(titleIds) => onChange({ ...value, titleIds })}
      />

      <SelectField
        label="Card shape"
        hint="Mixing shapes between rows is what makes a page read as curated rather than templated."
        value={value.aspect}
        onChange={(aspect) => onChange({ ...value, aspect })}
        options={[
          { value: '2:3', label: 'Poster (tall)' },
          { value: '16:9', label: 'Story (wide)' },
        ]}
      />
    </>
  )
}
