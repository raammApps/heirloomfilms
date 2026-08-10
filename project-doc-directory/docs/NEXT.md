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
component tests, 69 E2E, all green.** **Both external services are live and verified end to end**: the app boots on
`DATA_DRIVER=supabase` + `VIDEO_DRIVER=bunny`, an operator logs in against real Postgres, and
create → publish → guest page works. `pnpm test:integration` is 10/10, and `pnpm verify:upload` proves a real
TUS upload survives a network drop. Local development stays on `file` + `bunny` so the demo
catalogue is available. Working tree clean on `master`.

Run `pnpm preflight` first in any new session: it reports the real state of both services in a
few seconds and is more trustworthy than this paragraph.

---

## Tier 1 — unretired risk

Empty. The three things doc 09 called out as schedule risk — the video provider, the database,
and resumable upload — have all now run against the real services.

---

## Tier 2 — before a planner sees it

### N-12 · Two blind spots the suite has, now that we know they exist  ·  ~2h

Validation against real infrastructure found three fatal bugs that 220 unit tests and 69 E2E
tests all passed straight through. Both blind spots are structural, not oversights:

1. **E2E only ever runs `TENANCY_MODE=subdomain`.** `playwright.config.ts` sets
   `ROOT_DOMAIN=mehfil.localhost:3000` and never sets the mode, so path mode — *what production
   runs* — has no coverage at all. That is how Play could 404 for every guest with a green
   suite. Add a third Playwright project running the guest journey in path mode; the routes
   differ, so it is a real second surface, not a duplicate.

2. **`verify:playback` proves the CDN, not the player.** It appends the token with curl and
   asserts 200/403. A real player resolves child playlists relative to the manifest, drops the
   query string, and gets 403 on every one — which is exactly what happened, invisibly, behind
   a passing script. Drive the actual `<video>` through hls.js in that script and assert
   `readyState === 4`, the way `verify:upload` already drives a real browser.

Until both exist, "the tests pass" says nothing about the configuration that is deployed.

### N-11 · Finish the deploy  ·  ~30m + DNS

**Deployed and running** at `marquee-film-pub` (Vercel, Hobby, `sandeep-bh5-7354s-projects`).
`/api/health` reports `supabase` + `bunny`, so the environment took. Three things remain, and
none of them are code:

1. **It is not public.** Vercel Deployment Protection is on by default and 302s every request to
   an SSO login, so a guest cannot open a catalogue. Turning it off is what makes this a real
   deployment — Settings → Deployment Protection → Vercel Authentication → Disabled (or limit it
   to Preview). `vercel curl` is how to verify anything until then.
2. **The Bunny webhook has still never been verified**, because it needs a public URL. Point the
   library's webhook at `<deployment>/api/webhooks/bunny`, upload one film, and watch it reach
   `ready` unaided. Until this passes, transcode completion depends on the reconcile cron.
3. **No GitHub auto-deploy.** Connecting the repo failed: *"private and owned by an
   organization, which is not supported on the Hobby plan"*. Either make the repo public, move it
   to a personal account, or keep deploying with `./scripts/deploy-vercel.sh`.

Then DNS, per [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) §5 — one CNAME for `path` mode,
and `ROOT_DOMAIN` updated to match.

### N-4 · The browse route renders dynamically, not ISR  ·  ~2h

`app/c/[slug]/page.tsx` reads the locale cookie, which opts the whole route out of static
generation. Doc 05 §6 wants ISR here, and this is a real cost against the 2.5s LCP budget on the
page every guest lands on.

Options, in order of preference: resolve the locale client-side after a static first paint; or
move it into the path (`/hi/…`), which doc 03 argues against because the WhatsApp link is the
product's front door. Measure before and after — the point is the number, not the refactor.

### N-5 · Lighthouse in CI  ·  ~2h  ·  doc 09 P1-14

First-load JS is gated (`pnpm check:bundle`) and playback start and rebuffer ratio are now
measured in production (`qoe.playback_start`, `qoe.rebuffer`). What remains is **LCP and CLS**,
which Lighthouse CI against the built app covers.

Playback start deliberately stays out of CI: it cannot be honestly measured on CI hardware, and
doc 10 §3 M-9 keeps the authoritative number on a real phone on real 4G. Production telemetry is
the continuous version of it.

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

- **Credentials** live in `.env.local` (gitignored, verified). Both services are fully
  configured; `pnpm preflight` is all green.
- **Supabase**: schema applied, org `kalyanam`, operator `operator@mehfil.test`. The app
  verifies its own scrypt hash, so the Supabase Auth password on that account is random and
  unused — it exists only to satisfy `operators.id → auth.users.id`. The app login is
  `operator@mehfil.test` / `mehfil-dev`.
- **The real database has no demo catalogue.** The nine-title fixture only exists in the
  `memory`/`file` drivers. Seeding a real one properly is N-6 (it needs real footage).
- **Bunny**: library `mehfil` id `724076`, pull zone `6300168`, CDN `vz-98fb153e-d39.b-cdn.net`.
  Token auth **on**, IP pinning **off**, `BlockNoneReferrer` **off** — all three deliberate, see
  PROGRESS.
- **The account key and the library key are different.** `BUNNY_API_KEY` is the library key
  (Stream endpoints); `BUNNY_ACCOUNT_API_KEY` manages libraries. A 401 looks identical either way.
- **Playback tokens sign the directory `/{guid}/`, not the manifest.** Signing the file 403s
  every rendition and segment. `pnpm verify:playback` guards this; do not "simplify" it.
- **An interrupted upload is not a failed one.** `UploadManager` marks it `interrupted` and
  resumes on the `online` event; tus's default retry policy gives up on a bare network error,
  so `onShouldRetry` is set explicitly. `pnpm verify:upload` guards this against real Bunny.
- Commands: `pnpm preflight` · `pnpm verify` · `pnpm test:e2e` · `pnpm test:integration` ·
  `pnpm verify:playback` · `pnpm verify:upload` · `pnpm check:bundle` · `pnpm bootstrap:sql`.

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
