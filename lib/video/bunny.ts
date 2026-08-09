import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import { ApiError } from '@/lib/http/errors'
import { log } from '@/lib/log'
import {
  TUS_CHUNK_BYTES,
  type AssetStatus,
  type PlaybackTicket,
  type UploadTicket,
  type Usage,
  type VideoProvider,
} from './provider'

const API_BASE = 'https://video.bunnycdn.com/library'
const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload'

/** Bunny's numeric status codes, from their Stream API. */
const STATUS_MAP: Record<number, AssetStatus['state']> = {
  0: 'uploading',
  1: 'uploading',
  2: 'processing',
  3: 'processing',
  4: 'ready',
  5: 'failed',
  6: 'processing',
}

export class BunnyProvider implements VideoProvider {
  readonly name = 'bunny'

  private get libraryId(): string {
    return env.BUNNY_LIBRARY_ID!
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}/${this.libraryId}${path}`, {
      ...init,
      headers: {
        AccessKey: env.BUNNY_API_KEY!,
        accept: 'application/json',
        'content-type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      log.error('bunny: api call failed', {
        path,
        status: response.status,
        body: body.slice(0, 300),
      })
      throw new ApiError('INTERNAL', `Bunny responded ${response.status}`)
    }

    return (await response.json()) as T
  }

  async createUpload({
    title,
    sizeBytes,
  }: {
    title: string
    sizeBytes: number
  }): Promise<UploadTicket> {
    const video = await this.call<{ guid: string }>('/videos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })

    // TUS creation is authorised by sha256(libraryId + apiKey + expiry + videoId). Bunny
    // validates it server-side, which is what keeps our API key out of the browser.
    const expire = Math.floor(Date.now() / 1000) + 24 * 60 * 60
    const signature = createHash('sha256')
      .update(`${this.libraryId}${env.BUNNY_API_KEY}${expire}${video.guid}`)
      .digest('hex')

    log.info('bunny: upload created', { providerId: video.guid, sizeBytes })

    return {
      providerId: video.guid,
      tusEndpoint: TUS_ENDPOINT,
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expire),
        VideoId: video.guid,
        LibraryId: this.libraryId,
      },
      chunkSizeBytes: TUS_CHUNK_BYTES,
    }
  }

  async getPlaybackToken({
    providerId,
    scope,
    ttlS,
  }: {
    providerId: string
    scope: { catalogueId: string; titleId: string }
    ttlS: number
  }): Promise<PlaybackTicket> {
    const host = env.BUNNY_CDN_HOSTNAME!
    const expires = Math.floor(Date.now() / 1000) + ttlS

    /**
     * Sign the **directory**, not the manifest.
     *
     * `token = base64url(sha256(securityKey + path + expires))` is Bunny's URL token
     * authentication, and signing `/{guid}/playlist.m3u8` does authorise that one file — which
     * is exactly the trap. HLS immediately fetches `/{guid}/240p/video.m3u8` and the segments
     * beneath it, and those 403 with a file-scoped token. Playback would show the poster, load
     * the manifest, and then die. Signing `/{guid}/` covers the whole rendition tree with one
     * token, and the guid in the path is itself the scope: a token minted for one video cannot
     * authorise another, whatever the caller claims.
     *
     * Verified against the live CDN by `pnpm verify:playback`, which asserts a child playlist
     * as well as the manifest. Do not "simplify" this back to the file path.
     */
    const directory = `/${providerId}/`
    const token = createHash('sha256')
      .update(`${env.BUNNY_TOKEN_AUTH_KEY}${directory}${expires}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    // No extra query parameters on the signed URL: Bunny validates the request as a whole, and
    // an audit tag appended here silently breaks playback. `scope` is enforced where it belongs
    // — the token endpoint only mints a URL after checking this catalogue owns this title.
    void scope

    const query = `?token=${token}&expires=${expires}`

    return {
      playbackUrl: `https://${host}${directory}playlist.m3u8${query}`,
      thumbnailsUrl: `https://${host}${directory}seek/seek.vtt${query}`,
      expiresAt: new Date(expires * 1000).toISOString(),
    }
  }

  async getStatus(providerId: string): Promise<AssetStatus> {
    const video = await this.call<{
      status: number
      length: number
      thumbnailCount: number
      thumbnailFileName?: string
      encodeProgress: number
    }>(`/videos/${providerId}`)

    const state = STATUS_MAP[video.status] ?? 'processing'
    const host = env.BUNNY_CDN_HOSTNAME!

    return {
      state,
      durationS: video.length > 0 ? Math.round(video.length) : null,
      // Bunny generates evenly spaced stills; the first three are the poster candidates the
      // operator picks from (doc 09 P0-10).
      posterCandidates:
        state === 'ready'
          ? Array.from(
              { length: Math.min(3, Math.max(video.thumbnailCount, 1)) },
              (_, i) => `https://${host}/${providerId}/thumbnail_${i + 1}.jpg`,
            )
          : [],
      thumbnailsUrl: state === 'ready' ? `https://${host}/${providerId}/seek/seek.vtt` : null,
      errorMessage: state === 'failed' ? 'The provider could not encode this file' : null,
    }
  }

  async deleteAsset(providerId: string): Promise<void> {
    await this.call(`/videos/${providerId}`, { method: 'DELETE' })
  }

  async getUsage(providerId: string): Promise<Usage> {
    const video = await this.call<{ storageSize: number }>(`/videos/${providerId}`)
    return { storedGb: video.storageSize / 1024 ** 3, deliveredGb: 0 }
  }

  verifyWebhook(rawBody: string, headers: Headers) {
    const secret = env.BUNNY_WEBHOOK_SECRET
    if (!secret) {
      log.error('bunny: webhook received but BUNNY_WEBHOOK_SECRET is unset — rejecting')
      return null
    }

    const provided = headers.get('x-bunny-signature') ?? ''
    const expected = createHash('sha256').update(`${secret}${rawBody}`).digest('hex')
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null

    try {
      const payload = JSON.parse(rawBody) as { VideoGuid?: string; Status?: number }
      if (!payload.VideoGuid) return null
      const state = STATUS_MAP[payload.Status ?? 2] ?? 'processing'
      return {
        providerId: payload.VideoGuid,
        state,
        ...(state === 'failed' ? { errorMessage: 'The provider could not encode this file' } : {}),
      }
    } catch {
      return null
    }
  }
}
