import { RESERVED_SUBDOMAINS } from './schema'

/**
 * Host → what to serve. A pure function with no I/O so it can be exhaustively unit tested
 * (doc 05 §5, doc 10 §1 test 1) and run inside middleware on the edge.
 */

export type TenantResolution =
  | { kind: 'marketing' }
  | { kind: 'admin' }
  | { kind: 'catalogue'; slug: string; source: 'subdomain' }
  | { kind: 'custom-domain'; host: string }
  | { kind: 'unknown'; host: string }

/** Strip the port and any trailing dot, lowercase. `Host` headers are not normalised for us. */
export function normaliseHost(rawHost: string | null | undefined): string {
  if (!rawHost) return ''
  return rawHost.trim().toLowerCase().split(':')[0]!.replace(/\.$/, '')
}

export function resolveTenant(rawHost: string | null | undefined, rawRoot: string): TenantResolution {
  const host = normaliseHost(rawHost)
  const root = normaliseHost(rawRoot)

  if (!host) return { kind: 'unknown', host: '' }

  if (host === root || host === `www.${root}`) return { kind: 'marketing' }

  if (host.endsWith(`.${root}`)) {
    const label = host.slice(0, -(root.length + 1))

    // Only a single label is a catalogue. `a.b.mehfil.app` is not a tenant, it is a mistake.
    if (label.includes('.')) return { kind: 'unknown', host }

    if (label === 'admin') return { kind: 'admin' }
    if ((RESERVED_SUBDOMAINS as readonly string[]).includes(label)) return { kind: 'unknown', host }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label)) return { kind: 'unknown', host }

    return { kind: 'catalogue', slug: label, source: 'subdomain' }
  }

  // Anything else is either a configured custom domain or noise; the DB decides. Localhost
  // without a subdomain is treated as marketing so `pnpm dev` lands somewhere useful.
  if (host === 'localhost' || host === '127.0.0.1') return { kind: 'marketing' }

  return { kind: 'custom-domain', host }
}

/** The public URL of a catalogue, used for share links and OG tags. */
export function catalogueUrl(slug: string, rootDomain: string, path = '/'): string {
  const isLocal = /localhost|127\.0\.0\.1/.test(rootDomain)
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${slug}.${rootDomain}${path}`
}
