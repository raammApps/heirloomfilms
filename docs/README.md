# Engineering documentation

Two trees, and the split is deliberate:

| | What it is | Who changes it |
|---|---|---|
| **`project-doc-directory/`** | The **specification**: what the product should be. Numbered docs 01–15, plus `PROGRESS.md` (what was built) and `NEXT.md` (what is left, in order). | Changes when the product decision changes |
| **`docs/`** *(here)* | How the thing that exists actually works and how to run it | Changes when the code changes |

If they ever disagree, `project-doc-directory/` says what was intended and `docs/` says what is
true. Both are worth knowing; only one of them is running in production.

## In this directory

| | |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | How the system fits together, with diagrams. **Start here.** |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Accounts, environment variables, DNS, and the settings that fail silently when wrong |
| [`../knip.md`](../knip.md) | What the dead-code gate keeps on purpose, and why |
| [`../CLAUDE.md`](../CLAUDE.md) | The rules that keep the codebase coherent, and which are enforced by a test rather than by memory |
