# 01 — Product Spec

## 1. Problem

An Indian wedding is 3–7 distinct ceremonies across several days, often several cities,
with 200–800 guests who each need a different subset of that information. Today this is
coordinated over WhatsApp forwards, a PDF invite card, and a spreadsheet the family
maintains by hand. Three things break repeatedly:

1. **Guests don't know which events they're invited to.** A blanket "you're invited" leaves
   the family fielding the same question 200 times.
2. **Headcount per ceremony is guesswork.** Caterers need per-event numbers. Families
   commit to numbers they don't have.
3. **The invite doesn't travel well.** A link pasted into WhatsApp that unfurls as a broken
   grey box is, functionally, an invite nobody opens.

Existing wedding-website builders solve #1–#3 adequately and give it away free. What none
of them solve is that the result looks like everyone else's wedding website.

## 2. The wedge

We are not selling RSVP software. We are selling **an invite guests screenshot and forward**
— a wedding presented as a prestige streaming title, with the RSVP machinery underneath as
table stakes rather than as the pitch.

This distinction determines every scoping decision. When forced to choose between a feature
that improves the guest's first eight seconds and one that improves back-office depth, take
the first eight seconds. Zola already won back-office depth and gives it away.

## 3. Who we sell to

**We do not sell to couples.** Direct-to-consumer economics in this category are known-bad:
free incumbents mean acquisition cost exceeds a realistic per-wedding price.

**We sell to wedding management companies.** They already:

- have the couple's trust and attention at the exact moment the website is relevant
- already charge in lakhs, so a ₹8–15k line item is rounding error, not a decision
- have 20–80 weddings a season, so one signed partner is 20–80 tenants
- are looking for differentiation against other planners

| | Couple (end user) | Planner (customer) |
|---|---|---|
| Wants | An invite that makes their people react | To look premium; to stop doing RSVP admin by hand |
| Fears | Looking tacky; guests missing information | Client complaints; anything that adds work |
| Success looks like | Guests forwarding it unprompted | Zero support calls; couple posts about it |
| Pays | Nothing (planner bundles it) | Per-wedding licence |

## 4. Goals and non-goals

### Goals (Phase 0–1)

- G1. A guest lands from WhatsApp and understands, in under 15 seconds, which events they're
  invited to and when the first one is.
- G2. A guest can RSVP per event — not one blanket yes/no — in under 60 seconds, on a phone,
  without creating an account.
- G3. A planner can rebrand the entire site (logo, colours, name) by editing one config file
  and redeploying, in under 10 minutes.
- G4. A shared link unfurls correctly in WhatsApp, iMessage and Instagram DM, every time.
- G5. The couple's family can see live per-event headcounts without asking us.

### Non-goals (explicitly out of scope)

- **Registry / gifting / Shagun payments.** Payment handling drags in PA/PG compliance and
  settlement risk for negligible revenue. Link out to the couple's own UPI QR instead.
- **Vendor marketplace.** Our customer *is* the vendor. Competing with them kills the channel.
- **Native mobile apps.** The entire distribution mechanic is a link in WhatsApp. An app
  install is a funnel step that destroys the product.
- **A couple-facing self-serve signup.** Phase 0–2 are planner-mediated. Self-serve is a
  Phase 3 question that only opens if planners tell us couples are asking.
- **Photo sharing / live galleries during the event.** Different product, different problem.
- **Matchmaking, budgeting, vendor booking, checklists.** WedMeGood territory. Not ours.

## 5. Feature set

Priority key: **P0** = Phase 0 demo cannot ship without it. **P1** = needed for a real
paying wedding. **P2** = planner-facing scale. **P3** = later.

### 5.1 Guest experience

| ID | Feature | Pri | Notes |
|---|---|---|---|
| GE-1 | Profile gate ("who's joining?") | P0 | Bride's side / groom's side / friends. Sets a filter and is the signature moment. Skippable. |
| GE-2 | Hero banner with couple, date, city, synopsis | P0 | Full-bleed. Primary CTA = RSVP, secondary = event details. |
| GE-3 | Horizontal poster rows | P0 | Snap-scroll on touch, arrow buttons on pointer. Rows: Ceremonies, Our Story, Travel & Stay, Cast & Crew. |
| GE-4 | Detail modal per card | P0 | Poster header, date/time, venue, dress code, map link, inline RSVP. Focus-trapped, Esc to close, deep-linkable via `?event=sangeet`. |
| GE-5 | Per-event RSVP | P0 | Yes/No per ceremony, guest count, name, phone. No account. |
| GE-6 | Language toggle EN / हिंदी | P0 | Full UI + content. Persists to `localStorage`. Extensible to ta/te/mr/gu. |
| GE-7 | WhatsApp-optimised OG tags | P0 | `og:image` 1200×630 ≤300KB, absolute URL, `og:title`, `og:description`. |
| GE-8 | Add to calendar (.ics) per event | P1 | Per-event and all-events. |
| GE-9 | Travel & accommodation cards | P1 | Hotels, airport distance, shuttle timings, booking code. |
| GE-10 | Dietary / meal preference capture | P1 | Veg / Jain / vegan / allergies free text. Caterers need this. |
| GE-11 | Personalised invite links | P1 | `?g=<token>` pre-fills name and pre-filters events to that guest's invite set. The "uncle test" feature. |
| GE-12 | Passcode-protected page | P2 | For a private message or the address of an intimate ceremony. |
| GE-13 | Story episodes with video | P2 | Autoplay-muted preview on hover; full playback in modal. Deferred — video hosting cost and mobile data. |

### 5.2 Couple / family experience

| ID | Feature | Pri | Notes |
|---|---|---|---|
| CE-1 | Live RSVP dashboard, per event | P1 | Counts + list. Read-only link, no login, unguessable URL. |
| CE-2 | Guest list CSV export | P1 | For the caterer and the planner. |
| CE-3 | Guest list CSV import | P1 | Planners already have a spreadsheet. Meet them there. |
| CE-4 | WhatsApp broadcast helper | P2 | Generates per-guest `wa.me` links with pre-filled message. Not an automated sender — see compliance §5. |
| CE-5 | Reminder nudges to non-responders | P2 | Manual trigger, not automated blast. |

### 5.3 Planner / partner experience

| ID | Feature | Pri | Notes |
|---|---|---|---|
| PE-1 | White-label theming via config | P0 | Logo, colour pair, font pair, "presented by" credit, favicon. |
| PE-2 | Tenant config as a single JSON file | P0 | Human-editable. Zod-validated at build. |
| PE-3 | Custom domain per wedding | P1 | `aanyaandvikram.com` → tenant. |
| PE-4 | Partner admin: list weddings, create tenant | P2 | Replaces "email Sandeep a JSON file". |
| PE-5 | Partner-level branding defaults | P2 | Set once, inherited by every wedding they create. |
| PE-6 | Usage/billing view | P3 | Only once there is more than one partner. |

### 5.4 Theme packs

| ID | Feature | Pri | Notes |
|---|---|---|---|
| TH-1 | "Marquee" — the cinematic default | P0 | Near-black + hot red. The streaming look. See doc 04. |
| TH-2 | "Mandap" — traditional, warm, ornamental | P2 | For families who find the streaming look too irreverent. |
| TH-3 | "Minimal" — editorial, typographic, restrained | P2 | For the design-conscious urban couple. |

**Never build**: themes imitating an identifiable commercial product's UI. See §12.

## 6. Core user stories with acceptance criteria

### US-1 — Guest opens the link from WhatsApp

> As a guest who received a link in a family WhatsApp group, I want to immediately understand
> whose wedding this is and when, so I know whether to keep reading.

**Acceptance**
- [ ] Link preview in WhatsApp shows a poster image, couple names and date — not a grey box.
- [ ] First contentful paint under 1.8s on a throttled Fast 3G / 4× CPU-slowdown profile.
- [ ] Couple names, wedding date and city are visible above the fold at 360×800 without scrolling.
- [ ] Page is usable with JavaScript still loading (content is server-rendered).

### US-2 — Guest RSVPs to some events but not others

> As an out-of-town guest, I want to say yes to the sangeet and wedding but no to the haldi,
> so the family gets accurate numbers.

**Acceptance**
- [ ] Each event exposes an independent yes/no control; there is no single global RSVP.
- [ ] Guest count is captured per event, defaulting to 1, max 20.
- [ ] Submitting requires name + phone only; no email, no account, no OTP.
- [ ] On submit, a confirmation state shows exactly which events were accepted and declined.
- [ ] Re-submitting with the same phone number updates rather than duplicates (Phase 1).
- [ ] Whole flow completes in ≤60s in a moderated test on a phone.

### US-3 — Guest reads in Hindi

> As an older relative, I want to read the invite in Hindi, so I don't have to ask someone.

**Acceptance**
- [ ] Toggle is reachable from the top nav on every screen, labelled in both scripts (`EN / हिं`).
- [ ] Toggling swaps UI chrome *and* tenant content (event names, descriptions, dress codes).
- [ ] Choice persists across reload and across in-site navigation.
- [ ] Devanagari renders with a proper Devanagari font, not a fallback with clipped matras.
- [ ] If a tenant supplies no Hindi string for a field, fall back to English silently — never
      show an empty field or a translation key.

### US-4 — Planner rebrands the site for their agency

> As a wedding planner, I want the site to carry my agency's logo and colours, so my clients
> see it as my service.

**Acceptance**
- [ ] Changing `partner.logo`, `partner.name` and `theme.colors` in tenant JSON changes the
      whole site with no code edits.
- [ ] Contrast is validated at build time: if a supplied colour pair fails 4.5:1 for body text,
      the build fails with a clear message naming the failing pair.
- [ ] No Mehfil branding appears anywhere on the guest-facing site except an optional,
      config-disableable footer credit.

### US-5 — Family checks the headcount

> As the bride's father, I want to see how many people said yes to the sangeet, so I can tell
> the caterer.

**Acceptance**
- [ ] A read-only dashboard URL shows per-event accepted / declined / awaiting counts.
- [ ] Counts include guest-count multipliers, not just response rows.
- [ ] CSV export contains one row per guest per event.
- [ ] The URL is unguessable (≥128 bits of entropy) and carries no login.

## 7. Success metrics

Phase 0 is a sales artefact, so its metric is commercial, not behavioural.

| Phase | Metric | Target |
|---|---|---|
| 0 | Planner meetings taken from the demo | 5 |
| 0 | Planners who say yes to a paid pilot | 1 |
| 1 | Weddings live | 3 |
| 1 | Guest RSVP completion rate (opened → submitted) | >35% |
| 1 | Median time to RSVP | <60s |
| 1 | Planner support requests per wedding | <2 |
| 2 | Partners renewing for a second season | >50% |

The single number that matters in Phase 1 is **RSVP completion rate**. If guests open the
site and don't RSVP, the planner's admin work didn't go away, and there is no second season.

## 8. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | Do planners want to hold the guest data themselves, or is us holding it a blocker? | Sandeep, in pitch meetings | Phase 1 design |
| Q2 | Is per-wedding licence or per-season subscription an easier yes for a planner? | Sandeep | First contract |
| Q3 | Will families accept a streaming aesthetic, or is it a young-couple-only product? | Show demo to 5 non-technical people over 50 | Phase 1 |
| Q4 | Hindi first, or a South-Indian language first? Depends which planners sign. | Sandeep | Phase 1 |
| Q5 | Does the profile gate delight or annoy? It adds a tap before content. | Instrument in Phase 1; A/B if volume allows | Phase 2 |
