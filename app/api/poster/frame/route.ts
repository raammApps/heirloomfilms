import { generatePosterSvg } from '@/lib/poster'

export const runtime = 'nodejs'

/**
 * Deterministic placeholder imagery for the fake video driver and the demo photographs.
 *
 * This exists so an offline demo and the Playwright suite have real, stable image bytes to
 * render without shipping binaries in the repo. Production posters come from the provider.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const asset = url.searchParams.get('asset') ?? 'unknown'
  const n = url.searchParams.get('n') ?? '1'
  const label = url.searchParams.get('label') ?? ''

  const svg = generatePosterSvg({
    slug: `${asset}#${n}`,
    label,
    width: 1600,
    height: 1200,
  })

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
