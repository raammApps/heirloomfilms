# 02 — Information Architecture

## 1. Sitemap

```
Guest-facing (per tenant)
│
├── /                          Home — the whole experience, single page
│   ├── #profile-gate          Overlay on first visit (dismissible, remembered)
│   ├── #hero                  Couple, date, city, synopsis, primary CTA
│   ├── #ceremonies            Poster row — the 3–7 events
│   ├── #story                 Poster row — narrative episodes
│   ├── #travel                Poster row — stay, transport, arrival
│   ├── #people                Poster row — cast & crew
│   └── #rsvp                  Full RSVP form section
│
├── /?event=<slug>             Home with detail modal open (deep link, shareable)
├── /?g=<token>                Home personalised to a guest (Phase 1)
├── /rsvp                      Standalone RSVP page (fallback + direct link target)
├── /travel                    Standalone travel page (long-form, printable)
├── /api/og                    Dynamic OG image generation
└── /private/<slug>            Passcode-gated page (Phase 2)

Family-facing
└── /dashboard/<token>         Read-only live RSVP counts + export (Phase 1)

Partner-facing (Phase 2)
├── /partner/login
├── /partner                   List of weddings
├── /partner/new               Create a tenant
└── /partner/<tenant>/settings Branding defaults, domain, guest import
```

**Design decision — single page, not multi-page.** The guest journey is one continuous
scroll with modals. Multi-page navigation on a phone from a WhatsApp link adds load
transitions that break the "it feels like an app" impression, which is the entire product.
`/rsvp` and `/travel` exist only as direct-link targets and as no-JS fallbacks; they render
the same content the modal would.

## 2. Route → tenant resolution

| Incoming host | Resolves to | Mechanism |
|---|---|---|
| `aanya-vikram.heirloomfilms.app` | tenant `aanya-vikram` | Middleware reads subdomain, rewrites to `/aanya-vikram/...` |
| `aanyaandvikram.com` | tenant `aanya-vikram` | Middleware looks up custom-domain map |
| `heirloomfilms.app` | Marketing / partner login | No tenant |
| `demo.heirloomfilms.app` | tenant `demo` | The pitch demo. Never delete. |
| unknown subdomain | 404 with a branded "this invite may have moved" page | — |

See `05-technical-architecture.md §2` for the middleware implementation.

## 3. Navigation model

### Top navigation (sticky, transparent → solid on scroll)

```
[Partner logo]   Ceremonies · Story · Travel · People        [EN|हिं]  [RSVP →]
```

- Collapses on mobile to: `[logo]                    [EN|हिं] [RSVP →]`
  — section links become part of scroll, not a hamburger. A hamburger menu on a 5-section
  page is ceremony without function.
- The RSVP button is always visible, always the only filled button on screen.
- Nav links are anchor scrolls with `scroll-behavior: smooth`, and set focus to the section
  heading for screen readers.

### Modal navigation

- Opening a card pushes `?event=<slug>` via `history.pushState`.
- Browser back closes the modal rather than leaving the site. This is the single most
  important navigation behaviour on Android — the hardware back button must not exit.
- Left/right arrow keys move between cards within the same row while a modal is open.
- Esc closes. Focus returns to the originating card.

## 4. Content hierarchy per screen

Ordered by what a guest needs first. Anything below the line in each screen is optional
reading.

### Home / hero
1. Whose wedding (names)
2. When (date) and where (city)
3. What this is (one-line synopsis)
4. What to do (RSVP)
   ───
5. Everything else

### Event detail modal
1. Which ceremony (name)
2. When (day, date, start time)
3. Where (venue name, then address)
4. RSVP control
   ───
5. Dress code
6. Description / what happens at this ceremony
7. Map link, parking, entry notes

### RSVP section
1. Per-event yes/no controls (the actual task)
2. Name, phone
   ───
3. Guest count per accepted event
4. Meal preference
5. Message to the couple

**Rule:** if a field is not needed to produce a caterer headcount, it is optional and appears
after the submit-critical fields. Every optional field measurably reduces completion.

## 5. Empty, loading and error states

| Situation | Behaviour |
|---|---|
| Tenant has fewer than 3 events | Row still renders; do not pad with placeholders. Row scroll arrows hide. |
| Tenant has no story episodes | Hide the entire "Our Story" row. Never render an empty row. |
| Tenant has no travel info | Hide the row and the `/travel` route. Remove from nav. |
| Poster image missing | Render the generated gradient poster with the event name set in display type. Never a broken image. |
| RSVP submit in flight | Button shows spinner + "Sending…", form disabled, no layout shift. |
| RSVP submit fails | Inline error above the button with a retry, plus a `wa.me` fallback link to message the planner directly. Never lose the user's typed input. |
| RSVP already submitted (Phase 1) | Load prior answers into the form, change CTA to "Update my RSVP". |
| Passcode wrong | Shake the input, generic message, rate-limit after 5 attempts. |
| JS disabled | Full content renders server-side. Modals become the `/travel` and `/rsvp` pages. RSVP form posts natively. |

## 6. Scroll and section order rationale

The order is **Ceremonies → Story → Travel → People**, not the more obvious
Story → Ceremonies.

A guest arrives with a question ("what am I invited to and when?"), not with curiosity about
the couple's love story. Serving the story first buries the utility and costs RSVP
completion. The story row earns its place second because by then the guest has their answer
and is willing to be charmed.

`Travel` before `People` because out-of-town guests are the ones who need to act early
(book flights), and they are also the ones most likely to decline late if the logistics
look hard.
