---
name: parallel
description: Split work so frontend and backend can be built at the same time without conflicts. Use when asked to parallelise, run work concurrently, split a feature between agents, or speed up delivery with multiple workstreams.
---

# Build front and back in parallel

Frontend and backend in this repo touch almost entirely separate directories. Fifty commits of
history show 64 changes under `components/` and `app/**/page.tsx`, 63 under `app/api/` and
`lib/db/`, and **the two sets barely intersect**. Parallel work is safe here — but only if the
three genuinely shared files are dealt with *first*.

## The three files everything collides on

| File | Why |
|---|---|
| `lib/schema.ts` | The Zod contract both sides read |
| `lib/db/repository.ts` + `memory-repository.ts` + `supabase-repository.ts` | One new method touches all three |
| `docs/NEXT.md`, `docs/PROGRESS.md` | Every task appends to them |

Everything else can be worked on simultaneously.

## Phase 1 — land the contract, alone, first

**One small commit on `main`, before any parallel work starts.** It contains only:

- the Zod schema for whatever is being exchanged, in `lib/schema.ts`
- the `Repository` interface method, **plus its implementation in all three drivers** — the memory
  one must actually work, because the frontend will develop against it
- the route file with its signature and a typed stub

Nothing else. This commit should be reviewable in a minute.

**The memory driver is the whole trick.** The frontend builds against `DATA_DRIVER=memory` with a
working fake while the backend builds the Supabase implementation, and neither waits.

## Phase 2 — fan out

Spawn one agent per stream, each with `isolation: "worktree"` so it gets its own checkout and
cannot touch the others' files.

```
Agent(subagent_type: "general-purpose", isolation: "worktree",
      description: "…", prompt: "…")
```

### Ownership, and it is strict

| Stream | Owns | Never touches |
|---|---|---|
| **Frontend** | `components/`, `app/**/page.tsx`, `app/**/layout.tsx`, `modules/*/Guest.tsx`, `modules/*/Editor.tsx`, `tests/component/` | `app/api/`, `lib/db/`, `supabase/` |
| **Backend** | `app/api/`, `lib/db/`, `lib/video/`, `lib/photos/`, `lib/admin/`, `supabase/migrations/`, `tests/unit/` | `components/`, any `page.tsx` |
| **Either, by prior agreement only** | `lib/schema.ts`, `modules/registry.ts` | — |

**Nobody edits `docs/NEXT.md` or `docs/PROGRESS.md`.** The integrator does that once, at merge.
Two agents appending to PROGRESS is a guaranteed conflict for no benefit.

### What each prompt must carry

A subagent starts cold. Give it:

- **The contract commit hash** — "build against the interface landed in `<sha>`"
- **Its ownership boundary**, verbatim from the table above
- **The gate**: `pnpm verify` green before it reports done
- **An explicit "do not"**: do not edit files outside your boundary; if you need something there,
  stop and say so rather than reaching across

## Phase 3 — integrate

Merge backend first, then frontend. Backend changes are usually additive behind the interface;
frontend changes assume it exists.

Then, on `main`:

```bash
pnpm verify && pnpm test:e2e
```

**The E2E suite is the integration test.** It is the only thing that exercises both halves
together, and it runs three Playwright projects including path mode. A parallel merge that passes
unit tests and fails E2E is the normal failure — that is the suite doing its job.

Only then update `NEXT.md` and `PROGRESS.md`, once, with both streams described.

## What not to parallelise

- **Anything touching one file.** Two agents in `CustomizerShell.tsx` is slower than one.
- **Exploratory or design work.** Parallelism needs a known interface; if the shape is still being
  decided, one agent in plan mode is faster.
- **Fewer than ~2 hours of work per stream.** A subagent re-derives context from cold; below that
  the setup costs more than it saves.
- **A migration plus code that depends on it.** Land the migration, confirm it applied, then fan out.

## Good pairs in the current backlog

| Frontend stream | Backend stream | Shared |
|---|---|---|
| **N-23** plan capacity in the console | **N-25** delivery metering | none |
| **N-26** branding-preset picker | **N-24** renewal and lapse lifecycle | `lib/schema.ts` — land first |
| **N-22** download UI | **N-22** export endpoint | the route signature — land first |

## The honest caveat

Two agents cost roughly twice the tokens of one, and each starts without the context this session
has. Parallelism buys **wall-clock time**, not efficiency. Use it when something is genuinely
blocking and the interface is genuinely settled — not by default.
