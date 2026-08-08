'use client'

import { NumberField, SelectField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { PhotoGridConfig } from './schema'

export default function Editor({ value, onChange, albums }: EditorProps<PhotoGridConfig>) {
  return (
    <>
      <SelectField
        label="Album"
        value={value.albumId ?? ''}
        onChange={(albumId) => onChange({ ...value, albumId: albumId || null })}
        options={[
          { value: '', label: 'All photos' },
          ...albums.map((album) => ({ value: album.id, label: album.name.en })),
        ]}
      />

      <NumberField
        label="Columns"
        min={2}
        max={4}
        hint="Two on a phone regardless — this is the desktop count."
        value={value.columns}
        onChange={(columns) => onChange({ ...value, columns })}
      />
    </>
  )
}
