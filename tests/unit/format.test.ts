import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDurationBadge,
  slugify,
  suggestSlug,
  titleFromFilename,
} from '@/lib/format'

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [7, '0:07'],
    [428, '7:08'],
    [1284, '21:24'],
    [3661, '1:01:01'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatClock(input)).toBe(expected)
  })

  it('clamps a negative position rather than printing a minus sign', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})

describe('formatDurationBadge', () => {
  it('rounds to whole minutes and never shows 0m', () => {
    expect(formatDurationBadge(20)).toBe('1m')
    expect(formatDurationBadge(244)).toBe('4m')
    expect(formatDurationBadge(null)).toBeNull()
    expect(formatDurationBadge(0)).toBeNull()
  })
})

describe('slugify and suggestSlug', () => {
  it('turns a couple name into an address', () => {
    expect(suggestSlug({ en: 'Aanya & Vikram' })).toBe('aanya-and-vikram')
  })

  it('strips punctuation and collapses separators', () => {
    expect(slugify('  The  Sangeet!! (final) ')).toBe('the-sangeet-final')
  })

  it('falls back to something usable when nothing survives', () => {
    expect(suggestSlug({ en: '???' })).toMatch(/^wedding-[a-z0-9]{4}$/)
  })
})

describe('titleFromFilename', () => {
  it('drops the extension and the delivery cruft a studio adds', () => {
    expect(titleFromFilename('sangeet_final_v3_1080p.mp4')).toBe('Sangeet')
    expect(titleFromFilename('WED-highlights-FINAL-color.mov')).toBe('Wed Highlights')
  })

  it('never returns an empty title', () => {
    expect(titleFromFilename('final_v2.mp4')).toBe('Untitled')
  })
})
