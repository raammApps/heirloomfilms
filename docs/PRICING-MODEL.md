# Pricing model

What to charge a channel partner, what it costs us, and how to handle resolution.

Costs are from the providers' live pricing pages, August 2026. Every figure is worked rather than
asserted so you can redo it when a rate moves. Sources at the bottom.

> This is a business model, not advice about your finances. The numbers are arithmetic on
> published rates; the judgement calls are marked as judgement calls.

**Revision history, because two of my earlier assumptions were wrong and it matters:**

| Rev | What changed |
|---|---|
| 1 | Assumed a wedding was under 2 hours. Told you to resist storage tiers. |
| 2 | You corrected me: a wedding is **10–15 hours**, all functions, both sides. Recomputed. |
| **3** | **Used Bunny's published per-resolution bitrates instead of the spec's estimate. Storage per hour is 4.55 GB, not 2.64 — 72% higher. A 15-hour wedding at Bunny's default settings is 68 GB and does not fit the 40 GB tier.** Plus: resolution economics, and the Google Drive question. |

---

## 1. Break-even, explained plainly

You asked what I meant. Here it is without the jargon.

**Some costs happen whether you sell one wedding or five hundred.** The database and the hosting
cost ₹51,570 a year even if nobody signs up. Call that the *fixed cost*.

**Every wedding you sell brings in money and takes some away.** A Full Wedding plan brings ₹6,500
and costs about ₹685 in storage and bandwidth for that specific wedding. What is left —
**₹5,815** — is what that sale contributes toward the ₹51,570.

**Break-even is just: how many sales until those contributions add up to the fixed cost.**

> ₹51,570 ÷ ₹5,815 = **8.9 weddings**

| | |
|---|---|
| Weddings 1–8 | Paying off the servers. You are running at a loss. |
| Wedding 9 | You are level. |
| Wedding 10 onward | **₹5,815 each, straight to profit.** |

Here it is running:

| Weddings sold | Contributions | Fixed cost | Where you stand |
|---|---|---|---|
| 3 | ₹17,445 | ₹51,570 | **−₹34,125** |
| 6 | ₹34,890 | ₹51,570 | **−₹16,680** |
| **9** | ₹52,335 | ₹51,570 | **+₹765 — level** |
| 15 | ₹87,225 | ₹51,570 | +₹35,655 |
| 30 | ₹1,74,450 | ₹51,570 | +₹1,22,880 |

**Why it differs per plan.** A cheaper plan contributes less, so it takes more of them:

| Plan | Contribution each | Break-even |
|---|---|---|
| Highlights ₹2,500 | ₹2,159 | **23.9 weddings** |
| Signature ₹4,000 | ₹3,544 | **14.6 weddings** |
| Full Wedding ₹6,500 | ₹5,815 | **8.9 weddings** |

**The one decision this drives:** lead with the top tier. Not to squeeze anyone — because it is
genuinely what a 10–15 hour wedding needs — but the side effect is you reach profit in 9 sales
instead of 24.

**And the escape hatch:** that ₹51,570 is optional right now. See §7. On free tiers you are in
profit on **wedding #1**, and all of this becomes academic until you are much bigger.

---

## 2. The encoding ladder, explained plainly

You asked what I meant about 1080p. This is the single most important mechanic in your cost model,
so it is worth two minutes.

**When a studio uploads one film, we do not store one file.** The player has to work for a guest
on patchy 4G in a banquet hall *and* a cousin on fibre in Dubai. So the video service encodes the
same film at several resolutions, and the player switches between them mid-playback depending on
the connection. That set of versions is the **ladder**.

**You pay to store every rung.** Upload one 1-hour film and, at Bunny's default settings, you are
storing five copies:

| Rung | Bitrate | Storage for 1 hour |
|---|---|---|
| 240p | 600 kbps | 0.26 GB |
| 360p | 800 kbps | 0.34 GB |
| 480p | 1,400 kbps | 0.60 GB |
| 720p | 2,800 kbps | 1.20 GB |
| 1080p | 5,000 kbps | 2.15 GB |
| **Total** | **10,600 kbps** | **4.55 GB** |

**One hour of finished film costs 4.55 GB of storage, not one hour's worth of anything.**

That is where my earlier numbers were wrong. The spec estimated the ladder at ~6 Mbps; Bunny's
published bitrates add to **10.6 Mbps**. So:

| | Spec's estimate | **Bunny's actual** |
|---|---|---|
| Per finished hour | 2.64 GB | **4.55 GB** |
| A 15-hour wedding | 39.6 GB | **68.2 GB** |

**A 15-hour wedding does not fit the 40 GB tier at default settings.** It needs 68 GB. That is the
correction, and it has to be fixed before you sell anything.

### The fix: choose the rungs

You control which rungs get encoded. Removing the top one halves the total, because 1080p alone is
47% of the ladder.

| Ladder | Mbps | Per hour | 15-hour wedding |
|---|---|---|---|
| Everything, 240p–1080p (default) | 10.6 | 4.55 GB | **68.2 GB** |
| Drop 240p | 10.0 | 4.29 GB | 64.4 GB |
| **360p–720p** | **5.0** | **2.15 GB** | **32.2 GB** |
| 480p + 720p only | 4.2 | 1.80 GB | 27.0 GB |

**The judgement, and it is a judgement:** a three-hour sangeet recording, watched once on a phone
while someone scrolls to find themselves, does not need 1080p. A five-minute highlights film that
gets shown to relatives on a TV does.

### Two profiles, and the tiers start working

| Profile | Ladder | Per hour | For |
|---|---|---|---|
| **Feature** | 360p–1080p | 4.29 GB | Highlights, teasers, the ceremony edit — rewatched, shown to people |
| **Long-form** | 360p–720p | 2.15 GB | Full-function recordings — watched once, scrubbed through |

A realistic 15-hour wedding — 2 hours of Feature, 13 hours of Long-form:

> (2 × 4.29) + (13 × 2.15) = 8.6 + 28.0 = **36.6 GB** ✓ fits the 40 GB tier

At a typical mix that is **~2.47 GB per hour**, which gives the honest tier capacities:

| Plan | Holds |
|---|---|
| 10 GB | ~4 hours |
| 20 GB | ~8 hours |
| 40 GB | **~16 hours** |

> **This is a configuration change you must make before selling.** Also check **Keep Original
> Files** and **MP4 Fallback** — both optional, both roughly double storage again. Then upload one
> real wedding and read the actual figure off the catalogue overview, which already meters real
> stored bytes. That turns every number here from a good estimate into a measurement.

---

## 3. Resolution as a product: 720p, 1080p, 2K, 4K

You are right that customers will ask. The answer is that **2K and 4K cannot be a plan tier, but
they are an excellent per-film upsell** — and the reason is a pricing structure most people miss.

### Standard encoding is free. Premium is charged per minute.

| Encoding | Resolutions | Cost |
|---|---|---|
| Standard (H.264) | up to 1080p | **Free** |
| Premium — Full HD package | up to 1080p | $0.05 / minute |
| Premium — 4K package | up to 4K | **$0.15 / minute** |

1440p and 2160p are **premium only**. And premium is billed **per minute of video**, which is
brutal for long-form:

| What | Minutes | 4K encoding cost |
|---|---|---|
| One 5-minute highlights film | 5 | **₹72** |
| A 40-minute ceremony edit | 40 | ₹573 |
| **A whole 15-hour wedding** | 900 | **₹12,892** |

Storage compounds it. 4K HEVC is 20,000 kbps on its own — 8.79 GB per hour:

| Approach | Encoding | Storage/year | **Total** | vs a ₹6,500 plan |
|---|---|---|---|---|
| Whole 15-hr wedding in 4K | ₹12,892 | ₹2,213 (193 GB) | **₹15,105** | **loses ₹8,605** |
| Only the 5-min highlights in 4K | ₹72 | ₹12 | **₹84** | 1.3% of the plan |

**Selling "a 4K plan" for a 15-hour wedding loses money at any price a studio would pay.** Selling
4K on the one film that deserves it costs ₹84.

### So sell resolution per film, not per plan

| Level | What it is | Included? |
|---|---|---|
| **Standard** | up to 1080p, adaptive | **In every plan, free** |
| **Cinema 2K** | 1440p master on one film | Add-on |
| **Cinema 4K** | 2160p master on one film | Add-on |

Suggested pricing, per film, with a runtime cap:

| Add-on | Cap | Our cost | **Price** | Margin |
|---|---|---|---|---|
| Cinema 2K | 10 min | ~₹160 | **₹999** | 84% |
| Cinema 4K | 10 min | ~₹160 | **₹1,499** | 89% |
| Each extra 10 min | | ~₹143 | **₹750** | 81% |

> **Verify one thing before publishing this.** Bunny lists premium packages as SD / Full HD / 4K.
> 1440p sits above Full HD, so I have budgeted it at the 4K rate. Confirm which package 1440p bills
> under — if it falls under Full HD at $0.05/min, your 2K margin improves and you may want to price
> it lower to make it the popular one.

### Why this is a good product, not a compromise

It matches how the films are actually watched. The highlights film is the one that goes on a
television at a family gathering; the sangeet recording is watched once on a phone. **Charging for
quality where quality is visible, and not where it is not, is a more honest product than a "4K
plan" that quietly cannot afford itself.**

It also gives the studio a genuine upsell to the couple — "4K master of your highlights film" is
an easy ₹3,000–5,000 line on their quotation, against ₹1,499 to you.

**What has to be built:** a per-title quality setting, and the encoding profile applied at upload.
Bunny requires resolutions to be chosen **before** upload, so this is a choice in the upload flow,
not a toggle afterwards. It does not exist yet. Until it does, set the library to the two-profile
configuration in §2 and handle 4K requests manually.

---

## 4. The Google Drive question

You said the pitch is *"instead of storing your photos on Google Drive, save it on ours — we have
a player and it looks better."*

**The first half of that sentence will lose you the deal. The second half wins it.** Here is why,
and it is the most important number in this document.

| | Price | Per GB per year |
|---|---|---|
| Google One, 2 TB | ₹6,500/year | **₹3.17** |
| Our Full Wedding, 40 GB | ₹6,500/year | **₹162.50** |

**Same money. Fifty-one times less storage.** And our add-on at ₹25/GB/month is **95×** Google's
rate.

The moment you frame this as storage, a studio owner — who buys 2 TB drives for a living — does
that arithmetic in his head, and you are a very expensive Google Drive. You cannot win that
comparison. Google's storage is a loss-leader for an ecosystem; yours has to pay for a business.

### What you are actually selling

Not gigabytes. **A guest with no account opens a link on their phone at a wedding reception and a
film starts playing in under a second and a half, on a page with the couple's name and colours on
it.** Google Drive cannot do that at any price:

| | Google Drive | This |
|---|---|---|
| Guest needs an account | Often | **Never** |
| Adaptive streaming on 4G | No — downloads or buffers | **Yes** |
| Looks like the couple's | No | **Yes — their name, colours, logo** |
| Resume where you left off | No | **Yes** |
| Guests browse and choose | A file list | **A catalogue** |
| Shareable to 200 people | Permissions, or a link anyone can copy the file from | **A link that streams and cannot be downloaded** |
| Works in 5 years | Whoever still has the folder | **A permanent address the couple owns** |

**The correct sentence is not "cheaper than Drive". It is: "your couple sends one link to two
hundred guests, and every one of them sees your studio's name on something that looks like
Netflix."** Storage is what makes that possible; it is not what they are buying.

### The practical consequence for pricing

**Never publish a per-GB price as a headline.** Add-on storage at ₹25/GB/month is fine as a
mechanism — nobody prices a small top-up against Google One — but if "₹300 per GB per year"
appears on a price list next to Google's ₹3.17, you have handed them the wrong comparison.

Say **"40 GB — the whole wedding, about 16 hours"**, not "40 GB at ₹162/GB".

### And the trap to avoid

If a studio genuinely wants somewhere to park raw multicam footage — 200 GB of ungraded camera
files nobody will watch — **that is not this product, and you should not price it.** It is a
backup service, you would be reselling storage at 51× Google's price, and the first invoice ends
the relationship. Say: *"Keep the rushes on Drive. Put the finished films here, where the couple's
family will actually watch them."*

That is also a better sales line than any discount.

---

## 5. What it costs us

### Published rates, August 2026

| Item | Rate |
|---|---|
| Bunny Stream — standard encoding, to 1080p | **Free** |
| Bunny Stream — premium encoding, 4K package | $0.15 / minute |
| Bunny Stream — storage | **$0.01 / GB / month** |
| Bunny CDN — delivery, Asia & Oceania (Standard) | **$0.03 / GB** |
| Bunny Edge Storage — photographs, HDD, one region | $0.01 / GB / month |
| Bunny minimum | $1 / month |
| Supabase Pro | $25 / month |
| Vercel Pro | $20 / month |
| USD → INR | **₹95.5** |

Use Bunny's **Standard** network, not Volume. Volume is six times cheaper on delivery but runs 10
PoPs globally, and the product's promise is playback starting in under a second and a half on 4G.

### Storage per wedding

| Plan | Per month | Per year |
|---|---|---|
| 10 GB | $0.10 | **₹115** |
| 20 GB | $0.20 | **₹229** |
| 40 GB | $0.40 | **₹458** |

### Delivery, at 1.8 Mbps adaptive, 20-minute sessions

| Scenario | Delivered | Cost |
|---|---|---|
| Modest — 150 guests × 15 min | 29.7 GB | ₹85 |
| **Typical — 300 guests × 20 min** | **79.1 GB** | **₹227** |
| Engaged — plus 60 watching a 90-min function | 150.3 GB | ₹431 |
| Flaunted — 1,500 guests | 395.5 GB | ₹1,133 |

**The gap between the 10 GB and 40 GB plans is ₹343 a year. The gap between a quiet wedding and a
flaunted one is ₹1,048 on the same plan.** You are selling the axis that barely varies. §8 bounds
the one that does.

### All-in variable cost

| Plan | Typical | Worst inside allowance |
|---|---|---|
| 10 GB | **₹341** | ₹544 |
| 20 GB | **₹456** | ₹1,089 |
| 40 GB | **₹685** | ₹2,177 |

---

## 6. The plans

Twelve months included. A studio can sell "a year"; a three-month window plus a renewal
conversation in the same breath is how a sale stalls.

| | Storage | Holds | Films | Photos | **To partner** | They sell |
|---|---|---|---|---|---|---|
| **Highlights** | 10 GB | ~4 hrs | 15 | 60 | **₹2,500** | ₹6,000–8,000 |
| **Signature** | 20 GB | ~8 hrs | 25 | 150 | **₹4,000** | ₹10,000–12,000 |
| **Full Wedding** | 40 GB | **~16 hrs** | 40 | 300 | **₹6,500** | ₹15,000–20,000 |

Hours assume the two-profile configuration from §2. Without it, halve them.

**Highlights is not a wedding.** It is the highlights film, the ceremony edit and one function —
or a pre-wedding shoot. Position it as the entry package, never the default.

**Full Wedding is the normal purchase** for what your studio owner described. Lead with it.

### Margins

| Plan | Price | Variable | Contribution | Break-even |
|---|---|---|---|---|
| Highlights | ₹2,500 | ₹341 | ₹2,159 (86.4%) | 23.9 |
| Signature | ₹4,000 | ₹456 | ₹3,544 (88.6%) | 14.6 |
| Full Wedding | ₹6,500 | ₹685 | **₹5,815 (89.5%)** | **8.9** |

Net per wedding once fixed costs are spread:

| Weddings/yr | Highlights | Signature | Full Wedding |
|---|---|---|---|
| **20** | **−₹420** | ₹966 | ₹3,236 |
| 50 | ₹1,127 | ₹2,513 | ₹4,784 |
| 100 | ₹1,643 | ₹3,028 | ₹5,299 |

A partner needs to roughly **double their money** to bother selling something; below ~50% they
treat it as a favour and stop mentioning it. These leave 57–69%.

---

## 7. Do not pay ₹51,570 a year yet

At 20 weddings, Supabase Pro and Vercel Pro cost ₹2,578 per wedding — nearly four times the entire
variable cost of a Full Wedding plan.

**Supabase Free and Vercel Hobby carry this to roughly 50 weddings.** Real fixed cost then is
Bunny's $1/month minimum: **₹1,146/year**.

| | Break-even |
|---|---|
| **On free tiers** | **Wedding #1** |
| On Pro tiers | Wedding #9–24 |

Move when you hit a real limit — the free database ceiling, or Vercel's commercial-use terms once
partners pay you — not on principle. Budget it as a step change at ~50 weddings, where it is 4% of
revenue rather than 100%.

---

## 8. Extra storage, and bounding delivery

### Extra storage — the mechanism you described

> **₹25 per GB per month, charged only for the months left on the plan.**

Co-terminus: it expires with the plan, so there is one renewal date and one invoice forever.

| Bought | Months left | They pay | Costs us |
|---|---|---|---|
| +2 GB | 11 | **₹550** | ₹21 |
| +5 GB | 9 | **₹1,125** | ₹43 |
| +10 GB | 6 | **₹1,500** | ₹57 |

Deliberately **more expensive per GB than upgrading a tier** (₹300/GB/year against ₹125–150). Not
a trap — a signpost:

| Months left | Add-ons cheaper below | Above that |
|---|---|---|
| 12 | 5 GB | Upgrade the tier |
| 9 | 6.7 GB | Upgrade the tier |
| 6 | 10 GB | Upgrade the tier |

Small top-ups are cheap; large ones push to the next tier — which is what you want, because the
tier is recurring revenue and the add-on is not.

Rules worth writing down: whole GB only · never below what is stored · no refund on unused
capacity, said up front · a tier upgrade credits unused add-on months, so the signpost never
becomes a penalty for guessing wrong early.

### Delivery allowance

| Plan | Allowance | Worst-case cost | Roughly |
|---|---|---|---|
| 10 GB | 150 GB | ₹430 | ~570 guests at 20 min |
| 20 GB | 300 GB | ₹860 | ~1,140 guests |
| 40 GB | 600 GB | ₹1,719 | ~2,280 guests |

**Past the allowance, do not bill automatically. Call them.** A catalogue over its allowance is
either being loved — the best sales story you will get — or a leaked link, which they need to know
about. The margins say you can afford the conversation.

> The app meters storage but not delivery (`getUsage` returns `deliveredGb: 0`). The allowance is
> enforced from the Bunny dashboard today.

---

## 9. Upgrades and renewals

**Tier upgrade mid-term:** the difference, prorated by months remaining, no fee. Credit unused
add-on capacity. Never downgrade below what is stored.

> 10 → 20 GB with 7 months left: (₹4,000 − ₹2,500) × 7/12 = **₹875**

**Renewal: ₹1,999/year**, flat across all three tiers, charged to whoever owns the catalogue —
after handover, the couple.

| Plan | Cost in a renewal year | Margin |
|---|---|---|
| 10 GB | ₹137 | 93% |
| 20 GB | ₹252 | 87% |
| 40 GB | ₹481 | 76% |

Nearly pure margin: the traffic burst has passed and only the couple revisits. Flat pricing because
the difference is ₹344 and *"₹1,999 a year to keep it"* is a sentence a couple says yes to without
a spreadsheet.

Offer the partner **15% of renewals** they originated — ₹300 a year, and the only thing that makes
them set expectations properly at handover, which is what actually drives renewal.

> **No payment flow exists (N-20).** Sell annual plans and invoice manually. With three tiers and a
> few partners, a spreadsheet is cheaper than billing you might price wrong.

---

## 10. What has to happen before you sell

In order:

1. **Set the encoding ladder** to the two profiles in §2, and confirm Keep Original Files and MP4
   Fallback are off. Without this the 40 GB tier holds 8.6 hours, not 16, and you will be refunding
   people.
2. **Upload one real 15-hour wedding** and read the actual stored GB off the overview. Correct
   §2's table with the measurement.
3. **Confirm which premium package 1440p bills under**, so the 2K price is right.
4. **Decide the positioning sentence** and hold to it — the guest experience, never the gigabytes.
5. Then build: per-title quality profiles, storage add-ons, and billing (N-20).

---

## Redoing this when prices move

| | Aug 2026 |
|---|---|
| Bunny storage | $0.01 / GB / month |
| Bunny delivery, Asia | $0.03 / GB |
| Bunny premium encoding, 4K | $0.15 / minute |
| Supabase Pro · Vercel Pro | $25 · $20 / month |
| USD → INR | ₹95.5 |
| Ladder, 360p–1080p | 10.0 Mbps → 4.29 GB / hour |
| Ladder, 360p–720p | 5.0 Mbps → 2.15 GB / hour |
| Delivery per 20-min session | 0.26 GB |

The two that matter are **delivery per GB** and **the ladder**. Storage could triple and the worst
tier would still be 85% margin.

---

## Sources

- [Bunny CDN pricing](https://bunny.net/pricing/) · [Stream pricing](https://bunny.net/pricing/stream/) · [Storage pricing](https://bunny.net/pricing/storage/)
- [Bunny video specification](https://bunny.net/docs/stream/video-specification) — per-resolution bitrates
- [Bunny encoding](https://bunny.net/docs/stream/encoding) — Keep Original Files, MP4 Fallback
- [Bunny premium encoding](https://bunny.net/stream/premium-encoding/) — per-minute package pricing
- [Supabase pricing](https://supabase.com/pricing) · [Vercel pricing](https://vercel.com/pricing)
- [Google One pricing 2026](https://blog.internxt.com/google-one-pricing/) · [USD/INR](https://www.exchangerates.org.uk/USD-INR-spot-exchange-rates-history-2026.html)
- Internal: `docs/spec/05-technical-architecture.md` §2, `docs/spec/11-whitelabel-and-b2b.md` §3
