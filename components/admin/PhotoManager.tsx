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
 * The renditions every photograph is stored as, widest first.
 *
 * A portfolio is judged on the full-screen view and paid for by the thumbnails, so one file
 * cannot serve both: a 2048px master dropped into a three-column grid is roughly twenty times
 * the bytes that grid can show. `2048` covers a full-screen lightbox on a retina laptop, `1024`
 * a row card or a desktop grid cell, `480` a phone thumbnail. `srcset` then lets the browser
 * pick, which is the only thing that knows the real display size.
 *
 * DSLR originals of 25–40MB are not stored. They are the photographer's master, not a web
 * asset — delivery is billed by the gigabyte (doc 05 §2) and no screen can show the difference.
 */
const RENDITIONS = [
  { width: 2048, quality: 0.88, suffix: '' },
  { width: 1024, quality: 0.84, suffix: '-1024' },
  { width: 480, quality: 0.82, suffix: '-480' },
] as const

/**
 * Cut every rendition from one decode of the original.
 *
 * Decoding a 40MB DSLR frame is the expensive part, so it happens once and each size is drawn
 * from the same bitmap. All three together come to roughly a megabyte, which matters: Vercel
 * rejects a request body over ~4.5MB with FUNCTION_PAYLOAD_TOO_LARGE *before the route runs*,
 * so the whole set has to fit in a single request that the platform will actually deliver.
 */
async function renditions(
  file: File,
): Promise<{ files: { suffix: string; file: File }[]; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap
  const longest = Math.max(width, height)
  const base = file.name.replace(/\.[^.]+$/, '')
  const files: { suffix: string; file: File }[] = []

  try {
    for (const rendition of RENDITIONS) {
      // Never upscale: a small photograph stays its own size at every step, and the browser
      // simply picks the one it wants.
      const scale = Math.min(1, rendition.width / longest)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))

      const context = canvas.getContext('2d')
      if (!context) continue
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', rendition.quality),
      )
      if (!blob) continue

      files.push({
        suffix: rendition.suffix,
        file: new File([blob], `${base}${rendition.suffix}.jpg`, { type: 'image/jpeg' }),
      })
    }
  } finally {
    bitmap.close()
  }

  return { files, width, height }
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
            const meta = await makeLqip(file)
            const { files, width, height } = await renditions(file)
            if (files.length === 0) throw new Error('That image could not be read')

            const form = new FormData()
            // The widest is the master; the rest ride along under their suffix so one request
            // stores the whole set and a photograph is never live at only some sizes.
            for (const { suffix, file: rendition } of files) {
              form.set(suffix ? `file${suffix}` : 'file', rendition)
            }
            if (meta.lqip) form.set('lqip', meta.lqip)
            // The original's dimensions, so the grid reserves the right aspect ratio.
            form.set('width', String(width))
            form.set('height', String(height))

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
