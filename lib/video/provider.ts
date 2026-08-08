/**
 * The narrow interface over the video platform (doc 05 §2).
 *
 * Five methods, no provider types leaking past this file. Switching from Bunny to Cloudflare
 * is a new implementation of this interface and one line in `lib/video/index.ts` — the
 * decision in doc 05 is explicitly a default, not a lock-in, and the code should keep it that
 * way.
 */

export type UploadTicket = {
  /** Opaque provider id for the asset — persisted as `titles.provider_id`. */
  providerId: string
  /** TUS endpoint the browser uploads to. Bytes never pass through our server. */
  tusEndpoint: string
  /** Headers the browser must send with the TUS creation request. Short-lived. */
  headers: Record<string, string>
  chunkSizeBytes: number
}

export type PlaybackTicket = {
  playbackUrl: string
  thumbnailsUrl: string | null
  expiresAt: string
}

export type AssetStatus = {
  state: 'uploading' | 'processing' | 'ready' | 'failed'
  durationS: number | null
  posterCandidates: string[]
  thumbnailsUrl: string | null
  errorMessage: string | null
}

export type Usage = {
  storedGb: number
  deliveredGb: number
}

export interface VideoProvider {
  readonly name: string

  createUpload(input: {
    /** Used only as the provider-side display name; the guest never sees it. */
    title: string
    sizeBytes: number
  }): Promise<UploadTicket>

  /**
   * A short-lived, catalogue+title-scoped playback URL. `scope` is bound into the token so a
   * leaked token for one film cannot fetch another (doc 10 §1 test 7).
   */
  getPlaybackToken(input: {
    providerId: string
    scope: { catalogueId: string; titleId: string }
    ttlS: number
  }): Promise<PlaybackTicket>

  getStatus(providerId: string): Promise<AssetStatus>

  deleteAsset(providerId: string): Promise<void>

  getUsage(providerId: string): Promise<Usage>

  /**
   * Verify a webhook payload's authenticity. Returns the provider id and state, or null when
   * the signature does not check out — the handler rejects on null before parsing anything.
   */
  verifyWebhook(
    rawBody: string,
    headers: Headers,
  ): { providerId: string; state: AssetStatus['state']; errorMessage?: string } | null
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024
export const TUS_CHUNK_BYTES = 5 * 1024 * 1024

export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/x-msvideo',
] as const

export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'] as const

/**
 * Container check that runs before a byte moves (doc 05 §3 requirement 5). Browsers report an
 * empty `type` for some containers on Android, so the extension is the authority and the MIME
 * type is corroboration.
 */
export function isAcceptedVideo(filename: string, mimeType?: string): boolean {
  const lower = filename.toLowerCase()
  const extensionOk = ACCEPTED_VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
  if (extensionOk) return true
  return !!mimeType && (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(mimeType)
}
