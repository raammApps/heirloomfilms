# CLAUDE.md — Mehfil (implementation)

The **specification** lives in `project-doc-directory/`. Read
`project-doc-directory/CLAUDE.md` first, then `project-doc-directory/docs/13-agent-runbook.md §2`
for the per-ticket reading map. Never load the whole doc set.

This file covers the **codebase**: what exists, and the rules that keep it coherent.

## Context discipline

- `project-doc-directory/docs/PROGRESS.md` is the handoff file. Read it after CLAUDE.md; a cold
  start is then ~4k tokens regardless of repo size. Append after every ticket.
- Never read the `.svg` wireframes into context. `docs/03-wireframes.md` carries the text.
- Never read `archive/` — superseded invite-site work.

## Working rules, enforced rather than remembered

These are lint rules, tests or types, not conventions. If you find yourself wanting to break one,
the check will tell you before review does.

| Rule | Enforced by |
|---|---|
| `process.env` only in `lib/env.ts` | eslint `no-restricted-properties` |
| No `dangerouslySetInnerHTML` on tenant or guest strings | eslint `no-restricted-syntax` |
| No `any` | eslint + `tsc --strict` |
| No file outside `modules/` names a module type | `tests/unit/registry.test.ts` |
| Every English key has a Hindi entry | `tests/unit/i18n.test.ts` |
| No `-flix` in a shipped app name | `appNameSchema` in `lib/schema.ts` |
| Palette contrast | `pnpm check:contrast` |
| Secrets never in the browser bundle | `server-only` on `lib/env.ts` and the driver modules |

Run `pnpm verify` before committing. One ticket from doc 09 per commit.

## Deliberate deviations from the spec

Both were forced, both are argued rather than assumed. Do not "fix" either without reading why.

1. **The guest tree is client-rendered.** Doc 08 sketches `<ModuleRenderer>` as a server
   component. Doc 14 §5.4 requires the customizer's preview to render *the real guest
   components*, and a server component cannot mount in the operator's browser. One
   implementation that both surfaces share beats two that drift. The player — the heavy chunk —
   is still lazy-loaded on its own route.

2. **`Repository` sits between the app and Postgres.** Doc 06 specifies Supabase from Phase 0
   and production runs on it. The interface exists so the suite, CI, and an offline demo run
   against an in-memory store with identical semantics. A test suite that needs a database is a
   test suite nobody runs.

## Where the risk actually is

- `lib/catalogue-access.ts` — the only place a guest request is authorised. Draft is not a 404,
  lapsed is a renewal screen, passcode precedes content. Change it once, not per route.
- `lib/admin/session.ts` — the only place `org_id` enters a query. A route that does not call
  `requireOperator` or `requireOwnedCatalogue` is visibly unscoped.
- `modules/registry.ts` — one line per module. A `switch` on module type anywhere else is the
  abstraction leaking.
- `components/admin/UploadManager.tsx` — resumable multi-gigabyte upload is where doc 13 §7 says
  the schedule slips. Do not simplify the offset handling.

## Stack

Next.js 15 App Router · TypeScript strict · Tailwind v4 with CSS custom properties for tenant
theming · Zod for every config and form · Supabase Postgres with RLS · Bunny Stream behind
`lib/video/provider.ts` · Vercel · pnpm.

## Definition of done for Phase 0

A planner is handed a phone, opens a catalogue, taps a film, and it starts playing in under a
second and a half on 4G. Then they watch their own logo and colour appear on it, live, while
someone drags a section into a different order and hits Publish.

Both in the same meeting, or the product does not work yet.
