# 05 — Technical Architecture

## 1. Stack

| Concern | Choice | Why this, not the alternative |
|---|---|---|
| Framework | Next.js 15, App Router | Subdomain routing via middleware, ISR for browse pages, and route handlers for the admin API — all three without extra infrastructure. |
| Language | TypeScript, strict | |
| Styling | Tailwind v4 + CSS custom properties | Runtime per-tenant theming needs CSS vars; Tailwind alone can't do it. |
| **Video** | **Bunny Stream** | See §2. Free transcoding, $0.01/GB storage, cheap delivery, built-in India PoPs, token auth, TUS resumable upload. |
| Player | **Vidstack** (or Bunny's player) | Framework-native, themeable to our design system, HLS via hls.js, good a11y. Bunny's own player is the zero-work fallback but is harder to brand. |
| DB | Supabase Postgres | RLS maps onto tenant isolation; SQL because catalogue/title/progress data is relational. |
| Auth (admin) | Supabase Auth | Operator accounts only. Guests never authenticate. |
| Uploads | **TUS resumable** via Bunny | Non-negotiable — see §3. |
| Payments | Razorpay | Subscriptions, UPI/cards, Indian entity. |
| Host | Vercel | Wildcard subdomains + automatic TLS. |

**Deliberately not used:** a self-hosted transcoding pipeline (FFmpeg on a VM is a weekend to
build and a permanent operational burden — encoding is a solved commodity); DRM (wrong threat
model, see doc 01 §4); a video CMS like Contentful (we are the CMS); S3 + MediaConvert (three
times the cost and five times the code of Bunny for identical output).

## 2. Video platform choice, with the arithmetic

This is the decision that determines whether the business has margin, so here is the working.

**Assumptions for one typical catalogue — a curated keepsake, not an archive:**

- **8–12 titles, ~30 minutes of finished video total** (one long ceremony film, a highlights
  reel, a few short pieces), plus ~40 photographs
- Transcode ladder 360p/480p/720p/1080p ≈ 6 Mbps aggregate → **~2 GB stored**
- 300 viewers, ~12 minutes watched each, ~1.8 Mbps mobile adaptive → **~49 GB delivered**

| | Bunny Stream | Cloudflare Stream |
|---|---|---|
| Transcoding | Free | Included |
| Storage | $0.01/GB → **$0.02/mo** | $5 per 1,000 min → **$0.15/mo** |
| Delivery | ~$0.03/GB (Asia) → **$1.47** | $1 per 1,000 min → 3,600 min → **$3.60** |
| Year 1 total | **≈ $1.7 (~₹150)** | **≈ $5.4 (~₹470)** |
| Player · resumable upload · India PoPs | Yes · TUS · Yes | Yes · tus · Yes |

**"It really got flaunted" case** — the link spreads to 2,000 viewers: ~324 GB ≈ $9.7 (~₹850)
in that year. Storage barely moves; only delivery does, and delivery only grows when the
product is working.

**This is the number that makes the business easy.** At ~₹150/catalogue/year against a
₹4,000+ licence, hosting is a rounding error — which means margin is never the constraint and
the interesting decisions are all about product, not cost. It also materially changes the
lifetime-hosting question; see doc 11 §3.

**Decision: Bunny Stream.** ~3× cheaper here and the gap widens with long films, because
Cloudflare prices per *minute* — punishing exactly what we store, a long ceremony edit few
people finish. Neither would break us at this volume, so treat this as a default, not a
lock-in.

Keep the integration behind `lib/video/provider.ts` with a narrow interface
(`createUpload`, `getPlaybackToken`, `getStatus`, `deleteAsset`, `getUsage`) so switching
providers is one file, not a rewrite. Do not let Bunny types leak into components.

### Cost guardrails (build these, don't just document them)

- Per-catalogue monthly usage recorded and visible in admin.
- Alert at 300 GB delivered in a month — either it is being flaunted hard (good) or a link
  leaked (act on it). At our cost basis this alert is about *knowing*, not about billing.
- **Enforce the content cap in the admin** (15 titles, ~60 photos). It is a curation feature
  first (doc 01 §4) and a cost ceiling second — but it is also what keeps the ~₹150 figure
  true. If planners routinely push past it, the product has drifted into being an archive and
  both the economics and the point need rethinking.
- Verify the ~₹150 assumption against real numbers after three catalogues.

## 3. Upload pipeline — the part that will break

An operator uploads a 6GB ceremony film over Indian office wifi from a laptop that sleeps. A
naive `<input type="file">` POST fails and loses everything. Volume is low — a handful of
files per catalogue — but **individual files are large**, so resumability matters as much as
it would for an archive product. This has to work on the first try or the planner never uses
the product again.

```
Operator selects files
  → POST /api/admin/uploads  (server creates a Bunny video object, returns TUS endpoint + signed headers)
  → Browser uploads directly to Bunny via TUS, chunked, resumable
      · 5MB chunks, progress per file, parallelism 2
      · offset persisted to IndexedDB → survives refresh, sleep, and network loss
      · exponential backoff on failure, resume from last acked offset
  → Bunny webhook → POST /api/webhooks/bunny  (transcode status)
  → title.status: uploading → processing → ready | failed
  → On ready: pull duration + extract 3 candidate poster frames
```

Requirements, all testable:

1. **The file never passes through our server.** Direct-to-Bunny. Vercel route handlers have
   payload limits and would make us pay egress twice.
2. Killing the network at 80% and restoring it resumes from ~80%, not 0%.
3. Closing the tab and reopening the admin resumes the upload.
4. Per-file progress, aggregate progress, and a realistic time estimate.
5. Reject unsupported containers *before* upload starts, with a clear message.
6. Webhook endpoint verifies the signature and is idempotent — Bunny will retry.

## 4. Playback and access control

Wedding video is private. The threat model is "a link gets forwarded outside the family",
not "a determined pirate". Signed URLs are the right level.

```
Guest opens catalogue
  → server checks: published? passcode satisfied? subscription active?
  → issues a short-lived playback token (default 4h) scoped to catalogue + title
  → player requests the HLS manifest with the token
  → Bunny token authentication validates and serves
```

- Tokens expire in 4 hours; a copied `.m3u8` URL is dead after that.
- Tokens are bound to catalogue and title, so one leaked token doesn't unlock the library.
- Optional IP pinning is **off** by default — Indian mobile IPs rotate mid-playback and it
  causes false failures.
- `noindex, nofollow` on every catalogue; no sitemap; no cross-catalogue browse or search
  exists in the product at all.
- Passcode: rate-limited to 5 attempts, then a 15-minute lockout per IP.

## 5. Multi-tenancy

Unchanged in shape from the invite-site design.

```
Request → middleware.ts
  ├─ host = req.headers.host, stripped and lowercased
  ├─ root domain or www → marketing / admin login
  ├─ admin.<root> → admin app
  ├─ *.<root> → catalogue, tenant = first label
  └─ else → custom-domain lookup
```

`resolveTenant` stays a pure, exhaustively unit-tested function. Reserved subdomains:
`www, admin, api, app, cdn, static, assets, demo, staging, help, status, blog, docs`.

**Isolation:** Postgres RLS keyed on `catalogue_id` and `org_id`; a guest session can read
published titles of exactly one catalogue and write only its own playback progress; an
operator can read and write only catalogues belonging to their org. Every data-layer PR
answers "what enforces isolation here?" in its description.

## 6. Rendering and performance

| Route | Strategy |
|---|---|
| `/` (browse) | ISR, revalidate on publish; the one personalised row (Continue Watching, P1) hydrates client-side |
| `/title/<slug>` | ISR + client modal |
| `/watch/<slug>` | Dynamic — needs a fresh playback token |
| `/admin/*` | Dynamic, auth-gated, `no-store` |
| `/api/*` | Edge where possible; upload and webhook handlers on Node runtime |

### Budgets (enforced in CI, Moto G-class profile, Fast 3G + 4× CPU throttle)

| Metric | Budget |
|---|---|
| **Playback start time (press play → first frame), p75 on 4G** | **≤ 1.5s** |
| **Rebuffer ratio** | **≤ 1%** |
| Browse page LCP | ≤ 2.5s |
| Browse first-load JS | ≤ 150KB gzip (player lazy-loaded, not in the initial bundle) |
| CLS | ≤ 0.05 |
| OG image | ≤ 300KB |

Playback start time is the metric the product lives or dies on. What it takes:

- Preload the HLS manifest and the first segment on title-modal open, before Play is pressed.
- Start the ladder at 480p and step up. Never start at 1080p — it looks better for two seconds
  and then stalls, which is worse than starting soft.
- Short segments (2–4s) so the first one arrives fast.
- Player chunk lazy-loaded but prefetched on modal open.
- Poster frame shown instantly so the transition never flashes black.

## 7. Data flow summary

```
Operator ──create catalogue──▶ Postgres (catalogues)
        └─upload──▶ Bunny (direct, TUS) ──webhook──▶ Postgres (titles.status, duration, poster)

Guest ──open──▶ Next.js ISR browse page (catalogue + published titles)
      ──profile select──▶ localStorage profile id
      ──play──▶ /api/playback/token ──▶ signed token ──▶ Bunny CDN (HLS)
      ──progress every 10s──▶ /api/progress ──▶ Postgres (playback_progress)

Cron ──nightly──▶ recompute trending; check subscription states; usage rollups
```

## 8. Failure modes

| Failure | Handling |
|---|---|
| Transcode fails | Title stays in `failed` with the provider's reason surfaced in admin, plus a one-click retry. Never silently missing from the catalogue. |
| Upload interrupted | TUS resume from last acked offset. State in IndexedDB. |
| Webhook missed | Nightly reconciliation job polls Bunny for any title stuck in `processing` >2h. |
| Playback token expired mid-watch | Player refreshes the token transparently on 403 and resumes at the same position. Never dump the guest back to the start. |
| Bunny outage | Nothing we can do about delivery; browse pages stay up and show an honest banner rather than a broken player. |
| Subscription lapsed | Renewal screen. Content retained, not served. **Never a 404, never deletion.** |
| Catalogue goes viral | Usage alert at 300GB/month; decide whether to charge or investigate a leak. |
| Guest on a 2G connection | Ladder bottoms out at 360p; offer an audio-only... no — offer a "download for later" prompt (VE-13) instead of pretending it will stream. |

## 9. Phase 0 scope

Everything above is the destination. Phase 0 is:

```
Next.js + Supabase + Bunny
  ├─ one org, one operator account, real login
  ├─ create catalogue, upload, title, categorise, publish  ← the admin is P0
  ├─ browse: hero, genre rows, Trending, New, Continue Watching
  ├─ profile gate, title modal, player
  └─ one demo catalogue, fully populated, publicly demo-able
```

No billing, no custom domains, no analytics, no multi-role orgs. The admin **is** in Phase 0
because a demo where Sandeep edits JSON is not a demo of this product — the planner has to
see themselves creating a catalogue.
