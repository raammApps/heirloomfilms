# Why `check:dead` exists, and what it deliberately keeps

`pnpm check:dead` fails the build on code nothing imports. It runs inside `pnpm verify`, so dead
code is caught before review rather than accumulating.

It earns that place only if it stays quiet. A report that always lists a dozen known-fine items
is a report people stop reading, so everything below is either removed or explained here.

## Found and removed

- `framer-motion` — a dependency with **zero imports** anywhere in the codebase.
- `pluralise`, `CURATION_TITLE_WARNING`, `DEMO_IDS`, `rootDomainHost`, `isProduction`, `isTest` —
  helpers nothing called.
- `revalidateCatalogueById` — written during the caching work and then never wired up.

It also surfaced something that was not dead code at all: `MAX_PHOTOS` existed as a constant and
**nothing checked it**, so the photograph cap doc 01 §4 calls "a real cap" stopped nothing. That
is now enforced in the upload route.

## Kept on purpose

**Provider setters** — `setRepository`, `setAuthProvider`, `setPhotoProvider`. The fourth,
`setVideoProvider`, is used across three test files; these are the same seam for the other
drivers. Removing them would leave an asymmetric set where a test author has to discover which
providers happen to be injectable.

**`BROWSE_LCP_MS` and `CLS`** — the budgets doc 05 §1 sets, sitting beside `PLAYBACK_START_MS`,
which is used. They are what N-5's Lighthouse gate will assert. Deleting them would mean
retyping the spec's numbers from memory later.

**Exported types** (`Occasion`, `OrgKind`, `PartnerRegistration`, …) — the public surface of a
schema module. `z.infer` types belong next to the schema that produces them whether or not
another file has needed one yet.
