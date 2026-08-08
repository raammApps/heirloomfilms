# PROGRESS

Append one entry per completed ticket. Keep entries to ~3 lines.
A fresh agent session reads CLAUDE.md → this file → the next ticket's files (doc 13 §2).

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

---

## Three bugs the tests found, worth knowing about

1. **`lib/env.ts` was reaching the client bundle** through `lib/log` → `modules/registry`, which
   crashed hydration on every guest page — the server rendered fine, so it only showed up in
   Playwright. `lib/log` no longer imports env, and `lib/env.ts` is now `server-only` so the next
   occurrence is a build error rather than a white screen in front of a guest.
2. **The customizer's advisories switched on module type names.** See P0-20 note.
3. **At 360px the nav's "Switch profile" label overlapped the language toggle** and made it
   untappable — caught by the Hindi E2E on the mobile project, not visible at desktop width.
   Replaced with the avatar doc 02 §4 actually specifies.

## Open, and deliberately so

- **The browse route renders dynamically, not ISR.** Reading the locale cookie in
  `app/c/[slug]/page.tsx` opts the route out of static generation, which doc 05 §6 wants. Fix is
  to move locale into the path or resolve it client-side. Real LCP cost, not yet paid.
- **No Lighthouse or QoE probe in CI** (doc 09 P1-14). Budgets are documented; nothing fails the
  build if first-load JS regresses past 150KB.
- **Doc 04 §2's contrast table is approximate.** `--text-lo` computes to 6.4:1 not 5.4:1, and
  `--accent` to 3.6:1 not 4.1:1. Every pairing still clears its minimum; the numbers are pinned
  in `tests/unit/contrast.test.ts` so a palette edit shows up in review.
- **The two things doc 13 §8 says not to delegate** — real cleared footage, and measuring
  playback start on real 4G at a venue — are untouched.
