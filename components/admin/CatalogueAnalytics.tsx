import { formatClock } from '@/lib/format'
import type { Title } from '@/lib/schema'

/**
 * What guests actually watched.
 *
 * Reads counters the guest surface already maintains: `viewCount` increments once a play passes
 * thirty seconds — never on an impression, which doc 06 §3 calls a vanity number — and
 * `watch_seconds` accumulates in the same transaction as the play event, so the two cannot
 * drift apart.
 *
 * Deliberately no per-guest detail. Doc 06 §5 keeps personal data off the viewer side entirely,
 * and "who watched what" is exactly the thing a couple would be uncomfortable knowing a planner
 * could see.
 */

/** A film nobody finished is a different problem from one nobody started. */
function completionHint(title: Title): string | null {
  if (title.viewCount === 0 || !title.durationS) return null
  const averageS = title.watchSeconds / title.viewCount
  const share = averageS / title.durationS
  if (share >= 0.85) return 'watched to the end'
  if (share <= 0.25) return 'most stop early'
  return null
}

export function CatalogueAnalytics({ titles }: { titles: Title[] }) {
  const published = titles.filter((t) => t.published)
  const totalPlays = published.reduce((sum, t) => sum + t.viewCount, 0)
  const totalSeconds = published.reduce((sum, t) => sum + t.watchSeconds, 0)

  const ranked = [...published].sort(
    (a, b) => b.viewCount - a.viewCount || b.watchSeconds - a.watchSeconds,
  )

  if (published.length === 0) return null

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-l-line)] bg-white p-4">
      <h2 className="text-[15px] font-semibold">What guests watched</h2>
      <p className="mt-1 text-[13px] text-[var(--color-l-text-mid)]">
        A play counts once it passes thirty seconds, so a guest opening a film and leaving is not
        counted. No guest is identified.
      </p>

      {totalPlays === 0 ? (
        <p className="mt-4 rounded-[var(--radius-card)] bg-[var(--color-l-surface-2)] px-4 py-6 text-center text-[14px] text-[var(--color-l-text-mid)]">
          Nothing watched yet. Numbers appear here once guests start opening films.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Figure label="Plays" value={String(totalPlays)} />
            <Figure label="Total watch time" value={formatClock(totalSeconds)} />
          </div>

          <ol className="mt-5 flex flex-col gap-2">
            {ranked.map((title) => {
              // Relative to the most-watched film, so the bars compare rather than just exist.
              const share = totalPlays > 0 ? title.viewCount / (ranked[0]?.viewCount || 1) : 0
              const hint = completionHint(title)

              return (
                <li key={title.id} className="flex items-center gap-3">
                  <span className="w-2/5 truncate text-[13px]" title={title.name.en}>
                    {title.name.en}
                  </span>

                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-l-surface-2)]">
                    <span
                      className="absolute inset-y-0 start-0 rounded-full bg-accent"
                      style={{ width: `${Math.max(share * 100, title.viewCount > 0 ? 4 : 0)}%` }}
                    />
                  </span>

                  <span className="w-28 shrink-0 text-end text-[12px] text-[var(--color-l-text-mid)]">
                    {title.viewCount} {title.viewCount === 1 ? 'play' : 'plays'}
                    {hint ? ` · ${hint}` : ''}
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--color-l-surface-2)] px-4 py-3">
      <p className="text-[12px] text-[var(--color-l-text-mid)]">{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold">{value}</p>
    </div>
  )
}
