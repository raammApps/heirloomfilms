/**
 * The narrow interface over photo storage.
 *
 * Deliberately smaller than `lib/video/provider.ts`, because photographs are a different
 * problem: no transcode, no webhook, no signed playback. Bytes go up, a stable public URL
 * comes back. Three methods, no provider types past this file, so moving from Bunny Storage to
 * anything else is a new implementation and one line in `lib/photos/index.ts`.
 *
 * **Why bytes pass through our server here, unlike video.** Film upload hands the browser a
 * short-lived TUS ticket so multi-gigabyte transfers never touch us. Storage has no equivalent:
 * authenticating a browser PUT means shipping the zone's write password to the client, which
 * would let anyone who opened devtools write to — and delete from — every catalogue's storage.
 * Photographs are megabytes, not gigabytes, so proxying them is cheap and the trade is obvious.
 */

export type StoredPhoto = {
  /** Public, unsigned, permanent. Safe to persist in `photos.url`. */
  url: string
  /** Path within the zone, kept so the file can be deleted later. */
  key: string
}

export interface PhotoProvider {
  readonly name: string

  /**
   * Store one image and return its public URL.
   *
   * `key` is caller-chosen and must already be namespaced per catalogue — the provider does not
   * invent paths, so there is exactly one place that decides how storage is laid out.
   */
  put(key: string, body: ArrayBuffer, contentType: string): Promise<StoredPhoto>

  /** Remove one image. Missing is success: deleting twice must not be an error. */
  remove(key: string): Promise<void>

  /** The public URL a key maps to, without uploading. */
  urlFor(key: string): string
}
