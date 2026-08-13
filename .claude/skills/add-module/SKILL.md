---
name: add-module
description: Add a new module type to the guest catalogue (billboard, row, letter, timeline, checklist and so on). Use when asked to add a section, module, or new kind of content block to a wedding page.
---

# Add a module

Doc 14 §7's promise: **one folder plus one registry line.** `tests/unit/registry.test.ts` fails the
build if anything else names the type.

## The folder

`modules/<name>/`

| File | |
|---|---|
| `schema.ts` | Zod config schema. Every field `.default()`ed — configs come off a jsonb column. |
| `Guest.tsx` | What a guest sees. Server component unless it needs state. |
| `Editor.tsx` | The inspector form. Uses `components/admin/fields`. |
| `index.ts` | `defineModule({ meta, schema, Guest, Editor, defaults, consumes?, advise? })` |

## meta, in full

```ts
meta: {
  type: 'thing',            // matches the registry key — the test asserts this
  label: 'Thing',           // shown in "add section"
  description: '…',
  icon: 'LucideIconName',
  occasions: ['wedding', …],
  phase: 0 | 1 | 2,
  content: 'video' | 'photo' | 'text',
  shape: 'hero' | 'row' | 'grid' | 'prose',   // for the wizard's template thumbnails
  singleton?: true,         // only if two instances would fight
}
```

`content` and `shape` exist so surfaces outside `modules/` can reason about a section **without
naming its type**. If you find yourself wanting a `switch` on type anywhere else, add a meta field
instead.

## The rules that are enforced

- **Register lazily:** `Editor: dynamic(() => import('./Editor'))`. The registry is imported by the
  guest page, so a static Editor import ships the admin's forms to every guest on a phone. This
  was real — `check:bundle` caught it.
- **Empty disappears.** Doc 14 §3: a module with nothing to show renders `null`, never a heading
  over a blank strip. `advise` should say so, so the operator knows it is invisible.
- **Never assume another module exists.**
- **No `dangerouslySetInnerHTML`** on tenant or guest strings — eslint blocks it.
- **Every English i18n key needs a Hindi entry** — `tests/unit/i18n.test.ts` blocks it. Prefer
  operator-authored strings over new keys.

## Register it

One line in `modules/registry.ts`, plus its import. Nothing else in the codebase changes.

## Test it

Add to `tests/unit/phase-1-modules.test.ts` (or the equivalent): defaults parse, meta is complete,
and the empty state is declared. Then `pnpm verify` and `pnpm check:bundle` — the bundle budget is
tight and a careless import will break it.
