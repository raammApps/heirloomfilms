# 08 — Component Spec

Props are the contract. Every component listed here is presentational and receives tenant
data from the route — none of them fetch. `L` = `LocalisedString`, resolved by the caller
through `t()` before it reaches a leaf component unless noted.

## Tree

```
app/_tenant/[tenant]/page.tsx
└── <TenantProvider config locale>
    ├── <ProfileGate />                 client, conditional
    ├── <TopNav />                      client (scroll state)
    ├── <HeroBanner />                  server
    ├── <PosterRow kind="events" />     server shell + client scroller
    │   └── <PosterCard />              client (opens modal)
    ├── <PosterRow kind="story" />
    ├── <PosterRow kind="travel" />
    ├── <PosterRow kind="people" />
    ├── <RsvpSection />                 client (form state)
    ├── <DetailModal />                 client, portal, URL-driven
    └── <SiteFooter />                  server
```

---

### `<TenantProvider>`

Client context holding `config`, `locale`, `setLocale`, `rsvpDraft`, `setRsvpDraft`,
`segment`, `setSegment`. Persists `locale` and `segment` to `localStorage` **and** a cookie
so SSR output matches the client's first render (otherwise hydration flashes English).

`rsvpDraft: Record<eventSlug, { status: 'yes'|'no'|null; partySize: number }>` — the shared
state between modal toggles and the RSVP form. Not persisted to the server until submit;
persisted to `localStorage` so a guest who closes the tab mid-decision does not start over.

---

### `<ProfileGate>`

| Prop | Type | Notes |
|---|---|---|
| `appName` | `string` | The per-couple streaming brand, e.g. "AanyaVikramStream" |
| `segments` | `Segment[]` | From config |
| `onSelect` | `(slug \| null) => void` | `null` = skipped |

Renders `appName` as a large tracked-out wordmark above the tiles — this is where the
per-couple branding lands, and it is the first thing a guest sees. Animate it in over ~600ms
with a slight scale settle before the tiles appear; that beat is what sells the reference.
The partner's logo does **not** appear here — it lives in the nav and footer.

**States:** hidden (already chosen / ≤1 segment / `?g=` token present) · visible · exiting.

**Behaviour:** full-viewport overlay, `role="dialog"` `aria-modal="true"`, focus moves to the
heading on mount, Esc = skip. Never blocks content from a user who skips — it sets a
highlight preference, not permission.

---

### `<TopNav>`

| Prop | Type |
|---|---|
| `partner` | `Partner` |
| `sections` | `{ id, label }[]` |

**States:** transparent (scrollY < 80) · solid (`--surface-1` + backdrop-blur) · hidden
(scrolling down past 400px on mobile, revealed on scroll up).

The RSVP button never hides. On mobile it is the only nav element besides logo and language
toggle — no hamburger. Section links are anchor scrolls that also move focus to the section
heading (`tabIndex={-1}` + `.focus()`) so screen readers follow.

---

### `<HeroBanner>`

| Prop | Type | Notes |
|---|---|---|
| `couple` | `Couple` | |
| `hero` | `{ portrait: Image; landscape: Image }` | Two crops, not one |
| `eventCount` | `number` | |
| `onRsvpClick` | `() => void` | |

Server component. `<picture>` with a `media` switch at `md` — do not rely on `object-fit`
to rescue a landscape image on a portrait phone. `priority` + `fetchPriority="high"` on the
LCP image; explicit `width`/`height` to hold layout (CLS budget is 0.05).

Ken Burns via CSS `@keyframes` on a wrapper, disabled under `prefers-reduced-motion` and
suppressed for the first 1500ms after load.

**Acceptance:** at 360×800 with browser chrome, names + date + city + ceremony count are all
above the fold.

---

### `<PosterRow>`

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | Resolved |
| `items` | `CardItem[]` | |
| `aspect` | `'2:3' \| '16:9' \| '4:3' \| '1:1'` | Per row type |
| `onItemOpen` | `(slug) => void` | |

Scroll container: `overflow-x auto`, `scroll-snap-type: x mandatory`, `scroll-padding-inline-start`
matching the grid margin. Cards `scroll-snap-align: start`.

Arrows render only under `@media (hover: hover) and (pointer: fine)`. They scroll by
`Math.floor(containerWidth / cardWidth) * cardWidth` — whole cards only, never a fractional
offset that leaves a card half-cut.

Keyboard: the row is a `role="list"`; cards are focusable; Left/Right move focus and the
container scrolls the focused card into view. **Do not trap arrow keys** — a user must still
be able to Tab out.

If `items.length === 0`, render nothing at all. Never an empty row with a heading.

---

### `<PosterCard>`

| Prop | Type |
|---|---|
| `item` | `CardItem` |
| `aspect` | `Aspect` |
| `rsvpStatus` | `'yes' \| 'no' \| null` |
| `onOpen` | `() => void` |

A `<button>`, not a `<div onClick>`. Content: poster image (or generated fallback), title
overlay with a bottom scrim, meta line (date + time for events), and an RSVP status badge
when `rsvpStatus` is set.

Hover (pointer devices only): 1.03 scale + accent hairline, 180ms. No hover state on touch —
`:hover` sticks after tap on Android and leaves cards looking selected.

Image: `loading="lazy"` except the first two cards of the first row, `sizes` set per
breakpoint, LQIP blur placeholder from config.

---

### `<DetailModal>`

| Prop | Type |
|---|---|
| `item` | `EventItem \| Episode \| TravelItem \| Person \| null` |
| `siblings` | `string[]` |
| `onClose` | `() => void` |
| `onNavigate` | `(slug) => void` |

The component with the most ways to be subtly wrong. Required behaviours:

1. Rendered in a portal; `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on the title.
2. **Focus trap** while open; focus returns to the originating card on close.
3. `Esc` closes. Click on the scrim closes. Click inside does not.
4. Body scroll locked without layout shift (compensate for scrollbar width).
5. `history.pushState({ event: slug })` on open; `popstate` closes. **Android back must close
   the modal, not leave the site.**
6. `?event=<slug>` deep-links directly to the open modal on a cold load.
7. `←`/`→` navigate `siblings`, replacing history rather than pushing (so back exits the
   modal, not through every card visited).
8. Content order fixed: title → date/time → venue → RSVP → dress code → description → map.
9. Yes/No writes to `rsvpDraft`. It does **not** submit.

---

### `<EventRsvpToggle>`

| Prop | Type |
|---|---|
| `eventSlug` | `string` |
| `value` | `'yes' \| 'no' \| null` |
| `partySize` | `number` |
| `maxParty` | `number` |
| `onChange` | `(status, partySize) => void` |

Two pills in a `role="radiogroup"` with `aria-label` naming the event ("Sangeet attendance").
**Never a switch component** — a switch has an implied default, and a wrong default silently
corrupts headcount.

Party-size stepper appears only when `value === 'yes'`, animating height. Min 1, max
`maxParty`; `−` disabled at 1, `+` disabled at max with a tooltip explaining the limit.

Tap targets ≥44×44 CSS px.

---

### `<RsvpForm>`

| Prop | Type |
|---|---|
| `events` | `EventItem[]` (`rsvp: true` only) |
| `draft` | `RsvpDraft` |
| `config` | `TenantConfig['rsvp']` |
| `onSubmitted` | `(result: RsvpResult) => void` |

**States:** idle · validating · submitting · success · error · closed (past `closesAt`).

Field order and requirements:

| Field | Required | Input attributes |
|---|---|---|
| Per-event toggles | ≥1 answered | — |
| Name | yes | `autocomplete="name"` |
| Phone | yes | `type="tel"` `inputmode="numeric"` `autocomplete="tel"` |
| Meal preference | no | Select, only if `collectMealPreference` |
| Message | no | ≤500 chars, only if `collectMessage` |

- All inputs `font-size: 16px` — anything smaller triggers iOS zoom-on-focus, which throws
  the guest out of the layout mid-form.
- Validation on blur, not on keystroke. Errors inline, `aria-describedby`, focus moves to
  the first invalid field on failed submit.
- Honeypot field `_hp`, visually hidden, `tabindex="-1"`, `autocomplete="off"`. Silently
  discard submissions that fill it.
- On network failure: keep every value, show inline retry, and surface a `wa.me` fallback to
  message the planner. A guest must never hit a dead end.
- Purpose-limitation line sits directly above the submit button (DPDP notice requirement),
  not in a footer link.

---

### `<RsvpConfirmation>`

| Prop | Type |
|---|---|
| `result` | `RsvpResult` |

Restates accepted **and** declined events explicitly, with dates. Offers "Add all to
calendar" (`/api/ics`) and "Share with family" (Web Share API, `navigator.share`, falling
back to copy-link). Provides "Update my RSVP" returning to the form pre-filled.

Rendered from the **server response**, not from local draft state — the guest must see what
was actually stored.

---

### `<LanguageToggle>`

Segmented control labelled in both scripts (`EN` / `हिं`). `aria-label="Choose language"`;
each option `aria-pressed`. Changing locale re-renders content without navigation and
without losing `rsvpDraft`. Sets `<html lang>` and applies the `[lang="hi"]` leading
adjustment.

If `config.locales.length === 1`, render nothing.

---

### `<GeneratedPoster>`

| Prop | Type |
|---|---|
| `seed` | `string` (card slug) |
| `label` | `string` |
| `aspect` | `Aspect` |

Deterministic from `seed`: gradient pair index, motif index, rotation. Pure SVG, no network.
Must look designed, not like a fallback — half the Phase 0 tenants will have no photography.
Motif geometry is generated from parameters; do not trace or embed third-party artwork.

---

## Shared rules

- No component reads `window` during render. Anything viewport-dependent goes in an effect
  with an SSR-safe default.
- No component imports another tenant's config. Ever.
- Every interactive element has a visible focus ring — `outline` is never set to `none`
  without an equivalent replacement.
- Any string a guest can type is escaped on render. `name` and `message` reach the DOM as
  text nodes, never `dangerouslySetInnerHTML`.
