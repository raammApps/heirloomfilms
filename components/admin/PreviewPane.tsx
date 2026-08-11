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
  /** Instance id of the section being edited, outlined here so the two panels agree. */
  selectedId?: string | null
  /** Clicking a section selects it. Omit to keep the preview read-only. */
  onSelect?: (instanceId: string) => void
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
export function PreviewPane({
  catalogue,
  titles,
  albums,
  photos,
  modules,
  selectedId = null,
  onSelect,
}: Props) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [debounced, setDebounced] = useState(modules)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(modules), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [modules])

  const published = titles.filter((title) => title.published && title.status === 'ready')

  /**
   * One delegated listener rather than an overlay per section.
   *
   * An overlay would sit on top of the guest tree and change how it lays out; delegation leaves
   * the rendered markup untouched, which is the whole point of previewing the real components
   * (doc 14 §5.4). `ModuleRenderer` already tags each instance with `data-module-id`, so the
   * nearest one up from the click target is the section that was pointed at.
   *
   * Capture phase, because guest components have their own handlers — a poster card would open
   * its modal, and the operator would get a dialog instead of an editor. In the customizer,
   * pointing at a section means "edit this"; the guest surface is where it means "watch this".
   */
  const selectFromClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelect) return
    const section = (event.target as HTMLElement).closest?.('[data-module-id]')
    const id = section?.getAttribute('data-module-id')
    if (!id) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(id)
  }

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
        <div
          className={`h-full overflow-y-auto ${onSelect ? '[&_[data-module-id]]:cursor-pointer' : ''}`}
          data-testid="preview-viewport"
          onClickCapture={selectFromClick}
        >
          {onSelect ? <SelectionStyles selectedId={selectedId} /> : null}
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

/**
 * The selection outline, as scoped CSS rather than props threaded through the guest tree.
 *
 * Every alternative involved teaching guest components about editing: a wrapper element changes
 * layout, a className prop puts an admin concern in a module's signature. Attribute selectors
 * against the tags `ModuleRenderer` already emits leave the previewed markup byte-identical to
 * what a guest gets, which is the property that makes this a preview at all.
 *
 * `inset` rather than a border so nothing shifts by a pixel when a section becomes selected.
 */
function SelectionStyles({ selectedId }: { selectedId: string | null }) {
  const selected = selectedId
    ? `[data-module-id="${CSS.escape(selectedId)}"] { outline: 2px solid var(--color-accent); outline-offset: -2px; }`
    : ''

  return (
    <style>{`
      [data-module-id] { outline: 0 solid transparent; transition: outline-color 120ms ease; }
      @media (hover: hover) and (pointer: fine) {
        [data-module-id]:hover { outline: 2px dashed color-mix(in srgb, var(--color-accent) 60%, transparent); outline-offset: -2px; }
      }
      ${selected}
    `}</style>
  )
}
