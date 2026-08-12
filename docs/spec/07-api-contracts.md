# 07 — API Contracts

Three surfaces: **guest** (unauthenticated, read + own progress), **admin** (operator
session), **webhooks** (provider → us).

## Conventions

- JSON in, JSON out. Errors: `{ "error": { "code", "message", "fields"? } }`
- Client localises by `code`; never display `message` to a guest.
- Times ISO 8601 with `+05:30`.
- Guest endpoints are rate-limited per IP + catalogue at the edge.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Zod rejected; `fields` maps path → message |
| `CATALOGUE_NOT_FOUND` | 404 | Slug unknown, or draft, to an anon caller |
| `PASSCODE_REQUIRED` | 401 | Privacy gate not satisfied |
| `SUBSCRIPTION_INACTIVE` | 402 | Lapsed past grace — client routes to `/renew` |
| `TITLE_NOT_READY` | 409 | Still transcoding, or failed |
| `UPLOAD_LIMIT` | 413 | File exceeds the per-file cap |
| `UNAUTHORIZED` / `FORBIDDEN` | 401 / 403 | Admin only |
| `RATE_LIMITED` | 429 | With `Retry-After` |
| `INTERNAL` | 500 | Never leak detail |

---

# Guest

## `POST /api/playback/token`

The one endpoint that matters for the core metric. Keep it fast — target p99 under 120ms.

```jsonc
// request
{ "catalogue": "aanya-vikram", "titleSlug": "sangeet-film", "profileId": "b1f…", "passcode": "…" }

// 200
{
  "playbackUrl": "https://vz-….b-cdn.net/<guid>/playlist.m3u8?token=…&expires=…",
  "thumbnailsUrl": "https://…/seek.vtt",
  "durationS": 1284,
  "resumeAtS": 428,             // from playback_progress for this profile
  "expiresAt": "2026-08-08T20:14:00+05:30",
  "captions": [ { "lang": "hi", "url": "https://…/hi.vtt" } ]
}
```

Rules: title must be `published` **and** `status='ready'`; catalogue `published` and
`sub_status` in `included|active|grace`; token scoped to this catalogue **and** title, 4h
expiry; no IP pinning (Indian mobile IPs rotate mid-playback and it causes false failures).

Client refreshes silently on 403 and resumes at the same position. Never restart playback.

## `POST /api/progress`

Heartbeat every 10s while playing, plus on pause and unload (`sendBeacon`).

```jsonc
{ "catalogue":"aanya-vikram", "profileId":"b1f…", "titleId":"9c…",
  "positionS": 428, "deltaS": 10, "durationS": 1284 }
```

Upserts `playback_progress`; appends to `play_events` only when `deltaS > 0`. Marks
`completed` past 95% (which removes it from Continue Watching). Returns `204`. Fire-and-forget
— a failed heartbeat must never interrupt playback.

## `POST /api/profiles`

`{ catalogue, label, avatarSeed }` → `{ profileId }`. Label comes from a fixed set
("Bride's side", "Groom's side", "Friends", "Family"). **Never accepts a free-text personal
name** — see doc 06 §5.

## `POST /api/passcode`  ·  `GET /api/og`  ·  `POST /api/module-state`

- `passcode`: `{ catalogue, passcode }` → sets an httpOnly cookie. 5 attempts, then 15-min
  lockout per IP. Constant-time compare.
- `og`: 1200×630 via Satori — billboard still at 40% over `--surface-0`, couple name in
  Archivo 800, occasion + date, partner logo at 15%. Cached immutable, keyed on config hash.
  **≤300KB — assert this in a test.**
- `module-state`: `{ profileId, moduleId, state }` for checklist ticks and quiz answers.
  Upsert, `204`.

---

# Admin

All require an operator session; every query is scoped to `org_id` from the session, never
from the request body.

## `POST /api/admin/catalogues`

```jsonc
{ "coupleName": {"en":"Aanya & Vikram"}, "appName": {"en":"AanyaVikramStream"},
  "weddingDate": "2026-11-14", "slug": "aanya-vikram",
  "occasion": "wedding", "template": "wedding-full" }
```

Validates slug against the reserved list and `/flix$/i` on `appName` (doc 12 §1). Sets
`included_until = now() + 3 months` and seeds `modules` from the template.

`GET` list · `PATCH /:id` (branding, settings, privacy) · `POST /:id/publish` (copies
`draft_modules` → `modules`, sets `published_at`, revalidates ISR).

## `PUT /api/admin/catalogues/:id/modules`

The customizer's autosave. Writes the whole array to `draft_modules` — **never** to
`modules`.

```jsonc
{ "modules": [ { "id":"m1", "type":"billboard", "enabled":true, "order":0,
                 "title":{"en":""}, "config":{ "featuredRef":"t_9c…", "useTrailer":true } } ] }
```

Each instance's `config` is validated against that module type's Zod schema from the
registry. An unknown `type` is a `400`, not a silent drop.

## `POST /api/admin/uploads`

Creates the provider object and returns a resumable endpoint. **Bytes never pass through our
server.**

```jsonc
// request
{ "catalogueId":"…", "filename":"sangeet_final.mp4", "sizeBytes": 6442450944, "kind":"video" }

// 200
{ "titleId":"9c…", "tusEndpoint":"https://video.bunnycdn.com/tusupload",
  "headers": { "AuthorizationSignature":"…", "AuthorizationExpire":"…",
               "VideoId":"…", "LibraryId":"…" },
  "chunkSizeBytes": 5242880 }
```

Creates the `titles` row at `status='uploading'` immediately, so a refresh mid-upload shows
the file rather than losing it.

## `PATCH /api/admin/titles/:id` · `POST /api/admin/titles/:id/retry` · `POST /api/admin/titles/reorder`

Metadata (name, synopsis, category, credits, poster, captions, published, sort_order);
re-trigger a failed transcode; bulk reorder as `[{id, sortOrder}]` in one transaction.

## `GET /api/admin/catalogues/:id/analytics` *(P1)*

Per-title views, watch seconds, completion rate; catalogue totals; `deliveredGb` and
`storedGb` for the current month from `usage_rollup`.

---

# Webhooks

## `POST /api/webhooks/bunny`

Verify the signature before anything else. **Must be idempotent** — Bunny retries.

| Provider status | `titles.status` | Also |
|---|---|---|
| finished | `ready` | Set `duration_s`, extract 3 poster candidates, revalidate ISR |
| failed / error | `failed` | Store `error_message`, surface in admin with retry |
| processing | `processing` | — |

A nightly reconciliation job polls anything stuck in `processing` for over two hours — webhooks
get lost and a title silently missing from a couple's wedding catalogue is not acceptable.

## `POST /api/webhooks/razorpay` *(P1)*

Signature-verified. Drives `sub_status`: paid → `active`; failed → `grace` (60 days);
cancelled → `grace`. **No webhook may ever set `deleted`** — deletion is only ever a job that
runs after the documented notice period.

---

## Deliberately not built

| Not building | Why |
|---|---|
| Public catalogue index / cross-catalogue search | The product has no public surface by design |
| Guest identity or accounts | Profiles are device-local labels; adding identity adds DPDP surface to the hottest path |
| Per-guest viewing history API | Privacy liability; no planner has asked who watched what |
| Server-side video proxy | Doubles egress cost and adds a failure point between guest and CDN |
| Public module API | The registry is internal; third-party modules are not a Phase 0–2 concern |
