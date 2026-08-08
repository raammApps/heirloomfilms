import { env } from '@/lib/env'
import { BunnyProvider } from './bunny'
import { FakeVideoProvider } from './fake'
import type { VideoProvider } from './provider'

const KEY = Symbol.for('mehfil.videoProvider')
type Global = typeof globalThis & { [KEY]?: VideoProvider }

/** The one switch on provider in the codebase (doc 05 §2). */
export function getVideoProvider(): VideoProvider {
  const g = globalThis as Global
  g[KEY] ??= env.VIDEO_DRIVER === 'bunny' ? new BunnyProvider() : new FakeVideoProvider()
  return g[KEY]
}

export function setVideoProvider(provider: VideoProvider): void {
  ;(globalThis as Global)[KEY] = provider
}

export * from './provider'
