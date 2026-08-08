import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness and configuration probe. Deliberately reports *which drivers* are active but never
 * a credential — a deploy that silently came up on the memory driver is the failure this is
 * here to catch.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
      drivers: { data: env.DATA_DRIVER, video: env.VIDEO_DRIVER },
      at: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
