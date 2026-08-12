import { resolveLocalised } from '@/lib/i18n'
import type { GuestProps } from '../contract'
import type { TimelineConfig } from './schema'

/**
 * A vertical spine with a dot per moment (doc 14 §3).
 *
 * Server-rendered: it is text and images, with no state and nothing to hydrate. Adding
 * `'use client'` here would put it in the guest bundle for nothing.
 *
 * Empty entries disappear rather than rendering a blank row — doc 14 §3's rule that every module
 * handles its own empty state by not being there.
 */
export default function Guest({ config, ctx }: GuestProps<TimelineConfig>) {
  const entries = config.entries.filter(
    (entry) => resolveLocalised(entry.what, ctx.locale).trim().length > 0,
  )
  if (entries.length === 0) return null

  const photos = new Map(ctx.photos.map((photo) => [photo.id, photo]))

  return (
    <section
      className="gutter-x py-12 md:py-20"
      data-testid="timeline-module"
      aria-labelledby={`timeline-${ctx.instanceId}`}
    >
      <h2 id={`timeline-${ctx.instanceId}`} className="type-display-lg mb-8">
        {ctx.heading}
      </h2>

      <ol className="mx-auto max-w-[70ch]">
        {entries.map((entry, index) => {
          const photo = entry.photoId ? photos.get(entry.photoId) : null
          const when = resolveLocalised(entry.when, ctx.locale).trim()
          const detail = resolveLocalised(entry.detail, ctx.locale).trim()

          return (
            <li key={entry.id} className="relative flex gap-4 pb-8 last:pb-0">
              {/* The spine, drawn per-item so the last one does not trail past the final dot. */}
              <div className="flex flex-col items-center" aria-hidden>
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                {index < entries.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-[color-mix(in_srgb,var(--color-text-lo)_45%,transparent)]" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                {when ? <p className="type-label text-text-lo">{when}</p> : null}
                <p className="mt-0.5 text-[17px] font-semibold text-text-hi">
                  {resolveLocalised(entry.what, ctx.locale)}
                </p>
                {detail ? <p className="mt-1 text-[15px] text-text-mid">{detail}</p> : null}

                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- the photo provider
                     already emits sized renditions and its own srcset; the loader would resize
                     an already-resized image. */
                  <img
                    src={photo.url}
                    alt={resolveLocalised(entry.what, ctx.locale)}
                    width={photo.width ?? undefined}
                    height={photo.height ?? undefined}
                    loading="lazy"
                    // Intrinsic dimensions are what keep this out of the CLS budget the vitals
                    // gate now enforces.
                    className="mt-3 w-full rounded-[var(--radius-card)] object-cover"
                  />
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
