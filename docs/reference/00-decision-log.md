# Decision Log

Why the documented product differs from `original-business-case.pdf`. Kept so nobody — human
or agent — reopens a settled question without seeing the reasoning first.

## D-1 · Full streaming design, own name and mark

**Original:** Netflix-styled sites at `subdomain.flixinvite.com`, per-couple names like
"SharmaFlix", plus Prime Video and Spotify-Wrapped theme packs.

**Decided:** Build the streaming design at **full fidelity** — near-black surface, hot red
accent, profile gate, poster rows, hero with scrim, episode framing, title-detail modal
(all ten mechanics in `docs/04 §1b`). Keep our own product name, our own wordmark, and
`#d11a2a` rather than `#E50914`.

**Why the line sits there and not somewhere else.** The design and the marks are two
different exposures. Trade dress requires the look to identify a *source* and cause
confusion, and nobody on a page headed "Aanya & Vikram" with the couple's photographs thinks
they are on a video-streaming service; the same grammar is used by Disney+, Prime Video,
JioHotstar and countless dashboards. Netflix-themed wedding content is an openly commercial
Etsy category that has coexisted with Netflix for years. Enforcement concentrates on
**names and marks**, where a lawyer can act cleanly without arguing about confusion — and a
`-flix` suffix is exactly that.

So the trade is: give up the suffix and the exact hex, keep 100% of the experience. The name
contributes nothing to a guest's two-second reaction. Additionally, a planner reselling this
under their own brand cannot have a third party's brand on it — white-label and `-flix` are
structurally incompatible.

**Cost of the decision:** zero experientially. Per-couple naming becomes `SharmaStream` or
`Sharma Originals` instead of `SharmaFlix` — same joke, different word.

**Superseded:** an earlier draft of this document specified a gold accent on aubergine and
treated the palette as equally risky as the name. That was over-cautious and has been
reversed. The design is the product; the name was never the point.

## D-2 · D2C freemium → B2B white-label

**Original:** free branded subdomain for couples, monetised through ₹149–999 add-ons.

**Decided:** sell per-wedding licences to wedding management companies at ₹3.5k/6k/12k; they
resell at ₹8–25k inside packages already costing lakhs.

**Why:** every add-on in the original stack (multi-event ₹999, multilingual ₹499, WhatsApp
RSVP ₹799) is already free on India-focused builders — The Curated Knot, Wedd.ai, DesiWeds —
and a complete site with a custom domain sells at ₹999 one-time elsewhere. The original doc's
own insight was "the base site is a commodity, monetise the novelty", then it priced the
commodity. Sandeep had already dropped a ₹2,000 D2C wedding app for exactly this reason.

**Cost:** strategic dependence on the planner, who owns the customer. Accepted for now; Phase
0's job is revenue and proof, not a moat.

## D-3 · Registry / Shagun payments → cancelled

Handling guest money invokes RBI payment-aggregator rules and settlement obligations for
negligible revenue. Link out to the couple's own UPI instead. See `docs/12 §4`.

## D-4 · Automated WhatsApp invites → manual `wa.me` links

Automated business messaging needs the WhatsApp Business Cloud API with an approved business
and pre-approved templates; unofficial libraries risk the number being banned mid-season, and
messaging people who never opted in to *us* is a DPDP problem. Generating links the family
sends from their own number is also simply more effective — an invite from a cousin gets
opened, one from an unknown business number does not. See `docs/12 §3`.

## D-5 · No database in Phase 0

The original architecture assumed a full multi-tenant SaaS build. Phase 0's only job is to get one
planner to say yes; a database adds hosting, auth, migrations, backups and a privacy surface
before anyone has agreed to anything. The multi-tenant *middleware* is still built in Phase 0
(with one tenant), because retrofitting tenancy later means touching every component.

## D-6 · Financial model restated

The original table put 2,000 paying couples as a "base case" on zero acquisition spend, with
organic Reels as the channel. Reels virality is a lottery ticket, not a planning assumption.

Replaced with a channel-based model: one signed planner = 20–80 weddings/season. Three
planners at 25 weddings each at ₹5k average = ~₹37.5 lakh season revenue with a sales process
that is five meetings rather than a viral hit. Lower ceiling, vastly higher probability.

## D-7 · Scope explicitly bounded to Phase 0

~50 hours to a deployable demo plus five pitch meetings. Phase 1 is conditional on a signed
pilot. If no planner commits by end of September, the season is gone and stopping is the
correct outcome. This is stated in `docs/12 §7` because the binding constraint is not
technical — it is that this competes for the same hours as an already-committed consulting
practice in the same months.

## D-8 · Invite/RSVP site → white-label streaming platform (Aug 2026)

**Decided:** the product is a white-label, streaming-style **experience platform** for wedding
films and personal content. An operator at a wedding management company logs in, creates a
catalogue, uploads films, arranges modules in a customizer, and publishes a branded site.
The invite/RSVP work is archived to `archive/invite-site/` and returns later as an `rsvp`
module, not as a product.

**Why the pivot is commercially better, not just different:**

- Wedding films are already paid for and already exist. We are not creating a new line item,
  we are upgrading the delivery of one worth lakhs — which is a much easier sell than adding
  a website nobody budgeted for.
- Google Drive links, WeTransfer expiries and pen drives are the incumbent, and they are
  genuinely bad. Free wedding-website builders were a much stronger incumbent.
- It creates recurring revenue (doc 01 §7), which fixes the Nov–Jan seasonality that the
  original business case flagged as structural.
- The unit economics hold: ~₹320/wedding/year in hosting against a ₹4,000+ licence (doc 05 §2).

**Retention:** 3 months included with the planner's licence, then ₹249/month or ₹1,999/year
paid by the couple. Grace 60 days, then cold storage, then a final notice. Never silent
deletion.

## D-9 · The customizer is the differentiator

After reviewing the reference reel (`reference/reference-reel.mp4`), the product is not a
video player with decoration — it is a streaming **shell wrapping personal modules**, several
of which contain no video at all (letter, memory vault, bucket list, date-night planner).

Sites like it exist today as one-off builds: 6–20 hours of developer time, unresellable. The
module registry plus a non-technical customizer turns that into 30 minutes of an operator's
time, forty times a season. The streaming UI is copyable in a weekend; a module system with a
safe theming layer, validated content and a working multi-gigabyte upload pipeline is months.

Spec: `docs/spec/14-modules-and-customizer.md`. It is why the customizer is P0 and not Phase 2 —
a demo where Sandeep edits JSON demonstrates a bespoke service, which is exactly what the
planner can already buy elsewhere.

## D-10 · A curated keepsake, not a media library (Aug 2026)

**Clarified:** this holds **6–15 items** — the pieces worth flaunting and cherishing. It is
explicitly **not** where all 40GB of footage and 2,000 photos go; those stay wherever they
live today.

**What that changed, concretely:**

- **Cut** `trending` (ranks the billboard first, every time, across eight items),
  `new_releases` (the whole catalogue publishes at once), search, and My List. All of them
  solve *abundance*, and there is no abundance.
- **Demoted** Continue Watching to P1 — most items are under five minutes and get finished.
- **Rows are curated, not computed.** Auto-grouping by category at this scale produces six
  rows of one card. Rows are now hand-picked lists with operator-written headings, which is
  also what the reference reel actually does ("TOP 5 HITS OF HEART LIST").
- **Promoted** per-title share to P0 (it is the *flaunt* mechanic) and chapters to P1 (the one
  long film needs them).
- **Added a 15-title / 60-photo soft cap** in the admin. This is the rare limit that is a
  feature: past roughly forty items it stops being a keepsake and becomes a folder with
  better fonts.
- **A 2–3 card row is now a designed state**, not an edge case — no arrows, no peeking card,
  cards sized up. Rendering three cards at library scale looks like a loading error.
- **Costs fell to ~₹150/catalogue/year** (from ~₹320), which makes hosting a rounding error
  and reopens the lifetime-hosting question — see doc 11 §3.
- **Effort moved** from managing many items to making few items beautiful: poster art,
  billboard weight, the letter's typography.

**The naming that should drive review decisions:** *flaunt* (would the couple send this?) and
*cherish* (would they open it on their own, a year later?). A feature that serves neither is
out, however standard it looks in a real streaming app.

## Still open

Carried in `docs/01 §8` — whether planners will accept us holding guest data; per-wedding vs
season pricing; whether a streaming aesthetic reads as premium or irreverent to older
families; which regional language ships after Hindi; whether the profile gate helps or costs
conversion.
