'use client'

import { NumberField } from '@/components/admin/fields'
import type { EditorProps } from '../contract'
import type { ContinueWatchingConfig } from './schema'

export default function Editor({ value, onChange }: EditorProps<ContinueWatchingConfig>) {
  return (
    <>
      <p className="mb-3 text-[13px] text-[var(--color-l-text-mid)]">
        Fills itself from what each guest has actually watched, so it is empty for a first-time
        visitor and hidden entirely when there is nothing to resume. Nothing to curate.
      </p>

      <NumberField
        label="Only after this many seconds"
        hint="Below this, a resume point is a mis-tap rather than an intention."
        value={value.minSeconds}
        min={0}
        max={3600}
        onChange={(minSeconds) => onChange({ ...value, minSeconds })}
      />

      <NumberField
        label="Most films to show"
        value={value.maxItems}
        min={1}
        max={12}
        onChange={(maxItems) => onChange({ ...value, maxItems })}
      />
    </>
  )
}
