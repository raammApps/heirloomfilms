# 07 — API Contracts

Small surface by design. Every endpoint is edge-deployed, validates with Zod, and returns a
consistent error envelope.

## Conventions

- `Content-Type: application/json` on request and response.
- Errors always: `{ "error": { "code": "...", "message": "...", "fields"?: {...} } }`
- `message` is user-safe English; the client localises by `code`, never by displaying `message`.
- Times are ISO 8601 with `+05:30` offset. Never bare UTC, never epoch — a wedding at
  "2026-11-14T03:00:00Z" is a bug waiting to happen.
- Rate limits are per IP + tenant, enforced at the edge, returning `429` with `Retry-After`.

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Zod rejected the payload; `fields` maps path → message |
| `TENANT_NOT_FOUND` | 404 | Slug does not resolve |
| `RSVP_CLOSED` | 409 | `rsvp.closesAt` has passed |
| `EVENT_NOT_FOUND` | 400 | `event_slug` not in tenant config |
| `RATE_LIMITED` | 429 | Too many submissions |
| `TOKEN_INVALID` | 404 | Dashboard token unknown (404 not 403 — do not confirm existence) |
| `INTERNAL` | 500 | Anything else. Never leak detail. |

---

## `POST /api/rsvp`

Submit or update a guest's response across events. **Idempotent on `(tenant, phone)`** —
resubmitting updates rather than duplicating.

### Request

```jsonc
{
  "tenant": "demo",
  "guest": {
    "name": "Rhea Menon",
    "phone": "+919876543210",       // or "9876543210" — normalised server-side
    "side": "bride",                // optional
    "mealPref": "veg",              // optional: veg | jain | vegan | none | other
    "message": "Can't wait!",       // optional, ≤500 chars
    "locale": "en"
  },
  "responses": [
    { "eventSlug": "sangeet",  "status": "yes", "partySize": 2 },
    { "eventSlug": "wedding",  "status": "yes", "partySize": 2 },
    { "eventSlug": "mehendi",  "status": "no",  "partySize": 0 }
  ],
  "inviteToken": "g_7f3a…"          // optional, from ?g=
}
```

### Validation

```ts
const RsvpRequest = z.object({
  tenant: z.string().regex(/^[a-z0-9-]+$/),
  guest: z.object({
    name: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(10).max(16),
    side: z.enum(['bride','groom','both','unknown']).default('unknown'),
    mealPref: z.enum(['veg','jain','vegan','none','other']).optional(),
    message: z.string().max(500).optional(),
    locale: z.string().max(5).default('en'),
  }),
  responses: z.array(z.object({
    eventSlug: z.string(),
    status: z.enum(['yes','no','maybe']),
    partySize: z.number().int().min(0).max(20).default(1),
  })).min(1).max(20),
  inviteToken: z.string().max(64).optional(),
})
```

Server-side rules beyond the schema:

1. Every `eventSlug` must exist in that tenant's config and have `rsvp: true`.
2. `status: "no"` forces `partySize` to 0.
3. `partySize` is clamped to `config.rsvp.maxGuestsPerRsvp`.
4. Reject if `config.rsvp.closesAt` is past → `RSVP_CLOSED`.
5. Normalise phone to E.164, assuming `+91` for bare 10-digit numbers.
6. Strip HTML from `name` and `message`. Never render either without escaping.

### Response `200`

```jsonc
{
  "ok": true,
  "guestId": "5c0f…",
  "updated": false,                 // true if this replaced a previous submission
  "accepted": [
    { "eventSlug": "sangeet", "title": "Sangeet", "startsAt": "2026-11-13T19:00:00+05:30", "partySize": 2 },
    { "eventSlug": "wedding", "title": "Wedding", "startsAt": "2026-11-14T08:30:00+05:30", "partySize": 2 }
  ],
  "declined": [ { "eventSlug": "mehendi", "title": "Mehendi" } ],
  "icsUrl": "/api/ics?tenant=demo&guest=5c0f…"
}
```

The response carries everything the confirmation screen needs, so the client does not
re-derive it from local state and risk showing something different from what was stored.

### Rate limiting

10 submissions per IP per tenant per hour. Family members share networks at venues, so do
not set this tight. Add a honeypot field (`_hp`) rather than a CAPTCHA — a CAPTCHA on a
wedding RSVP is a completion-rate disaster.

### Phase 0 variant

No `/api/rsvp`. The form POSTs `multipart/form-data` directly to
`config.rsvp.endpoint` (Formspree). The client builds the confirmation view from local
state. Keep the same field names so migrating to the real endpoint in Phase 1 is a URL
change, not a rewrite.

---

## `GET /api/og`

Dynamic Open Graph image, 1200×630, generated with `next/og` (Satori).

| Param | Required | Notes |
|---|---|---|
| `tenant` | yes (implicit from host) | |
| `event` | no | Renders that ceremony's card instead of the couple card |
| `locale` | no | Defaults to tenant default |

Composition: hero image at 40% opacity over `--surface-0`, couple display name in Archivo 800
at 84px, date + city in Inter at 30px, partner logo bottom-right at 15% opacity.

Cache: `public, immutable, max-age=31536000`, keyed by a hash of the relevant config fields.
Output must be ≤300KB — check this in a test, because Satori will happily produce 900KB.

---

## `GET /api/ics`

Returns `text/calendar`. One `VEVENT` per accepted event.

| Param | Required |
|---|---|
| `tenant` | yes |
| `guest` | no — with it, only that guest's accepted events; without it, all events |
| `event` | no — single event |

`VEVENT` fields: `SUMMARY` = `<Event> — <Couple display name>`, `DTSTART`/`DTEND` with
`TZID=Asia/Kolkata`, `LOCATION` = venue name + address, `DESCRIPTION` includes dress code
and the site URL, `UID` = `<tenant>-<eventSlug>-<guestId|all>@mehfil.app`.

Stable `UID`s matter: they let a re-download update the existing calendar entry rather than
duplicating it when a guest changes their RSVP.

---

## `GET /api/dashboard/:token`

Server-side only; the page fetches it, the browser never calls it with a key.

### Response `200`

```jsonc
{
  "tenant": "demo",
  "couple": "Aanya & Vikram",
  "totals": { "invited": 412, "responded": 268, "attending": 301, "awaiting": 144 },
  "events": [
    { "slug": "sangeet", "title": "Sangeet", "startsAt": "2026-11-13T19:00:00+05:30",
      "yes": 214, "no": 18, "awaiting": 40, "headcount": 246 }
  ],
  "meals": { "veg": 186, "jain": 22, "vegan": 9, "none": 51, "other": 0 },
  "updatedAt": "2026-08-08T12:04:00+05:30"
}
```

`headcount` sums `party_size` where `status='yes'`. It is **not** the count of yes rows.
Write a test that asserts this explicitly — it is the field the caterer's invoice depends on.

Token comparison must be constant-time. Unknown token → `404 TOKEN_INVALID`, never `403`.

Every call appends to `access_log`.

---

## `GET /api/dashboard/:token/export.csv`

`Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`.

One row per guest per event:

```csv
guest_name,phone,side,event,status,party_size,meal_pref,responded_at,message
Rhea Menon,+919876543210,bride,sangeet,yes,2,veg,2026-09-02T14:31:00+05:30,Can't wait!
```

- UTF-8 **with BOM** — otherwise Devanagari names render as mojibake in Excel, which is
  where every planner will open this.
- Prefix any cell starting with `= + - @` with a single quote to prevent CSV formula
  injection. A planner opening an export is running whatever a guest typed.
- Logged to `access_log` as `csv_export`.

---

## `POST /api/revalidate`

Internal. Triggers ISR revalidation after a config change. Requires `x-revalidate-secret`
matching an env var. Body: `{ "tenant": "demo" }`.

---

## Endpoints deliberately not built

| Not building | Why |
|---|---|
| `GET /api/guests` | No client needs a guest list; the dashboard aggregates server-side. An endpoint that returns guest lists is the one an attacker wants. |
| `DELETE /api/rsvp` | Guests update rather than delete. Erasure requests go through the documented DPDP process, not a public endpoint. |
| Public tenant config API | Config contains venue addresses and family names. It ships server-rendered, not as a fetchable JSON blob. |
| Webhooks | No integrations exist yet. Build when a partner asks. |
