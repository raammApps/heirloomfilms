import 'server-only'
import { env } from '@/lib/env'
import { log } from '@/lib/log'
import type { PhotoProvider, StoredPhoto } from './provider'

/**
 * Bunny Edge Storage, read through the pull zone in front of it.
 *
 * Two hostnames, and confusing them is the whole difficulty:
 *
 * - `<region>.storage.bunnycdn.com` — the **origin**. Writes go here, authenticated with the
 *   zone password. Never reachable from a browser; the password is a full read/write/delete
 *   credential for every catalogue's photographs.
 * - `<zone>.b-cdn.net` — the **pull zone**. Public reads, no credential.
 *
 * The storage zone lives in Singapore, matching the Stream library: Bunny has no India origin,
 * and delivery still uses the India PoPs, which is what doc 05 §2's cost maths depends on.
 */

/** Bunny's regional origins. `de` is the default and carries no prefix. */
function originHost(region: string): string {
  const code = region.trim().toLowerCase()
  return code === 'de' || code === '' ? 'storage.bunnycdn.com' : `${code}.storage.bunnycdn.com`
}

export class BunnyPhotoProvider implements PhotoProvider {
  readonly name = 'bunny'

  private get origin(): string {
    return `https://${originHost(env.BUNNY_STORAGE_REGION)}/${env.BUNNY_STORAGE_ZONE}`
  }

  urlFor(key: string): string {
    return `https://${env.BUNNY_PHOTO_CDN_HOSTNAME}/${key}`
  }

  async put(key: string, body: ArrayBuffer, contentType: string): Promise<StoredPhoto> {
    const response = await fetch(`${this.origin}/${key}`, {
      method: 'PUT',
      headers: {
        AccessKey: env.BUNNY_STORAGE_PASSWORD ?? '',
        'content-type': contentType,
      },
      body,
    })

    if (!response.ok) {
      // The body carries Bunny's reason; the status alone does not distinguish a bad key from
      // a zone that does not exist, and both look like "upload broken" to an operator.
      const detail = await response.text().catch(() => '')
      log.error('photo storage: put failed', { key, status: response.status, detail: detail.slice(0, 200) })
      throw new Error(`Storage rejected the upload (${response.status}).`)
    }

    return { url: this.urlFor(key), key }
  }

  async remove(key: string): Promise<void> {
    const response = await fetch(`${this.origin}/${key}`, {
      method: 'DELETE',
      headers: { AccessKey: env.BUNNY_STORAGE_PASSWORD ?? '' },
    })

    // 404 is success: the caller wanted the file gone, and it is.
    if (!response.ok && response.status !== 404) {
      log.warn('photo storage: delete failed', { key, status: response.status })
    }
  }
}
