'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import type { Photo } from '@/lib/schema'

/**
 * Drag, drop, done.
 *
 * The counterpart to `<UploadManager>` for photographs, and deliberately much simpler: these
 * are megabytes, so there is no resumable transfer, no provider callback and no processing
 * state to survive. What it does share is the rule that an operator is never asked to wait
 * before doing the next thing — uploads run several at a time and the grid fills in as they land.
 */

type Pending = {
  key: string
  name: string
  /** Object URL, shown immediately so the grid never has an empty slot mid-upload. */
  preview: string
  state: 'uploading' | 'failed'
  error?: string
}

/** Wide enough to blur convincingly, small enough to inline in the row. */
const LQIP_WIDTH = 16

/**
 * The longest edge we keep. A phone shoots 4032px; a guest views the gallery on a 390px screen,
 * and the largest this is ever displayed at is a full-screen lightbox on a desktop.
 */
const MAX_EDGE = 2560

/**
 * Anything above this is resized before upload.
 *
 * Vercel rejects a request body over ~4.5MB with FUNCTION_PAYLOAD_TOO_LARGE — the platform
 * refuses it before the route runs, so no server-side limit can catch it and the operator just
 * sees "Upload failed". Modern phone photographs are 4–8MB, so this was every real photograph.
 *
 * Resizing is the right answer rather than a workaround: doc 05 §2 pays for delivery, and
 * shipping a 4032px original to a phone on 4G costs money and start time to display something
 * no guest can see.
 */
const RESIZE_ABOVE_BYTES = 3 * 1024 * 1024

/**
 * Re-encode oversized photographs in the browser.
 *
 * Returns the original untouched when it is already small enough — re-encoding a modest JPEG
 * only loses quality for no gain.
 */
async function shrink(file: File): Promise<File> {
  if (file.size <= RESIZE_ABOVE_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    )
    if (!blob || blob.size >= file.size) return file

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Better to attempt the original and get a real error than to silently drop the photograph.
    return file
  }
}

/**
 * Build the blurred placeholder in the browser, where the image is already decoded.
 *
 * Doing this server-side would mean a native image dependency and CPU on every upload, to
 * produce something the client can make for free from a canvas it already has.
 */
async function makeLqip(file: File): Promise<{ lqip?: string; width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file)
    const ratio = bitmap.height / bitmap.width
    const canvas = document.createElement('canvas')
    canvas.width = LQIP_WIDTH
    canvas.height = Math.max(1, Math.round(LQIP_WIDTH * ratio))
    const context = canvas.getContext('2d')
    if (!context) return { width: bitmap.width, height: bitmap.height }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const lqip = canvas.toDataURL('image/jpeg', 0.5)
    const result = { width: bitmap.width, height: bitmap.height, ...(lqip.length < 4000 ? { lqip } : {}) }
    bitmap.close()
    return result
  } catch {
    // A placeholder is a nicety. Never let it stop the photograph itself from being uploaded.
    return {}
  }
}

export function PhotoManager({
  catalogueId,
  initialPhotos,
}: {
  catalogueId: string
  initialPhotos: Photo[]
}) {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [pending, setPending] = useState<Pending[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'))
      if (images.length === 0) return

      const entries: Pending[] = images.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        preview: URL.createObjectURL(file),
        state: 'uploading',
      }))
      setPending((current) => [...current, ...entries])

      await Promise.all(
        images.map(async (file, index) => {
          const entry = entries[index]!
          try {
            // Dimensions come from the original; the upload is whatever survives the resize.
            const meta = await makeLqip(file)
            const sending = await shrink(file)

            const form = new FormData()
            form.set('file', sending)
            if (meta.lqip) form.set('lqip', meta.lqip)
            if (meta.width) form.set('width', String(meta.width))
            if (meta.height) form.set('height', String(meta.height))

            const response = await fetch(`/api/admin/catalogues/${catalogueId}/photos`, {
              method: 'POST',
              body: form,
            })
            if (!response.ok) {
              // A payload rejected by the platform never reaches the route, so the body is
              // plain text rather than our JSON envelope. Reading it as JSON only turned a
              // specific, actionable failure into "Upload failed".
              const raw = await response.text().catch(() => '')
              let message = raw.slice(0, 120)
              try {
                message = (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? message
              } catch {
                if (response.status === 413 || /PAYLOAD_TOO_LARGE/i.test(raw)) {
                  message = 'That photograph is too large to send. Try one under 4MB.'
                }
              }
              throw new Error(message || `Upload failed (${response.status})`)
            }

            const body = (await response.json()) as { photo: Photo }
            setPhotos((current) => [...current, body.photo])
            setPending((current) => current.filter((p) => p.key !== entry.key))
            URL.revokeObjectURL(entry.preview)
          } catch (error) {
            setPending((current) =>
              current.map((p) =>
                p.key === entry.key
                  ? { ...p, state: 'failed', error: error instanceof Error ? error.message : 'Upload failed' }
                  : p,
              ),
            )
          }
        }),
      )

      // The customizer's advice and the guest preview both read photo counts.
      router.refresh()
    },
    [catalogueId, router],
  )

  const remove = useCallback(async (photo: Photo) => {
    setPhotos((current) => current.filter((p) => p.id !== photo.id))
    await fetch(`/api/admin/photos/${photo.id}`, { method: 'DELETE' }).catch(() => {})
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void upload([...event.dataTransfer.files])
        }}
        className={`flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-l-line)]'
        }`}
      >
        <p className="text-[15px] font-medium text-[var(--color-l-text-hi)]">Drop photographs here</p>
        <p className="text-[13px] text-[var(--color-l-text-mid)]">
          JPEG, PNG, WebP or AVIF · large photographs are resized automatically
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-[var(--radius-pill)] border border-[var(--color-l-line)] px-4 py-2 text-[13px]"
        >
          Choose photographs
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            void upload([...(event.target.files ?? [])])
            event.target.value = ''
          }}
        />
      </div>

      {photos.length === 0 && pending.length === 0 ? (
        <p className="text-[14px] text-[var(--color-l-text-mid)]">
          No photographs yet. The photo sections in the customizer stay hidden from guests until
          there is at least one.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- tenant CDN, arbitrary host */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
                style={photo.lqip ? { backgroundImage: `url(${photo.lqip})`, backgroundSize: 'cover' } : undefined}
              />
              <button
                type="button"
                onClick={() => void remove(photo)}
                aria-label="Remove photograph"
                className="absolute end-2 top-2 rounded-[var(--radius-pill)] bg-black/70 px-2 py-1 text-[12px] text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                Remove
              </button>
            </li>
          ))}

          {pending.map((entry) => (
            <li key={entry.key} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
              <img
                src={entry.preview}
                alt=""
                className={`aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover ${
                  entry.state === 'failed' ? 'opacity-40' : 'opacity-60'
                }`}
              />
              <div className="absolute inset-x-2 bottom-2 rounded bg-black/70 px-2 py-1 text-[12px] text-white">
                {entry.state === 'failed' ? (entry.error ?? 'Failed') : 'Uploading…'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
