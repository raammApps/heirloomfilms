/**
 * Rendition URLs, derived from a stored master.
 *
 * **Deliberately free of imports.** Guest modules are client components, and `lib/photos/index`
 * reaches `lib/env` through the Bunny driver, which is `server-only`. Pulling that into a
 * `<img>` would put the storage password's module graph in the browser bundle — the same class
 * of mistake that once dragged `lib/env` into the client and broke hydration on every guest
 * page. Keeping this file dependency-free is what makes it safe on both sides.
 */

/** The widths every new photograph is stored at, widest first. */
export const PHOTO_WIDTHS = [2048, 1024, 480] as const

/**
 * The `srcset` for a stored photograph.
 *
 * Empty for anything uploaded before renditions existed — those have one file, and advertising
 * widths that are not there would put a 404 inside a `srcset` and leave a hole in the gallery.
 * The width segment in the path is what makes the two cases distinguishable.
 */
export function photoSrcSet(url: string): string {
  const widest = PHOTO_WIDTHS[0]
  if (!url.includes(`/w${widest}/`)) return ''

  return PHOTO_WIDTHS.map(
    (width) => `${url.replace(`/w${widest}/`, `/w${width}/`)} ${width}w`,
  ).join(', ')
}
