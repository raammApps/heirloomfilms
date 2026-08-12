# 11 — White-label & B2B

## 1. Why B2B

Direct-to-consumer loses on arithmetic and on trust: a couple will not hand their wedding
films to an unknown platform, and paid acquisition cannot be recovered from a single sale.

The planner channel inverts that:

| Problem in D2C | What the planner channel does to it |
|---|---|
| Acquisition cost exceeds price | The planner already has the customer. Our CAC is one meeting. |
| Nobody trusts a new brand with their wedding video | We borrow the planner's trust entirely |
| One customer = one wedding | One partner = 20–80 catalogues a season |
| Seasonality (Nov–Jan) | The month-4 subscription bills all year |

The cost is strategic dependence: the planner owns the relationship and we are a supplier.
Accept it. Phase 0's job is revenue and proof, not a moat.

## 2. What the planner actually buys

Not "video hosting". Three things, in the order they care about:

1. **A deliverable that makes them look expensive.** They compete with other planners for the
   same couple. "Your best moments arrive as your own private streaming service" is a closing
   line; "we'll WeTransfer you the files" is what everyone else says.
2. **Something the couple shows two hundred people.** Every person who opens it sees the
   planner's logo. It is the only thing in their business that markets them *after* the
   wedding is over — and it only works because it is short enough that people actually watch
   it. A 40-file archive gets opened once.
3. **A reason the couple talks about them a year later.** The keepsake is still there on the
   anniversary. Nothing else they deliver has that property.

Sell #1 in the meeting, prove #2 in the pilot, and #3 is what gets you the second season.

**What we are not selling them: storage.** If a planner starts asking about gigabytes and
whether they can dump the full shoot in, the conversation has gone wrong — redirect to what
the couple will actually show people. See doc 01 §4.

## 3. Pricing

Two revenue lines: a per-wedding licence from the planner, and a subscription from the couple
from month 4. Hosting costs ~₹320/wedding/year (doc 05 §2), so both lines are high margin.

### Line 1 — per-wedding licence (planner pays, covers months 1–3)

| Tier | Included | Our price to planner | Their price to couple |
|---|---|---|---|
| **Essential** | Curated catalogue — up to 8 titles + 40 photos, billboard, rows, 3 months | ₹4,000 | ₹10,000–15,000 |
| **Signature** | Up to 15 titles + 60 photos, all modules (letter, timeline), custom domain, captions, analytics | ₹7,000 | ₹18,000–25,000 |
| **Atelier** | + bespoke module or theme work, 4K, priority turnaround, **we do the curation** | ₹14,000 | ₹30,000+ |

Note what the tiers are **not** graded on: storage. Grading a keepsake by gigabytes invites
the planner to treat it as an archive, which is the one thing it must not become. Tier on
craft and features instead.

Season deal: 20 weddings prepaid → 25% off. That is the conversation worth chasing — it
converts a per-wedding sale into one annual commitment.

### Line 2 — subscription (couple pays, month 4 onward)

**₹249/month or ₹1,999/year.** Offered in-catalogue and by email at month 3.

Optional 15% revenue share to the planner on renewals. It costs little and it keeps them
motivated to set expectations properly at handover — which is what actually drives conversion.

**Why the couple and not the planner.** The planner's willingness to pay ends when the wedding
does. The couple's grows: by month 4 they have watched the film a dozen times and sent the
link to sixty people. ₹1,999/year to keep it is an easy yes for someone who spent lakhs on the
wedding — and it is the only mechanism that turns this from a seasonal fee into a compounding
asset.

### Reconsider: lifetime hosting is now defensible

An earlier draft argued against lifetime hosting on cost grounds. **That argument was based on
an archive-sized catalogue and no longer holds.** At a curated 6–15 items the real cost is
~₹150/year (doc 05 §2) — roughly **₹1,500 over ten years**, which fits inside a ₹4,000+ licence
with room to spare.

So the choice is now a product decision, not a financial one:

| | 3 months + subscription (current) | Lifetime, priced in |
|---|---|---|
| Revenue | Recurring; fixes Nov–Jan seasonality | One-off; seasonality returns |
| The couple's feeling | "Will my wedding video expire?" — a real anxiety for a *keepsake* | "It's ours, forever" — a much better story |
| Planner's pitch | Has to explain a renewal | Nothing to explain |
| Downside | Churn, failed cards, an awkward month-3 email | No compounding revenue; a long-tail obligation you can't exit |

**The tension is real and worth naming: "cherish" and "your access expires in 90 days" are in
direct conflict.** A keepsake that nags for a card number is a worse keepsake.

A middle path worth testing in the first pilots: **12 months included** (not 3), then
₹1,999/year — long enough that the first renewal lands after the first anniversary, when the
couple has actually rewatched it and the value is proven, rather than while the wedding is
still being unpacked.

Current spec keeps 3-months-plus-subscription. Revisit after the first cohort; the numbers
support any of the three.

**Do not discount the licence below ₹3,000.** Below that a planner reads it as not-a-real-
service and starts asking whether you will exist next season.

### The number to watch

**Month-4 conversion.** Target >25%. If it comes in under 10%, the couple does not value the
artefact enough to keep it, and the honest conclusion is that this is a per-wedding service
business rather than a subscription platform — which changes the pricing, not the product.

## 4. What "white-label" means concretely

All driven by org and catalogue branding plus the customizer — no code changes, no forks.
See `docs/14 §5`.

| Element | Configurable | Notes |
|---|---|---|
| Logo in nav and footer | Yes | Light-on-dark variant required |
| Accent colour | Yes | Five presets + custom, contrast-validated at pick time |
| Display font | Yes | From an approved self-hosted set |
| "presented by …" credit | Yes | Localised |
| Favicon, OG image treatment | Yes | |
| Which sections exist, and in what order | **Yes — this is the differentiator** | Module list per catalogue |
| Custom domain | Yes (Signature+) | |
| Mehfil credit anywhere | Off by default | |
| Near-black surface | **No** | The cinematic base is the product identity |

**We do not appear on the guest-facing catalogue by default.** A planner will not resell
something that advertises a supplier to their client. Give up the marketing surface, take the
margin.

### Partner onboarding, first meeting to live

1. Planner sends logo, brand colours, one line of positioning.
2. We build a branded demo catalogue — 24-hour turnaround. This is the closing artefact.
3. Planner shows it to their next couple.
4. Couple says yes → planner uploads the films (or forwards the videographer upload link).
5. Live within 2 working days of the last file landing.

### What the planner needs to collect

One-page checklist for them; incomplete content is the top reason a launch slips.

- Final film files from the videographer — **exports, not project files**
- A title and one-line synopsis for each film
- Which film is the billboard/featured one
- 15–40 photos if they want the Memory Vault module
- Couple names as they should appear, wedding date, city
- Optional: a personal letter, a timeline of 5–8 moments, credits for the crew
- Hindi versions, or explicit sign-off to run English-only
- Whether it is unlisted (default) or passcode-protected

## 5. The pitch, in the room

Twelve minutes, on a phone, not a laptop.

1. **Don't open a deck.** Hand them your phone with the demo catalogue already loaded.
2. Let them scroll for thirty seconds without narrating. The reaction happens or it doesn't.
3. Tap a film. **Let them watch it start instantly.** Then say: *"That's on 4G, right now."*
4. Ask what they send couples today. Let them say "Google Drive" out loud themselves.
5. Open the customizer on your laptop. Drag a section. Change the accent to **their** brand
   colour. Publish. Refresh the phone. *"That took eleven seconds."*
6. Then: *"Your junior does this in half an hour. Your logo, your colours. My name appears
   nowhere."*
7. Price it. One number. Stop talking.

Step 5 is the pitch. Everything before it is setup. A planner who has watched their own brand
appear on a wedding catalogue in real time is no longer comparing you to WeTransfer.

**Ask for one pilot wedding at half price, not a partnership.** A pilot is a decision they
can make alone in the meeting. A partnership needs a conversation with someone who isn't in
the room.

### Objections you will actually get

| They say | The honest answer |
|---|---|
| "Google Drive is free." | It is. It also buffers, expires, and makes a film you charged ₹2 lakh for feel like a file transfer. You're not buying storage — you're buying the thirty seconds your client spends showing this to a friend. |
| "Can I put the whole shoot in?" | No, and that's the point. Forty files is a folder. Eight is something they'll actually send to people. Keep the archive wherever it lives now — this is the part they show. |
| "YouTube unlisted is free too." | And one setting away from public, with ads and 'recommended videos' next to a wedding. Ask them if they'd tell a client that's the plan. |
| "Can I edit it myself?" | Yes — that's the whole product. Show them the customizer. This is the answer that closes. |
| "What if you disappear?" | Fair. You get an export of every source file and the catalogue metadata at any time, in writing. Put it in the contract, don't just say it. |
| "Who pays after three months?" | The couple, ₹1,999 a year, and they're offered it directly — you're not chasing them. If they don't renew nothing is deleted for over a year. |
| "My videographer won't hand over files." | Then send them the upload link; they upload directly, no account needed. If that still fails, the videographer is the customer and we should be talking to them instead. |
| "Can I get it cheaper?" | Season deal: 20 prepaid, 25% off. Not a discount on one. |

## 6. Contract points to settle before the first rupee

Have an actual lawyer paper this; the list is what to brief them on.

- **Data controller vs processor.** The planner (or couple) is the controller; we are the
  processor. Put it in writing, with a purpose-limitation and no-secondary-use clause.
- **Guest data ownership and export on termination.**
- **Retention:** 12 months post-wedding, then purge. Named in the contract, not just in docs.
- **Uptime expectation for the wedding week** and what happens if it is missed.
- **IP:** we own the platform, they own their brand assets, the couple owns their photos.
  We get a limited licence to use anonymised screenshots in our own marketing — ask for it
  explicitly, and let them refuse.
- **Employment IP check.** Confirm with an employment lawyer that this work sits outside the
  IP-assignment clause of your current employment before you invoice anyone. Do this before
  the first pitch meeting, not after the first cheque.

## 7. Honest assessment of this channel

**What makes it work:** one signed planner is 20–80 weddings, so the sales effort per tenant
collapses. The buyer is commercially sophisticated and can say yes in a meeting. Our
marginal cost per site is near zero.

**What will hurt:** planners are slow payers and will push for exclusivity in their city
before they have earned it (decline politely — offer a category, not a territory). The
relationship is fragile: one bad wedding-day incident ends the account and the referrals.
And a planner with an in-house designer can eventually copy the format, because the format
is not defensible — the operational reliability and the per-ceremony data model are the only
things that get harder to copy over time.

**The number that tells you whether this is a business:** how many of the first three
planners come back for a second wedding without being chased. If it is fewer than two, the
product is a novelty, not a service, and the honest move is to stop rather than to build
Phase 2.
