import type { Category } from './schema'

/**
 * Deterministic generated poster art (doc 04 §6).
 *
 * Half of Phase 0 tenants will have no photography ready, so this is not a fallback that may
 * look like one — it has to read as intentional. Everything is derived from the card slug so
 * the same title always gets the same artwork across builds and across the OG image.
 *
 * The motifs are parametric originals — generated from numbers, never traced (doc 12 §1 rule 7).
 */

export type GradientPair = { from: string; to: string; ink: string }

const PALETTES: GradientPair[] = [
  { from: '#f2933a', to: '#d4547e', ink: '#2a0d16' }, // marigold / rose
  { from: '#e0b155', to: '#4a2350', ink: '#ffffff' }, // gold / aubergine
  { from: '#3b3f8f', to: '#d4547e', ink: '#ffffff' }, // indigo / rose
  { from: '#1f6b52', to: '#e0b155', ink: '#06231a' }, // emerald / gold
  { from: '#2b2f45', to: '#f2933a', ink: '#ffffff' }, // dusk / marigold
  { from: '#141418', to: '#e0b155', ink: '#ffffff' }, // ink / gold
]

const MOTIFS = ['mandala', 'paisley', 'torana', 'lotus'] as const
export type Motif = (typeof MOTIFS)[number]

/** FNV-1a — small, stable, and not dependent on any crypto API so it runs on the edge. */
export function hashSlug(slug: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function paletteFor(slug: string): GradientPair {
  return PALETTES[hashSlug(slug) % PALETTES.length]!
}

export function motifFor(slug: string): Motif {
  return MOTIFS[(hashSlug(slug) >>> 8) % MOTIFS.length]!
}

function motifPath(motif: Motif, seed: number): string {
  const petals = 6 + (seed % 7)
  const parts: string[] = []

  switch (motif) {
    case 'mandala': {
      for (let ring = 1; ring <= 3; ring++) {
        const radius = ring * 90
        for (let i = 0; i < petals * ring; i++) {
          const angle = (i / (petals * ring)) * Math.PI * 2
          const x = 300 + Math.cos(angle) * radius
          const y = 300 + Math.sin(angle) * radius
          parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}m-18 0a18 18 0 1 0 36 0a18 18 0 1 0-36 0`)
        }
      }
      break
    }
    case 'paisley': {
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2
        const cx = 300 + Math.cos(angle) * 150
        const cy = 300 + Math.sin(angle) * 150
        parts.push(
          `M${cx.toFixed(1)} ${cy.toFixed(1)}c60 -70 130 -20 90 60c-30 60 -110 70 -140 10c-25 -50 20 -90 50 -70`,
        )
      }
      break
    }
    case 'torana': {
      for (let i = 0; i < petals; i++) {
        const x = 40 + i * (520 / petals)
        parts.push(`M${x.toFixed(1)} 120q${(260 / petals).toFixed(1)} 140 ${(520 / petals).toFixed(1)} 0`)
      }
      parts.push('M0 120h600')
      break
    }
    case 'lotus': {
      for (let i = 0; i < petals * 2; i++) {
        const angle = (i / (petals * 2)) * Math.PI * 2
        const x = 300 + Math.cos(angle) * 210
        const y = 380 + Math.sin(angle) * 120
        parts.push(`M300 380Q${x.toFixed(1)} ${(y - 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`)
      }
      break
    }
  }

  return parts.join(' ')
}

export type PosterOptions = {
  slug: string
  label: string
  eyebrow?: string
  width?: number
  height?: number
}

/**
 * An SVG poster as a string. Rendered as a `data:` URI in `<img src>` so it costs no request
 * and cannot be blocked, and is byte-identical between the server and the client.
 */
export function generatePosterSvg({
  slug,
  label,
  eyebrow,
  width = 600,
  height = 900,
}: PosterOptions): string {
  const palette = paletteFor(slug)
  const motif = motifFor(slug)
  const seed = hashSlug(slug)
  const escape = (text: string) =>
    text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`).slice(0, 60)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">`,
    '<defs>',
    `<linearGradient id="g" x1="0" y1="0" x2="0.7" y2="1" gradientTransform="rotate(145 0.5 0.5)">`,
    `<stop offset="0" stop-color="${palette.from}"/><stop offset="1" stop-color="${palette.to}"/>`,
    '</linearGradient>',
    `<linearGradient id="s" x1="0" y1="1" x2="0" y2="0">`,
    `<stop offset="0" stop-color="#0c0c0d" stop-opacity="0.92"/><stop offset="0.55" stop-color="#0c0c0d" stop-opacity="0"/>`,
    '</linearGradient>',
    `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/></filter>`,
    '</defs>',
    `<rect width="${width}" height="${height}" fill="url(#g)"/>`,
    `<g transform="translate(${width / 2 - 300} ${height / 2 - 340}) scale(1)" fill="none" stroke="${palette.ink}" stroke-opacity="0.13" stroke-width="3">`,
    `<path d="${motifPath(motif, seed)}"/>`,
    '</g>',
    `<rect width="${width}" height="${height}" fill="url(#s)"/>`,
    `<rect width="${width}" height="${height}" filter="url(#n)" opacity="0.03"/>`,
    eyebrow
      ? `<text x="44" y="${height - 108}" fill="#f5f5f6" fill-opacity="0.72" font-family="Inter,system-ui,sans-serif" font-size="22" letter-spacing="4">${escape(eyebrow.toUpperCase())}</text>`
      : '',
    `<text x="44" y="${height - 52}" fill="#f5f5f6" font-family="Archivo,Impact,sans-serif" font-size="52" font-weight="800" letter-spacing="-1">${escape(label)}</text>`,
    '</svg>',
  ].join('')
}

export function posterDataUri(options: PosterOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generatePosterSvg(options))}`
}

const CATEGORY_EYEBROWS: Record<Category, string> = {
  highlights: 'Highlights',
  pre_wedding: 'Pre-Wedding',
  mehendi: 'Mehendi',
  haldi: 'Haldi',
  sangeet: 'Sangeet',
  ceremony: 'The Ceremony',
  reception: 'Reception',
  full_films: 'Full Film',
  aerial: 'From Above',
  guest_wishes: 'Wishes',
  behind_scenes: 'Behind the Scenes',
}

export function categoryEyebrow(category: Category): string {
  return CATEGORY_EYEBROWS[category]
}
