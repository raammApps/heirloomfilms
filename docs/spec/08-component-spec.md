# 08 — Component Spec

Props are the contract. Guest components are presentational and receive data from the route.
Module components follow the `ModuleDefinition` interface in doc 14 §4.

```
app/[catalogue]/page.tsx
└── <CatalogueProvider catalogue profile locale>
    ├── <ProfileGate />                client, first visit
    ├── <TopNav />                     client (scroll state)
    ├── <ModuleRenderer modules={…} /> server — walks catalogue.modules in order
    │   ├── <BillboardModule />
    │   ├── <CuratedRowModule /> ─ <PosterRow> ─ <PosterCard>
    │   ├── <PhotoRowModule />
    │   ├── <LetterModule /> <PhotoGridModule />
    │   ├── <ContinueWatchingModule />  P1, client (profile state)
    │   └── … registry-driven, never a hardcoded list
    ├── <TitleModal />                 client, portal, URL-driven
    └── <SiteFooter />

app/[catalogue]/watch/[slug]/page.tsx
└── <Player />                         client, own route
```

---

### `<ModuleRenderer>`

| Prop | Type |
|---|---|
| `modules` | `ModuleInstance[]` |
| `catalogue` | `Catalogue` |

Sorts by `order`, filters `enabled`, looks each `type` up in the registry, renders `Guest`
with validated config. An unknown type renders nothing and logs server-side — a stale module
type must never crash a live wedding page.

**This component must contain no `switch` on module type.** If adding a module means editing
this file, doc 14's abstraction has leaked.

### `<ProfileGate>`

| Prop | Type |
|---|---|
| `catalogue` | `Catalogue` |
| `appName` | `string` |
| `onSelect` | `(profileId) => void` |

Full-viewport overlay, first visit only. `appName` renders as a large tracked-out wordmark
above the tiles, animating in over ~600ms with a scale settle before the tiles appear — that
beat is what sells the reference. Four fixed labels (Bride's side / Groom's side / Friends /
Family) as letter tiles with generated colours. Skippable; choice persists in `localStorage`.
`role="dialog"`, focus on heading, Esc skips.

Creates a `profile` server-side and stores the returned id locally. **Never accepts a
free-text personal name.**

### `<Billboard>`

| Prop | Type |
|---|---|
| `title` | `Title` |
| `useTrailer` | `boolean` |

Full-bleed. Muted, looping, autoplaying trailer with a poster still beneath it; the still
shows instantly and the video fades in only once it can play through. Falls back to the still
permanently under `prefers-reduced-motion`, `Save-Data`, or a connection slower than 3G.

Bottom-to-top scrim, then app name / title name in Archivo 800, one-line synopsis (clamped to
2 lines), then **▶ Play** (filled, accent) and **ⓘ More Info** (glass). Exactly two buttons.

Play navigates to `/watch/<slug>`. Never starts playback inline — a guest tapping Play in a
noisy room expects full screen.

### `<PosterRow>` / `<PosterCard>`

| Prop | Type |
|---|---|
| `title` | `string` (resolved) |
| `items` | `RowItem[]` |
| `aspect` | `'2:3' \| '16:9' \| '1:1'` |
| `showProgress` | `boolean` (P1) |

`overflow-x auto`, `scroll-snap-type: x mandatory`, cards `scroll-snap-align: start`,
`scroll-padding-inline-start` matching the grid margin. Rows break the right margin so the
next card peeks — that is the affordance, do not contain it.

Arrows only under `@media (hover:hover) and (pointer:fine)`, scrolling by
`floor(containerWidth / cardWidth) * cardWidth` — whole cards, never a fractional offset.
`role="list"`; cards focusable; ←/→ move focus and scroll it into view without trapping Tab.

**When `items.length <= 3` the row switches layout**: no arrows, no peeking card, no snap
scroll, left-aligned, card width stepped up so the row fills its measure. This is the common
case in a curated catalogue, not an edge case — three cards at library scale reads as a
loading error. Acceptance-tested.

Cards are `<button>`. Video cards show a duration badge, a category badge, and — when
`showProgress` (P1) — an accent progress bar across the bottom. **Poster quality carries
disproportionate weight here**: with eight cards on the page, one weak poster is 12% of the
experience. Hover lift 1.03 / 180ms on pointer
devices only (`:hover` sticks after tap on Android). First two cards of the first row eager,
everything else lazy with LQIP.

`items.length === 0` → render nothing. Never an empty row with a heading.

### `<TitleModal>`

Nine required behaviours, all reviewable:

1. Portal, `role="dialog"`, `aria-modal`, `aria-labelledby`.
2. Focus trap; focus returns to the originating card on close.
3. Esc and scrim click close; inside click does not.
4. Body scroll locked without layout shift.
5. `pushState('?title=<slug>')` on open; `popstate` closes. **Android back closes the modal,
   not the site.**
6. Cold load of `?title=…` opens it directly.
7. ←/→ move between siblings in the same row, using `replaceState` so back exits the modal
   rather than walking every card visited.
8. Content order: poster → title → duration · category · date → synopsis → **▶ Play** ·
   **↗ Share** → credits. Share is P0: `navigator.share` where available, falling back to
   copy-link plus a prefilled WhatsApp text. It is how the catalogue spreads.
9. **Prefetch the HLS manifest and first segment on open.** This is where the sub-1.5s
   playback target is actually won — by the time Play is pressed, the first segment is warm.

### `<Player>`

| Prop | Type |
|---|---|
| `titleSlug` | `string` |
| `profileId` | `string \| null` |

The component the product is judged on.

- Poster frame paints immediately; never a black flash between browse and playback.
- Fetch token → attach HLS → start at **480p** and step up. Never start at 1080p.
- Resume from `resumeAtS` with a "Resuming from 7:08 · Start over" affordance for 6 seconds.
- Controls: play/pause, ±10s, scrub with thumbnail preview (VTT sprite), volume, quality,
  speed, captions, PiP, fullscreen. All keyboard-mapped (`space`, `←/→`, `f`, `m`, `c`),
  all with visible focus, all ≥44px touch targets.
- Controls auto-hide after 3s of inactivity, reappear on any input; never auto-hide while a
  control has focus.
- Heartbeat `POST /api/progress` every 10s, on pause, and on unload via `sendBeacon`.
- **On 403, refresh the token silently and continue at the same second.** Never restart.
- Errors are honest and actionable: "This film is still processing" ≠ "Something went wrong".
- Back / Esc returns to browse at the prior scroll position with the modal closed.

Lazy-load the player chunk; prefetch it on title-modal open. It must not sit in the browse
route's initial bundle (150KB budget, doc 05 §6).

### `<LetterModule>` / `<PhotoGridModule>`

`Letter` — long-form, `body-lg`, generous measure (60–70ch), slow fade-in per paragraph on
scroll (disabled under reduced-motion), signature in display type. No chrome. The most
emotionally effective screen in the reference has no video in it; treat its typography with
the same care as the player's performance.

`PhotoGrid` — masonry, LQIP, lightbox with swipe and ←/→, lazy beyond the first 12, pinch-zoom
on touch.

---

# Admin components

### `<UploadDropzone>` / `<UploadManager>`

Global and persistent. **Navigating anywhere in the admin must not cancel an upload.**

- Drag-drop or pick; validates container and size before a byte moves.
- Per-file progress, aggregate progress, realistic time remaining.
- Offsets in IndexedDB → survives refresh, sleep, and network loss; resumes from last acked
  offset, not from zero.
- Parallelism 2; exponential backoff.
- Creates the `titles` row immediately at `uploading`, so a refresh shows the file.
- Explicit pause/resume/cancel per file. Cancel asks for confirmation.

### `<CustomizerShell>`

Two panes; see doc 14 §5 for the layout.

| Prop | Type |
|---|---|
| `catalogue` | `Catalogue` |
| `modules` | `ModuleInstance[]` |
| `onChange` | `(modules) => void` |

- Drag reorder **and** keyboard reorder (`↑/↓` with a grab affordance) — mouse-only is both
  an a11y failure and a trackpad annoyance.
- Eye toggles `enabled` without discarding config.
- Gear opens that module's `Editor` in a side sheet.
- Autosave to `draft_modules`, debounced 800ms, with a visible "Saved" state.
- Undo stack of 20.
- `Publish` is separate and explicit, and shows a diff summary of what will change.

### `<PreviewPane>`

Renders **the real guest component tree** against draft modules — not a mock. A second
implementation will drift and an operator will publish something they never saw. Mobile
frame is the default; desktop is a toggle. Updates debounced ~300ms.

### `<ModuleEditor>`

Generated from the module's Zod schema wherever possible: string, localised string, number,
boolean, enum, media-ref (opens a picker), array of sub-objects. Hand-written editors only
where config is genuinely spatial, like `timeline`.

### `<ThemePicker>`

Five curated accent presets plus a custom picker. Contrast against `--surface-0` validated
**at pick time in the UI**, with a live inline warning — not as a build failure the operator
never sees. Surface stays near-black in every theme; that is not configurable.

---

## Shared rules

- No component reads `window` during render.
- No component queries across catalogues. Ever.
- Every interactive element has a visible focus ring.
- Any operator- or guest-supplied string renders as a text node — never
  `dangerouslySetInnerHTML`, including in `letter`.
- Adding a module changes nothing outside `modules/<type>/` plus one registry line.
