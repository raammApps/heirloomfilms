'use client'

import { Monitor, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CatalogueShell } from '@/components/streaming/CatalogueShell'
import type { Album, Catalogue, ModuleInstance, Photo, Title } from '@/lib/schema'

const DEBOUNCE_MS = 300

type Props = {
  catalogue: Catalogue
  titles: Title[]
  albums: Album[]
  photos: Photo[]
  modules: ModuleInstance[]
}

/**
 * Renders **the real guest component tree** against draft modules — not a mock (doc 14 §5.4).
 *
 * A second implementation drifts, and the operator publishes something they never saw. The
 * guest tree is mounted inside a dark, width-constrained frame with `preview` set, which makes
 * navigation, history and the profile gate inert.
 *
 * Mobile is the default, because that is where guests are.
 */
export function PreviewPane({ catalogue, titles, albums, photos, modules }: Props) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [debounced, setDebounced] = useState(modules)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(modules), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [modules])

  const published = titles.filter((title) => title.published && title.status === 'ready')

  return (
    <div>
      <div role="group" aria-label="Preview size" className="mb-3 flex items-center gap-1">
        <DeviceButton
          active={device === 'mobile'}
          onClick={() => setDevice('mobile')}
          label="Mobile preview"
        >
          <Smartphone size={16} aria-hidden /> Mobile
        </DeviceButton>
        <DeviceButton
          active={device === 'desktop'}
          onClick={() => setDevice('desktop')}
          label="Desktop preview"
        >
          <Monitor size={16} aria-hidden /> Desktop
        </DeviceButton>
      </div>

      <div
        className="mx-auto overflow-hidden rounded-[var(--radius-modal)] border border-[var(--color-l-line)] bg-surface-0"
        style={{
          colorScheme: 'dark',
          width: device === 'mobile' ? 390 : '100%',
          maxWidth: '100%',
          height: device === 'mobile' ? 780 : 700,
        }}
      >
        <div className="h-full overflow-y-auto" data-testid="preview-viewport">
          {published.length === 0 ? (
            <p className="gutter-x py-16 text-center text-[14px] text-text-lo">
              Nothing is published yet. Publish a film on the Films tab to see it here.
            </p>
          ) : (
            <CatalogueShell
              bundle={{ catalogue, titles: published, albums, photos }}
              modules={debounced}
              locale="en"
              initialTitleSlug={null}
              initialProgress={[]}
              shareBaseUrl=""
              preview
            />
          )}
        </div>
      </div>
    </div>
  )
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3 text-[13px] ${
        active
          ? 'border-transparent bg-[var(--color-l-text-hi)] text-white'
          : 'border-[var(--color-l-line)]'
      }`}
    >
      {children}
    </button>
  )
}
