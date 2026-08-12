# 03 — Wireframes

Low-fidelity and annotated: **structure, hierarchy and behaviour**, not visual design.
Colour and type come from `04-design-system.md`. Where a wireframe and a spec disagree, the
spec wins.

Open `wireframes/index.html` to browse them all. Do not read the SVGs into an agent's
context — this document carries everything needed in text.

| File | Screen | Breakpoint |
|---|---|---|
| `01-profile-gate-mobile.svg` | Profile gate | 360×800 |
| `02-browse-mobile.svg` | Browse — billboard + rows | 360×800 |
| `03-title-modal-mobile.svg` | Title detail modal | 360×800 |
| `04-player.svg` | Player, `/watch/<slug>` | — |
| `05-browse-desktop.svg` | Browse — desktop | 1440×900 |
| `06-admin-titles.svg` | Admin — titles & upload | 1440×900 |
| `07-customizer.svg` | **Customizer** — the differentiator | 1440×900 |
| `08-whitelabel-swap.svg` | Two partners, one build | 1440×900 |

## Layout grid

| Breakpoint | Width | Columns | Gutter | Margin |
|---|---|---|---|---|
| `base` | 360–639 | 4 | 16px | 16px |
| `sm` | 640–767 | 6 | 20px | 24px |
| `md` | 768–1023 | 8 | 24px | 32px |
| `lg` | 1024–1439 | 12 | 24px | 48px |
| `xl` | ≥1440 | 12 | 32px | max-width 1360, centred |

Rows **break the right margin at every breakpoint** so the next card peeks. That is the
scroll affordance. Do not contain rows inside the grid margin.

## Card sizing

| Card type | Aspect | Mobile | Desktop |
|---|---|---|---|
| Film poster | 2:3 | 132px | 200px |
| Story / episode | 16:9 | 240px | 300px |
| Photo | 4:3 | 200px | 260px |
| Person | 1:1 | 108px | 140px |

Mixed aspect ratios per row are deliberate — they read as curation rather than a template,
and let a guest identify a row type while scrolling fast.

## Screen notes

### 01 — Profile gate
`catalogue.app_name` as a large tracked-out wordmark, animating in over ~600ms with a scale
settle before the tiles appear. Four **fixed** labels as letter tiles; never a free-text
personal name (doc 06 §5). Skippable, remembered. If it costs conversion in Phase 1 data,
make Continue Watching device-scoped and drop it.

### 02 — Browse
Billboard poster paints instantly; the muted trailer fades in only once it can play through.
Exactly two buttons. Rows are **curated** — hand-picked titles with operator-written headings,
registry-driven (doc 14); this page contains no `switch` on module type. The whole catalogue
is 6–15 items over ~2 screens of scroll. **A row with 2–3 cards is a designed state**: no
arrows, no peeking card, left-aligned, cards sized up. There is no Trending, no New, no
search — see doc 01 §4.

### 03 — Title modal
Order: poster → title → duration/category/date → Play + Share → synopsis → credits. **Share is P0** — it is the flaunt mechanic.
**Prefetch the HLS manifest and first segment on open** — this is where the sub-1.5s target
is won. Android back closes the modal. `?title=` deep-links. ←/→ between siblings uses
`replaceState` so back exits rather than walking every card visited.

### 04 — Player
Start the ladder at 480p and step up. Resume affordance for 6 seconds. Controls auto-hide
after 3s but never while focused; all ≥44px and keyboard-mapped. On a 403 mid-playback,
refresh the token silently and continue at the same second — never restart.

### 05 — Browse desktop
Enhancement layer. Arrows only on hover-capable pointers, scrolling by whole cards.

### 06 — Admin, titles & upload
The `titles` row is created at `uploading` the instant upload starts, so a refresh shows the
file. Uploads continue while the operator navigates anywhere in the admin. A failed transcode
states the provider's actual reason and offers retry. Processing and failed titles are
visible to the operator and hidden from guests.

### 07 — Customizer
The differentiator; full spec in doc 14 §5. Drag **and** keyboard reorder. Eye toggles
visibility without discarding config. Contrast validated at pick time in the UI. Preview
renders the real guest component tree, mobile by default. Autosave to `draft_modules`;
Publish is separate and explicit.

### 08 — White-label
Same build, same components. Only the catalogue row differs — partner name, logo, accent,
and **the module list**. Near-black surface is constant across partners.

## Not wireframed

- **`/renew`, passcode gate** — single-purpose screens the specs describe adequately.
- **Analytics (P1)** — its shape depends on what the first planner asks for.
- **Marketing site** — Phase 0 sells in person, from a phone.
