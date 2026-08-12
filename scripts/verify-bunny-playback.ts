#!/usr/bin/env tsx
/**
 * Prove the playback path against the real Bunny, end to end.
 *
 * The one thing no unit test can establish: whether *our* token signature is the signature
 * Bunny expects. Get the algorithm subtly wrong and every unit test still passes, the URL still
 * looks right, and every guest gets a 403 — discovered at a wedding.
 *
 * So this uploads a real file, waits for the transcode, and then asserts both directions:
 * a signed URL is served, and an unsigned one is refused. Refusing matters as much as serving
 * — an unenforced zone would serve both and the privacy promise in doc 01 US-5 would be false
 * while every test stayed green.
 *
 *   pnpm verify:playback
 *
 * Consumes a few seconds of encoding. Deletes the video afterwards unless --keep is passed.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const value = match[2]!.trim().replace(/^["']|["']$/g, '')
    if (value) process.env[match[1]!] ??= value
  }
}

const LIBRARY = process.env.BUNNY_LIBRARY_ID
const API_KEY = process.env.BUNNY_API_KEY
const HOST = process.env.BUNNY_CDN_HOSTNAME
const TOKEN_KEY = process.env.BUNNY_TOKEN_AUTH_KEY
const KEEP = process.argv.includes('--keep')
const SAMPLE = 'public/media/sample.webm'

if (!LIBRARY || !API_KEY || !HOST || !TOKEN_KEY) {
  console.error('Bunny is not configured. Run `pnpm preflight`.')
  process.exit(1)
}

const api = (path: string, init?: RequestInit) =>
  fetch(`https://video.bunnycdn.com/library/${LIBRARY}${path}`, {
    ...init,
    headers: { AccessKey: API_KEY, accept: 'application/json', ...init?.headers },
  })

function sign(path: string, expires: number): string {
  // Must match lib/video/bunny.ts exactly. If these ever diverge, this script is what catches it.
  return createHash('sha256')
    .update(`${TOKEN_KEY}${path}${expires}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/** The first non-comment line of a master playlist: the rendition HLS will fetch next. */
function firstRendition(manifest: string): string | null {
  return manifest.split('\n').find((line) => line.trim() && !line.startsWith('#')) ?? null
}

/**
 * N-12 §2 — put a real player in front of the real CDN.
 *
 * Everything above this proves the *CDN*: given a URL with a token already on it, does Bunny
 * serve it. That is not the question a guest asks. hls.js resolves child playlists and segments
 * relative to the manifest, **relative resolution drops the query string**, and every one of
 * them then arrives unsigned and comes back 403 — a player that attaches cleanly and can never
 * load a byte. That shipped, behind a script that was passing.
 *
 * Curl cannot find it, because curl is told the URL. Only something that walks the manifest by
 * itself can, so this drives Chromium with hls.js and waits for frames to actually decode.
 *
 * `xhrSetup` is copied from `components/streaming/useHlsPlayback.ts` rather than imported — the
 * hook is a React module and this is a standalone node script. That duplication is the weak
 * point of this check, so if the two drift, the divergence is the thing to look at first.
 */
async function playsInARealPlayer(
  manifestUrl: string,
  signedQuery: string,
  signedPrefix: string,
): Promise<{ ok: boolean; detail: string }> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()

    // A real http origin rather than about:blank: an opaque `null` origin changes how the
    // browser treats the cross-origin media requests, which is not the thing under test.
    await page.route('https://playback.verify/', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><video id="v" muted></video>' }),
    )

    // tsx compiles this file with esbuild's `keepNames`, which rewrites function expressions to
    // call a `__name` helper. That helper exists in node and not in the page, so any evaluated
    // body containing a named function throws `__name is not defined` before it runs. A string
    // literal is not compiled, so this shim survives the transform.
    await page.addInitScript('globalThis.__name = globalThis.__name || ((fn) => fn)')

    await page.goto('https://playback.verify/')
    await page.addScriptTag({ path: 'node_modules/hls.js/dist/hls.min.js' })

    return await page.evaluate(
      async ([url, query, prefix]) => {
        const Hls = (window as unknown as { Hls: any }).Hls
        if (!Hls?.isSupported()) return { ok: false, detail: 'hls.js reports no MSE support' }

        const video = document.getElementById('v') as HTMLVideoElement
        const hls = new Hls({
          xhrSetup: (xhr: XMLHttpRequest, requestUrl: string) => {
            xhr.withCredentials = false
            if (!query || requestUrl.includes('token=') || !requestUrl.startsWith(prefix!)) return
            xhr.open('GET', requestUrl + query, true)
          },
        })

        return await new Promise<{ ok: boolean; detail: string }>((resolve) => {
          const fail = (detail: string) => {
            hls.destroy()
            resolve({ ok: false, detail })
          }
          const timer = setTimeout(() => fail('timed out before any frame decoded'), 45_000)

          hls.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
            if (!data?.fatal) return
            clearTimeout(timer)
            const code = data.response?.code ? ` HTTP ${data.response.code}` : ''
            fail(`${data.type} / ${data.details}${code}`)
          })

          // HAVE_ENOUGH_DATA. Anything less means the manifest parsed but the media never
          // arrived, which is exactly the failure mode being hunted.
          video.addEventListener('canplaythrough', () => {
            clearTimeout(timer)
            const state = video.readyState
            hls.destroy()
            resolve({ ok: state >= 4, detail: `readyState=${state}` })
          })

          hls.loadSource(url!)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => void video.play().catch(() => {}))
        })
      },
      [manifestUrl, signedQuery, signedPrefix] as const,
    )
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  let guid: string | undefined

  try {
    console.log('1. creating the video object…')
    const created = await api('/videos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: `playback-verification-${Date.now()}` }),
    })
    if (!created.ok) throw new Error(`create failed: ${created.status} ${await created.text()}`)
    guid = ((await created.json()) as { guid: string }).guid
    console.log(`   guid ${guid}`)

    console.log(`2. uploading ${SAMPLE}…`)
    const body = readFileSync(SAMPLE)
    const uploaded = await api(`/videos/${guid}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body,
    })
    if (!uploaded.ok) throw new Error(`upload failed: ${uploaded.status} ${await uploaded.text()}`)
    console.log(`   ${(body.byteLength / 1024).toFixed(0)}KB accepted`)

    console.log('3. waiting for the transcode…')
    let state = -1
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((r) => setTimeout(r, 5000))
      const status = await api(`/videos/${guid}`)
      const video = (await status.json()) as { status: number; encodeProgress: number }
      state = video.status
      process.stdout.write(`   status=${state} progress=${video.encodeProgress}%\r`)
      if (state === 4) break
      if (state === 5) throw new Error('the provider failed to encode the sample')
    }
    console.log()
    if (state !== 4) throw new Error('timed out waiting for the transcode')
    console.log('   ready')

    // ── The actual question ───────────────────────────────────────────────────
    // The directory is what gets signed; see the comment in lib/video/bunny.ts.
    const directory = `/${guid}/`
    const expires = Math.floor(Date.now() / 1000) + 3600
    const query = `?token=${sign(directory, expires)}&expires=${expires}`
    const signed = `https://${HOST}${directory}playlist.m3u8${query}`
    const unsigned = `https://${HOST}${directory}playlist.m3u8`

    console.log('4. fetching the SIGNED manifest…')
    const withToken = await fetch(signed)
    console.log(`   HTTP ${withToken.status}`)

    console.log('5. fetching the UNSIGNED manifest…')
    const without = await fetch(unsigned)
    console.log(`   HTTP ${without.status}`)

    // The step that matters most, and the one a manifest-only check misses: HLS fetches a
    // rendition playlist immediately, and a file-scoped token 403s there.
    let childStatus: number | string = 'not reached'
    const manifest = withToken.ok ? await withToken.text() : ''
    const rendition = manifest ? firstRendition(manifest) : null
    if (rendition) {
      console.log(`6. fetching the child playlist "${rendition}" with the SAME token…`)
      childStatus = (await fetch(`https://${HOST}${directory}${rendition}${query}`)).status
      console.log(`   HTTP ${childStatus}`)
    }

    // Posters live in the same protected directory, and the whole reason for the redirect route
    // is that a signed URL cannot be persisted. Prove a signed poster resolves.
    console.log('7. fetching a signed POSTER frame…')
    const posterQuery = `?token=${sign(directory, expires)}&expires=${expires}`
    const poster = await fetch(`https://${HOST}${directory}thumbnail_1.jpg${posterQuery}`)
    const posterUnsigned = await fetch(`https://${HOST}${directory}thumbnail_1.jpg`)
    console.log(`   signed HTTP ${poster.status} · unsigned HTTP ${posterUnsigned.status}`)

    // The question none of the steps above asks: can a *player* walk this on its own?
    console.log('8. playing it in a real browser through hls.js…')
    const played = withToken.ok
      ? await playsInARealPlayer(signed, query, `https://${HOST}${directory}`)
      : { ok: false, detail: 'skipped — the manifest itself was refused' }
    console.log(`   ${played.ok ? 'decoded frames' : 'FAILED'} · ${played.detail}`)

    console.log()
    const servesPoster = poster.ok && posterUnsigned.status !== 200
    const servesSigned = withToken.ok
    const refusesUnsigned = without.status === 403 || without.status === 401
    const servesChild = childStatus === 200

    if (servesSigned && refusesUnsigned && servesChild && servesPoster && played.ok) {
      const renditions = (manifest.match(/RESOLUTION=(\d+x\d+)/g) ?? []).join(', ')
      console.log('PASS — signature accepted, unsigned refused, and a real player reached frames.')
      if (renditions) console.log(`  ladder: ${renditions}`)
      return
    }

    if (!servesSigned) {
      console.error('FAIL — Bunny rejected our signed URL. The token algorithm does not match.')
      console.error('  Every guest would get a 403. Check the sign() implementation against')
      console.error('  lib/video/bunny.ts and Bunny’s URL token authentication docs.')
    }
    if (!refusesUnsigned) {
      console.error(`FAIL — an unsigned URL returned ${without.status}.`)
      console.error('  The pull zone is not enforcing token authentication, so a copied .m3u8')
      console.error('  never expires. doc 01 US-5 would be false. Enable it on the pull zone.')
    }
    if (!servesPoster) {
      console.error(`FAIL — a signed poster returned ${poster.status}.`)
      console.error('  The admin poster picker and every generated card would show a broken')
      console.error('  image. See app/api/poster/[titleId]/route.ts.')
    }
    if (servesSigned && !servesChild) {
      console.error(`FAIL — the manifest loaded but the child playlist returned ${childStatus}.`)
      console.error('  The token is scoped to one file instead of the directory, so playback')
      console.error('  would start and immediately stall. Sign `/{guid}/`, not the .m3u8.')
    }
    if (servesSigned && servesChild && !played.ok) {
      console.error(`FAIL — every URL this script fetched was fine, but a real player could not`)
      console.error(`  play the stream: ${played.detail}.`)
      console.error('  That gap is the whole point of step 8: curl is handed the signed URL,')
      console.error('  while hls.js resolves child playlists and segments *relative* to the')
      console.error('  manifest and drops the query string. Check `xhrSetup` in')
      console.error('  components/streaming/useHlsPlayback.ts — it is what reattaches the token.')
    }
    process.exitCode = 1
  } finally {
    if (guid && !KEEP) {
      await api(`/videos/${guid}`, { method: 'DELETE' }).catch(() => {})
      console.log(`\ncleaned up ${guid}`)
    }
  }
}

void main()
