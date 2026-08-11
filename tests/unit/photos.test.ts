import { describe, expect, it } from 'vitest'
import { defaultAlbumId, photoKey } from '@/lib/photos'
import { FakePhotoProvider } from '@/lib/photos/fake'

/**
 * Photographs upload several at a time, which is where the interesting failure lives.
 *
 * The first working version generated a fresh album id per request, so three photographs
 * dropped together produced three albums: every request reached "does an album exist?" before
 * any had finished creating one. Deriving the id makes the primary key arbitrate instead.
 */

const CATALOGUE = '79594419-9452-406b-9510-2b75c925919b'

describe('defaultAlbumId', () => {
  it('is stable, so parallel uploads converge on one album', () => {
    const ids = Array.from({ length: 8 }, () => defaultAlbumId(CATALOGUE))
    expect(new Set(ids).size).toBe(1)
  })

  it('differs per catalogue, so one couple never writes into another album', () => {
    expect(defaultAlbumId(CATALOGUE)).not.toBe(defaultAlbumId('11111111-1111-4111-8111-111111111111'))
  })

  it('is a valid v5 uuid, because the column is typed', () => {
    expect(defaultAlbumId(CATALOGUE)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})

describe('photoKey', () => {
  it('namespaces by catalogue, so deleting one sweeps a prefix', () => {
    expect(photoKey(CATALOGUE, 'photo-1', 'jpg')).toBe(`c/${CATALOGUE}/photo-1.jpg`)
  })

  it('normalises the extension however it arrives', () => {
    expect(photoKey(CATALOGUE, 'p', '.JPG')).toBe(`c/${CATALOGUE}/p.jpg`)
  })
})

describe('the provider contract', () => {
  it('stores, serves and forgets', async () => {
    const provider = new FakePhotoProvider()
    const key = photoKey(CATALOGUE, 'p1', 'png')

    const stored = await provider.put(key, new ArrayBuffer(8), 'image/png')
    expect(stored.url).toBe(provider.urlFor(key))
    expect(provider.list()).toEqual([key])

    await provider.remove(key)
    expect(provider.list()).toEqual([])
  })

  it('treats deleting twice as success', async () => {
    const provider = new FakePhotoProvider()
    await expect(provider.remove('never-existed')).resolves.toBeUndefined()
  })
})
