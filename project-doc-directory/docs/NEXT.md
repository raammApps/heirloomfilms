# NEXT — the ordered backlog

`PROGRESS.md` records what was built and why. **This file records what is left, in the order it
should be taken up.** Read CLAUDE.md → PROGRESS.md → this file; that is a ~5k-token cold start.

Ordering rule: unretired risk first, then things that would embarrass us in front of a planner,
then debt. Within a tier, cheapest first.

Update this file as items land — move them out, do not leave them ticked.

---

## Where things stand, in one paragraph

Phase 0 is built: guest catalogue, player, admin, customizer, and the module registry. All six
doc 10 §2 journeys run, plus an OG size budget and a zero-axe-violations gate. **180 unit and
component tests, 69 E2E, all green.** Bunny is live and verified end to end against the real
CDN. Supabase has a working secret key but **the schema is still unapplied**, so `DATA_DRIVER` is
still `file` locally. Working tree clean on `master`.

Run `pnpm preflight` first in any new session: it reports the real state of both services in a
few seconds and is more trustworthy than this paragraph.

---

## Tier 1 — unretired risk

### N-1 · Finish the Supabase wiring  ·  one manual step  ·  ~30min

`SupabaseRepository` (564 lines) and both migrations have still never executed. This is the last
piece of production path with no coverage behind it.

1. ~~Secret key into `.env.local`.~~ Done.
2. `pnpm bootstrap:sql > /tmp/bootstrap.sql`, paste into the Supabase SQL editor, run. It
   applies both migrations (11 tables, 16 RLS policies) and the first org in one transaction.
   **This is the only remaining step** — it cannot be automated, because PostgREST does not
   execute DDL and the Management API needs a personal access token rather than the secret key.
3. Create the operator in Authentication → Users, then run the `insert into operators`
   statement printed at the end of that script.
4. `DATA_DRIVER=supabase`, then `pnpm preflight` and `pnpm test:integration`. Four Supabase
   integration tests exist and currently skip; they should go green, including the RLS one
   (doc 10 §1 test 12 — anon must not see a draft catalogue).

**Blocked on:** step 2 only. The secret key is in `.env.local` and works; `pnpm preflight`
confirms everything except the schema. `pnpm test:integration` currently fails its three
Supabase tests for exactly that reason — that is the harness working, not a defect.

### N-3 · A real upload through the browser, against Bunny  ·  ~1h

`pnpm verify:playback` uploads via a plain `PUT`. The product uploads via **TUS from the
browser**, which is the path doc 09 says the schedule slips on, and it has never run against a
real endpoint. E2E-5 covers our half of the contract only.

Do it by hand: `pnpm dev` with `VIDEO_DRIVER=bunny`, drop a large file into the admin, kill the
network at ~60%, restore, confirm it resumes from ~60% and not from zero. Then reload the tab
mid-upload and confirm it continues. This is doc 10 §2 E2E-5's untestable half and doc 10 §3 M-5.

---

## Tier 2 — before a planner sees it

### N-4 · The browse route renders dynamically, not ISR  ·  ~2h

`app/c/[slug]/page.tsx` reads the locale cookie, which opts the whole route out of static
generation. Doc 05 §6 wants ISR here, and this is a real cost against the 2.5s LCP budget on the
page every guest lands on.

Options, in order of preference: resolve the locale client-side after a static first paint; or
move it into the path (`/hi/…`), which doc 03 argues against because the WhatsApp link is the
product's front door. Measure before and after — the point is the number, not the refactor.

### N-5 · Lighthouse / QoE probe in CI  ·  ~3h  ·  doc 09 P1-14

The first-load JS budget is now gated (`pnpm check:bundle`, in CI after the build; browse is
141.8KB against 150KB). What is still only documented in `lib/budgets.ts` is **LCP, CLS and
playback start time** — and playback start is the metric the product lives or dies on.

Lighthouse CI against the built app covers LCP and CLS. Playback start needs a real QoE probe
and cannot be honestly measured on CI hardware; doc 10 §3 M-9 keeps the authoritative number on
a real phone on real 4G.

### N-6 · The demo catalogue needs real footage  ·  doc 13 §8 — **not to be delegated**

The fixture uses generated gradients. That proves the mechanics and would misrepresent the
product to a planner, who judges it on whether the films feel real. Needs real, cleared,
permission-granted material. Sandeep's, per doc 13 §8.

---

## Tier 3 — debt, in the order it will start hurting

### N-7 · Operator auth is a signed cookie, not Supabase Auth  ·  ~3h

The schema and RLS are written for Supabase Auth (`operators.id` references `auth.users.id`);
the app verifies a scrypt hash itself. Fine for one operator, wrong for Phase 2's org roles.
Contained to `lib/admin/session.ts`.

### N-8 · Doc 10 §1 test 4 is stale  ·  ~10min, doc change only

It requires "Trending suppression … New suppressed on a catalogue younger than 14 days", but
doc 01 §5.1 **cut** both features (VE-13, VE-14). Verified absent from the code. Either update
doc 10 or reread the requirement as "assert they do not exist".

### N-9 · The repo directory is named `couple-flix`  ·  ~5min

Doc 12 §1 rule 2 forbids `-flix` in "product, package, repo, domain, class, comment". The
package is `mehfil` and no code carries the suffix, but the directory does. Renaming to `mehfil`
makes the rule hold end to end.

### N-10 · Phase 1 modules  ·  doc 09 P1-07

`continue_watching`, `timeline`, `checklist`, `randomiser`. The registry, the `module_state`
table and the endpoint are all ready. Adding one should touch its own folder plus one registry
line — `tests/unit/registry.test.ts` fails the build otherwise. Remember `meta.content`.

---

## Held by Sandeep, not by an agent (doc 13 §8)

| # | What | Why it cannot be delegated |
|---|---|---|
| M-9 | Playback start under 1.5s on real 4G, p75 | Needs a phone, a venue, and a stopwatch |
| M-11 | A non-technical operator publishes a catalogue in under 30 min, timed | The hesitation is the roadmap |
| M-1 | WhatsApp preview on a real Android and iPhone | Cache behaviour is not reproducible locally |
| — | Real cleared footage for the demo (N-6) | It is the sales artefact |
| — | Rotate the Bunny account key | It was pasted into a chat transcript |
| — | Trademark search on "Mehfil", classes 42 and 45 | Doc 12 §1, before any planner collateral |

---

## Facts a new session will want

- **Credentials** live in `.env.local` (gitignored, verified). Bunny is fully configured and
  the Supabase secret key works; only the schema is missing.
- **Bunny**: library `mehfil` id `724076`, pull zone `6300168`, CDN `vz-98fb153e-d39.b-cdn.net`.
  Token auth **on**, IP pinning **off**, `BlockNoneReferrer` **off** — all three deliberate, see
  PROGRESS.
- **The account key and the library key are different.** `BUNNY_API_KEY` is the library key
  (Stream endpoints); `BUNNY_ACCOUNT_API_KEY` manages libraries. A 401 looks identical either way.
- **Playback tokens sign the directory `/{guid}/`, not the manifest.** Signing the file 403s
  every rendition and segment. `pnpm verify:playback` guards this; do not "simplify" it.
- Commands: `pnpm preflight` · `pnpm verify` · `pnpm test:e2e` · `pnpm test:integration` ·
  `pnpm verify:playback` · `pnpm bootstrap:sql` · `pnpm seed`.

## Picking up an item

```
Read CLAUDE.md, docs/PROGRESS.md and docs/NEXT.md. Do not read any other documentation
unless the item names it.

Run `pnpm preflight` to see the real state of the external services.

Implement <N-nn> from docs/NEXT.md. Only that item.

When its acceptance criteria are met:
1. pnpm verify
2. Commit with a message that says what changed and why
3. Move <N-nn> out of docs/NEXT.md and append to docs/PROGRESS.md
4. Stop.
```
