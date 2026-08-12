# 10 — Testing & Acceptance

## 1. Test strategy

Small surface, high stakes: the software runs once per wedding, on a date that cannot slip,
in front of everyone the couple knows. Optimise for **correctness of the few things that
matter** rather than coverage percentage.

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Vitest | `resolveTenant`, module config schemas, trending/new suppression, progress + completion maths, i18n fallback, contrast validator |
| Component | Vitest + Testing Library | Modal focus/history behaviour, module renderer, customizer reorder, player state |
| E2E | Playwright | The six critical journeys below, mobile + desktop viewports |
| Visual | Playwright screenshots | Browse, title modal, player, customizer — mobile and desktop, EN and HI |
| A11y | axe-core in Playwright | Every page state; zero violations gate |
| Performance | Lighthouse CI + a QoE probe | Budgets from doc 05 §6 — playback start time is the one that matters |
| Manual | Real devices | Playback start on real 4G, WhatsApp preview, Android back button, sunlight legibility |

**Coverage target: none.** Instead, this list of things that must have a test:

1. `resolveTenant` for every host shape (root, www, admin, valid, reserved, unknown, custom domain, port, uppercase).
2. Module renderer: unknown `type` renders nothing and does not throw; disabled modules are skipped; order is respected.
3. Adding a module requires no change outside `modules/<type>/` — assert the registry is the only touch point.
4. ~~Trending suppression: hidden below `minPlays`; New suppressed on a catalogue younger than 14
   days.~~ **Withdrawn.** Doc 01 §5.1 cut both rows — VE-13 because trending is meaningless across
   eight items and would rank the billboard first every time, VE-14 because the whole catalogue
   publishes at once. Verified absent from the code. The number is kept rather than renumbered so
   references to "doc 10 §1 test 4" still land somewhere that explains itself.
5. A play counts toward `view_count_7d` only past 30 seconds watched.
6. `playback_progress` marks `completed` past 95% and the title leaves Continue Watching.
7. Playback token is scoped to catalogue **and** title; a token for title A cannot fetch title B.
8. Expired token → client refreshes and resumes at the same position, does not restart.
9. i18n falls back to English silently when `hi` is missing — never a key, never empty.
10. Contrast validator flags a known-bad accent.
11. OG image is ≤300KB.
12. RLS: an anon client cannot `select` unpublished titles, draft catalogues, or another catalogue's rows.
13. `appName` matching `/flix$/i` is rejected at catalogue creation.

## 2. Critical E2E journeys

### E2E-1 — Guest watches and resumes
Load `/` → pick a profile → open a title modal → Play → assert playback starts → seek to 50%
→ leave → reload → **Continue Watching row shows the title with a progress bar** → open →
resumes within 5s of the stop position.
**Asserts:** doc 01 US-1 and US-2.

### E2E-2 — Deep link and back button
Load `/?title=sangeet-film` cold → modal is open → press back → modal closes, still on site,
scroll position preserved → forward → modal reopens. Then Play → `/watch/...` → back →
returns to browse at the prior scroll position with the modal closed.
**Asserts:** the single most common interaction on Android.

### E2E-3 — Hindi
Toggle to हिं → chrome and title metadata are Hindi → reload → still Hindi → a title with no
`hi` synopsis shows English, not a key and not a blank.

### E2E-4 — Operator publishes a catalogue
Login → create catalogue from a template → upload a fixture file → wait for `ready` → set
title and category → open customizer → reorder two sections → publish → open the guest URL →
**the published page matches the preview exactly**.

### E2E-5 — Upload resilience
Start a large upload → kill the network at ~60% → restore → assert it resumes from ~60%, not
0% → reload the page mid-upload → assert the title row still exists and upload continues.

### E2E-6 — Access control
Unpublished title is absent from the guest page and its playback token request is rejected ·
draft catalogue shows "not yet available", not a 404 · lapsed subscription routes to `/renew`
with content intact · wrong passcode 5× triggers lockout.

## 3. Manual device checklist

Run before every planner demo and before every live wedding.

| # | Check | Device |
|---|---|---|
| M-1 | WhatsApp link preview shows image + names + date | Real Android and iPhone |
| M-2 | Hardware back closes modal, does not exit site | Android Chrome |
| M-3 | Tapping a form field does not zoom the page | iPhone Safari |
| M-4 | Readable in direct sunlight at max brightness | Any phone, outdoors |
| M-5 | Loads in <3s on 4G at a venue, not office wifi | Real network |
| M-6 | Hindi matras are not clipped at any size | Both platforms |
| M-7 | Rows scroll with a thumb without triggering page scroll | Both platforms |
| M-8 | Site works with system font-size at maximum | Android accessibility settings |
| M-9 | **Playback starts in under 1.5s** on real 4G, measured with a stopwatch | Real network, real phone |
| M-10 | A 20-minute film plays through with no visible rebuffer | Real network |
| M-11 | An operator who has never seen the admin publishes a catalogue in <30 min | A real person, timed |

M-9 and M-11 are the two that predict the business outcome. Run M-11 with someone
non-technical and watch where they hesitate — that hesitation is the roadmap.

## 4. Accessibility acceptance

WCAG 2.1 AA. Non-negotiable items:

- [ ] All text meets 4.5:1 (3:1 for ≥24px or ≥19px bold)
- [ ] Every interactive element reachable and operable by keyboard
- [ ] Visible focus indicator everywhere; `outline: none` never appears without a replacement
- [ ] Modal traps focus, restores it on close, and announces itself
- [ ] Every player control is keyboard-operable and labelled; captions toggle is reachable
- [ ] Rows do not trap arrow keys
- [ ] Customizer sections can be reordered by keyboard, not only by drag
- [ ] Images have meaningful `alt`; decorative posters are `alt=""`
- [ ] `prefers-reduced-motion` disables the billboard trailer, reveals and scroll easing
- [ ] Tap targets ≥44×44 CSS px
- [ ] `<html lang>` matches the rendered language
- [ ] Screen-reader pass: VoiceOver (iOS) and TalkBack (Android) — not just desktop NVDA

Rationale worth stating to anyone who pushes back: the audience for a wedding catalogue skews
older than a typical consumer product's, and half of them will watch on a tablet with the
system font size turned up. This is not compliance theatre, it is the uncle test.

## 5. Security review checklist

Every PR touching data answers these in the description:

- [ ] **What enforces tenant isolation in this change?**
- [ ] Is any secret reachable from the browser bundle?
- [ ] Is user input escaped on render and parameterised in queries?
- [ ] Does any new endpoint return guest personal data? If yes, why does it exist?
- [ ] Is the new endpoint rate-limited?
- [ ] Does anything new get written to logs that shouldn't be there (phone numbers, tokens)?

Pre-launch, once:

- [ ] Anon key cannot read unpublished titles, draft catalogues, or another catalogue's rows
- [ ] A playback token for one title cannot fetch another; tokens expire as specified
- [ ] Service-role key is never reachable from the browser bundle
- [ ] All catalogues `noindex`; no sitemap; no cross-catalogue browse exists
- [ ] Bunny webhook rejects an unsigned or replayed payload
- [ ] Backup restore drill completed successfully

## 6. Pre-handover runbook

Per catalogue, before the link goes to the couple:

1. Every title is `ready` — none stuck in `processing` or `failed`.
2. Play the first 20 seconds of **every** film on a phone on mobile data.
3. Check the billboard trailer, the poster art, and that no title is missing a category.
4. Verify the WhatsApp preview on a fresh URL (`?v=2` — WhatsApp caches previews for days).
5. Confirm privacy: `noindex` set, passcode working if enabled.
6. Confirm `included_until` is correct so the month-3 upsell fires on the right date.
7. Confirm rollback: the previous deployment is one click away.

If a catalogue is being shown at the reception, load-test it first — 300 people opening a
link in the same ten minutes on the same venue wifi is a real spike.
