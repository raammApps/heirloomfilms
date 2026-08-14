# NEXT — the ordered backlog

[`PRODUCT.md`](./PRODUCT.md) is **what the product is**, surface by surface — update that first
when something changes. `PROGRESS.md` records what was built and why. **This file records what is
left, in the order it should be taken up.** Read CLAUDE.md → PROGRESS.md → this file; that is a ~8k-token cold start.

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

### N-17 · SMTP  ·  **working** — two follow-ups below

Resend is wired into Supabase Auth and `POST /auth/v1/recover` returns `200`. The domain is
verified with DKIM, SPF on a `send` subdomain, and a single DMARC record; the existing Hostinger
mailbox was never touched.

Two things this did **not** settle:

1. **The confirmation link host is unverified.** It is built from Supabase's Site URL, which no
   test here can read. If it is wrong, every other check still passes and partners land on the
   old deployment.
2. **Confirm email is switched off**, so registration still sends nothing — `signUp` auto-confirms
   in ~50ms. Anyone can register with an address they do not own. See `GO-LIVE.md` §3.

The original problem, for the record:

Supabase Auth sends a confirmation on sign-up and a link on password reset, and by default both
go through Supabase's built-in SMTP — a few messages per hour, meant for development. Hitting it
returns `over_email_send_rate_limit`, which is what the first live registration attempt did.

A partner who never receives their confirmation cannot sign in, and no message the app can write
will help, because the limit belongs to the project rather than to their address.

Configure a real provider and check the Site URL, or the confirmation link lands somewhere that is
not this deployment. Step-by-step in [`GO-LIVE.md`](./GO-LIVE.md) §3; background in
`docs/DEPLOYMENT.md` §12.

> Resend puts SPF and MX on a **`send` subdomain**, so the root SPF record that Hostinger mail
> depends on is never touched — no merge, no risk to existing email. The general rule still holds
> (one SPF record per domain, ever), it just does not bite with this provider.
>
> The real trap is Hostinger's DNS form, which **appends the domain to the Name field**: enter
> `send`, not `send.heirloomfilms.in`. Getting that wrong is the usual reason verification hangs.

### N-33 · One flaky E2E test, unsolved  ·  **fails ~2 runs in 3 under the full suite**

`admin.spec.ts › a catalogue made in the wizard is in the list without a reload` (N-32 §1). Passes
every time in isolation and under `--project=desktop` alone; fails only in a full parallel run.

**The behaviour it guards is correct** — removing `router.refresh()` from `CreateWizard` makes it
fail reliably, and restoring it makes it pass, so the fix is real and proven.

Ruled out, each by testing it:

- **Latency.** Raising the timeout to 20s did not help; it waits the full budget and the catalogue
  never arrives.
- **Rendering scale.** Filtering the list to the one slug before asserting did not help either.
- **A stale server cache.** `revalidatePath('/admin')` in the create route changed nothing, and
  correlated with a *previously stable* caption test starting to fail, so it was reverted.
- **The store being reset between tests.** There is no reset endpoint; nothing clears it.

What is left to try: whether concurrent workers sharing one in-memory store and one operator
session interfere — three projects write catalogues into the same org throughout the run. Worth
an hour with `--workers=1` to confirm, then either isolating the org per worker or quarantining
this spec into its own project.

**Do not delete the test to make the suite green.** It guards a real bug that reached production.

### N-29 · Language chosen at account creation  ·  ~half a session

**New requirement.** A tenant should pick their language when their account is created, and new
catalogues should inherit it.

Today `orgSchema` has no locale, `DEFAULT_LOCALE` is always English, and the guest toggles. So a
Hindi-first studio in Jaipur sets up every wedding in English and hopes guests find the switch.

- `orgSchema.locale`, set at registration, inherited by catalogues at creation.
- The catalogue's default locale drives what a guest sees **before** they touch the toggle.
- Separately: **the admin console is English-only.** Localising it is a larger job — every operator
  string, ~40 components — and worth scoping on its own once the guest side inherits properly.

### N-21 · The migration email  ·  ~2h  ·  **blocked by N-17**

A couple only learns they own their wedding if the partner remembers to tell them. That is the
single biggest hole in the commercial model (`PRICING.md` §2): they pay a studio ₹20,000, then a
year later a company they have never heard of asks them for money.

At handover, email them: this is yours, here is your login, here is the renewal date, here is what
happens if you do not. Then the expiry warnings — 30 / 14 / 7 / 1 days, and each day of grace.

### N-22 · Download everything, before deletion  ·  ~half a session

**Gates the 30-day deletion policy.** Deleting a wedding is not a recoverable mistake, and a couple
who changed email address loses it permanently. An export offered through the grace period turns
the worst moment in the product into a reasonable one — nobody lost anything, they were handed it.

Do not ship deletion without this.

### N-23 · Plan capacity in the console  ·  ~2h

Nothing shows what a plan holds. `PRICING.md` §6 requires "this plan holds about 9 hours" at
purchase and a warning at 80% used — otherwise a partner buys the wrong tier and hits the cap at
80% uploaded. Storage is also **not enforced at upload**; the cap is advisory today.

### N-24 · Lifecycle: renewal, lapse, deletion  ·  doc 15

The state machine exists and `resolveAccess` honours it. Nothing writes it. Needs: a renewal path,
the lapse transition, and the deletion job 30 days after — the only cost that compounds
(`SCALE-PLAN.md` §4.1).

### N-25 · Delivery metering  ·  ~2h

`getUsage` returns real stored bytes and `deliveredGb: 0`. Until it is real, allowances cannot be
enforced and no catalogue's cost can be attributed. Fine at 60 weddings from the Bunny dashboard;
impossible at 300.

### N-26 · Saved branding presets — the marketplace's honest first version  ·  doc: `PRODUCT.md` §6

A theme marketplace is the largest item on the product map and none of it exists. **The first
version worth building is not a marketplace**: more templates, plus branding presets a partner
saves and reuses across weddings. No payment, no review process, no versioning — and it delivers
most of the value ("all my weddings look like my studio").

`PRODUCT.md` §6 lists the five product questions that have to be answered before a real
marketplace is scoped. Build a marketplace when a third party asks to publish into one.

### N-27 · Platform admin, beyond read-only  ·  doc 15 §1

The console lists orgs and one org's catalogues, read-only. Missing: create a tenant, assign a
plan or quota, suspend, and any view of users. Today all of it is SQL.

Keep read-only as the default stance; add writes one at a time, with an audit trail.

### N-20 · Razorpay  ·  doc 15 §4  ·  **needs `0006_entitlements.sql` run first**

Two flows that should not share a code path: partners buy catalogue credits in advance, couples
pay renewal and storage after the included months. The subscription state machine already exists
and `resolveAccess` honours it — what is missing is only the thing that *writes* it. Verify the
webhook the way the Bunny one is verified, and assume it gets lost, because that lesson is
already paid for.

The entitlement tables and the resolver now exist (N-19); what is missing is the thing that
*writes* a row. `plans` is empty on purpose — the price list is a business decision, not a
migration.

### N-14 · Real footage  ·  operator task

**Partly done.** A first real catalogue is live (`swarit-and-smriti`) and the verdict was "it
looks good" — which is the signal this item exists to get. But it holds two WhatsApp-compressed
clips and ten photographs, so it does not yet answer the two questions that need real material:
how many GB a finished hour actually costs, and whether the card treatment, row gradients and
billboard scrim hold up against 300 DSLR frames.

The guest surface has otherwise been judged against generated gradients and flat test images.
Card treatment, row edge gradients and billboard scrim are all still unassessed against real
photographs, and that is the largest remaining gap between this and something that reads as a
streaming product. Nothing else on this list changes that impression as much.

### N-11 · Domain  ·  **live** — one item left, see [`GO-LIVE.md`](./GO-LIVE.md) §4

`https://heirloomfilms.in` serves the product: DNS points at both Vercel addresses, the
certificate issued, `ROOT_DOMAIN` is switched and redeployed, health reports `supabase` + `bunny`,
and push-to-deploy works again now the repo is public.

Nameservers stayed with Hostinger and the MX records are untouched, so existing mail is intact —
that is why `path` mode rather than `subdomain` is the right call for this domain.

**Left:** the Bunny library's `WebhookUrl` still points at the old URL. It needs Bunny's *account*
API key, which this repo deliberately does not hold, so it is a dashboard change.

> It has not broken, because `marquee-film-pub.vercel.app` is still attached and still serving the
> current build — luck rather than design. The alias list already holds several `marquee-film-*`
> names pinned to deployments days old. The webhook must point at the **stable domain**, never at
> a per-deployment URL, precisely because such a URL keeps answering after the next deploy from
> the *old* build: a webhook that appears healthy while running superseded code.

`pnpm preflight` and an end-to-end playback check against the new domain are **not yet run**.

### N-6 · The demo catalogue needs real footage  ·  doc 13 §8 — **not to be delegated**

The fixture uses generated gradients. That proves the mechanics and would misrepresent the
product to a planner, who judges it on whether the films feel real. Needs real, cleared,
permission-granted material. Sandeep's, per doc 13 §8.

---

## Tier 3 — debt, in the order it will start hurting

## Held by Sandeep, not by an agent (doc 13 §8)

**Insert yourself into `platform_admins`** if you want the platform console. It is built and
gated (N-16), and the table is empty, so today nobody can reach it — which is the correct default.
`id` must be your Supabase `auth.users` id:

```sql
insert into platform_admins (id, email, name)
values ('<your auth.users id>', 'you@example.com', 'Sandeep');
```

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
- **Supabase**: schema applied, org `kalyanam`, operator `operator@heirloomfilms.test`. The app
  verifies its own scrypt hash, so the Supabase Auth password on that account is random and
  unused — it exists only to satisfy `operators.id → auth.users.id`. The app login is
  `operator@heirloomfilms.test` / `heirloomfilms-dev`.
- **The real database has no demo catalogue.** The nine-title fixture only exists in the
  `memory`/`file` drivers. Seeding a real one properly is N-6 (it needs real footage).
- **Bunny**: library `heirloomfilms` id `724076`, pull zone `6300168`, CDN `vz-98fb153e-d39.b-cdn.net`.
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
