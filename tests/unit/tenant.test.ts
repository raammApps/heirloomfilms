import { describe, expect, it } from 'vitest'
import {
  adminUrl,
  cataloguePath,
  catalogueUrl,
  isLocalDomain,
  normaliseHost,
  resolveTenant,
} from '@/lib/tenant'

/**
 * doc 10 §1 test 1: `resolveTenant` for every host shape.
 *
 * This function decides which of two applications a request reaches, on every request, so it
 * gets exhaustive coverage rather than representative coverage.
 */
const ROOT = 'mehfil.app'

describe('resolveTenant', () => {
  it('treats the root domain and www as marketing', () => {
    expect(resolveTenant('mehfil.app', ROOT)).toEqual({ kind: 'marketing' })
    expect(resolveTenant('www.mehfil.app', ROOT)).toEqual({ kind: 'marketing' })
  })

  it('routes the admin subdomain to the admin app', () => {
    expect(resolveTenant('admin.mehfil.app', ROOT)).toEqual({ kind: 'admin' })
  })

  it('resolves a catalogue from a single subdomain label', () => {
    expect(resolveTenant('aanya-vikram.mehfil.app', ROOT)).toEqual({
      kind: 'catalogue',
      slug: 'aanya-vikram',
      source: 'subdomain',
    })
  })

  it('is case-insensitive and ignores the port', () => {
    expect(resolveTenant('Aanya-Vikram.Mehfil.App:3000', ROOT)).toEqual({
      kind: 'catalogue',
      slug: 'aanya-vikram',
      source: 'subdomain',
    })
  })

  it('ignores a trailing dot in the Host header', () => {
    expect(resolveTenant('aanya-vikram.mehfil.app.', ROOT)).toMatchObject({ kind: 'catalogue' })
  })

  it.each(['api', 'cdn', 'static', 'assets', 'demo', 'staging', 'help', 'status', 'blog', 'docs', 'app'])(
    'refuses the reserved subdomain %s',
    (label) => {
      expect(resolveTenant(`${label}.mehfil.app`, ROOT).kind).toBe('unknown')
    },
  )

  it('refuses a multi-label subdomain rather than guessing', () => {
    expect(resolveTenant('a.b.mehfil.app', ROOT)).toEqual({ kind: 'unknown', host: 'a.b.mehfil.app' })
  })

  it('refuses a label that is not slug-shaped', () => {
    expect(resolveTenant('not_a_slug.mehfil.app', ROOT).kind).toBe('unknown')
    expect(resolveTenant('-leading.mehfil.app', ROOT).kind).toBe('unknown')
  })

  it('treats an unrelated host as a candidate custom domain', () => {
    expect(resolveTenant('aanyaandvikram.in', ROOT)).toEqual({
      kind: 'custom-domain',
      host: 'aanyaandvikram.in',
    })
  })

  it('treats bare localhost as marketing so `pnpm dev` lands somewhere', () => {
    expect(resolveTenant('localhost:3000', 'mehfil.localhost:3000')).toEqual({ kind: 'marketing' })
    expect(resolveTenant('127.0.0.1:3000', 'mehfil.localhost:3000')).toEqual({ kind: 'marketing' })
  })

  it('resolves a catalogue under a localhost root domain', () => {
    expect(resolveTenant('aanya-vikram.mehfil.localhost:3000', 'mehfil.localhost:3000')).toEqual({
      kind: 'catalogue',
      slug: 'aanya-vikram',
      source: 'subdomain',
    })
  })

  it('handles a missing Host header', () => {
    expect(resolveTenant(null, ROOT)).toEqual({ kind: 'unknown', host: '' })
    expect(resolveTenant('', ROOT)).toEqual({ kind: 'unknown', host: '' })
  })
})

describe('normaliseHost', () => {
  it('strips port, case and a trailing dot', () => {
    expect(normaliseHost('  Example.COM.:8443 ')).toBe('example.com')
  })
})

describe('catalogueUrl', () => {
  it('uses https in production and http for a localhost root', () => {
    expect(catalogueUrl('aanya-vikram', 'mehfil.app')).toBe('https://aanya-vikram.mehfil.app/')
    expect(catalogueUrl('aanya-vikram', 'mehfil.localhost:3000')).toBe(
      'http://aanya-vikram.mehfil.localhost:3000/',
    )
  })

  /**
   * The domain and the addressing strategy are both configuration. Nothing downstream may
   * assume either — a move from a wildcard to a single CNAME must not reach a component.
   */
  it('addresses a catalogue by path when the mode says so', () => {
    expect(catalogueUrl('aanya-vikram', 'raammcorp.in', '/', 'path')).toBe(
      'https://raammcorp.in/c/aanya-vikram',
    )
    expect(catalogueUrl('aanya-vikram', 'marquee.raammcorp.in', '/watch/x', 'path')).toBe(
      'https://marquee.raammcorp.in/c/aanya-vikram/watch/x',
    )
  })

  it('keeps the subdomain shape when the mode says so', () => {
    expect(catalogueUrl('aanya-vikram', 'raammcorp.in', '/watch/x', 'subdomain')).toBe(
      'https://aanya-vikram.raammcorp.in/watch/x',
    )
  })

  it('works for any domain, which is the whole point', () => {
    for (const domain of ['mehfil.app', 'raammcorp.in', 'marquee.film', 'example.co.uk']) {
      expect(catalogueUrl('couple', domain)).toBe(`https://couple.${domain}/`)
      expect(catalogueUrl('couple', domain, '/', 'path')).toBe(`https://${domain}/c/couple`)
    }
  })
})

describe('cataloguePath', () => {
  /**
   * The relative counterpart of `catalogueUrl`, and the fix for a bug that made the player
   * unreachable in path mode: components pushed `/watch/<slug>`, which is the catalogue root
   * only when the catalogue *is* the site root. In path mode that is the marketing page.
   */
  it('is empty in subdomain mode, where the catalogue is already the root', () => {
    expect(cataloguePath('aanya-vikram', 'subdomain')).toBe('')
    expect(cataloguePath('aanya-vikram')).toBe('')
  })

  it('prefixes every guest route in path mode', () => {
    expect(cataloguePath('aanya-vikram', 'path')).toBe('/c/aanya-vikram')
  })

  it('composes into the same place `catalogueUrl` points at, in both modes', () => {
    for (const mode of ['subdomain', 'path'] as const) {
      const absolute = catalogueUrl('aanya-vikram', 'raammcorp.in', '/watch/the-ceremony', mode)
      const relative = `${cataloguePath('aanya-vikram', mode)}/watch/the-ceremony`
      expect(absolute.endsWith(relative)).toBe(true)
    }
  })
})

describe('isLocalDomain', () => {
  it.each(['localhost:3000', 'lvh.me:3000', 'lvh.me', 'app.localhost', '127.0.0.1:3000'])(
    'treats %s as local, so links use http',
    (domain) => {
      expect(isLocalDomain(domain)).toBe(true)
    },
  )

  it.each(['raammcorp.in', 'marquee.film', 'mehfil.app'])(
    'treats %s as public, so links use https',
    (domain) => {
      expect(isLocalDomain(domain)).toBe(false)
    },
  )
})

describe('adminUrl', () => {
  it('follows the tenancy mode too', () => {
    expect(adminUrl('raammcorp.in')).toBe('https://admin.raammcorp.in')
    expect(adminUrl('raammcorp.in', 'path')).toBe('https://raammcorp.in/admin')
    expect(adminUrl('lvh.me:3000', 'path')).toBe('http://lvh.me:3000/admin')
  })
})

describe('resolveTenant against a real registrable domain', () => {
  // Guards against anything that quietly assumed a `.app` TLD or a two-label domain.
  it('handles a .in domain identically', () => {
    expect(resolveTenant('raammcorp.in', 'raammcorp.in')).toEqual({ kind: 'marketing' })
    expect(resolveTenant('admin.raammcorp.in', 'raammcorp.in')).toEqual({ kind: 'admin' })
    expect(resolveTenant('aanya-vikram.raammcorp.in', 'raammcorp.in')).toEqual({
      kind: 'catalogue',
      slug: 'aanya-vikram',
      source: 'subdomain',
    })
  })

  it('handles a root that is itself a subdomain', () => {
    // `marquee.raammcorp.in` as the root makes `<slug>.marquee.raammcorp.in` a catalogue.
    expect(resolveTenant('marquee.raammcorp.in', 'marquee.raammcorp.in')).toEqual({
      kind: 'marketing',
    })
    expect(resolveTenant('aanya-vikram.marquee.raammcorp.in', 'marquee.raammcorp.in')).toEqual({
      kind: 'catalogue',
      slug: 'aanya-vikram',
      source: 'subdomain',
    })
  })
})
