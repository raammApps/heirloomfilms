import { describe, expect, it } from 'vitest'
import { dictionary, parseLocale, resolveLocalised, translate } from '@/lib/i18n'

/** doc 10 §1 test 9: Hindi falls back to English silently — never a key, never a blank. */

describe('translate', () => {
  it('returns Hindi when present', () => {
    expect(translate('hi', 'billboard.play')).toBe('चलाएँ')
  })

  it('interpolates variables', () => {
    expect(translate('en', 'footer.presentedBy', { name: 'Kalyanam' })).toBe(
      'Presented by Kalyanam',
    )
    expect(translate('hi', 'photo.counter', { index: 2, total: 9 })).toBe('9 में से 2')
  })

  it('leaves an unknown placeholder alone rather than printing undefined', () => {
    expect(translate('en', 'footer.presentedBy', {})).toBe('Presented by {name}')
  })

  it('has a Hindi entry for every English key, so nothing silently degrades', () => {
    const missing = Object.keys(dictionary.en).filter(
      (key) => !(key in dictionary.hi),
    )
    expect(missing).toEqual([])
  })

  it('never renders an empty string for a known key', () => {
    for (const locale of ['en', 'hi'] as const) {
      for (const key of Object.keys(dictionary.en) as (keyof typeof dictionary.en)[]) {
        expect(translate(locale, key).trim().length, `${locale}:${key}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('resolveLocalised', () => {
  it('falls back to English when the Hindi value is missing', () => {
    expect(resolveLocalised({ en: 'The Ceremony' }, 'hi')).toBe('The Ceremony')
  })

  it('falls back to English when the Hindi value is blank or whitespace', () => {
    expect(resolveLocalised({ en: 'The Ceremony', hi: '   ' }, 'hi')).toBe('The Ceremony')
  })

  it('never returns the key or undefined for a null value', () => {
    expect(resolveLocalised(null, 'hi')).toBe('')
    expect(resolveLocalised(undefined, 'en')).toBe('')
  })

  it('accepts a plain string for convenience', () => {
    expect(resolveLocalised('Sangeet', 'hi')).toBe('Sangeet')
  })
})

describe('parseLocale', () => {
  it.each([
    ['hi', 'hi'],
    ['hi-IN', 'hi'],
    ['en-GB,en;q=0.9', 'en'],
    ['fr', 'en'],
    ['', 'en'],
    [null, 'en'],
  ])('parses %s as %s', (input, expected) => {
    expect(parseLocale(input)).toBe(expected)
  })
})
