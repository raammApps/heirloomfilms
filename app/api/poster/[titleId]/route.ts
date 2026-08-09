import { NextResponse } from 'next/server'
import { resolveAccess } from '@/lib/catalogue-access'
import { getRepository } from '@/lib/db'
import { route } from '@/lib/http/handler'
import { getVideoProvider } from '@/lib/video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * A stable URL for a title's poster frame.
 *
 * Enabling token authentication protects *every* file in the Bunny zone, posters included, and
 * a signed URL expires. `titles.poster_url` is persisted, rendered into ISR-cached pages and
 * baked into the OG image — so storing a signed URL there yields a poster that works today and
 * 403s in four hours, which is the worst kind of failure: invisible until someone reopens their
 * wedding a year later.
 *
 * So the database stores `/api/poster/<titleId>?file=…`, which never expires, and this route
 * mints a fresh signature per request and redirects. Bytes still come from the CDN — this is a
 * 302, not a proxy, so doc 07's "no server-side video proxy" holds.
 */

/** Long enough for a browser to follow the redirect and fetch; short enough to stay fresh. */
const ASSET_TTL_S = 60 * 60

/** Below the token TTL, so a cached redirect can never outlive the URL it points at. */
const CACHE_S = 15 * 60

export async function GET(
  request: Request,
  { params }: { params: Promise<{ titleId: string }> },
) {
  return route('poster', async () => {
    const { titleId } = await params
    const file = new URL(request.url).searchParams.get('file') ?? 'thumbnail_1.jpg'

    // No path traversal out of the asset's own directory.
    if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
      return new NextResponse(null, { status: 400 })
    }

    const repository = getRepository()
    const title = await repository.getTitle(titleId)
    if (!title?.providerId) return new NextResponse(null, { status: 404 })

    /**
     * A poster is a still from someone's wedding, so it gets the same gate the films get: a
     * draft or lapsed catalogue must not leak its imagery. Operators reach posters through the
     * admin, which loads them from the same route — so this deliberately allows an unpublished
     * *title* inside a servable catalogue, but not an unservable catalogue.
     */
    const catalogue = await repository.getCatalogueById(title.catalogueId)
    if (!catalogue) return new NextResponse(null, { status: 404 })

    const verdict = await resolveAccess(catalogue.slug)
    const servable = verdict.kind === 'ok' || verdict.kind === 'draft' || verdict.kind === 'locked'
    if (!servable) return new NextResponse(null, { status: 404 })

    const url = await getVideoProvider().getAssetUrl({
      providerId: title.providerId,
      file,
      ttlS: ASSET_TTL_S,
    })

    return NextResponse.redirect(new URL(url, request.url), {
      status: 302,
      headers: { 'cache-control': `public, max-age=${CACHE_S}` },
    })
  })
}
