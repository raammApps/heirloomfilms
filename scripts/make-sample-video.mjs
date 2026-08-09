#!/usr/bin/env node
/**
 * Generate the sample clip the `fake` video driver serves.
 *
 * Why generate rather than commit a stock file: doc 12 §1 requires a licence check on every
 * asset we ship, and doc 13 §8 is explicit that the demo must not use footage of strangers.
 * Rendering our own from a canvas sidesteps both — the bytes are parametric originals, the
 * same rule the poster motifs follow.
 *
 * It buys two things. `E2E-1` can assert that playback actually starts and resumes at a real
 * position, rather than asserting that a `<video>` element exists. And an offline demo on venue
 * wifi plays something instead of showing an error.
 *
 *   node scripts/make-sample-video.mjs
 *
 * Re-run only when the clip needs to change; the output is committed.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const DURATION_MS = 12_000
const WIDTH = 480
const HEIGHT = 270
/** Held low deliberately: this is a committed fixture, not a demo reel. Target ~200KB. */
const BITRATE = 120_000
const OUTPUT = 'public/media/sample.webm'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('about:blank')

console.log(`Rendering ${DURATION_MS / 1000}s at ${WIDTH}×${HEIGHT}…`)

const base64 = await page.evaluate(
  async ({ durationMs, width, height, bitrate }) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')

    // The same six gradient pairs the generated poster art uses, so the clip belongs to the
    // same visual family as everything around it.
    const pairs = [
      ['#f2933a', '#d4547e'],
      ['#e0b155', '#4a2350'],
      ['#3b3f8f', '#d4547e'],
    ]

    const stream = canvas.captureStream(25)
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: bitrate,
    })
    const chunks = []
    recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data)

    const finished = new Promise((resolve) => {
      recorder.onstop = resolve
    })

    recorder.start()
    const startedAt = performance.now()

    await new Promise((resolve) => {
      function frame() {
        const elapsed = performance.now() - startedAt
        const progress = Math.min(1, elapsed / durationMs)

        const pair = pairs[Math.floor(progress * pairs.length) % pairs.length]
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, pair[0])
        gradient.addColorStop(1, pair[1])
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)

        // A moving element, so a seek visibly lands somewhere different — which is what makes
        // "resumed at the right second" observable rather than notional.
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 3
        for (let ring = 1; ring <= 5; ring++) {
          ctx.beginPath()
          ctx.arc(
            width / 2 + Math.cos(progress * Math.PI * 4) * 120,
            height / 2 + Math.sin(progress * Math.PI * 4) * 60,
            ring * 22,
            0,
            Math.PI * 2,
          )
          ctx.stroke()
        }

        // A visible timecode: a screenshot of the player is then self-describing.
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 32px monospace'
        ctx.fillText(`${(elapsed / 1000).toFixed(1)}s`, 22, height - 22)

        if (progress >= 1) {
          resolve()
          return
        }
        requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    })

    recorder.stop()
    await finished

    const blob = new Blob(chunks, { type: 'video/webm' })
    const buffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  },
  { durationMs: DURATION_MS, width: WIDTH, height: HEIGHT, bitrate: BITRATE },
)

await browser.close()

const buffer = Buffer.from(base64, 'base64')
await mkdir('public/media', { recursive: true })
await writeFile(OUTPUT, buffer)

console.log(`Wrote ${OUTPUT} — ${(buffer.length / 1024).toFixed(0)}KB`)
