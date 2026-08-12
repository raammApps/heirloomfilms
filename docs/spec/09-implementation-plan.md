# 09 — Implementation Plan

One ticket per commit. Do not start a ticket whose dependencies are open. Estimates assume
one developer at ~10–15 hrs/week.

**Phase 0's job is a demo that closes a wedding company.** That demo has three parts a
planner must see: a beautiful guest catalogue, video that plays instantly, and *them*
creating a catalogue in the customizer. All three are P0. If P0-01…P0-20 are done and no
planner has committed, stop.

---

## Phase 0 — the demo (target: 3–4 weeks)

### Track A · Foundation

| # | Ticket | Deps | Est |
|---|---|---|---|
| P0-01 | Scaffold: Next.js 15, TS strict, Tailwind v4, pnpm, CI (lint + tsc + test) | — | 2h |
| P0-02 | Design tokens per doc 04 (near-black + `#d11a2a`), self-hosted Archivo/Inter/Mukta | 01 | 3h |
| P0-03 | Supabase project, schema per doc 06 §1 + doc 14 §6, RLS policies | 01 | 5h |
| P0-04 | Operator auth: login, session, org scoping, protected `/admin` | 03 | 4h |
| P0-05 | Middleware tenant resolution (`resolveTenant` pure + exhaustive unit tests) | 01 | 3h |
| P0-06 | i18n: dictionary, `LocalisedString` resolution, EN/HI, silent English fallback | 01 | 3h |

### Track B · Video pipeline — *the highest-risk work; start it early*

| # | Ticket | Deps | Est |
|---|---|---|---|
| P0-07 | `lib/video/provider.ts` interface + Bunny implementation (`createUpload`, `getPlaybackToken`, `getStatus`, `deleteAsset`, `getUsage`) | 01 | 5h |
| P0-08 | **Resumable upload** — TUS direct-to-Bunny, 5MB chunks, IndexedDB offset, backoff | 07 | 8h |
| P0-09 | Bunny webhook handler: signature verification, idempotent, status → `titles` | 07 | 4h |
| P0-10 | Poster extraction: 3 candidate frames on ready, custom upload, generated fallback | 09 | 4h |
| P0-11 | Playback token endpoint + signed HLS, 4h expiry, catalogue+title scoped | 07 | 4h |
| P0-12 | Player: Vidstack themed to tokens, ABR, scrub thumbnails, keyboard, silent token refresh | 11 | 8h |

> **Do P0-07 and P0-08 in week one, before any UI.** Everything else is work you have done
> before; resumable multi-gigabyte upload against a third-party API is where the schedule
> will actually slip. Find that out early.

### Track C · Guest catalogue

| # | Ticket | Deps | Est |
|---|---|---|---|
| P0-13 | Module registry + contract per doc 14 §4; renderer that walks `catalogue.modules` | 02 | 6h |
| P0-14 | `billboard` module: muted autoplay trailer, poster fallback, Play / More Info | 13, 02 | 5h |
| P0-15 | `curated_row` + `photo_row`: snap scroll, pointer arrows by whole cards, **and a correct 2–3 card layout** (no arrows, no peek, sized up) | 13 | 6h |
| P0-16 | Title detail modal: focus trap, `?title=`, Android back, ←/→ between siblings | 15 | 6h |
| P0-17 | Profile gate + profiles; per-title **share** (share sheet, copy link, WhatsApp text) on modal and end-of-playback | 13, 03 | 6h |
| P0-18 | Progress heartbeat (10s) → `play_events` + `playback_progress`; resume within 5s | 12, 17 | 4h |
| P0-19 | `letter` + `photo_grid` modules | 13 | 5h |

### Track D · Admin + customizer

| # | Ticket | Deps | Est |
|---|---|---|---|
| P0-20 | Catalogue list + 4-step create wizard (doc 02 §3), upload running in background from step 3 | 04, 08 | 7h |
| P0-21 | Title list + editor: name, synopsis, category, order, publish toggle, transcode status + retry, **15-title soft cap with an honest explanation** | 09, 20 | 7h |
| P0-22 | **Customizer**: section list, drag reorder (keyboard-accessible), visibility toggle, gear → Editor sheet | 13, 20 | 9h |
| P0-23 | Live preview pane (real guest components), mobile default, debounced ~300ms | 22 | 6h |
| P0-24 | Templates: "The Keepsake", "Films Only", "Anniversary" + curation nudges (doc 14 §5.9) | 22 | 4h |
| P0-25 | Branding: logo, accent with live contrast warning, presented-by | 22 | 4h |
| P0-26 | Draft/publish: autosave to `draft_modules`, explicit publish → `modules` + ISR revalidate, undo ×20 | 22 | 5h |

### Track E · Ship

| # | Ticket | Deps | Est |
|---|---|---|---|
| P0-27 | OG tags + `/api/og` (≤300KB), verified unfurling in real WhatsApp | 14 | 4h |
| P0-28 | Privacy: `noindex`, unlisted default, passcode gate with lockout | 03 | 4h |
| P0-29 | Demo catalogue — real footage, **9 titles, not 20**, full EN+HI copy, a written letter, ~30 photos | all C | 8h |
| P0-30 | Deploy: Vercel, wildcard DNS, perf pass against doc 05 §6 budgets | all | 5h |

**Phase 0 exit criteria**

- [ ] Playback starts in **under 1.5s** on a phone on real 4G, p75
- [ ] Rebuffer ratio under 1% across a full 20-minute film
- [ ] A 6GB upload survives the laptop sleeping and resumes
- [ ] An operator who has never seen the tool publishes a catalogue in under 30 minutes
- [ ] Reordering sections in the customizer visibly changes the published guest page
- [ ] A row containing three cards looks deliberate, not broken
- [ ] The whole catalogue is ~2 screens of scroll and contains nothing that feels like filler
- [ ] The link unfurls correctly in a real WhatsApp group
- [ ] Sandeep can run the whole demo from a phone, on mobile data, without a laptop

---

## Phase 1 — first paying weddings (after a signed pilot)

| # | Ticket | Est |
|---|---|---|
| P1-01 | Razorpay subscriptions: 3-months-included → monthly/yearly, webhooks | 8h |
| P1-02 | Subscription lifecycle jobs: grace 60d, cold storage, notices, **never delete silently** | 6h |
| P1-03 | `/renew` screen — catalogue visible, content retained, no 404 anywhere | 3h |
| P1-04 | Usage rollups + per-catalogue cost view + >300GB/month alert | 5h |
| P1-05 | Analytics for operators: views, watch time, completion, top titles | 6h |
| P1-06 | `/watch/<slug>?t=` timestamp deep link + end-of-playback card. **No search** — doc 01 §4 | 4h |
| P1-07 | `continue_watching`, `timeline`, `checklist`, `randomiser` modules; chapters in the long film | 12h |
| P1-08 | Captions upload (WebVTT); language toggle across title metadata | 5h |
| P1-09 | Videographer upload link — scoped, expiring, no admin account needed | 6h |
| P1-10 | Bulk upload + auto-titling from filenames | 5h |
| P1-11 | Custom domains | 4h |
| P1-12 | DPDP: privacy notice, grievance contact, retention job, access log | 5h |
| P1-13 | Accessibility pass: axe clean, keyboard, VoiceOver + TalkBack, player controls | 7h |
| P1-14 | Performance budgets enforced in CI (Lighthouse + a QoE probe) | 5h |

**Exit:** five catalogues live; playback start p75 <1.5s; operator publish time <30 min;
month-4 subscription conversion measured on the first cohort.

---

## Phase 2

Multi-operator orgs and roles · org-level branding defaults · `quiz`, `guestbook`
(moderated), `countdown`, `people`, `map` modules · chapters within long films · download
for offline · 4K tier · other occasions (anniversary, proposal) as first-class templates ·
`rsvp` returns as a module from `archive/invite-site/`.

---

## Sequencing rationale

**Why the video pipeline comes before the UI.** Resumable multi-GB upload and sub-1.5s
playback are the two things that can fail in ways no amount of design fixes. Everything in
Track C is work Sandeep has done many times. Derisk the unknown first.

**Why the customizer is P0 and not Phase 2.** The pitch is "your junior does this in thirty
minutes, forty times a season." A demo where Sandeep edits JSON demonstrates the wrong
product entirely — it shows a bespoke service, which is what the planner can already buy.

**Why the module registry (P0-13) precedes any module.** Building the billboard first and
extracting an abstraction later means rewriting every module. The registry is two days that
saves two weeks by module eight.

**Why the demo catalogue gets 8 hours.** It is the sales artefact. A planner judges the
product on whether the content feels real. Do not fill it with lorem ipsum or stock footage
of strangers — use real, licensed, permission-cleared material.

## Definition of done (every ticket)

- [ ] `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` pass
- [ ] Works at 360×800 and 1440×900
- [ ] Keyboard-operable, visible focus, no new axe violations
- [ ] Works in Hindi
- [ ] No hardcoded catalogue content; nothing outside `modules/<type>/` changed to add a module
- [ ] Ticket-specific acceptance criteria met and demonstrated
