'use client'

import { NumberField, SelectField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { PhotoRowConfig } from './schema'

export default function Editor({ value, onChange, albums }: EditorProps<PhotoRowConfig>) {
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

      <SelectField
        label="Card shape"
        value={value.layout}
        onChange={(layout) => onChange({ ...value, layout })}
        options={[
          { value: '4:3', label: 'Landscape' },
          { value: '1:1', label: 'Square' },
        ]}
      />

      <NumberField
        label="How many"
        min={1}
        max={30}
        hint="A row is a taste, not the album. The grid is where a guest browses properly."
        value={value.limit}
        onChange={(limit) => onChange({ ...value, limit })}
      />
    </>
  )
}
