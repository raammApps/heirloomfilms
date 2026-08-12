import Link from 'next/link'
import type { setupChecklist } from '@/lib/admin/setup-checklist'
import { IconCheck } from './icons'

/**
 * "Am I done?" — answered on the page rather than left to the operator's memory.
 *
 * The wizard's last step handed them the customizer and said nothing more. This is the only
 * place in the console that distinguishes *a catalogue that exists* from *a wedding a guest can
 * watch*, which are very different things and used to look identical.
 *
 * Server component: every input is state the page already loaded, and none of it changes without
 * a navigation.
 */
export function SetupChecklist({
  checklist,
}: {
  checklist: ReturnType<typeof setupChecklist>
}) {
  const { items, done, total, ready } = checklist
  const percent = Math.round((done / total) * 100)

  return (
    <aside
      aria-label="Setup"
      className="h-fit rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4 lg:sticky lg:top-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Before guests arrive</h2>
        <span className="text-[13px] text-[var(--color-l-text-mid)]">
          {done}/{total}
        </span>
      </div>

      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-l-surface-2)]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div
          className={`h-full rounded-full transition-[width] ${
            ready ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-accent)]'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-[12px] text-[var(--color-l-text-mid)]">
        {ready
          ? 'A guest opening the link right now finds something to watch.'
          : 'The unticked required items are what a guest would run into.'}
      </p>

      <ul className="mt-3.5 space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2.5">
            <span
              aria-hidden
              className={`mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                item.done
                  ? 'border-transparent bg-[var(--color-ok)] text-white'
                  : item.required
                    ? 'border-[var(--color-l-text-mid)]'
                    : 'border-dashed border-[var(--color-l-line)]'
              }`}
            >
              {item.done ? <IconCheck /> : null}
            </span>

            <span className="min-w-0">
              <Link
                href={item.href}
                className={`block text-[13.5px] underline-offset-4 hover:underline ${
                  item.done
                    ? 'text-[var(--color-l-text-mid)] line-through decoration-[var(--color-l-line)]'
                    : 'font-medium'
                }`}
              >
                {item.label}
                {!item.required && !item.done ? (
                  <span className="ms-1.5 type-label text-[var(--color-l-text-mid)]">optional</span>
                ) : null}
              </Link>
              {!item.done ? (
                <span className="mt-0.5 block text-[12px] text-[var(--color-l-text-mid)]">
                  {item.detail}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
