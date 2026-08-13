# Pricing model

Written to answer one question: **what should we charge a channel partner for a 10 / 20 / 40 GB
plan, and why.**

Every cost is from the providers' live pricing pages in August 2026, and every figure is worked
rather than asserted, so you can redo it when a price moves. Sources at the bottom.

> This is a business model, not advice about your finances. The numbers are arithmetic on
> published rates; the judgement calls are flagged as judgement calls.

> **Revision, August 2026.** The first version of this document assumed a wedding delivery was
> under two hours of finished film, and on that basis told you to push back on the studio owner's
> request for larger tiers. **That was wrong.** An Indian wedding is every function from both
> sides — pre-wedding, haldi, mehendi, sangeet, ceremony, reception — and lands at **10–15 hours
> post-production**. He was describing his job accurately. Everything below is recomputed on that,
> and §6 is now a different argument.

---

## The short version

| | Storage | Holds | **We charge the partner** | They sell for |
|---|---|---|---|---|
| **Highlights** | 10 GB | ~3.8 hrs | **₹2,500** | ₹6,000–8,000 |
| **Signature** | 20 GB | ~7.6 hrs | **₹4,000** | ₹10,000–12,000 |
| **Full Wedding** | 40 GB | ~15.2 hrs | **₹6,500** | ₹15,000–20,000 |

Twelve months included. Delivery allowance of 150 / 300 / 600 GB. Renewal **₹1,999/year**.
**Extra storage: ₹25 per GB per month, charged only for the months left on the plan.**

Four things drive it:

1. **A full wedding needs the 40 GB tier.** 10–15 hours is 26–40 GB at the current encoding
   settings. The top tier is the *normal* one, not the premium one.
2. **Infrastructure is 5–10% of the price** — ₹341–685 per wedding per year.
3. **Storage is not the cost driver, delivery is** — and delivery does not vary with the plan.
4. **Your fixed costs dominate below ~20 weddings a year.** That is a volume problem, not a
   pricing problem, and §5 removes it.

---

## 1. What it actually costs

### Published rates, August 2026

| Item | Rate |
|---|---|
| Bunny Stream — transcoding | **Free** |
| Bunny Stream — storage | **$0.01 / GB / month** |
| Bunny CDN — delivery, Asia & Oceania (Standard, 119 PoPs) | **$0.03 / GB** |
| Bunny CDN — delivery (Volume network, 10 PoPs) | $0.005 / GB |
| Bunny Edge Storage — photographs, HDD, one region | $0.01 / GB / month |
| Bunny minimum | $1 / month |
| Supabase Pro | $25 / month |
| Vercel Pro | $20 / user / month |
| USD → INR | **₹95.5** |

India sits in Bunny's "Asia & Oceania" band. **Use the Standard network, not Volume** — Volume is
six times cheaper but runs 10 PoPs globally, and the product's promise is a film starting in under
a second and a half on 4G. The sums below use $0.03/GB throughout.

### How much storage a wedding actually needs

Bunny stores the transcode ladder — 360p/480p/720p/1080p, ~6 Mbps aggregate — which is
**2.64 GB per finished hour**.

| Finished runtime | Storage needed |
|---|---|
| 8 hrs | 21.1 GB |
| 10 hrs | **26.4 GB** |
| 12 hrs | 31.6 GB |
| 15 hrs | **39.6 GB** |
| 20 hrs | 52.7 GB |

And what the tiers hold:

| Plan | Full ladder | At 720p max |
|---|---|---|
| 10 GB | 3.8 hrs | 6.3 hrs |
| 20 GB | 7.6 hrs | 12.6 hrs |
| 40 GB | 15.2 hrs | **25.3 hrs** |

**Read that second column, because it is the biggest lever you have.**

### The encoding ladder is a pricing decision

Dropping 1080p from the ladder — 360p/480p/720p, ~3.6 Mbps — takes storage from 2.64 GB/hour to
**1.58 GB/hour**. That is a **40% cut**, and it turns 20 GB from "not enough for a wedding" into
"comfortably a whole wedding".

The judgement: **a three-hour sangeet recording watched on a phone does not need 1080p; a
five-minute highlights film does.** Two profiles is the right answer:

| Profile | Ladder | For |
|---|---|---|
| **Feature** | to 1080p — 2.64 GB/hr | Highlights, teasers, the ceremony edit. Things rewatched and shown to people. |
| **Long-form** | 720p max — 1.58 GB/hr | Full-function recordings people scrub through once. |

A 15-hour wedding delivered as 2 hours of Feature and 13 hours of Long-form is
**5.3 + 20.5 = 25.8 GB** — inside the 40 GB tier with real headroom, rather than at 39.6 GB and
against the wall.

> **Two settings to check on your Bunny library before selling anything.**
> **Keep Original Files** and **MP4 Fallback** are both optional and both roughly double storage.
> If either is on, every number here understates by 2×. The product already reads real stored
> bytes per title, so the honest calibration is: **upload one real wedding, read the actual number
> off the overview, and correct this table.** Everything above is a well-founded estimate; that
> would be a measurement.

### Storage cost per wedding

| Plan | Per month | **Per year** |
|---|---|---|
| 10 GB | $0.10 | $1.20 = **₹115** |
| 20 GB | $0.20 | $2.40 = **₹229** |
| 40 GB | $0.40 | $4.80 = **₹458** |

### Delivery — the number that actually moves

At 1.8 Mbps adaptive on mobile. With 10–15 hours available, sessions get *longer*, not just more
numerous, so this assumes 20-minute sessions rather than 12.

| Scenario | Delivered | Cost to us |
|---|---|---|
| Modest — 150 guests × 15 min | 29.7 GB | **₹85** |
| Typical — 300 guests × 20 min | 79.1 GB | **₹227** |
| Engaged — 300 × 20 min, plus 60 watching a full 90-min function | 150.3 GB | **₹431** |
| Flaunted — 1,500 guests × 20 min | 395.5 GB | **₹1,133** |

**The difference between the 10 GB and 40 GB plans costs you ₹343 a year. The difference between a
quiet wedding and a flaunted one costs ₹1,048 — on the same plan.** You are selling the axis that
barely varies and absorbing the one that does. That is fine, and §4 bounds it, but it is why these
tiers should not be priced as though storage were the product.

### All-in variable cost, year one

| Plan | Typical | Worst case inside its allowance |
|---|---|---|
| 10 GB | **₹341** | ₹544 |
| 20 GB | **₹456** | ₹1,089 |
| 40 GB | **₹685** | ₹2,177 |

### Fixed cost, which is the one that bites

Supabase Pro + Vercel Pro = $45/month = **₹51,570/year**.

| Weddings per year | Fixed cost carried by each |
|---|---|
| 20 | **₹2,578** |
| 50 | ₹1,031 |
| 100 | ₹516 |
| 250 | ₹206 |

**At 20 weddings a year, fixed cost per wedding is four to seven times variable cost.** Pricing
cannot fix that. Volume can, and so can §5.

---

## 2. Why not cost-plus

Infrastructure is ₹341–685 per wedding. Cost plus a healthy 100% would be ₹1,400 — **leaving most
of the value on the table** and signalling that this is a commodity.

Price against what the deliverable is worth. A studio charges ₹80,000–3,00,000 to shoot and edit a
wedding of this scale. The films are what the couple actually keeps. A ₹6,000–20,000 line for
"your own private streaming site for a year, every function, shareable with everyone you invited"
sits inside that comfortably and reads as premium.

**The cost model's job is not to set the price. It is to prove you cannot lose money** — and to
name the one case where that stops being true, which is delivery on a wedding that travels.

---

## 3. The recommended plans

Twelve months, not three. A studio can sell "a year"; a three-month window plus a renewal
conversation in the same breath is how a sale stalls.

### Highlights — 10 GB — ₹2,500

Up to 15 films, 60 photographs. **The highlights film, the ceremony edit, and one or two
functions.** Not a whole wedding — position it as the budget package or the pre-wedding shoot,
never as the default.

### Signature — 20 GB — ₹4,000

Up to 25 films, 150 photographs. Custom domain. **A whole wedding if the long functions are
encoded at 720p; the main functions from one side otherwise.**

### Full Wedding — 40 GB — ₹6,500

Up to 40 films, 300 photographs. Custom domain, priority support. **Every function, both sides,
15 hours.** This is the tier most of his weddings will need. Lead with it.

### Margins

| Plan | Price | Variable | Contribution |
|---|---|---|---|
| Highlights | ₹2,500 | ₹341 | **₹2,159 (86.4%)** |
| Signature | ₹4,000 | ₹456 | **₹3,544 (88.6%)** |
| Full Wedding | ₹6,500 | ₹685 | **₹5,815 (89.5%)** |

Net, after fixed costs:

| Weddings/yr | Highlights | Signature | Full Wedding |
|---|---|---|---|
| **20** | **−₹420** | ₹966 | ₹3,236 |
| 50 | ₹1,127 | ₹2,513 | ₹4,784 |
| 100 | ₹1,643 | ₹3,028 | ₹5,299 |
| 250 | ₹1,952 | ₹3,338 | ₹5,609 |

### Break-even

| Plan | Weddings/year to cover fixed costs |
|---|---|
| Highlights | **23.9** |
| Signature | **14.6** |
| Full Wedding | **8.9** |

**One studio doing 9–15 weddings a season covers your entire infrastructure** — because they will
be buying the top tier. Keep that in mind when you decide how hard to negotiate with the first
partner.

### What the partner makes

| Plan | You charge | They sell | They keep |
|---|---|---|---|
| Highlights | ₹2,500 | ₹6,000–8,000 | ₹3,500–5,500 (58–69%) |
| Signature | ₹4,000 | ₹10,000–12,000 | ₹6,000–8,000 (60–67%) |
| Full Wedding | ₹6,500 | ₹15,000–20,000 | ₹8,500–13,500 (57–68%) |

A channel partner needs to roughly **double their money** to bother selling something; below ~50%
they treat it as a favour and stop mentioning it. Publish a suggested retail and let them charge
what they like — you cannot enforce resale pricing and should not try.

---

## 4. Extra storage, mid-term

This is the mechanism you asked for, and it is the right one: **the plan is the commitment, the
add-on is the adjustment.**

### The rule

> **₹25 per GB per month, charged only for the months remaining on the plan.**

Extra storage is **co-terminus** — it expires with the plan, so there is one renewal date and one
invoice, forever. At renewal the whole thing is re-quoted: either they renew at the larger size,
or they delete content and come back down.

| Bought | Months left | They pay | Costs us |
|---|---|---|---|
| +2 GB | 11 | **₹550** | ₹21 |
| +5 GB | 9 | **₹1,125** | ₹43 |
| +10 GB | 6 | **₹1,500** | ₹57 |
| +5 GB | 3 | **₹375** | ₹14 |

96% margin, and the arithmetic is simple enough to do out loud on a phone call — which matters,
because this sale always happens mid-delivery with a couple waiting.

### Why ₹25/GB/month, and not less

It is deliberately **more expensive per GB than upgrading a tier**. Compare:

| Move | Cost | Per GB for a year |
|---|---|---|
| 10 → 20 GB | ₹1,500 | ₹150 |
| 20 → 40 GB | ₹2,500 | ₹125 |
| Add-on | ₹300/GB/year | **₹300** |

That is not a trap, it is a signpost. It makes the right choice obvious at each size:

| Months left | Add-ons cheaper below | Above that, upgrade the tier |
|---|---|---|
| 12 | 5.0 GB (from 10 GB) | ✔ |
| 9 | 6.7 GB | ✔ |
| 6 | 10.0 GB | ✔ |

**A small top-up is cheap; a large one pushes them to the next tier**, which is what you want,
because the tier is annual recurring revenue and the add-on is not.

### The conversation to give the studio

> "Buy the tier that fits the wedding you booked. If an extra function turns up, add a few GB for
> what is left of the year — it is about ₹25 a gigabyte a month. If you find yourself adding more
> than five, upgrade instead; it is cheaper."

### Rules worth writing into the contract

- **Sold in whole GB**, minimum 1.
- **Never below what is stored.** Ask them to delete first.
- **No refund on unused add-on capacity** — it expires with the plan. Say this up front.
- **A tier upgrade absorbs existing add-ons**: credit what they paid for the unused months against
  the upgrade. Otherwise the signpost above becomes a penalty for having guessed wrong early.

> **Not built.** `entitlements` supports per-catalogue grants with an expiry, so the data model
> holds this — but there is no payment flow and no UI (N-20). Until there is: take the money,
> raise the catalogue's `storageGb` grant by hand, and set its expiry to the plan's renewal date.

---

## 5. Bounding the delivery risk

One wedding travelling costs ₹1,133. Rare, but "rare" is not "never", and the failure is silent.

**Scale the allowance with the tier**, since a bigger catalogue genuinely invites more watching:

| Plan | Allowance | Costs us at full use | Roughly |
|---|---|---|---|
| 10 GB | 150 GB | ₹430 | ~570 guests at 20 min |
| 20 GB | 300 GB | ₹860 | ~1,140 guests |
| 40 GB | 600 GB | ₹1,719 | ~2,280 guests |

Past the allowance, **do not bill automatically. Call them.** A catalogue over its allowance is
either being loved — the best sales story you will get, and worth ₹900 — or a leaked link, which
they need to know about. Charging a couple without warning for their wedding being popular is a
terrible first impression, and the margins say you can afford the conversation.

> **The app meters storage but not delivery** — `getUsage` returns real stored bytes and
> `deliveredGb: 0`. The allowance is enforced from the Bunny dashboard today. If delivery ever
> becomes billable, that has to be built first.

---

## 6. Do not pay $45 a month yet

At 20 weddings a year, Supabase Pro and Vercel Pro cost ₹2,578 per wedding — nearly four times the
entire variable cost of a Full Wedding plan.

**Supabase Free and Vercel Hobby carry this to roughly 50 weddings.** Real fixed cost then is
Bunny's $1/month minimum: **₹1,146/year**.

| | Break-even |
|---|---|
| On free tiers | **Wedding #1** |
| On Pro tiers | Wedding #9–24 |

Move to Pro when you hit an actual limit — the free database ceiling, or Vercel's commercial-use
terms once partners are paying — not on principle. Budget it as a step change at ~50 weddings,
where it is 4% of revenue rather than 100%.

---

## 7. What I got wrong, and what survives it

The first version of this document argued you should resist tiering on storage, quoting the
specification (`docs/spec/11` §3):

> Grading a keepsake by gigabytes invites the planner to treat it as an archive, which is the one
> thing it must not become.

That argument assumed a wedding was a highlights film and a ceremony edit — under two hours. **At
10–15 hours the premise fails.** The studio owner is not asking for an archive; he is describing
the actual deliverable for a multi-day Indian wedding with functions on both sides. Storage tiers
are the correct shape, and he was right to ask for three.

**What survives is narrower, and it is a product problem rather than a pricing one.** Fifteen
hours across forty films is a genuinely hard thing for a guest to navigate. A wedding page with
forty entries and no shape is not a keepsake; it is a file listing. The caps stay in the plans —
15 / 25 / 40 films — but they are now doing a different job: not holding down cost, but forcing
the sections, headings and ordering that make fifteen hours legible to somebody arriving from a
WhatsApp link.

That is what the customizer is for, and it is where the remaining UX work should go.

**One thing to keep from the original argument:** raw footage is still a different product. If the
studio wants to park unedited multicam for client review, that is "delivery and review" — no guest
surface, different economics, different price list. Say yes to it separately or not at all.

---

## 8. Upgrades and renewals

**One plan at booking**, as you intended — ask them to pick a price, not a capacity, then let it
move.

### Upgrading a tier mid-term

**The difference, prorated by months remaining**, no fee.

> 10 → 20 GB with 7 months left: (₹4,000 − ₹2,500) × 7/12 = **₹875**

Credit any unused add-on capacity against it. Never downgrade below what is stored.

### Renewal — ₹1,999/year

Charged to whoever owns the catalogue, which after handover is the couple.

| Plan | Cost to us in a renewal year | Margin |
|---|---|---|
| 10 GB | ₹137 | **93%** |
| 20 GB | ₹252 | **87%** |
| 40 GB | ₹481 | **76%** |

A renewal year is nearly pure margin: the traffic burst has passed and only the couple revisits.

**Flat across all three tiers**, even though 40 GB costs three times more to hold — the difference
is ₹344 and "₹1,999 a year to keep it" is a sentence a couple says yes to without a spreadsheet.
Add-on storage renews at the same ₹25/GB/month, or they delete and come down.

Offer the partner **15% of renewals** they originated. It costs ₹300 a year and it is the only
thing that makes them set the couple's expectations properly at handover, which is what actually
drives renewal.

> **No payment flow exists (N-20).** Sell annual plans and invoice manually until it does — with
> three tiers and a few partners, a spreadsheet is cheaper than billing you might price wrong.

---

## 9. Two things before you launch

**Sell a season, not a discount.** Prepaid credits — 20 weddings for the price of 15, valid a year
— converts a per-deal negotiation into one commitment, gives you cash up front, and makes the
studio pick you by default. `plans.catalogue_credits` already exists in the schema.

**Lead with Full Wedding.** It is what his weddings actually need, it breaks even at 8.9 weddings
against Highlights' 23.9, and the tier a partner starts on is usually the tier they stay on. Let
Highlights exist as the thing they step *down* to.

---

## Redoing this when prices move

Seven inputs. Change them and everything follows:

| | Aug 2026 |
|---|---|
| Bunny storage | $0.01 / GB / month |
| Bunny delivery, Asia | $0.03 / GB |
| Supabase Pro | $25 / month |
| Vercel Pro | $20 / month |
| USD → INR | ₹95.5 |
| Encoding ladder | ~6 Mbps → 2.64 GB per finished hour |
| Delivery per 20-min session | 0.26 GB |

The two that matter are **delivery per GB** and **the encoding ladder**. Storage could triple and
the worst tier would still be 85% margin.

---

## Sources

- [Bunny CDN pricing](https://bunny.net/pricing/) — regional delivery rates, $1 monthly minimum
- [Bunny Stream pricing](https://bunny.net/pricing/stream/) — free transcoding, storage from $0.01/GB
- [Bunny Storage pricing](https://bunny.net/pricing/storage/) — HDD and SSD tiers
- [Bunny Stream encoding](https://bunny.net/docs/stream/encoding) — Keep Original Files, MP4 Fallback, enabled resolutions
- [Supabase pricing](https://supabase.com/pricing) · [Vercel pricing](https://vercel.com/pricing)
- [USD/INR, August 2026](https://www.exchangerates.org.uk/USD-INR-spot-exchange-rates-history-2026.html)
- Internal: `docs/spec/05-technical-architecture.md` §2, `docs/spec/11-whitelabel-and-b2b.md` §3,
  `docs/spec/15-partners-and-scale.md` §3
