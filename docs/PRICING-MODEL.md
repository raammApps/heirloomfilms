# Pricing model

Written to answer one question: **what should we charge a channel partner for a 10 / 20 / 40 GB
plan, and why.**

Every cost here is from the providers' live pricing pages in August 2026, and every figure is
worked rather than asserted, so you can redo it when a price moves. Sources at the bottom.

> This is a business model, not advice about your finances. The numbers are arithmetic on
> published rates; the judgement calls are flagged as judgement calls.

---

## The short version

| | Storage | **We charge the partner** | They sell for | Their margin |
|---|---|---|---|---|
| **Keepsake** | 10 GB | **₹2,500** | ₹6,000–8,000 | 58–69% |
| **Signature** | 20 GB | **₹4,000** | ₹10,000–12,000 | 60–67% |
| **Atelier** | 40 GB | **₹6,500** | ₹15,000–20,000 | 57–68% |

All three include **12 months** and a **300 GB delivery allowance**. Renewal after that:
**₹1,999/year** to whoever owns the catalogue by then.

Three things drive those numbers, and they are the reason to read further:

1. **Infrastructure is 4–10% of the price.** Roughly ₹250–600 per wedding per year.
2. **Storage is not your cost driver. Delivery is** — and delivery has nothing to do with which
   plan they bought.
3. **Your fixed costs dominate until roughly 20 weddings a year.** That is the only number that
   should worry you, and it is a volume problem rather than a pricing problem.

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

India falls inside Bunny's "Asia & Oceania" band. **Use the Standard network, not Volume** — the
Volume network is six times cheaper but runs 10 PoPs globally, and the product's whole promise is
a film starting in under a second and a half on 4G. Saving ₹113 per wedding is not worth losing
that; the sums below use $0.03/GB throughout.

### What "10 GB" buys

Bunny stores the transcode ladder (360p/480p/720p/1080p, ~6 Mbps aggregate):

| Plan | Finished video it holds |
|---|---|
| 10 GB | ~228 minutes — **3.8 hours** |
| 20 GB | ~455 minutes — **7.6 hours** |
| 40 GB | ~910 minutes — **15.2 hours** |

Worth saying out loud to the studio owner: **10 GB is already almost four hours of finished film.**
A wedding delivery is typically a 3–5 minute highlights reel, a 20–40 minute ceremony edit, and a
handful of shorts — well under two hours. If he is asking for 40 GB, he is thinking about *raw
footage*, and that is a different product (see §6).

### Storage cost per wedding

| Plan | Per month | **Per year** |
|---|---|---|
| 10 GB | $0.10 | $1.20 = **₹115** |
| 20 GB | $0.20 | $2.40 = **₹229** |
| 40 GB | $0.40 | $4.80 = **₹458** |

### Delivery cost — the number that actually moves

At 1.8 Mbps adaptive on mobile, a viewer watching 12 minutes pulls ~0.16 GB.

| Scenario | Delivered | Cost to us |
|---|---|---|
| Quiet — 100 guests, 8 min each | 10.5 GB | **₹30** |
| Typical — 300 guests, 12 min each | 47.5 GB | **₹136** |
| Flaunted — 2,000 viewers | 316 GB | **₹907** |
| Viral — 5,000 viewers, 15 min | 989 GB | **₹2,833** |

**Notice what this does to the plan structure.** The difference between a 10 GB and a 40 GB plan
costs you ₹343 a year. The difference between a quiet wedding and a flaunted one costs you ₹877 —
on the same plan. **You are selling the axis that does not vary and absorbing the one that does.**

That is survivable, and §4 says how to bound it. But it is why the tiers should not be priced as
though storage were the product.

### All-in variable cost, year one

| Plan | Quiet | Typical | Flaunted |
|---|---|---|---|
| 10 GB | ₹145 | **₹251** | ₹1,021 |
| 20 GB | ₹259 | **₹365** | ₹1,136 |
| 40 GB | ₹489 | **₹594** | ₹1,365 |

### Fixed cost, which is the one that bites

| | |
|---|---|
| Supabase Pro + Vercel Pro | $45/month = **₹51,570/year** |

| Weddings per year | Fixed cost carried by each |
|---|---|
| 20 | **₹2,578** |
| 50 | ₹1,031 |
| 100 | ₹516 |
| 250 | ₹206 |
| 500 | ₹103 |

**At 20 weddings a year your fixed cost per wedding is ten times your variable cost.** Pricing
cannot fix that. Volume can, and so can staying on free tiers while you are small — see §5.

---

## 2. Why not cost-plus

Infrastructure is ₹250–600 per wedding. If you priced at cost plus a healthy 100% you would
charge ₹1,200 — and be **leaving 80% of the value on the table**, while signalling to the studio
that this is a commodity.

Price against what the deliverable is worth instead. A studio charges ₹80,000–3,00,000 to shoot
and edit a wedding. The film is the thing the couple actually keeps. A ₹6,000–20,000 line item for
"your own private streaming site, for a year" sits inside that comfortably, and reads as premium
rather than as a hosting bill.

**The cost model's job is not to set the price. It is to prove you cannot lose money** — and to
tell you the one number where that stops being true, which is delivery on a wedding that goes
unexpectedly wide.

---

## 3. The recommended plans

Twelve months included, not three. A studio can sell "a year"; explaining a three-month window and
a renewal conversation in the same breath is how a sale stalls.

### Keepsake — 10 GB — ₹2,500

Up to 15 films, 60 photographs. The default, and enough for almost every wedding.

### Signature — 20 GB — ₹4,000

Up to 25 films, 150 photographs. Custom domain. The tier for a studio who wants headroom without
thinking about it.

### Atelier — 40 GB — ₹6,500

Up to 40 films, 300 photographs. Custom domain, priority support. For multi-day weddings with a
film per function.

### Margins at these prices

Contribution per wedding, typical traffic:

| Plan | Price | Variable cost | Contribution |
|---|---|---|---|
| Keepsake | ₹2,500 | ₹251 | **₹2,249 (90.0%)** |
| Signature | ₹4,000 | ₹365 | **₹3,635 (90.9%)** |
| Atelier | ₹6,500 | ₹594 | **₹5,906 (90.9%)** |

Net, after fixed costs are spread:

| Weddings/yr | Keepsake | Signature | Atelier |
|---|---|---|---|
| **20** | **−₹329** | ₹1,056 | ₹3,327 |
| 50 | ₹1,218 | ₹2,603 | ₹4,874 |
| 100 | ₹1,734 | ₹3,119 | ₹5,390 |
| 250 | ₹2,043 | ₹3,429 | ₹5,699 |

**Read the first row carefully.** At 20 weddings a year, selling only Keepsake **loses money**.
Not because the price is wrong but because ₹51,570 of fixed cost divided by 20 is more than the
whole plan's contribution. Two ways out, and you should take both: §5 removes the fixed cost while
you are small, and the ladder above gives the partner a reason to sell up.

### Break-even

| Plan | Weddings/year to cover fixed costs |
|---|---|
| Keepsake | **22.9** |
| Signature | **14.2** |
| Atelier | **8.7** |

**One studio doing 15–20 weddings a season covers your entire infrastructure.** That is the
sentence to keep in mind when you decide how hard to negotiate with the first partner.

### What the partner makes

| Plan | You charge | They sell | They keep |
|---|---|---|---|
| Keepsake | ₹2,500 | ₹6,000–8,000 | ₹3,500–5,500 (58–69%) |
| Signature | ₹4,000 | ₹10,000–12,000 | ₹6,000–8,000 (60–67%) |
| Atelier | ₹6,500 | ₹15,000–20,000 | ₹8,500–13,500 (57–68%) |

A channel partner needs to roughly **double their money** to bother selling something. Below about
50% they treat it as a favour to you and stop mentioning it. These leave 57–69%, which is enough
that it becomes a line on their own quotation rather than an afterthought.

**Publish a suggested retail price and let them charge what they like.** You cannot enforce resale
pricing and should not try; what you can do is make sure the first number in their head is one
that works for both of you.

---

## 4. Bounding the delivery risk

One wedding going viral costs you ₹2,833 — more than an Atelier plan. It will be rare. It should
still be bounded, because "rare" is not "never" and the failure is silent.

**Include 300 GB of delivery per catalogue per year.** That is ~1,900 guests watching 12 minutes,
costs you ₹860 at worst, and 95%+ of weddings will not come close.

| Allowance | Costs us at full use | Roughly |
|---|---|---|
| 100 GB | ₹286 | 630 viewers |
| **300 GB** | **₹860** | **1,900 viewers** |
| 500 GB | ₹1,432 | 3,160 viewers |

Past the allowance, **do not bill automatically.** Call them. A catalogue past 300 GB is either
being loved — which is the best sales story you will ever get, and worth the ₹900 — or the link
leaked, which they need to know about anyway. Charging a couple ₹500 without warning for their
wedding being popular is a terrible first impression, and the sums say you can afford the
conversation.

The alert already exists in the product at exactly 300 GB.

> **A gap you should know about.** The platform meters **storage** per catalogue but not
> **delivery** — `getUsage` returns real stored bytes and `deliveredGb: 0`. So the 300 GB figure
> is currently enforced by watching the Bunny dashboard, not by the app. If delivery becomes a
> billable axis, that has to be built first.

---

## 5. Do not pay $45 a month yet

At 20 weddings a year, Supabase Pro and Vercel Pro cost you ₹2,578 per wedding — more than the
entire variable cost of an Atelier plan.

**Supabase Free and Vercel Hobby carry this product to roughly 50 weddings.** The real fixed cost
then is Bunny's $1/month minimum: **₹1,146/year**.

| | Break-even |
|---|---|
| On free tiers | **Wedding #1** |
| On Pro tiers | Wedding #9–23 |

Move to Pro when you hit an actual limit — Supabase's free database ceiling, or Vercel's
commercial-use terms once partners are paying you — not on principle. Budget for it as a step
change at ~50 weddings, by which point it is 4% of revenue rather than 100%.

---

## 6. The disagreement worth having with your studio owner

He asked for 10/20/40 GB. The specification argues the opposite, in `docs/spec/11` §3:

> Note what the tiers are **not** graded on: storage. Grading a keepsake by gigabytes invites the
> planner to treat it as an archive, which is the one thing it must not become.

Both are right about different things, and the resolution matters more than the prices.

**He is right that studios buy in gigabytes.** It is the unit they understand, it makes three
tiers instantly comparable, and refusing to speak it makes you sound evasive.

**The spec is right about what happens next.** A studio sold "40 GB" will try to put 40 GB in it —
raw multicam, full ceremony masters, every angle. Then guests open a page with 30 films on it, do
not know where to start, and the product stops being a keepsake and becomes an unindexed hard
drive with a nicer player. Storage is not what makes the couple cry; the edit is.

**The resolution: sell gigabytes, cap titles.** Every tier above has both, and the title cap is
the one doing the real work.

| Plan | Storage | Films | Photographs |
|---|---|---|---|
| Keepsake | 10 GB | 15 | 60 |
| Signature | 20 GB | 25 | 150 |
| Atelier | 40 GB | 40 | 300 |

A studio comparing plans sees 10/20/40 and picks one. A studio trying to dump a shoot hits the
title cap and has to make an editorial decision — which is the decision you want them making.
Both caps are already enforced in the product.

If he pushes for raw-footage storage, that is a **different product** — "client review and
delivery" — with different economics, no guest surface, and no reason to share a price list with
this one. Say yes to it separately or not at all.

---

## 7. Upgrades and renewals

**One plan at booking**, as you intended. Almost nobody knows their storage needs before the shoot,
so ask them to pick a price rather than a capacity, and let it move afterwards.

### Upgrading mid-term

Charge **the difference, prorated by months remaining**, with no upgrade fee.

> Keepsake → Signature with 7 months left: (₹4,000 − ₹2,500) × 7/12 = **₹875**

An upgrade happens at the worst possible moment — mid-delivery, with a couple waiting. Anything
that makes it feel like a penalty gets you a phone call instead of a payment. It costs you ₹10 in
storage; take the ₹875 and be quick about it.

**Never downgrade below what is stored.** Offer deletion first.

### Renewal — ₹1,999/year

Charged to whoever owns the catalogue, which after handover is the couple.

| Plan | Renewal cost to us | Margin at ₹1,999 |
|---|---|---|
| 10 GB | ₹137 | **93%** |
| 20 GB | ₹252 | **87%** |
| 40 GB | ₹481 | **76%** |

A renewal year is nearly pure margin because the traffic burst has passed — the wedding is old
news and only the couple revisits.

**Flat renewal pricing across all three tiers**, even though 40 GB costs three times more to hold.
The difference is ₹344 and the simplicity is worth more; "₹1,999 a year to keep it" is a sentence
a couple says yes to without a spreadsheet.

Offer the partner **15% of renewals** on catalogues they originated. It costs ₹300 a year and it
is the only thing that makes them set the couple's expectations properly at handover — which is
what actually drives renewal.

> **Not built yet.** There is no payment flow. Extending a subscription is a manual date change in
> Settings today, and renewal is tracked as N-20 in `docs/NEXT.md`. **Sell annual plans and invoice
> manually until it exists** — with three tiers and a handful of partners, a spreadsheet is
> genuinely fine and is a great deal cheaper than building billing you might price wrong.

---

## 8. Two things to consider before you launch

### A season commitment, not a price cut

Rather than discounting per wedding, sell **prepaid credits**: 20 weddings for the price of 15,
valid a year. It converts a per-deal negotiation into one annual commitment, gives you the cash up
front, and makes the studio pick you by default because they have already paid.

The product already has the concept: `plans.catalogue_credits` in the schema.

### Do not sell your first partner the cheapest tier

At 20 weddings a year, Keepsake alone loses ₹329 per wedding once Pro tiers are on. Lead with
**Signature** and let Keepsake exist as the thing they step down to, rather than the thing they
start at. The tier a partner picks first is usually the tier they stay on.

---

## What to redo when prices move

Everything above comes from six numbers. Change them and the model follows:

| | Aug 2026 |
|---|---|
| Bunny storage | $0.01 / GB / month |
| Bunny delivery, Asia | $0.03 / GB |
| Supabase Pro | $25 / month |
| Vercel Pro | $20 / month |
| USD → INR | ₹95.5 |
| Delivery per viewer, 12 min @ 1.8 Mbps | 0.16 GB |

The two that matter are **delivery per GB** and **the exchange rate**. Storage could triple and
your worst tier would still be 88% margin.

---

## Sources

- [Bunny CDN pricing](https://bunny.net/pricing/) — regional delivery rates, $1 monthly minimum
- [Bunny Stream pricing](https://bunny.net/pricing/stream/) — free transcoding, storage from $0.01/GB
- [Bunny Storage pricing](https://bunny.net/pricing/storage/) — HDD and SSD tiers
- [Supabase pricing](https://supabase.com/pricing) — Free and Pro, overage rates
- [Vercel pricing](https://vercel.com/pricing) — Hobby and Pro
- [USD/INR, August 2026](https://www.exchangerates.org.uk/USD-INR-spot-exchange-rates-history-2026.html)
- Internal: `docs/spec/05-technical-architecture.md` §2 (cost basis), `docs/spec/11-whitelabel-and-b2b.md` §3
  (the tiering argument), `docs/spec/15-partners-and-scale.md` §3
