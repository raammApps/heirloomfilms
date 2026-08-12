# 13 — Agent Runbook (context & session management)

How to execute this documentation set with a coding agent **without exhausting a context
window or a usage session**. Read this before starting; it is the operating manual for the
other twelve documents.

## 1. The problem this solves

The full documentation set is ~24,000 words ≈ **32,000 tokens**. Loading all of it, then a
growing codebase, then a conversation, is how an agent session dies two-thirds of the way
through a ticket and leaves the repo in a half-edited state.

**The rule: never load the whole doc set. Load CLAUDE.md plus the two or three documents that
specific ticket names, and nothing else.** Each ticket below lists exactly what to read. The
tickets were sized so that no single one needs more than ~8,000 tokens of documentation.

## 2. Per-ticket reading map

| Ticket | Read exactly these | Docs tokens |
|---|---|---|
| P0-01 Scaffold | CLAUDE.md, 09 Track A | ~1.5k |
| P0-02 Tokens | CLAUDE.md, 04 §1b–4 | ~2.5k |
| P0-03 Schema/RLS | 06, 14 §6 | ~4k |
| P0-04 Operator auth | 06 §4, 05 §5 | ~2k |
| P0-05 Middleware | 05 §5, 02 §1 | ~2.5k |
| P0-06 i18n | 05, 08 shared rules | ~1.5k |
| **P0-07/08 Video provider + upload** | **05 §2–3, 07 admin uploads** | ~4k |
| P0-09 Webhook | 07 webhooks, 06 §1 | ~2k |
| P0-10 Posters | 04 §6, 06 §1 | ~1.5k |
| P0-11/12 Token + player | 05 §4 §6, 07 guest, 08 `<Player>` | ~5k |
| P0-13 Module registry | **14 §3–4**, 08 `<ModuleRenderer>` | ~4k |
| P0-14 Billboard | 08 `<Billboard>`, 04 §1b | ~2k |
| P0-15 Rows | 08 `<PosterRow>`, 03 card sizing | ~2.5k |
| P0-16 Title modal | 08 `<TitleModal>`, 02 §4 | ~2.5k |
| P0-17 Profiles + computed rows | 06 §3 §5, 08 `<ProfileGate>` | ~3k |
| P0-18 Progress | 07 `/api/progress`, 06 §1 | ~2k |
| P0-19 Letter + photo grid | 14 §3, 08 module components | ~2k |
| P0-20/21 Admin catalogue + titles | 02 §3, 07 admin, 08 `<UploadManager>` | ~5k |
| **P0-22–26 Customizer** | **14 §5 §7, 08 admin components** | ~5k |
| P0-27 OG | 07 `/api/og`, 05 | ~1.5k |
| P0-28 Privacy | 05 §4, 12 §2 | ~2.5k |
| P0-29 Demo catalogue | 01 §5, 14 §1 | ~3k |
| P0-30 Deploy | 05 §6 §9, 09 exit criteria | ~2.5k |
| P1-* | The named doc section only | ~3–6k |
| Any review pass | 10 §5, 12 §1 | ~2k |

**Never read `archive/`.** It is superseded invite-site work kept for reference only.
**Never read `reference/reference-reel.mp4`.** Look at `reference/frames/*.jpg` yourself if
you need the visual; doc 14 §1 describes them in text.

Wireframes are SVG — **do not read them into context.** Open them in a browser yourself. The
text in `03-wireframes.md` carries everything an agent needs.

## 3. Ready-to-paste ticket prompt

Use this verbatim, substituting the ticket ID. One ticket per session where possible.

```
Read CLAUDE.md and the files listed for <TICKET-ID> in docs/13-agent-runbook.md §2.
Do not read any other documentation.

Implement <TICKET-ID> from docs/09-implementation-plan.md. Only that ticket.

When its acceptance criteria are met:
1. Run: pnpm lint && pnpm exec tsc --noEmit && pnpm test
2. Commit with message: "<TICKET-ID>: <short description>"
3. Append a 3-line entry to docs/PROGRESS.md: what you built, files touched, anything
   that surprised you or that the next ticket needs to know.
4. Stop. Do not start the next ticket.
```

## 4. `docs/PROGRESS.md` — the handoff file

Create it at the start and append after every ticket. This is what lets a fresh session pick
up without re-reading the codebase, and it is the single highest-leverage habit for long
multi-session builds.

```markdown
## P0-04 · Tenant schema  — done 2026-08-15
Built: lib/schema.ts with all 6 invariants, lib/tenant.ts loader, 11 unit tests.
Files: lib/schema.ts, lib/tenant.ts, tenants/demo.json (stub), tests/schema.test.ts
Note: invariant 4 (locale fallback) needed a recursive walk of the config tree —
see walkLocalised() in schema.ts, reuse it in P0-06 rather than rewriting.
```

Starting a new session: read `CLAUDE.md`, then `PROGRESS.md`, then the next ticket's files.
That is a ~4k-token cold start regardless of how large the project has grown.

## 5. Budget discipline during a ticket

| Habit | Why |
|---|---|
| Never `cat` a whole file over ~300 lines — grep for the symbol | File dumps are the largest avoidable context cost |
| Never re-read a file you just edited to "verify" — the edit tool already errored if it failed | Pure waste |
| Delegate broad searches to a sub-agent and keep only the conclusion | Keeps file contents out of the main thread |
| Don't paste test output into the conversation on success — just the pass/fail line | Test logs are enormous |
| If a ticket is over halfway through the context, commit what works and start fresh | A clean handoff beats a truncated one |

## 6. If a session ends mid-ticket

1. Do **not** start the next session by asking the agent to "continue" — it has no memory.
2. Run `git status` and `git diff` yourself to see what's uncommitted.
3. Start the new session with: *"Read CLAUDE.md and PROGRESS.md. `git diff` shows partial
   work on `<TICKET-ID>`. Read the files listed for it in docs/13 §2, review the diff, and
   finish the ticket."*
4. Commit before doing anything else once it is green.

## 7. Ticket sizing note

Every Phase 0 ticket is scoped to 2–7 hours of human-equivalent work, which is roughly one
comfortable agent session with room for iteration. The tickets most likely to sprawl are
**P0-08 (resumable upload)**, **P0-12 (player)** and **P0-22 (customizer)** — all three have
a lot of edge cases. Split at a natural seam, add the split to `09-implementation-plan.md`,
and commit the first half. A committed half-feature beats an uncommitted whole one.

## 8. What not to delegate to the agent

- **The demo catalogue (P0-29)** — content and copy. It is the sales artefact; a planner
  judges the product on whether the films and titles feel real. Source real, cleared footage.
- **Playback QoE verification.** An agent cannot measure start time on real 4G at a venue.
  Doc 10 §3 is yours, on a phone.
- **The pricing conversation** and anything in doc 11 §5.
- **The employment IP check** in doc 12 §5.
- **Choosing what a couple's letter says.** Obvious, but worth writing down.
