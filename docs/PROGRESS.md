# PROGRESS

Append one entry per completed ticket. Keep entries to ~3 lines.

This file is **what was built**. [`NEXT.md`](NEXT.md) is **what is left, in order** — read that
to decide what to do; read this to understand why the code looks the way it does.

A fresh agent session reads CLAUDE.md → NEXT.md → this file → the item's own docs (doc 13 §2).

Format:

    ## <TICKET-ID> · <name> — done <date>
    Built: <what exists now>
    Files: <paths touched>
    Note: <anything the next ticket needs to know>

---

## P0-01/02 · Scaffold and tokens — done 2026-08-08
Built: Next.js 15 App Router, TS strict (`noUncheckedIndexedAccess`), Tailwind v4, pnpm, Vitest,
Playwright, GitHub Actions, Dockerfile. Marquee tokens per doc 04; Archivo/Inter/Mukta
self-hosted from `public/fonts` (all SIL OFL, licences recorded).
Files: package.json, tsconfig.json, next.config.ts, app/globals.css, lib/fonts.ts, .eslintrc.json
Note: two doc constraints are eslint rules rather than conventions — `process.env` only inside
`lib/env.ts`, and no `dangerouslySetInnerHTML` anywhere. Mukta is `preload: false`; Devanagari is
~130KB and no English first paint should pay for it.

## P0-03 · Schema and data layer — done 2026-08-08
Built: `lib/schema.ts` (Zod, everything infers from it), `supabase/migrations/0001` + `0002`
(schema + RLS), and a `Repository` interface with three drivers: memory, file, supabase.
Files: lib/schema.ts, lib/db/*, supabase/migrations/*
Note: **the repository seam is a deviation from doc 06** and a deliberate one — the suite, CI and
an offline planner demo all run against the in-memory store with identical semantics. Production
refuses to boot on anything but supabase unless `ALLOW_EPHEMERAL_DATA=1`.

## P0-04/05/06 · Auth, tenancy, i18n — done 2026-08-08
Built: scrypt + HMAC-signed cookie sessions (no native dep, no session table); pure
`resolveTenant` with 24 unit tests; EN/HI dictionary with silent English fallback.
Files: lib/auth.ts, lib/tenant.ts, middleware.ts, lib/i18n.ts, lib/admin/session.ts
Note: operator auth verifies a scrypt hash itself rather than using Supabase Auth. The schema and
RLS are written for Supabase Auth; the swap is contained to `lib/admin/session.ts`. Also:
`?__catalogue=` is sticky via cookie so `/watch/<slug>` resolves in dev the way a subdomain does.

## P0-07/09/11 · Video provider, webhook, playback token — done 2026-08-08
Built: five-method `VideoProvider`, a Bunny implementation and a deterministic `fake` driver;
signature-verified idempotent webhook; token endpoint scoped to catalogue **and** title, 4h.
Files: lib/video/*, app/api/webhooks/bunny/route.ts, app/api/playback/token/route.ts
Note: `fake` is a first-class driver, not a test mock — CI, Playwright and the offline demo all
run through the same code paths as production. It signs tokens the same way, so the
token-scoping test (doc 10 §1 test 7) is meaningful against it.

## P0-13…P0-19 · Module registry and the guest catalogue — done 2026-08-08
Built: the registry plus all five Phase 0 modules; billboard, curated rows with the 2–3 card
layout, title modal with history/prefetch/siblings, profile gate, player with silent 403 refresh,
10s progress heartbeat, generated poster art.
Files: modules/*, components/streaming/*, components/chrome/*, app/c/[slug]/*
Note: **the guest tree is client-rendered**, contrary to doc 08's sketch. Doc 14 §5.4 requires the
customizer preview to mount the real guest components and a server component cannot do that. The
player is still lazy-loaded on its own route; browse first-load JS is 146KB against the 150KB
budget — that is tight, watch it.

## P0-20…P0-26 · Admin and customizer — done 2026-08-08
Built: four-step wizard (resumable across a refresh, upload running from step 3), title list with
transcode status and retry, and the customizer — drag + keyboard reorder, visibility toggles,
editor sheet, autosave to `draft_modules`, explicit Publish, undo ×20, live contrast warning,
preview pane rendering the real guest tree.
Files: components/admin/*, app/admin/**, app/api/admin/**
Note: curation advisories are driven off a `content: 'video' | 'photo' | 'text'` tag in module
meta. They were first written switching on type names, which `tests/unit/registry.test.ts` caught
as exactly the leak doc 14 §7 forbids. Add the tag when you add a module.

## P0-27…P0-30 · Ship — done 2026-08-08
Built: OG image endpoint, passcode gate with 5-attempt/15-minute lockout, renewal screen that is
never a 404, the nine-title demo catalogue, CI, Dockerfile, `vercel.json` pinned to `bom1`, and
the nightly reconciliation cron for titles stuck in `processing`.
Files: app/api/og/route.tsx, app/api/passcode, app/c/[slug]/{locked,renew}, lib/db/seed-data.ts,
.github/workflows/ci.yml, Dockerfile, vercel.json, app/api/cron/reconcile/route.ts
Note: the demo fixture uses **generated** imagery, not stock footage of strangers. Doc 13 §8 is
explicit that the sales artefact needs real cleared footage; what this fixture proves is the
mechanics. Sourcing the real thing is still open.

## Gap-closing pass — doc 10 §2 journeys and the two gates — done 2026-08-09

Built: E2E-1 (watch and resume) and E2E-5 (upload resilience), the last two of the six named
journeys; the OG ≤300KB assertion (doc 10 §1 test 11); and axe-core as a zero-violations gate
across eight page states (doc 10 §4). All six journeys and both gates now run in CI.
Files: e2e/{playback,upload,gates,helpers}.spec.ts, lib/budgets.ts,
scripts/make-sample-video.mjs, public/media/sample.webm

Note: **the `fake` driver now serves a real clip.** `scripts/make-sample-video.mjs` renders a
12s 155KB WebM from a canvas in headless Chromium — our own bytes, so no licence question
(doc 12 §1) and no footage of strangers (doc 13 §8). Without it E2E-1 could only assert that a
`<video>` element existed; with it, playback, seek, resume and the `?t=` deep link are all
verified for real. It also means an offline demo plays something.

Note: E2E-5 verifies our half of the upload contract — container rejected before a byte moves,
the `titles` row created immediately, survives a reload, survives navigation, retry available.
**TUS resuming from a real acked offset after a real network drop is not covered** and cannot be
without a live provider; it stays a device check (doc 10 §3 M-5). Faking it would assert the
stub.

Note: E2E suites that write content now create their own catalogue (`e2e/helpers.ts`). Server
state is shared across a Playwright run, and uploading into the demo catalogue raced the other
suites for the 15-title cap.

---

## Visual pass — defects found by looking at the running product

Screenshots at 360×800 and 1440×900, after the suites were already green. None of these would
have been caught by a test that did not have eyes on it.

- The generated hero artwork baked "The Highlights" into the image, where it collided with the
  billboard's own headline and buttons. `generatePosterSvg` now omits type entirely when the
  label is empty, and every full-bleed use passes an empty one.
- The card title was printed twice — once in the artwork, once in the DOM label below. Doc 04 §6
  sets the name into generated art, which is right when the poster is the only surface showing
  it; the card also shows it, and has to, because a photographic poster has no baked text. The
  DOM label is now the single source.
- `हिं` in the language toggle was clipped at `type-label`'s 11px/1.2 — manual check M-6, on the
  one control a Hindi-reading guest has to find first. Devanagari now sets the floor for it.
- Admin headings inherited `--color-text-hi`, the *dark* theme's near-white, and were close to
  invisible on the light admin surface. Headings now inherit from their container.
- The billboard eyebrow sat above the page scrim's dark zone, so accent-on-a-bright-poster was
  unreadable at narrow widths. Fixed with a second tighter scrim under the copy — doc 04 §2
  forbids fixing it by lightening the red.
- Poster-coverage nudges were raised per row, so the operator read the same sentence twice with
  different numbers. Moved to a single catalogue-level advisory.

## Three bugs the tests found, worth knowing about

1. **`lib/env.ts` was reaching the client bundle** through `lib/log` → `modules/registry`, which
   crashed hydration on every guest page — the server rendered fine, so it only showed up in
   Playwright. `lib/log` no longer imports env, and `lib/env.ts` is now `server-only` so the next
   occurrence is a build error rather than a white screen in front of a guest.
2. **The customizer's advisories switched on module type names.** See P0-20 note.
3. **At 360px the nav's "Switch profile" label overlapped the language toggle** and made it
   untappable — caught by the Hindi E2E on the mobile project, not visible at desktop width.
   Replaced with the avatar doc 02 §4 actually specifies.

## Defects the accessibility gate found on its first run

Both were violations of the project's own rules that nothing else was checking.

1. **Accent text below 19px in five places** — the billboard date, the couple's name on the
   renewal and passcode screens, the nav wordmark, and the player's "Start over". Doc 04 §2 is
   explicit: `--accent` is 3.6:1 on black, UI and large text only, and "red body copy on black
   is not permitted". Metadata dropped to `--text-mid`; brand signals moved to `--accent-hi`,
   which is 4.9:1 and keeps the red.
2. **The language toggle signalled its active state with colour alone**, at 13px in `--accent` —
   both a contrast failure and WCAG 1.4.1. It is now a filled pill, white on accent at 5.4:1.
3. **The credits list was an invalid `<dl>`** — a bare `<dt>` heading mixed with `<div>` groups,
   which breaks the list for a screen reader (WCAG 1.3.1).

`pnpm check:contrast` covers the tokens; axe covers what they compose into on a page. The two
gates are complementary and both now run in CI.

## A stale requirement in doc 10

Doc 10 §1 test 4 requires "Trending suppression: hidden below `minPlays`; New suppressed on a
catalogue younger than 14 days." Doc 01 §5.1 **cut** both features (VE-13, VE-14). The test list
is stale against the product spec. Verified that neither feature exists in the code; doc 10
wants updating, or the requirement rereading as "assert they are absent".

## Bunny is live — done 2026-08-09

Built: Stream library `mehfil` (id 724076, pull zone 6300168, Singapore replication, CDN
`vz-98fb153e-d39.b-cdn.net`), token authentication enforced, IP pinning off per doc 05 §4.
`VIDEO_DRIVER=bunny` locally, four integration tests running against the live service, and
`pnpm verify:playback` proving the whole playback path end to end.

**`lib/video/bunny.ts` was signing the wrong path, and every guest would have got a 403.**
Bunny's URL token authentication is `base64url(sha256(securityKey + path + expires))` — which
was right — but signing `/{guid}/playlist.m3u8` authorises exactly that one file. HLS then
fetches `/{guid}/240p/video.m3u8` and the segments under it, and those 403. Playback would have
shown the poster, loaded the manifest and died. Signing the **directory** `/{guid}/` authorises
the whole rendition tree with one token. Verified: master 200, child playlist 200, unsigned 403.

Two traps worth knowing, both of which cost real time:

- A new Stream library ships with **`BlockNoneReferrer: true`**, which 403s any request with no
  `Referer`. It masked the token problem completely — every candidate algorithm returned 403,
  including unsigned. Native HLS on iOS and several Android players send no referrer, so this
  would have broken playback in production too. Now off, and `pnpm preflight` checks it.
- The **account key and the per-library key are different**. The account key manages libraries
  (`api.bunny.net`); the library key is what the Stream endpoints (`video.bunnycdn.com`) accept.
  A 401 looks identical either way. `.env.local` keeps them in separate variables and preflight
  reports which is which.

**Open, and it is a real gap: poster thumbnails now 403.** Enabling token authentication applies
to every file in the zone, including `/{guid}/thumbnail_1.jpg` and `preview.webp`, which
`getStatus` returns as plain URLs and the admin renders directly in the poster picker. Verified
403. Signing them with the 4-hour playback TTL is wrong — `posterUrl` is persisted, embedded in
ISR pages and in the OG image, and a keepsake is supposed to last years. The right fix is a
small redirect route (`/api/poster/<titleId>` → 302 to a freshly signed URL) so the stored value
never expires; bytes still come from Bunny, so doc 07's "no server-side video proxy" holds.
Not done. Until it is, generated poster art is used, which is the default anyway.

## Real-service wiring — first attempt 2026-08-09, blocked

Credentials arrived for both services. Neither is usable yet, and the blockers are external:

- **Supabase** — project is live and the publishable key authenticates, but the **schema is not
  applied** (no `catalogues`, `titles`, `orgs`, `operators`) and no **secret key**
  (`sb_secret_…`) was supplied. `SupabaseRepository` runs on the secret key; the publishable one
  cannot do server-side work.
- **Bunny** — the supplied 72-character string is a valid **account** key (neither GUID half
  works alone). The account has **no Stream library**, and creating one returns
  `user.insufficient_balance`: Bunny refuses to create zones at a zero balance. That reads like
  a permissions error and is not one.

Built while blocked: `pnpm preflight` (read-only, reports exactly what is missing and where it
comes from, exits non-zero when the configured drivers are not ready), `pnpm bootstrap:sql`, and
`tests/integration` which skips without credentials and runs the moment they exist.

Note: `.env.local` holds the supplied credentials and is gitignored — verified, nothing
committed. The Bunny account key was pasted into a chat transcript and should be rotated.

## N-2 · Posters under token authentication — done 2026-08-09
Built: `getAssetUrl` on the provider, poster candidates as provider-relative **file names**, and
`app/api/poster/[titleId]` which mints a signature per request and 302s. Playback and posters
share one `signDirectory()`.
Files: lib/video/{provider,bunny,fake,index}.ts, app/api/poster/[titleId]/route.ts, the three
status writers (webhook, retry, reconcile), tests/unit/poster.test.ts
Note: **never persist a signed URL.** `titles.poster_url` is embedded in ISR-cached pages and
the OG card, so a 4h token there yields a poster that works today and 403s when someone reopens
their wedding. The database stores `/api/poster/<id>?file=…`, which cannot expire. Verified
against live Bunny — signed manifest, child playlist and poster all 200; all three unsigned 403.

## N-5 (part) · First-load JS budget gated — done 2026-08-09
Built: `pnpm check:bundle`, in CI after the build. Computes gzipped first-load from
`.next/app-build-manifest.json` rather than scraping the `next build` table, so a Next.js
version bump does not silently disable it. Browse is 141.8KB against 150KB.
Files: scripts/check-bundle.ts, .github/workflows/ci.yml
Note: it warns below 5% headroom, before the budget actually breaks. LCP, CLS and playback start
are still documented rather than gated — see NEXT.md N-5.

## Also fixed
With credentials present, `tests/integration` silently joined `pnpm test` and failed on the
unapplied schema. The default suite must stay hermetic and fast or people stop running it, so
integration is now opt-in behind `RUN_INTEGRATION=1`.

## N-1 · Supabase live — done 2026-08-09
Built: nothing new; the driver finally ran. Schema applied (11 tables, 16 RLS policies), first
org and operator created, and the app verified on `DATA_DRIVER=supabase` + `VIDEO_DRIVER=bunny`:
health reports both, login works against real Postgres, and create → publish → guest page
round-trips. `pnpm test:integration` 10/10.
Note: the RLS test now carries a **positive control** — it proves anon *can* read a published
catalogue before proving it cannot read a draft. Without that, "anon saw nothing" also passes
when the query simply errored, which is the worst possible way for a security test to be green.
A second test proves anon cannot insert at all.
Note: the first integration run after applying the DDL failed with `PGRST205`. PostgREST caches
the schema and takes a few seconds to notice new tables — not a defect, but alarming if you do
not expect it.
Note: the real database has **no demo catalogue**. The nine-title fixture lives only in the
memory/file drivers.

## N-3 · Resumable upload, proved and fixed — done 2026-08-09
Built: `pnpm verify:upload` — boots the app on `VIDEO_DRIVER=bunny`, drives a real browser,
uploads 25MB to real Bunny, drops the network with `context.setOffline`, restores it, and
asserts the upload continues rather than restarting.
Files: scripts/verify-upload-resume.ts, components/admin/UploadManager.tsx,
tests/component/upload-manager.test.tsx
Note: **the first run failed, and the bug was real.** tus-js-client's default retry policy gives
up on a bare network error — no response, no status — which is exactly the case the whole
mechanism exists for. The row said "Failed" four seconds after the drop and nothing ever picked
it up. A wifi blip would have ended a six-gigabyte upload.
Fixed three ways: an explicit `onShouldRetry` that treats a response-less failure as retryable
(and still refuses 4xx, except tus's 409/423 offset conflicts); a `interrupted` state instead of
`error`, because the bytes are still at the provider and "Failed" reads as over; and resumption
on the `online` event, since no backoff schedule covers a laptop that slept for an hour.
Now: dropped at 20%, resumed to 100%, never restarted.

## Observability — done 2026-08-09
Built: `lib/observability.ts` (a swappable `reportError` sink, stdout today, a vendor later
without touching call sites), `/api/qoe` plus `useQoe` measuring press-play → first frame and
the rebuffer ratio, `/api/cron/usage` writing `usage_rollup` and alerting past 300GB, a global
error boundary with `/api/client-error`, and correlation ids on unhandled route errors.
Files: lib/observability.ts, app/api/qoe, app/api/cron/usage, app/api/client-error,
app/global-error.tsx, components/streaming/useQoe.ts, lib/db/* (listAllCatalogues, upsertUsage)
Note: **`usage_rollup` and `getUsage()` already existed and nothing called them.** A half-built
guardrail is worse than an absent one, because it reads as done. doc 05 §2 says to build these,
not document them.
Note: playback start is measured **press-play → first frame** on the `playing` event, not
`canplay` — `canplay` fires before anything is painted, which would have flattered the number
against the one metric doc 05 §6 says the product lives or dies on.
Note: QoE beacons carry no guest identity. doc 06 §5 applies to telemetry too.

## Deployment guide, and two defects writing it uncovered — done 2026-08-09
Built: `docs/DEPLOYMENT.md` — accounts, the Bunny settings that fail closed, Supabase bootstrap,
DNS, the full environment table, ordered verification, and what to alert on.
Files: docs/DEPLOYMENT.md, lib/video/{provider,bunny,fake}.ts, app/api/webhooks/bunny/route.ts,
app/api/cron/*/route.ts, lib/env.ts, tests/unit/webhook.test.ts, tests/integration/drivers.test.ts

Note: **the webhook verification was wrong in three ways** and all of them fail closed, so
titles would have sat in `processing` until the nightly reconciliation. Bunny sends
`X-BunnyStream-Signature` (we read `x-bunny-signature`); it is HMAC-SHA256 keyed by the library
**read-only** key (we computed `sha256(secret + body)`); and the webhook's `Status` enum is not
the video object's — the webhook calls Finished 3, the API calls it 4, which we had mapped to
`processing`. The handler now treats the payload as a *notification* and asks `getStatus()` what
actually happened, which removes the enum question entirely and makes it idempotent by
construction. Still unverified against a real delivery: it needs a public URL. Step 8.2 of the
guide is how to confirm it.

Note: **Vercel signs crons with `CRON_SECRET`, not `SESSION_SECRET`.** Worse, when the variable
is unset Vercel sends no header at all, so the jobs 401 and silently never run — surfacing weeks
later as usage that was never recorded. `lib/env.ts` now takes `CRON_SECRET`, and the guide
calls it out as the variable people forget.

Note: the integration tests were order-dependent — `orgId` was assigned inside one test and used
by three others, so a timeout there cascaded into misleading failures. Resolved in `beforeAll`
now, with a 30s budget and parallel table checks (5s+ → 806ms).

## Open, and deliberately so

- **The browse route renders dynamically, not ISR.** Reading the locale cookie in
  `app/c/[slug]/page.tsx` opts the route out of static generation, which doc 05 §6 wants. Fix is
  to move locale into the path or resolve it client-side. Real LCP cost, not yet paid.
- **No Lighthouse or QoE probe in CI** (doc 09 P1-14). The budgets are now declared in
  `lib/budgets.ts` and the OG one is enforced; first-load JS, LCP and playback start are still
  documented rather than gated.
- **The Bunny and Supabase drivers have never executed** — 1,104 lines including both SQL
  migrations. Every suite runs on `fake` + `memory`. Doc 09's sequencing rationale says to find
  out early whether resumable upload against a third-party API works; that remains unretired and
  is the single largest risk in the project.
- **Doc 04 §2's contrast table is approximate.** `--text-lo` computes to 6.4:1 not 5.4:1, and
  `--accent` to 3.6:1 not 4.1:1. Every pairing still clears its minimum; the numbers are pinned
  in `tests/unit/contrast.test.ts` so a palette edit shows up in review.
- **The two things doc 13 §8 says not to delegate** — real cleared footage, and measuring
  playback start on real 4G at a venue — are untouched.

## Deployed — 10 Aug 2026

Live on Vercel as `marquee-film-pub`, on Supabase and Bunny, at commit `f2f573b`.

The first attempt was refused outright: *"Vulnerable version of Next.js detected"*. 15.1.3
carries two criticals, one an authorization bypass in middleware — the single component that
resolves the tenant on every request. Upgraded to 15.5.23 and lifted postcss and sharp, both
pinned inside Next, via pnpm overrides. `pnpm audit --prod` is clean.

The upgrade then appeared to break 44 E2E tests. It had not. `.env.production.local` — the file
written to hold the deploy values — is a name Next auto-loads on *any* production build, so
`TENANCY_MODE=path` leaked into local builds, middleware became a no-op, and every guest page
rendered the marketing root. The symptom pointed at Next; the cause was a filename. It is now
`.env.vercel.local`, which Next never loads and `.env*.local` still ignores.

Two genuine test races surfaced alongside it, both fixed at the source rather than by raising a
timeout: the a11y audit ran before Next's streamed `<title>` landed, and the customizer audit
clicked two links back to back, the second landing mid-hydration and being swallowed. Five
consecutive full runs: 69 passed, no flakes.

Not yet done: the deployment is behind Vercel Deployment Protection, so it is not reachable by a
guest, and the Bunny webhook signature remains the one thing never verified against a real
delivery. Both are N-11.

## Validated against real infrastructure — 11 Aug 2026

Ran the product end to end on production Supabase and production Bunny: signed in, created a
catalogue, uploaded a film, transcoded it, published, opened it as a guest and played it. Every
step against live services, none against a stub.

It worked, eventually. It found four bugs first, and every one of them was fatal in the
configuration actually deployed:

- **Play was a 404 in path mode.** Components pushed `/watch/<slug>`, which is right only when
  the catalogue is the site root. The wordmark and the passcode redirect shared the assumption.
  `cataloguePath` now answers this beside `catalogueUrl`.
- **Playback failed on every Chromium browser.** `canPlayType` returns 'maybe' for HLS and then
  cannot decode; the code read anything non-empty as native support. Android Chrome is the
  primary target platform.
- **hls.js could not load a byte.** Bunny signs the directory; hls.js resolves children
  relative to the manifest and drops the query string, so every child 403'd.
- **Reconcile was blind to `uploading`**, the one state a lost webhook actually produces.

The lesson is in N-12. Two hundred and twenty unit tests and sixty-nine E2E tests passed
throughout, because the suite only ever exercises subdomain mode and the playback check proves
the CDN rather than the player. A test suite that cannot see the deployed configuration is not
measuring the product.

Still unverified: the Bunny webhook against a real delivery. It needs a public URL, and the
deployment is behind Vercel Deployment Protection.

## Webhook verified — 11 Aug 2026

The last unverified thing in the system, closed. Bunny's `WebhookUrl` had never been set at all
— the field was empty, so delivery was not failing, it had nowhere to go. Vercel Deployment
Protection was the second cause: it 302s an unauthenticated POST to an SSO login, so the
callback could not have arrived even once configured. Neither had anything to do with the Hobby
plan, which does not restrict inbound requests.

With protection off and the webhook set, a film uploaded to the live deployment reached `ready`
in under fifteen seconds, unaided. The handler rejects unsigned bodies with a 401, so the HMAC
verified for real — the three-way header/algorithm/key mistake found earlier is genuinely fixed.

Proved twice: once against the deployment URL, then again through the stable alias
`marquee-film-pub.vercel.app` after redeploying. The alias is what the webhook now points at.
A per-deployment URL would have kept answering after the next deploy while running the previous
build — a webhook that looks healthy and is quietly stale.

## Robustness pass — 12 Aug 2026

Five operator-reported issues. Two were the same defect seen from opposite sides: the customizer
ran two save models at once, so branding needed a button while sections autosaved. An operator
typed "Presented by", pressed Publish — which copies draft sections and never touches branding —
and lost it silently, while the message card's *missing* button looked like the bug rather than
the convention. Branding now autosaves like everything beside it.

Deleting a catalogue did not exist at any layer. Added assets-first, because the rows are the
only manifest of what was stored and removing them first strands every film at the provider,
paid for and unreclaimable. Confirmation is typing the slug: this destroys a wedding, and a
dialog is muscle memory by the third time.

Films now preview on hover. Bunny writes `preview.webp` into the directory the playback token
already signs, so it needed no new infrastructure at all. Most of the work was refusal — half a
second of deliberate hover, never on touch, not under reduced motion, not under Save-Data —
because ~300KB of unrequested animation on a metered plan is the default case here, not the edge.

Also: the public link is now a real link with a copy button rather than grey truncated text; the
custom domain and an expiry date are settable, and the expiry actually lapses a catalogue rather
than being decorative; and operators can see what guests watched.

Left for next time: the customizer's shape (N-13) and real footage (N-14).

## Customizer redesign — 12 Aug 2026

Editing happened in a sheet over the preview, so the thing being edited was hidden behind the
editor. Three columns now — sections, preview, inspector — and the preview is the way in:
clicking a section selects it.

Selection is one delegated listener against the `data-module-id` tags the renderer already
emits, in the capture phase, with the outline applied as scoped CSS. Every alternative taught
guest components about editing: a wrapper element changes layout, a className prop puts an admin
concern in a module's signature. The previewed markup stays byte-identical to what a guest
gets, which is the property that makes it a preview.

The inspector is deliberately not a dialog. No focus trap, no `aria-modal` — tabbing past the
last field reaches the preview rather than cycling inside a trap.

Two things surfaced. The editing surface had **no E2E coverage whatsoever**: the suite reordered
and hid sections but never once opened an editor, which is how the entire sheet could be deleted
with all 69 tests green. And `LocalisedField` labelled its inputs only "English" and "हिंदी"
beneath a plain paragraph, so a screen reader announced "English" with no indication of English
what — now a fieldset with a legend.

71 E2E, 259 unit and component.

## Partner model planned, and the first two steps taken — 12 Aug 2026

Doc 15 sets out partners, ownership transfer and what breaks at volume. Researching it against
the code found the thing that mattered most: the RLS grants let the `NEXT_PUBLIC_` anon key —
printed into every page — enumerate every published catalogue on the platform with the couple's
name and wedding date. Doc 01 forbids exactly that, twice. Nothing in the app used the key:
every guest path goes through a Next route holding the service role. So the anon role now has no
policies at all, and `0002` is re-runnable rather than a new migration. No data was wiped.

The architecture reuses `org_id` scoping for all three account types. A couple gets their own org
on transfer rather than a new owner column, because a column means every query asks "my org, or
am I the owner?" in RLS and session handling forever — and cross-tenant leaks live in that
branch.

Then the caching. `/c/[slug]` declared `revalidate` but read cookies, so it was never static and
never could be: access depends on the guest's cookies. Cached the reads instead, tagged per
catalogue, invalidated by every write an operator can see the result of. Proved both directions
against a real server — a direct Postgres change stayed invisible, an app write appeared at once.

The integration suite caught the RLS change and was itself wrong: it asserted anon could read a
published catalogue, which encoded the leak as intended behaviour. Rewritten to assert the
capability is gone.

## Partners can register — 12 Aug 2026

A studio signs up at `/admin/register`, gets an org and an operator row, and builds catalogues
for its couples. Verified against production: a partner registers, signs in, sees none of the
existing catalogues, gets 404 rather than 403 on one by id, creates their own and sees exactly
that one — while the original operator still sees only theirs. The probe was then removed.

No new isolation mechanism: partners are orgs, couples will be orgs, and `org_id` scoping is
untouched. `platform_admins` is a separate table rather than a role, because an admin who
belonged to an org would make every scoped query ask whether this member is special, and that
branch is where cross-tenant leaks live.

Auth moved to Supabase for real (`AUTH_DRIVER=supabase`), which registration requires:
`operators.id` references `auth.users(id)`, and only a genuine Supabase account satisfies it.
The local driver stays for the suite and CI, which run with no Supabase project at all.

Three things went wrong and each taught something:

- Registration 500'd on the first live attempt — the local driver mints its own uuid, which the
  foreign key refuses. Now refused up front with a message naming the fix.
- It left an **orphan org**, contradicting the previous commit's claim that a partial failure was
  safe. There is no transaction across the two writes, so the operator step now compensates.
- Setting the operator's Supabase password by **deleting and recreating** the auth user cascaded
  through `on delete cascade` and destroyed the `operators` row, so login failed on *both*
  drivers and looked like the new authenticator was at fault. Documented in DEPLOYMENT.md §11.

Still blocking real partners: SMTP (N-17). Sign-up and password reset both send email, and
Supabase's built-in sender allows a few messages an hour.


## One documentation tree

`project-doc-directory/` was a placeholder name that stuck, and the split it created was
arbitrary: nothing said which of two top-level trees a new document belonged in, so the answer
was "the one you happened to be in". `docs/README.md` had rationalised the split rather than
questioning it.

Everything now lives under `docs/`, moved with `git mv` so authorship survives:

| | |
|---|---|
| `docs/*.md` | The living documents — architecture, progress, next, deployment |
| `docs/spec/` | The specification, docs 01–15. What the product was *meant* to be |
| `docs/reference/` | Decision log, business case, the reference reel |
| `docs/wireframes/` | The SVGs. `spec/03-wireframes.md` carries the same content as text |
| `docs/archive/` | Superseded invite-site work. Never a source of truth |

The split that was worth keeping is **spec versus reality**, and that is now a subdirectory
rather than a second tree.

Three ignore lists named the old directory and were found only by grepping for it after the
tests passed: `.eslintrc.json`, `.prettierignore`, and the skip set in
`tests/unit/registry.test.ts`. The registry test passed throughout not because its skip worked
but because it only reads `.ts`/`.tsx` and the docs are markdown — it would have started
scanning the specification the moment anyone put a `.ts` example in there, and the specification
names module types on nearly every page. `.prettierignore` was mapped to the four moved
subdirectories rather than to `docs`, because the living documents *were* formatted before and
the hand-aligned spec tables were not.

Also added along the way: `docs/ARCHITECTURE.md`, which is what was actually missing — six
Mermaid diagrams covering what talks to what, who can see what, a guest opening a link, a film
arriving, the module registry, and a handover.
