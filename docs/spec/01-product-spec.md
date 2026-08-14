# 01 — Product Spec

**Heirloom Films is a white-label platform for building a curated keepsake — a wedding's best moments,
presented as a private streaming service.** A wedding management company logs into an admin
console, creates a catalogue, adds **the six to fifteen pieces worth keeping**, arranges them,
and publishes a branded site the couple's guests browse like a streaming service.

> **This is not where all the media goes.** The full 40GB of footage and the 2,000 photos
> still live wherever they live today. This holds only what the couple would actually show
> someone — the highlight film, the drone pass, the letter, twelve photographs. It is a
> mantelpiece, not a hard drive. Every scoping decision in these docs follows from that.

## 1. Problem

A couple spends lakhs on a wedding and comes away with 40GB of footage and two thousand
photographs — and **no way to show any of it to anyone**.

What they actually want to do is show someone. A colleague asks how the wedding was. A cousin
who couldn't come wants to see. Their own parents want to watch the ceremony again on a
Sunday. In every one of those moments the couple has three bad options:

- send a Drive folder — the person opens it, sees `WED_FINAL_v3_color.mp4` (5.8GB), and closes it
- send a WhatsApp-compressed clip that looks worse than the phone video their friend shot
- pull out their phone and scroll a camera roll while the other person waits politely

**The films are good. The showing is humiliating.** That gap is the product.

Three concrete failures:

1. **Nothing is presented.** A folder is not a presentation. The couple has to explain what
   each file is, which is the opposite of flaunting.
2. **Nothing plays well.** A 6GB file has no adaptive bitrate; on 4G it buffers and the
   person stops watching, which the couple notices.
3. **It expires, or it's public.** Either the link dies or it's an unlisted YouTube upload one
   setting away from being world-visible.

**The volume is not the problem — the curation and the frame are.** Nobody wants to browse
forty files. They want six things that are worth showing, arranged so the first one lands.

## 2. The wedge

We are not selling video hosting. We are selling **the moment someone opens a link and finds
their friends' wedding sitting in what looks like a streaming service** — poster art, a
billboard, a play button that starts in under a second.

Two words define the product, and they pull in the same direction:

- **Flaunt** — the couple sends this to people. Every design decision should make the couple
  *more* willing to send it. The first two seconds, the poster art, the WhatsApp preview.
- **Cherish** — the couple opens it themselves, years later, without an occasion. That is
  what the letter, the timeline and the photographs are for, and it is what justifies a
  subscription.

**Scoping consequence, and it is the important one: at six to fifteen items, library
mechanics are dead weight.** Search, auto-grouped genre rows, "Trending", bulk ingest — all
of that solves *abundance*, and we do not have abundance. What we have is a small number of
things that each have to be perfect. Effort moves from managing many items to making few
items beautiful.

## 3. Who we sell to

**The customer is the wedding management company.** An operator at the company logs into the
admin, creates a catalogue per wedding, uploads what the videographer delivered, titles and
categorises it, and publishes.

**The couple is the end user, and after month 3 they become the payer** (see §7).

| | Couple + guests (end users) | Planner (customer) |
|---|---|---|
| Wants | Their wedding to feel like an event worth rewatching | A premium deliverable that differentiates them |
| Fears | Files getting lost; the video being public | Anything that adds work or client complaints |
| Success | Guests message them unprompted after watching | The couple posts about it; renewals come without chasing |
| Pays | Subscription from month 4 | Per-wedding licence covering months 1–3 |

**Why the planner and not the videographer.** The videographer holds the footage, which makes
them the more obvious choice — but the planner owns the client relationship, bills in lakhs,
runs 20–80 weddings a season, and is already the party assembling deliverables from multiple
vendors. The operational cost is that the planner must collect files from the videographer.
Design for that: the admin has to accept a 40GB dump over a bad connection without falling
over, and needs an upload link the planner can forward to the videographer directly
(see PE-3).

## 4. Goals and non-goals

### Goals

- G1. Someone opens a link on a phone and video starts playing in **under 1.5 seconds** on 4G,
  at a quality that does not embarrass the videographer.
- G2. **The couple is proud to send it.** Measured crudely by whether they send it unprompted
  more than once.
- G3. An operator can go from a shortlist of files to a published, branded catalogue in
  **under 30 minutes**, with no technical knowledge.
- G4. Nothing in the catalogue feels like filler. Six excellent items beat twenty adequate ones.
- G5. The content is private by default and cannot be found by anyone without the link.

### Non-goals

- **The complete archive.** We are explicitly **not** where all 40GB and 2,000 photos go.
  Drive, a hard disk or the studio's own delivery keeps doing that. If a planner asks us to
  become the archive, the answer is no — it destroys the curation that makes this worth
  showing, and it changes the cost model from trivial to real.
- **A soft cap is a real cap.** 15 titles and ~60 photographs, enforced in the admin with an
  honest explanation. This is the one limit that is a *feature*: the moment a catalogue holds
  forty items it stops being a keepsake and becomes a folder with better fonts.
- **Search.** Pointless at this scale. If we ever need search, curation has failed.
- **Video editing, trimming, colour, music.** The videographer edits. We present.
- **Live streaming the wedding.** Different infrastructure and failure mode.
- **Public/social discovery, comments, likes.** This is private by nature.
- **Guest-uploaded content.** Moderation burden, no revenue, and it wrecks curation.
- **DRM.** Signed URLs plus an unguessable link is the right threat model.
- **RSVP and invitations.** Archived — see `archive/invite-site/`.

## 5. Feature set

**P0** = the demo cannot ship without it. **P1** = needed for a paying wedding. **P2** = scale.

### 5.1 Guest / viewer experience

| ID | Feature | Pri | Notes |
|---|---|---|---|
| VE-1 | Profile gate — "who's watching?" | P0 | Four fixed labels. The signature moment, and the frame that tells a visitor what kind of thing they just opened. |
| VE-2 | Billboard with autoplaying muted trailer | P0 | **Carries proportionally more weight here than in a real streaming app** — with eight items it is a third of the experience. Falls back to a still on save-data or reduced-motion. |
| VE-3 | **Curated rows** | P0 | Hand-ordered by the operator, with **operator-written row titles** ("The Ones That Made Us Cry"). Not auto-grouped by category — see §5.4. |
| VE-4 | Title detail modal | P0 | Poster, synopsis, duration, credits, Play. Deep-linkable, shareable. |
| VE-5 | Video player — adaptive bitrate HLS | P0 | Scrub with thumbnail preview, 10s skip, quality, fullscreen, PiP. |
| VE-6 | **Per-title share** | P0 | Share sheet + copy link + WhatsApp text, on the modal and at the end of playback. **This is the flaunt mechanic — it earns its P0.** |
| VE-7 | Continue Watching | **P1** | Genuinely useful only for the one long film. Most items are under 5 minutes and get finished. Demoted from P0. |
| VE-8 | Captions / subtitles | P1 | Uploadable WebVTT. Matters for regional-language speeches. |
| VE-9 | Language toggle EN / हिं | P1 | Chrome + title metadata. |
| VE-10 | Chapters within the long film | P1 | Jump to "the varmala". **Promoted** — with one long film in the set, chapters are how it stays watchable. |
| VE-11 | End-of-playback card | P1 | "Watch next" with one suggestion + share. Keeps a visitor moving through a small set. |
| VE-12 | Download for offline | P2 | Grandparents with bad connectivity. Rights conversation first. |
| VE-13 | ~~Trending~~ | **Cut** | Meaningless across eight items. It would rank the billboard first, every time. |
| VE-14 | ~~New This Week~~ | **Cut** | The whole catalogue publishes at once. |
| VE-15 | ~~Search / My List~~ | **Cut** | Solves abundance. There is no abundance. |

### 5.2 Operator / admin experience — **P0, not a later phase**

The admin is half the product. Without it there is no self-serve catalogue and the business
does not scale past Sandeep manually editing JSON.

| ID | Feature | Pri | Notes |
|---|---|---|---|
| AE-1 | Operator login | P0 | Email + password, or magic link. Per-organisation accounts. |
| AE-2 | Catalogue list | P0 | All weddings this operator manages, with status and subscription state. |
| AE-3 | Create catalogue | P0 | Couple names, wedding date, slug/subdomain, branding, privacy setting. |
| AE-4 | Video upload — resumable, chunked | P0 | Must survive a dropped connection at 80% of a 6GB file. TUS or equivalent. Non-negotiable. |
| AE-5 | Title metadata | P0 | Title, synopsis, category/genre, duration (auto), credits, order, featured flag. |
| AE-6 | Poster art | P0 | Auto-extract 3 candidate frames; allow custom upload; generated fallback. |
| AE-7 | Publish / unpublish per title | P0 | Lets an operator stage a catalogue then release it. |
| AE-8 | Transcode status | P0 | Clear per-title state: uploading → processing → ready → failed, with a retry. |
| AE-9 | Branding per catalogue | P0 | Logo, accent colour, "presented by" credit. |
| AE-10 | Privacy controls | P0 | Unlisted link (default), optional passcode, optional expiry. |
| AE-11 | Share panel | P1 | Copy link, WhatsApp share text, QR code for the reception. |
| AE-12 | Basic analytics | P1 | Views, watch time, completion rate, top titles. This is what the planner shows the couple. |
| AE-13 | Videographer upload link | P1 | A scoped, expiring upload URL the planner forwards. Removes the file-collection step. |
| AE-14 | **Curation guidance** | P1 | Soft cap warnings, a "your billboard is 9 minutes long — consider a shorter opener" style nudge, and a checklist of what a strong catalogue contains. The operator is not a curator by training; the tool has to help. |
| AE-15 | Subscription / billing view | P1 | Months remaining, renew, payment history. |
| AE-16 | Multi-operator org accounts, roles | P2 | Admin vs uploader. |

### 5.3 Platform

| ID | Feature | Pri |
|---|---|---|
| PL-1 | Adaptive bitrate transcode ladder, 360p–1080p (4K optional) | P0 |
| PL-2 | Signed playback URLs, expiring | P0 |
| PL-3 | India-edge CDN delivery | P0 |
| PL-4 | Per-catalogue subdomain + white-label theming | P0 |
| PL-5 | Subscription lifecycle: 3 months included → paid | P1 |
| PL-6 | Storage/bandwidth cost monitoring per catalogue | P1 |
| PL-7 | Custom domain | P2 |

## 6. Core user stories

### US-1 — Guest opens the link on a phone

> As a guest sent a link in a WhatsApp group, I want to see what's there and start watching
> immediately, so I don't give up.

- [ ] Video starts playing within **1.5s** of pressing play on 4G (throttled test profile).
- [ ] Rebuffer ratio under 1% across a full playthrough.
- [ ] Playback starts at a quality appropriate to the connection and steps up, never starting
      at 1080p and stalling.
- [ ] The browse page is interactive within 2.5s; poster rows do not shift as images load.
- [ ] Link preview in WhatsApp shows the hero poster, not a grey box.

### US-2 — Guest returns and resumes

> As a guest who watched half the ceremony film last night, I want it waiting where I left it.

- [ ] Continue Watching row appears with the title and a progress bar.
- [ ] Resume is within 5 seconds of the actual stop position.
- [ ] Position persists per profile across sessions and devices sharing that profile.
- [ ] A title watched past 95% leaves Continue Watching automatically.

### US-3 — Operator publishes a wedding

> As an operator with a folder of 18 films, I want a published catalogue in half an hour.

- [ ] Create catalogue → upload → title → publish, no documentation needed.
- [ ] A 6GB upload survives the laptop sleeping and the wifi dropping; it resumes, not restarts.
- [ ] Transcode status is visible per title; a failure explains itself and offers retry.
- [ ] Poster art exists for every title without the operator doing anything.
- [ ] Preview-as-guest before publishing.

### US-4 — Couple rewatches a year later

- [ ] Search finds a title by name or category in under 5 seconds.
- [ ] Everything still plays; nothing expired silently.
- [ ] If the subscription lapsed, the catalogue shows a clear renewal state — **never a 404,
      and never deleted content**. See §7.

### US-5 — Privacy

> As a family, I want to be sure this isn't findable by strangers.

- [ ] Catalogues are `noindex` and unlisted by default.
- [ ] Playback URLs are signed and expire; a copied `.m3u8` URL is dead within the hour.
- [ ] Optional passcode gate.
- [ ] No public directory, search, or cross-catalogue browse exists anywhere in the product.

> **⚠ Superseded — pricing.** The figures in this section are the original Phase 0 model and are
> **no longer what we sell.** [`docs/PRICING.md`](../PRICING.md) is current: three plans priced on
> storage (₹2,500 / ₹7,000 / ₹12,000), **twelve** months included rather than three, renewal per
> tier, 4K as a minute allowance, and 30-day deletion after lapse. This section is kept because the
> *reasoning* — why the couple pays rather than the planner, why tiers grade on craft — still
> holds, and because it is the record of what was intended.

## 7. Retention and subscription model

**3 months included with the planner's per-wedding licence, subscription after.**

| Month | State | Who pays |
|---|---|---|
| 0–3 | Full access, everything hot | Planner, in the per-wedding licence |
| Month 3 | Upsell shown in-catalogue and emailed to the couple | — |
| 4+ | Active subscription: ₹249/month or ₹1,999/year | The couple, directly |
| Lapsed | **Grace: 60 days.** Catalogue shows a renewal screen. Content retained, not served. | — |
| Lapsed +60d | Move to cold storage. Restorable within 24h on payment. | — |
| Lapsed +12 months | Final notice by email, then deletion | — |

**Never delete a couple's wedding video because a card expired.** The grace period and the
explicit final notice are product requirements, not niceties. Getting this wrong is the kind
of story that ends a planner relationship and travels.

This model also fixes the seasonality problem that killed the original business case:
weddings cluster in Nov–Jan, but subscriptions bill all year.

## 8. Success metrics

| Phase | Metric | Target |
|---|---|---|
| 0 | Planner meetings from the demo | 5 |
| 0 | Planners committing to a paid pilot | 1 |
| 1 | Catalogues published | 5 |
| 1 | **Playback start time, p75, 4G** | **<1.5s** |
| 1 | Rebuffer ratio | <1% |
| 1 | Guests who play ≥1 title / guests who open | >60% |
| 1 | Operator time to publish a catalogue | <30 min |
| 2 | **Month-4 subscription conversion** | **>25%** |
| 2 | Annual (vs monthly) share of subscriptions | >40% |

The number that decides whether this is a business is **month-4 conversion**. It tells you
whether the couple values the artefact enough to pay for it themselves — which is the only
thing that turns a seasonal per-wedding fee into a compounding asset.

## 9. Open questions

| # | Question | Resolve by |
|---|---|---|
| Q1 | Will planners actually collect files from videographers, or does that step break? | First pilot. If it breaks, AE-13 becomes P0 and the videographer becomes a second user type. |
| Q2 | Does the couple pay, or does the planner bundle a year in? | Test both in the first three pilots. |
| Q3 | Is 3 months long enough for the upsell to feel fair, or does it read as a bait-and-switch? | Watch the first renewal cohort. |
| Q4 | 4K: worth the storage and bandwidth, or is 1080p indistinguishable on the phones people use? | Measure device mix in Phase 1 before enabling 4K by default. |
| Q5 | Do guests use profiles, or does everyone tap the first tile? | Instrument. If nobody switches profile, Continue Watching should be device-scoped instead. |
