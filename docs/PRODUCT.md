# Product surface

**The canonical list of what this product is, and what of it exists.** Structured the way Sandeep
described it, so it stays recognisable as the business grows.

**This is the file to update on a pivot or a new requirement** — before writing code, before
touching `NEXT.md`. Everything else follows from it: `NEXT.md` is the ordered slice of what is
missing here, and `PRICING.md` prices what is built.

| Status | Meaning |
|---|---|
| **Built** | Exists, tested, deployed |
| **Partial** | Some of it works; the gap is named |
| **Missing** | Does not exist |

Last reviewed: **14 August 2026** — full consistency audit against the code and the spec.

## The name

**Heirloom Films** — `heirloomfilms.in`, registered 14 August 2026.

Chosen over Heirloom Films, Trove, Cinea, Aveya and several others. The reasoning is worth keeping,
because it is also the positioning:

- **"Heirloom" is arbitrary for a video platform**, which is what makes it distinctive and
  registrable. A trove is a collection and a stream is a stream; an heirloom is *a thing a family
  passes down*, which is the argument against Google Drive compressed into one word.
- **It is honest about permanence** in a way "Now and Forever" was not. An heirloom is something
  you keep and hand on — it does not promise a server runs indefinitely, so it does not fight the
  30-day deletion policy.
- **Trove and Cinea died on trademarks**, not domains: Trove is occupied in both class 41 and 42
  and its `.com` belongs to an operating platform; Cinea is a registered mark of a **Dolby
  Laboratories subsidiary** in video technology. Free domains are not the signal — free domains
  *plus no trademark holder* is.

The brand can present as **Heirloom** or **Heirloom Films**; the domain carries both.

> **Still outstanding: a trademark search in classes 41 and 42.** A search engine finds brands, not
> registry records — Cinea is exactly the case that proves the difference. Budget ₹3,000–8,000 with
> an agent, and ask specifically about "Heirloom Digital Productions", a small US wedding
> videography business.

---

## 1. Front end

### 1.1 Admin (us — the platform)

| | Status | Where it stands |
|---|---|---|
| Tenant account creation | **Partial** | Tenants self-register at `/admin/register`. **We cannot create one for them** — and until SMTP exists (N-17) self-registration does not work either, so today this is a manual SQL insert. |
| Tenant management | **Partial** | `/admin/platform` lists every org with catalogue counts, and one org's catalogues **read-only**. No suspend, no edit, no plan assignment, no delete. |
| User management | **Missing** | No view of operators or couples, no password reset on their behalf, no way to move a catalogue between orgs after handover. |
| Plan and quota assignment | **Missing** | `entitlements` resolves grants correctly but **nothing writes one**. Assigning a partner a plan is a SQL insert. |
| Revenue and usage view | **Missing** | Storage is metered per catalogue; delivery is not (`deliveredGb: 0`). No aggregate anywhere. |
| Impersonation for support | **Missing** | Deliberately — read-only is the current stance (doc 15 §1). Revisit only with an audit trail. |

**The shape is right and the surface is thin.** `platform_admins` is correctly outside the org
graph, so there is no privilege-escalation path to get wrong; what is missing is screens.

### 1.2 Tenant — the service provider (studio, planner)

| | Status | Where it stands |
|---|---|---|
| Create a user account with credentials | **Partial** | Done through **handover**: the partner issues a link, the couple sets their own password. There is no "create the couple an account with a password and hand it over". Deliberate — we never hold a couple's password — but it is not what "account creation" usually means, and it is worth confirming that is what you want. |
| Tier selection at creation | **Missing** | The wizard has no plan step. Every catalogue gets the same default caps. |
| Skin selection from a marketplace | **Missing** | Three hardcoded templates (`keepsake`, `films-only`, `anniversary`) chosen in the wizard. **No marketplace, no purchasable skins.** See §6. |
| Customisation — layout, text, message | **Built** | The customizer: drag or keyboard reorder, in-place heading editing, per-section editors, live preview of the real guest components. |
| **Saving is legible everywhere** | **Partial** | Three different models in one console and one of them is silent. The customizer autosaves and says *"Saved as draft"*; Settings has a Save button and a status line; **the film list saves on blur and says nothing at all.** An operator renaming a film has no way to know it worked. |
| Photograph captions | **Missing** | Photographs can be uploaded and deleted. There is **no PATCH route and no caption editing** — the field exists on the record and nothing can write it. |
| Language — guest surface | **Built** | English and Hindi, every guest string localised, silent fallback to English. |
| Language — **chosen at account creation** | **Missing** | **New requirement.** `orgSchema` has no locale field, so a tenant cannot set the language for their account and have new catalogues inherit it. Today the guest toggles and the default is always English. |
| Language — admin console | **Missing** | The console is English-only. A Hindi-first studio operates it in English regardless of what their guests see. |
| Account handover | **Built** | Single-use link, 14 days, hash-stored, one live transfer per catalogue, cancellable. Partner loses access entirely; credit survives. |
| Custom domain | **Partial** | Stored and validated. **Not served** — needs a CNAME plus the domain added to the hosting project, and nothing automates or verifies either. |
| Passcode | **Built** | Optional, five wrong tries locks the address for fifteen minutes. |
| Add storage | **Missing** | `entitlements` supports per-catalogue grants with expiry. No purchase flow, no UI, no proration. |
| See what a plan holds | **Missing** | Nothing shows "this plan holds about 9 hours" at purchase, or warns at 80% used. **Required by the pricing** — see `PRICING.md` §6. |
| Limits match the plan | **Built** | Storage is the only limit and it is enforced at both upload paths against real bytes. The film and photograph count caps are gone (N-28). |
| Included term matches what is sold | **Built** | Twelve months, matching `PRICING.md` (N-28). |

### 1.3 User — the couple

| | Status | Where it stands |
|---|---|---|
| View | **Built** | Guest catalogue, player, resume, deep links, profile gate, two languages. |
| Share a film | **Built** | `ShareButton` in the title modal — `navigator.share` (the WhatsApp sheet on a phone) with a copy-link fallback, and a `?t=` deep link so "watch from 7:08" works. |
| Share a photograph | **Missing** | The lightbox has no actions at all. No share, no copy link, no direct address for a single photograph. |
| Like a film or photograph | **Missing** | Nothing anywhere. Would need per-guest state, which `module_state` and the profile gate already provide. |
| Own the account after handover | **Built** | Their own org, full console minus the handover panel. |
| Told they now own it | **Missing** | **No migration email.** The couple learns they own it only if the partner tells them. This is the single biggest hole in the commercial model — `PRICING.md` §2. |
| Renewal | **Missing** | `subStatus` drives a renewal screen for guests. There is no way to actually renew — no payment, no self-service, no reminder. |
| Credentials management | **Partial** | Supabase Auth handles password reset. No in-app profile screen, no email change. |
| Passcode management | **Built** | Same settings screen the partner used. |
| Buy and apply a theme | **Missing** | Branding only — accent, logo, font, "presented by". No purchasable themes. See §6. |
| Hand back to the studio | **Missing** | Sandeep's idea, and a good one: let a couple return the catalogue for a re-skin or an update. No mechanism. |
| Download before deletion | **Missing** | **Required by the 30-day deletion policy.** `PRICING.md` §2 — without it, that policy should not ship. |

---

## 2. Back end

| | Status | Where it stands |
|---|---|---|
| Platform services | **Built** | Next.js route handlers, typed errors, rate limiting, structured logging, health endpoint, two crons. |
| Authentication | **Built** | Supabase Auth behind an `AuthProvider` seam; `local` driver keeps CI and tests offline. |
| Tenant management | **Partial** | Orgs, operators, handover and `origin_org_id` all exist. No lifecycle: no suspend, no plan assignment, no deletion. |
| Storage connector | **Built** | `VideoProvider` and `PhotoProvider` seams, Bunny and fake drivers. Resumable multi-gigabyte upload, proven against a real network drop. |
| Quota management | **Partial** | Storage resolves catalogue → org → default and **is enforced at both upload paths** against real stored bytes; the console shows GB used against the plan. **Nothing writes a grant yet** — that is the payment work. |
| Renewal | **Missing** | The state machine exists and `resolveAccess` honours it. Nothing writes it, warns about it, or acts on lapse. |
| Payment | **Missing** | No gateway, no invoices, no webhook. N-20. |
| Deletion and retention | **Missing** | `subStatus` has `cold`; **no code acts on it.** The retention policy is stated in the product and enforced nowhere — the only cost that compounds (`SCALE-PLAN.md` §4.1). |
| Delivery metering | **Missing** | `getUsage` returns real stored bytes and `deliveredGb: 0`. Allowances cannot be enforced and no catalogue's cost can be attributed. |
| Email | **Missing** | No SMTP (N-17). Blocks registration, password reset, the migration email, and every expiry warning. **This one blocks the most.** |

---

## 3. Storage — Supabase

**Built.** Postgres with RLS, `Repository` seam so the suite runs against an in-memory store.
8 GB on Pro against 0.16 GB used at 60 weddings — roughly 48× headroom. `SCALE-PLAN.md` §3.

Open: play events are kept forever. `retention_months` exists in migration 0006 and is unused.

---

## 4. Delivery — Bunny

**Built.** Stream for video (free transcoding, TUS resumable upload, token auth, HLS), Edge
Storage plus a pull zone for photographs. Signed, expiring, directory-scoped playback URLs.

Open: the encoding ladder must be set to 360p–720p by default before selling — at Full HD a
15-hour wedding needs 64 GB and fits no plan. `PRICING.md` §7.

---

## 5. Deployment — Vercel

**Built.** `bom1` (Mumbai), ISR on the guest page, two crons, deploy script that pushes every
environment variable first. CI runs lint, typecheck, 341 tests, dead-code, contrast, bundle and
vitals gates; 90 E2E across three Playwright projects including path mode.

Headroom: ~33× on function invocations at 10 weddings a month.

---

## 6. Skin / theme marketplace — **entirely new**

**Missing, and it is the largest single item on this page.** Nothing in the codebase anticipates
it.

### What exists to build on

- **Templates** — three named starting layouts, each a list of module instances.
- **Branding** — accent colour, logo, display font, "presented by", applied as scoped CSS custom
  properties so a tenant's colour never repaints the console.
- **The module registry** — a page *is* an ordered list of validated module instances. That is
  already most of what a theme is.

A theme is plausibly **template + branding preset + type scale**, which the architecture supports
today. What it does not support is anything about *selling* one.

### What has to be decided before any of it is built

These are product questions, not engineering ones, and the answers change the shape:

1. **Who makes themes?** Only us, or third parties? Third-party themes mean review, versioning,
   payouts and a sandbox — a different product, and a much bigger one.
2. **What can a theme change?** Colours and fonts is a preset. Layouts is a template. **Custom
   components is a plugin system**, and that is where this stops being a weekend.
3. **Who buys — partner or couple?** You have listed it under both. They imply different things:
   a partner buys once and reuses across weddings; a couple buys for their own page.
4. **One-off or subscription?** And does a theme survive handover?
5. **What happens when a theme is updated or withdrawn** on a live wedding?

### The honest read

The first version worth building is **not a marketplace**. It is **more templates plus saved
branding presets a partner can reuse** — which needs no payment, no review process, and no
versioning, and delivers most of the value ("their weddings all look like their studio").

Sell that first. Build a marketplace when a third party asks to publish into it.

---

## 7. What blocks what

Ordered by how much it unblocks:

1. **SMTP** — blocks registration, password reset, the migration email, every expiry warning, and
   therefore renewal. **Nothing else on this list matters as much.** (N-17)
2. **Payment** — blocks plan selection at creation, add-on storage, renewal, and the marketplace.
   (N-20)
3. **Delivery metering** — blocks allowance enforcement and any per-catalogue cost view.
4. **Deletion job** — the only cost that compounds.
5. **Download before deletion** — gates the 30-day policy ethically.
6. **Plan capacity in the UI** — "holds about 9 hours", warn at 80%. Cheap, and the pricing
   depends on it.

---

## Keeping this current

**Update this file first, then `NEXT.md`.** The order matters: this says what the product *is*,
`NEXT.md` says what to do next, and a backlog that has drifted from the product map is how you
build the wrong thing efficiently.

On a pivot: change the affected rows, move the date at the top, and say what changed in the commit
message. Do not delete a row that turned out to be wrong — mark it, so a future session knows it
was considered.

| Related | |
|---|---|
| [`NEXT.md`](./NEXT.md) | The ordered slice of what is missing here |
| [`PRICING.md`](./PRICING.md) | What the built parts are sold for |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How the built parts fit together |
| [`USAGE-GUIDE.md`](./USAGE-GUIDE.md) | How to use the built parts |
