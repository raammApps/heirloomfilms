# Documentation

Everything written about this project, in one tree.

## Start here

| | |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How the system fits together, with diagrams. The best single entry point. |
| [`PROGRESS.md`](./PROGRESS.md) | What has been built, and why it was built that way |
| [`NEXT.md`](./NEXT.md) | What is left, in the order to take it up |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Accounts, environment variables, DNS, and the settings that fail silently when wrong |

## The rest

| | |
|---|---|
| [`spec/`](./spec/) | The original specification, docs 01–15. **What the product is meant to be**, written before the code existed. |
| [`reference/`](./reference/) | The decision log, the business case, and the reference reel the design is measured against |
| [`wireframes/`](./wireframes/) | SVG wireframes. `spec/03-wireframes.md` carries the same content as text — read that instead; the SVGs are for humans. |
| [`archive/`](./archive/) | Superseded invite-site work. Kept for provenance, never a source of truth. |

## Spec versus reality

`spec/` says what was **intended**. Everything above it says what is **true**. They diverge in
places, and where they do, the divergence is argued rather than silent — `CLAUDE.md` lists the
deliberate deviations, and `PROGRESS.md` records what changed and why.

Only one of them is running in production.
