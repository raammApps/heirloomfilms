'use client'

import { ToggleField, TitleRefField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { BillboardConfig } from './schema'

export default function Editor({ value, onChange, titles }: EditorProps<BillboardConfig>) {
  return (
    <>
      <TitleRefField
        label="Featured film"
        hint="The first thing a guest sees. A short, strong opener beats the longest film."
        value={value.featuredRef}
        titles={titles}
        onChange={(featuredRef) => onChange({ ...value, featuredRef })}
      />

      <ToggleField
        label="Play a muted trailer behind the hero"
        hint="Falls back to the still on slow connections and for guests who prefer reduced motion."
        value={value.useTrailer}
        onChange={(useTrailer) => onChange({ ...value, useTrailer })}
      />

      <ToggleField
        label="Headline with the couple's name"
        hint="Turn this off to headline with the film's name instead."
        value={value.showCoupleName}
        onChange={(showCoupleName) => onChange({ ...value, showCoupleName })}
      />
    </>
  )
}
