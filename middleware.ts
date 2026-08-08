import { NextResponse, type NextRequest } from 'next/server'
import { resolveTenant } from '@/lib/tenant'

/**
 * Host → route rewrite (doc 05 §5).
 *
 * `resolveTenant` is a pure function tested exhaustively in `tests/unit/tenant.test.ts`; this
 * file only translates its verdict into a rewrite, so the routing logic itself is testable
 * without spinning up a server.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|media/|api/health).*)'],
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const rootDomain = process.env.ROOT_DOMAIN ?? 'mehfil.localhost:3000'
  const resolution = resolveTenant(request.headers.get('host'), rootDomain)

  // `?__catalogue=` is a dev affordance: it lets a plain `localhost:3000` reach a catalogue
  // without a wildcard DNS entry or an /etc/hosts edit.
  const override = url.searchParams.get('__catalogue')

  switch (resolution.kind) {
    case 'admin':
      if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api')) {
        url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`
        return NextResponse.rewrite(url)
      }
      return NextResponse.next()

    case 'catalogue': {
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) {
        const response = NextResponse.next()
        response.headers.set('x-mehfil-catalogue', resolution.slug)
        return response
      }
      url.pathname = `/c/${resolution.slug}${url.pathname === '/' ? '' : url.pathname}`
      const response = NextResponse.rewrite(url)
      response.headers.set('x-mehfil-catalogue', resolution.slug)
      return response
    }

    case 'custom-domain': {
      if (url.pathname.startsWith('/api')) return NextResponse.next()
      // The slug is unknown until the database is consulted, which middleware must not do.
      // `/d/<host>` resolves it in a server component instead.
      url.pathname = `/d/${resolution.host}${url.pathname === '/' ? '' : url.pathname}`
      return NextResponse.rewrite(url)
    }

    case 'marketing': {
      if (override && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/admin')) {
        url.searchParams.delete('__catalogue')
        url.pathname = `/c/${override}${url.pathname === '/' ? '' : url.pathname}`
        return NextResponse.rewrite(url)
      }
      return NextResponse.next()
    }

    default:
      return NextResponse.next()
  }
}
