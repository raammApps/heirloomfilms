# Mehfil

A white-label platform that presents a wedding's best moments as the couple's own private,
cinematic streaming service. An operator at a wedding management company creates a catalogue,
uploads the films, arranges the sections in a customizer, and publishes a branded site the
couple's guests browse like a streaming app.

**It is a keepsake, not an archive.** 6–15 items, 3–5 sections, two screens of scroll. The full
40GB and the 2,000 photos stay wherever they live today.

The specification lives in [`project-doc-directory/`](project-doc-directory/). This README covers
running and shipping the code.

---

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Then open:

| What | Where |
|---|---|
| Demo catalogue | http://localhost:3000/?__catalogue=aanya-vikram |
| Admin console | http://localhost:3000/admin — `operator@mehfil.test` / `mehfil-dev` |
| Health probe | http://localhost:3000/api/health |

No Supabase project and no Bunny account are needed. The default drivers are in-process and
deterministic, which is what lets the whole test suite — and a planner demo on venue wifi — run
with nothing behind them.

### Subdomains without DNS

In production a catalogue lives at `<slug>.mehfil.app`, resolved in `middleware.ts`. Locally,
`?__catalogue=<slug>` reaches the same route and sticks for the session, so client-side
navigation to `/watch/<slug>` behaves exactly as it will on a real subdomain. The override is
refused in production unless `ALLOW_EPHEMERAL_DATA=1` is set, which only the test harness does.

---

## Verification

```bash
pnpm verify
```

Runs lint, typecheck, the unit and component suites, and the palette contrast gate. End-to-end
runs separately because it builds and boots the app:

```bash
pnpm test:e2e
```

| Command | Covers |
|---|---|
| `pnpm test` | 168 unit and component tests |
| `pnpm test:e2e` | The six journeys in doc 10 §2, mobile and desktop |
| `pnpm check:contrast` | Every colour pairing in doc 04 §2, read out of `globals.css` |
| `pnpm typecheck` | Strict TS, `noUncheckedIndexedAccess`, no `any` |

The suite runs in about two seconds without a database. That is deliberate: a test suite that
needs infrastructure becomes a test suite nobody runs.

---

## Swappable drivers

Three seams keep the product from being welded to a vendor. Each has a real implementation and
a local one, and both go through the same interface.

| Seam | Interface | Drivers |
|---|---|---|
| Persistence | `lib/db/repository.ts` | `memory` · `file` · `supabase` |
| Video | `lib/video/provider.ts` | `fake` · `bunny` |
| Config | `lib/env.ts` | validated once, at boot |

`DATA_DRIVER=file` persists to `.data/store.json`, which survives a dev-server restart and makes
an offline demo possible. Production refuses to start on anything but `supabase` unless
`ALLOW_EPHEMERAL_DATA=1` is set explicitly.

Doc 05 §2 calls Bunny "a default, not a lock-in". Switching providers is one new class behind
`VideoProvider` and one line in `lib/video/index.ts`.

---

## Adding a module

The module system is the product's moat (doc 14). Adding one touches **its own folder plus one
registry line** — nothing else. `tests/unit/registry.test.ts` fails the build if any file outside
`modules/` names a module type.

```
modules/<type>/
  schema.ts    Zod config → validation and the generated editor form
  Guest.tsx    What a guest sees
  Editor.tsx   What the operator configures
  index.ts     defineModule({ meta, schema, Guest, Editor, defaults, advise })
```

Then one line in `modules/registry.ts`. The browse page, the customizer, the preview pane and the
admin all pick it up.

---

## Layout

```
app/
  c/[slug]/                 Guest catalogue (middleware rewrites the subdomain here)
    watch/[titleSlug]/      Player — its own route, needs a fresh token
    locked/ · renew/        Passcode gate · subscription renewal, never a 404
  admin/                    Operator console, auth-gated, light theme
  api/                      Route handlers, all through lib/http/handler.ts
components/
  streaming/                Billboard, PosterRow, TitleModal, ProfileGate, Player
  admin/                    UploadManager, CustomizerShell, PreviewPane, ThemePicker
  chrome/                   TopNav, SiteFooter, ThemeStyle
modules/<type>/             See above. registry.ts is the only wiring point.
lib/
  schema.ts                 Zod domain types — everything else infers from here
  tenant.ts                 Pure host → route resolution
  catalogue-access.ts       The one place a guest request is authorised
  video/ · db/ · admin/     The swappable seams
supabase/migrations/        Schema + RLS
e2e/ · tests/               Playwright · Vitest
```

---

## Deployment

### Vercel (primary)

Wildcard `*.mehfil.app` plus `admin.mehfil.app` pointed at the project. `vercel.json` pins the
Mumbai region — the audience is in India and the CDN edge matters more than anything else in the
config. The nightly reconciliation cron is declared there too.

### Container (portable)

```bash
docker build -t mehfil .
docker run -p 3000:3000 --env-file .env.production mehfil
```

Standalone output, non-root user, health check on `/api/health`. No secret is baked into the
image: `lib/env.ts` skips its production guards during the build phase precisely so the build
can run without real configuration.

### First run against Supabase

1. Apply `supabase/migrations/0001_initial_schema.sql`, then `0002_row_level_security.sql`.
2. Create the org row and the operator row (the operator's `id` is their `auth.users` id).
3. Set `DATA_DRIVER=supabase` and the three Supabase keys, plus the Bunny keys and
   `VIDEO_DRIVER=bunny`.
4. `GET /api/health` reports which drivers actually came up — check it after every deploy. A
   deployment that silently came up on the memory driver is the failure that probe exists for.

### What is enforced where

| Concern | Enforcement |
|---|---|
| Tenant isolation | Postgres RLS (`0002`) **and** org-scoped queries in `lib/admin/session.ts` |
| Service-role key never in the browser | `server-only` on `lib/env.ts`, `lib/db/*`, `lib/video/bunny.ts` |
| No catalogue is indexable | `X-Robots-Tag` on every response, plus per-page metadata |
| Passcode brute force | 5 attempts, 15-minute lockout per IP, constant-time compare |
| Playback token scope | Bound to catalogue **and** title, 4h expiry |
| No `-flix` in a product name | `appNameSchema`, rejected at catalogue creation |
| Palette contrast | `pnpm check:contrast` in CI, and live in the customizer at pick time |

---

## Known gaps

Recorded honestly rather than left to be discovered. Details and reasoning in
`project-doc-directory/docs/PROGRESS.md`.

- **The browse route renders dynamically, not ISR.** Reading the locale cookie opts the route
  out of static generation. Doc 05 §6 wants ISR here. The fix is to move locale into the path or
  resolve it client-side; it is a real LCP cost and it is not yet paid.
- **Operator auth is a signed cookie, not Supabase Auth.** The schema and RLS are written for
  Supabase Auth; the app currently verifies a scrypt hash itself. Fine for Phase 0's single
  operator, and the swap is contained to `lib/admin/session.ts`.
- **Poster candidates and trailers come from the provider, unstyled.** Doc 04 §6's generated
  artwork is implemented and used as the fallback everywhere, but three-frame extraction on
  `ready` is only as good as what Bunny returns.
- **No Lighthouse or QoE probe in CI.** Doc 05 §6's budgets are documented and the first-load JS
  is inside 150KB, but nothing fails the build if that regresses. Doc 09 P1-14.
- **Phase 1 modules are not built.** `continue_watching`, `timeline`, `checklist`, `randomiser`
  are Phase 1 by plan; the registry and `module_state` are ready for them.

The two things doc 13 §8 says not to delegate — real cleared footage for the demo, and measuring
playback start on real 4G at a venue — remain open by design.
