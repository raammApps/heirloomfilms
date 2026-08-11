import { describe, expect, it } from 'vitest'
import { PHOTO_WIDTHS, photoSrcSet } from '@/lib/photos/srcset'

/**
 * A portfolio is judged on the full-screen view and paid for by the thumbnails, so one file
 * cannot serve both: the 2048 master is ~56x the bytes a phone grid cell can show.
 *
 * The width lives in the path so a URL says what it is — which is also the only way to tell a
 * photograph uploaded before renditions existed from one uploaded after. Getting that wrong
 * puts a 404 inside a `srcset`, and the guest sees a hole in the gallery.
 */

const NEW = 'https://cdn.example.net/c/cat-1/w2048/photo-1.jpg'
const LEGACY = 'https://cdn.example.net/c/cat-1/photo-1.png'

describe('photoSrcSet', () => {
  it('offers every stored width for a photograph that has them', () => {
    const set = photoSrcSet(NEW)
    for (const width of PHOTO_WIDTHS) {
      expect(set).toContain(`/w${width}/photo-1.jpg ${width}w`)
    }
  })

  it('is empty for a photograph uploaded before renditions existed', () => {
    // Advertising widths that are not there is worse than advertising none.
    expect(photoSrcSet(LEGACY)).toBe('')
  })

  it('leaves unrelated images alone, so film posters are untouched', () => {
    expect(photoSrcSet('/api/poster/title-1?file=thumbnail_1.jpg')).toBe('')
    expect(photoSrcSet('data:image/svg+xml;base64,abc')).toBe('')
  })

  it('rewrites only the width segment, never the id', () => {
    // A photo id could contain anything; only the `/w<width>/` segment may move.
    const url = 'https://cdn.example.net/c/w2048/w2048/w2048-id.jpg'
    expect(photoSrcSet(url).split(', ')[2]).toContain('/w480/')
  })
})
