import type { NextConfig } from 'next'

/**
 * Security headers applied to every response.
 *
 * `X-Robots-Tag` is deliberately global: a catalogue is somebody's wedding and must never be
 * indexable (doc 05 §4, doc 01 US-5). The admin has no reason to be indexed either, so the
 * blanket header is both the correct and the safest default — there is no public surface in
 * this product that wants a crawler.
 */
const securityHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, noimageindex' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Emits a self-contained server bundle so the Docker image does not ship node_modules.
  output: process.env.NEXT_OUTPUT_STANDALONE === '1' ? 'standalone' : undefined,
  typedRoutes: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.b-cdn.net' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
