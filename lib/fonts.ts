import localFont from 'next/font/local'

/**
 * Self-hosted, per doc 04 §3 — no third-party request on a 3G first paint, and no
 * data-transfer question under DPDP. All three faces are SIL OFL 1.1; see
 * `public/fonts/LICENSES.md`.
 */

export const archivo = localFont({
  src: [{ path: '../public/fonts/archivo-latin-800-900.woff2', weight: '800 900', style: 'normal' }],
  variable: '--font-archivo',
  display: 'swap',
  preload: true,
  fallback: ['Impact', 'sans-serif'],
})

export const inter = localFont({
  src: [{ path: '../public/fonts/inter-latin-400-600.woff2', weight: '400 600', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})

export const mukta = localFont({
  src: [
    { path: '../public/fonts/mukta-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/mukta-devanagari-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/mukta-latin-700.woff2', weight: '700', style: 'normal' },
    { path: '../public/fonts/mukta-devanagari-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-mukta',
  display: 'swap',
  // Devanagari is only needed once a guest switches to Hindi; preloading it would cost every
  // English first paint ~130KB for nothing.
  preload: false,
  fallback: ['Noto Sans Devanagari', 'sans-serif'],
})

export const fontVariables = `${archivo.variable} ${inter.variable} ${mukta.variable}`
