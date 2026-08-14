# Partners, ownership transfer, and scale

How the platform goes from one operator to many businesses, and what has to be true for that not
to hurt. Written against the code as it stands on 12 Aug 2026, not against the ambition.

Doc 01 §7 already specifies the money: three months included with the planner's per-wedding
licence, then the couple pays directly. Doc 11 covers white-labelling. **This document is about
who accounts belong to, how a catalogue changes hands, and what breaks at volume.**

---

## 0. Fix this before a second business has data here

`supabase/migrations/0002_row_level_security.sql` grants `select` to the `anon` role on
`catalogues`, `titles`, `albums` and `photos`. The anon key is `NEXT_PUBLIC_` — it is in every
page this app serves. Anyone can take it from the page source and list **every published
catalogue on the platform**:

```
aanya-and-vikram    Aanya & Vikram   2026-12-01
swarit-and-smriti   Swarit & Smriti  2026-08-03
```

Doc 01 forbids this twice: *"No public directory, search, or cross-catalogue browse exists
anywhere in the product"* and *"never findable by anyone without the link"*.

**Nothing in the app uses the anon key.** Guest pages and admin both read through
`SupabaseRepository`, which holds the service-role key, server-side. The anon policies grant a
capability no code exercises. So the fix is subtraction: revoke the anon grants entirely and keep
RLS as the operator-isolation boundary it already is.

Today this leaks two couples. With partners it leaks **every partner's whole client list to
anyone**, including their competitors, and the wedding date and couple's name with it. It is the
cheapest fix in this document and the only one that gets more expensive by waiting.

---

## 1. Three kinds of account, one isolation mechanism

The temptation is to invent a new scope for partners. Resist it: `org_id` scoping already exists,
is enforced twice (RLS, plus `requireOwnedCatalogue` reading org from the session and never from
the request), and is the one thing in this system that has been tested against a second org.
**Every new role reuses it.**

| Who | Reality today | What changes |
|---|---|---|
| **Platform admin** — you | Does not exist. You are `operator@heirloomfilms.test` inside one org. | New `platform_admins` table keyed by `auth.users.id`, deliberately **not** an org. A platform admin has no `org_id`, which is what stops "admin" quietly becoming "member of every org". |
| **Partner** — studio, planner | `orgs` + `operators`. Already exactly this. | Add `orgs.kind = 'partner'`, self-registration, and an entitlement row. |
| **Couple** — the client | Does not exist. | A couple gets their **own org** on transfer, with one operator and one catalogue. |

**Why a couple gets an org rather than a new "owner" column.** A column means a second
authorisation path: every query would have to ask "is this my org, *or* am I the owner?", in RLS
and in `lib/admin/session.ts`, forever. Cross-tenant leaks live in exactly that kind of branch.
An org per couple is a slightly odd-looking row and zero new isolation logic — and isolation
logic is the part you cannot afford to get wrong once other businesses are on the platform.

Cost of the odd-looking row: one `orgs` insert per transfer. At the volumes doc 05 models, that
is nothing.

```
platform_admins ─── (no org)
orgs ── kind: partner ──┬── operators (admin | uploader)
                        └── catalogues ──▶ transferred ──▶ orgs ── kind: couple
                                                              └── operators (admin)
```

`catalogues.origin_org_id` records which partner created it — permanently, even after transfer.
That is what makes partner reporting, support access and attribution possible without giving the
partner a live claim on the couple's content.

---

## 2. Transfer is a handshake, not a button

The couple must end up in control, and the partner must not be able to hand over a catalogue to
an address the couple never confirmed.

```
partner clicks "Hand over"
   → transfers row: catalogue, from_org, to_email, token (single use), expires 14d
   → email to the couple
   → couple sets a password  → auth user + couple org + operator
                              → catalogues.org_id = couple org   (one statement)
                              → branding.presentedBy snapshotted, so the partner's
                                credit survives the partner losing write access
```

Non-obvious requirements, each of which is a real failure if missed:

- **Single-use, expiring token.** A forwarded email must not hand a wedding to whoever reads it
  second.
- **The partner keeps nothing by default.** "Transfer permanently" means the couple can remove
  the partner's access to their own wedding. `origin_org_id` remains for attribution; a separate,
  couple-revocable `support_access_until` is how a partner helps after the fact.
- **The transfer is one statement.** `org_id` moving and the couple org existing must not be able
  to half-happen; a catalogue owned by nobody is unreachable by every query in the system.
- **Idempotent.** Couples will click the link twice. The second click signs them in.

---

> **⚠ Superseded — pricing.** The figures in this section are the original Phase 0 model and are
> **no longer what we sell.** [`docs/PRICING.md`](../PRICING.md) is current: three plans priced on
> storage (₹2,500 / ₹7,000 / ₹12,000), **twelve** months included rather than three, renewal per
> tier, 4K as a minute allowance, and 30-day deletion after lapse. This section is kept because the
> *reasoning* — why the couple pays rather than the planner, why tiers grade on craft — still
> holds, and because it is the record of what was intended.

## 3. Entitlements, because "limited space" has to live somewhere

`MAX_TITLES = 15` and `MAX_PHOTOS = 60` are constants in `lib/schema.ts`. The moment a partner
buys more space, or a couple upgrades, a constant is the wrong shape.

```sql
plans        (id, kind: partner|catalogue, name, price_paise, catalogue_credits,
              storage_gb, max_titles, max_photos, retention_months)
entitlements (id, org_id | catalogue_id, plan_id, storage_gb, max_titles, max_photos,
              valid_until)
```

Resolution order, and it matters: **catalogue entitlement → partner entitlement → plan default**.
A couple who buys storage must not have it silently capped by their partner's tier, because by
then the partner is no longer in the relationship.

Keep the caps low by default anyway. Doc 05 §2 is explicit that the 15-title cap is a curation
requirement first and a cost ceiling second — *"if planners routinely push past it, the product
has drifted into being an archive"*. Sell storage, but do not let it turn this into Google Drive
with a nicer player.

**Enforce on write, not on read.** A guest page that has to check quota before rendering is a
guest page that gets slower as the business grows.

---

## 4. Money

Razorpay, per doc 05 §1 — Indian entity, UPI, subscriptions. Two distinct flows that should not
share a code path:

| Flow | Who pays | Shape |
|---|---|---|
| **Catalogue credits** | Partner | Prepaid pack. Creating a catalogue spends one. Matches how studios buy: in bulk, before the season. |
| **Renewal and storage** | Couple | Subscription, after the included months. Doc 01 §7: ₹249/month or ₹1,999/year. |

The subscription state machine already exists —
`sub_status ∈ included | active | grace | lapsed | cold | deleted` — and `resolveAccess` already
honours it, including the expiry date added this session. What is missing is only the thing that
*writes* it: a Razorpay webhook, verified the way the Bunny one is, and the same reconcile-style
cron for payments the video pipeline has for transcodes. Assume webhooks get lost, because they
do; that lesson is already paid for.

**Never delete a couple's wedding because a card expired.** Doc 01 §7 sets 60 days grace, cold
storage, and a final notice before deletion. Those are product requirements, not niceties, and
they are the reason to build the state machine properly rather than a boolean.

---

## 5. What actually breaks at scale

Ranked by when it bites, not by how interesting it is.

**1. The guest page is not cached.** N-4: `/c/[slug]` renders dynamically on every request, so
two hundred guests opening a link is two hundred renders and two hundred database round trips
per catalogue. This is the first thing that hurts and the cheapest to fix — the content changes
when an operator publishes, which is exactly what ISR with on-publish revalidation is for. Do
this before partner onboarding, not after.

**2. Indexes for the lookups on the hot path.** `catalogues.slug` and `catalogues.custom_domain`
are hit on every guest request; `titles.catalogue_id` and `photos.album_id` on every render.
Confirm they exist before the table is large enough for the answer to matter.

**3. One Bunny library for everyone.** Fine now. The pressure points are per-library API rate
limits and the blast radius of one leaked library key. A library per partner is the natural
split, and `lib/video/provider.ts` is already the seam — but do not pre-split; the migration is
easy and the complexity is not free.

**4. Delivery cost is not the constraint.** Doc 05 §2: ~₹150 per catalogue per year against a
₹4,000+ licence. Photographs are rounding error next to video, and video is already
resolution-capped. The usage cron alerts at 300GB per catalogue per month, which is the number
to watch for abuse rather than for cost.

**5. Postgres will be fine for a long time.** Weddings are read-heavy, tiny, and naturally
partitioned by catalogue. Nothing here needs sharding; it needs the cache in point 1.

---

## 6. Sequence

Each step leaves the platform working, and no step depends on a later one.

| # | Work | Why here |
|---|---|---|
| 1 | **Revoke the anon grants** | Leaks every client list. Minutes to fix. §0 |
| 2 | **ISR on the guest route** (N-4) | The only thing that gets worse with every catalogue sold. §5.1 |
| 3 | **Supabase Auth** (N-7) | Partner self-registration needs real accounts and password reset. The signed-cookie login cannot carry three account types, and the shared dev password is currently live. |
| 4 | **`platform_admins` + `orgs.kind`** | The smallest change that makes "you" distinct from "a partner". |
| 5 | **Partner registration and portal** | Now safe to let strangers in. |
| 6 | **Entitlements** replacing the constants | Needed before anything is sold by size. §3 |
| 7 | **Transfer** | Needs couple accounts, which need step 3. §2 |
| 8 | **Razorpay** | Last, because everything above it is what is being sold. §4 |

Steps 1–3 are worth doing whether or not the partner model happens. They are the ones where
waiting costs something.

---

## 7. What this document assumes, and what would change it

- **Partners are few and catalogues are many.** Tens of partners, thousands of catalogues,
  hundreds of thousands of guests. If partners turn out to be hundreds, revisit §5.3.
- **A couple wants control after the wedding, and most will never log in.** Transfer must work
  perfectly and be used rarely. Build it simple.
- **The partner relationship is the product.** Doc 01 §2 chose the planner over the videographer
  because the planner owns the client relationship. Anything that lets the platform go around a
  partner to their client breaks the thing that makes them sell it.
