# NEXT — the ordered backlog

`PROGRESS.md` records what was built and why. **This file records what is left, in the order it
should be taken up.** Read CLAUDE.md → PROGRESS.md → this file; that is a ~5k-token cold start.

Ordering rule: unretired risk first, then things that would embarrass us in front of a planner,
then debt. Within a tier, cheapest first.

Update this file as items land — move them out, do not leave them ticked.

---

## Where things stand, in one paragraph

Phase 0 is built and deployed: guest catalogue, player, admin console, customizer, the module
registry, and the partner/handover model. All six doc 10 §2 journeys run, plus an OG size budget,
a first-load JS budget and a zero-axe-violations gate. **308 unit and component tests, 81 E2E,
all green.**

**Both external services are live and verified end to end**: production runs on
`DATA_DRIVER=supabase` + `VIDEO_DRIVER=bunny` at `https://marquee-film-pub.vercel.app`, an
operator signs in against real Postgres, and create → publish → guest page works.
`pnpm test:integration` is 10/10, and `pnpm verify:upload` proves a real TUS upload survives a
network drop. Local development stays on `file` + `bunny` so the demo catalogue is available.
Branch is `main`.

Run `pnpm preflight` first in any new session: it reports the real state of both services in a
few seconds and is more trustworthy than this paragraph.

---

## Tier 1 — unretired risk

Empty. The three things doc 09 called out as schedule risk — the video provider, the database,
and resumable upload — have all now run against the real services.

---

## Tier 2 — before a planner sees it

### N-20 · Razorpay  ·  doc 15 §4  ·  **needs `0006_entitlements.sql` run first**

Two flows that should not share a code path: partners buy catalogue credits in advance, couples
pay renewal and storage after the included months. The subscription state machine already exists
and `resolveAccess` honours it — what is missing is only the thing that *writes* it. Verify the
webhook the way the Bunny one is verified, and assume it gets lost, because that lesson is
already paid for.

The entitlement tables and the resolver now exist (N-19); what is missing is the thing that
*writes* a row. `plans` is empty on purpose — the price list is a business decision, not a
migration.

### N-17 · SMTP, before registration is opened to anyone  ·  ~30m  ·  **blocks partner sign-up**

Supabase Auth sends a confirmation on sign-up and a link on password reset, and by default both
go through Supabase's built-in SMTP — a few messages per hour, meant for development. Hitting it
returns `over_email_send_rate_limit`, which is what the first live registration attempt did.

A partner who never receives their confirmation cannot sign in, and no message the app can write
will help, because the limit belongs to the project rather than to their address.

Configure a real provider (`docs/DEPLOYMENT.md` §12) and check the Site URL, or the confirmation
link lands somewhere that is not this deployment.

### N-16 · Partner model  ·  see doc 15

Platform admin, partner registration, couple accounts, ownership transfer, entitlements,
Razorpay. Sequenced in doc 15 §6 — the order matters, and steps 1–3 (this item, ISR, Supabase
Auth) are worth doing whether or not the partner model happens.

### N-14 · Real footage  ·  operator task

The guest surface has been judged against generated gradients and flat test images throughout.
Card treatment, row edge gradients and billboard scrim are all still unassessed against real
photographs, and that is the largest remaining gap between this and something that reads as a
streaming product. Nothing else on this list changes that impression as much.

### N-11 · Domain  ·  ~30m + DNS propagation

**Deployed, public and fully verified** at `https://marquee-film-pub.vercel.app` — Supabase,
Bunny, and webhook delivery all confirmed against real traffic. Nothing is unverified any more.

What is left is the name. Per [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) §5, `path` mode
needs one CNAME. Afterwards, update **two** things or transcodes silently stop:

1. `ROOT_DOMAIN` on the Vercel project.
2. The Bunny library's `WebhookUrl`.

> The webhook must always point at the **stable alias**, never at a `marquee-film-<hash>` URL.
> A per-deployment URL keeps answering after the next deploy — from the *old* build — so the
> failure is a webhook that appears healthy while running superseded code.

### N-6 · The demo catalogue needs real footage  ·  doc 13 §8 — **not to be delegated**

The fixture uses generated gradients. That proves the mechanics and would misrepresent the
product to a planner, who judges it on whether the films feel real. Needs real, cleared,
permission-granted material. Sandeep's, per doc 13 §8.

---

## Tier 3 — debt, in the order it will start hurting

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

**Run `supabase/migrations/0006_entitlements.sql`.** Creates `plans` and `entitlements`. Until it
is applied the Supabase driver logs a warning and resolves every catalogue to the default caps —
deliberately the *low* answer, so nothing is over-granted while the table is missing, but also
means no upgrade can take effect.

**Rotate the admin password.** `pnpm rotate:password` writes a new one to `.env.operator.local`
(gitignored, never printed) and prints the SQL. Run that `update operators …` in the Supabase SQL
editor, sign in, then delete the file. Production now refuses to boot on the repo's published
default, so this cannot quietly stay unrotated.

**Rotate the Supabase secret key.** It went through a chat transcript. It bypasses RLS entirely,
so it is the most valuable credential here. Supabase dashboard → Settings → API → roll the
`service_role` / secret key, then update `.env.local`, `.env.vercel.local` and
`./scripts/deploy-vercel.sh`.

**Rotate the Bunny account API key.** Also went through a transcript. Lower urgency than the
above: nothing deployed uses it — only `pnpm preflight` — so the exposure is local. It can still
create and delete zones on the account. Bunny dashboard → Account Settings → API.

**Real footage** (N-14), which is the one thing no agent can do for this product.

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
  `pnpm verify:playback` · `pnpm verify:upload` · `pnpm check:bundle` · `pnpm check:vitals` ·
  `pnpm bootstrap:sql`.

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
