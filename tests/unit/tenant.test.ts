import { describe, expect, it } from 'vitest'
import { catalogueUrl, normaliseHost, resolveTenant } from '@/lib/tenant'

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
})
