# CLAUDE.md — Mehfil

Project instructions for Claude Code. Read this file first, then `docs/13-agent-runbook.md`.

> **Context discipline — read this before opening any other document.**
> The full doc set is ~25k tokens. **Never load all of it.** `docs/13-agent-runbook.md §2`
> lists exactly which files each ticket needs (~1.5–5k tokens each). Load those and nothing
> else. Do not read the `.svg` wireframes into context — they are for humans, and
> `docs/03-wireframes.md` carries everything you need in text.
> After every ticket, append to `docs/PROGRESS.md` so the next session can cold-start in ~4k
> tokens instead of re-reading the codebase.

## What this is

**Mehfil** is a white-label **video streaming platform for wedding films**. An operator at a
wedding management company logs into an admin console, creates a catalogue for a wedding,
uploads the films, arranges sections in a customizer, and publishes a branded streaming site
the couple's guests browse like a streaming service.

One sentence: *the six to fifteen pieces of a wedding worth showing someone, presented as the
couple's own private prestige streaming service.*

**It is a keepsake, not an archive.** 6–15 items, 3–5 sections, two screens of scroll. The
full 40GB and the 2,000 photos stay wherever they live today. Two words decide every scoping
call: **flaunt** (would the couple send this to someone?) and **cherish** (would they open it
themselves a year later?). Anything serving neither is out, however standard it looks in a
real streaming app — which is why there is no search, no Trending, and no My List.

The incumbent is Drive links, WeTransfer expiries and pen drives. They are genuinely bad,
which is why this is an easier sell than the invite site it replaced (see
`reference/00-decision-log.md` D-8).

## Non-negotiable constraints

These are decisions already made. Do not relitigate them in code review or suggest
alternatives unless a spec explicitly opens the question.

0. **The customizer is the differentiator, not the streaming UI.** Anyone can copy poster
   rows. `docs/14-modules-and-customizer.md` is the doc that matters most; read it before
   any module or admin work.
1. **Build the streaming design at full fidelity.** Near-black
   surface, hot red accent, profile gate, poster rows, hero + scrim, episode framing,
   title-detail modal. All ten mechanics in `docs/04 §1b` are required; do not soften them.
   The *only* things we keep our own are the **name and the mark**: no `-flix` suffix
   anywhere (code, copy, package, domain, comment), our own wordmark rather than any
   company's logotype or N-mark, `--accent: #d11a2a` not `#E50914`, and no theme packs named
   for other products. That is where enforcement risk actually sits, and it costs the guest
   experience nothing. Full reasoning: `docs/12-compliance-and-risk.md §1`.
2. **Mobile-first.** ~90% of traffic arrives from a WhatsApp link on a mid-range Android
   phone. Design and test at 360×800 first; desktop is the enhancement.
3. **WhatsApp link preview must never break.** Open Graph tags are a P0 feature, not polish.
4. **White-label from day one.** Every colour, logo, name and string comes from tenant
   config. Zero hardcoded couple or planner data in components.
5. **Playback start time under 1.5s on 4G is a feature, not an optimisation.** Doc 05 §6.
6. **Never delete a couple's wedding video.** Lapsed subscription → renewal screen, 60-day
   grace, cold storage, explicit notice. Never a 404. Doc 01 §7.

## Phasing — build in this order

| Phase | Goal | Backend | Ship by |
|---|---|---|---|
| **Phase 0** | Demo: guest catalogue + player + admin + customizer | Supabase + Bunny | 3–4 weeks |
| **Phase 1** | Billing, subscription lifecycle, analytics, more modules | + Razorpay | +4 weeks |
| **Phase 2** | Org roles, remaining modules, other occasions | | later |

**The admin and customizer are in Phase 0.** A demo where Sandeep edits JSON demonstrates a
bespoke service — which is exactly what a planner can already buy elsewhere. If no planner
signs after Phase 0, Phase 1 never happens.

## Stack

- **Next.js 15** (App Router, TypeScript, strict mode)
- **Tailwind CSS v4** + CSS custom properties for tenant theming
- **Framer Motion** for row/modal transitions (respect `prefers-reduced-motion`)
- **Zod** for all config and form validation
- **Supabase** (Phase 1+) — Postgres, Row Level Security, storage for media
- **Vercel** — hosting, wildcard subdomains, ISR
- Package manager: **pnpm**

## Working agreements

- TypeScript strict. No `any`. Config objects are Zod-inferred types.
- Every component that renders tenant content takes data as props. No fetching inside
  presentational components.
- All user-visible strings go through the i18n dictionary (`lib/i18n.ts`) — English and
  Hindi at minimum. Never inline a display string in JSX.
- Accessibility is acceptance criteria, not a follow-up: keyboard-navigable rows, focus
  trap in modals, visible focus rings, 4.5:1 contrast on all text. See
  `docs/10-testing-and-acceptance.md`.
- Commit granularity: one ticket from `docs/09-implementation-plan.md` per commit.
- Before marking a ticket done, run the acceptance checklist for that ticket.

## Where things live

```
app/
  [catalogue]/          Guest routes (rewritten from subdomain by middleware)
    watch/[slug]/       Player — its own route, needs a fresh token
  admin/                Operator console (auth-gated)
  api/                  Route handlers
components/
  streaming/            Billboard, PosterRow, PosterCard, TitleModal, ProfileGate, Player
  admin/                UploadManager, CustomizerShell, PreviewPane, ModuleEditor
  chrome/               TopNav, Footer, LanguageToggle
modules/<type>/         schema · Guest · Editor · meta — see docs/14
  registry.ts           The ONLY place a module is wired in
lib/
  tenant.ts             Catalogue resolution
  video/provider.ts     Narrow interface over Bunny — no provider types leak out
  i18n.ts               Dictionary + t()
docs/ · wireframes/ · reference/ · archive/
```

## Definition of done for the whole Phase 0

A wedding planner is handed a phone, opens a catalogue, taps a film, and it **starts playing
in under a second and a half on 4G**. Then they watch their own logo and brand colour appear
on it, live, while someone drags a section into a different order and hits Publish.

If both of those land in the same meeting, the product works. Everything in these docs
exists to make those two moments true.
