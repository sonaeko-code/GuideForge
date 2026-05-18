# Claude Code Instructions — GuideForge / Sonaeko Platform

## 1. Project Context

This repo is currently **GuideForge**.

GuideForge is moving toward a future `sonaeko-platform` monorepo with multiple apps and
shared packages. **No files have moved yet.** All code remains in its current location.

The target direction is:

```
sonaeko-platform/
├─ apps/
│  ├─ guideforge/        ← this repo, eventually
│  ├─ techsperts/        ← separate repo today (../Techsperts)
│  └─ questline/         ← future / optional
├─ packages/
│  ├─ core/
│  ├─ ai/
│  ├─ governance/
│  ├─ domain-templates/
│  ├─ shared-types/
│  └─ design-system/     ← deferred
└─ docs/
```

**GuideForge and Techsperts should share a core engine. They should not become one website.**

- GuideForge remains the structured knowledge builder.
- Techsperts remains the tech repair / support product.
- QuestLine is a future / potential gaming guide network powered by GuideForge.

---

## 2. Current Migration Status

The migration is in the **pre-migration cleanup** phase. No apps have been moved yet.

Planning docs to read before any migration-related changes:

- `docs/PLATFORM_MONOREPO_PLAN.md` — target workspace structure and package responsibilities
- `docs/GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping
- `docs/SHARED_ENGINE_VOCABULARY_MAP.md` — neutral-to-product terminology reference
- `docs/MONOREPO_MIGRATION_CHECKLIST.md` — current phase and open tasks
- `docs/AI_ASSISTANT_MONOREPO_PROTOCOL.md` — assistant operating rules for the future monorepo
- `docs/GUIDEFORGE_TECHSPERTS_REPO_AUDIT.md` — side-by-side repo comparison (audit findings)
- `docs/MONOREPO_MIGRATION_DECISIONS.md` — resolved decisions about the monorepo approach

---

## 3. Important Current Decisions

These decisions are final for the initial migration. Do not re-litigate them without the
user's explicit instruction:

- The future monorepo starts as a **mixed-framework** workspace.
- GuideForge stays **Next.js 16 / React 19** during and after the initial move.
- Techsperts stays **Vite / React Router / React 18.3.1** during the initial move.
- Do **not** convert Techsperts to Next.js during the shell migration — that is a separate
  future project.
- Early shared packages must be **framework-neutral** — no React imports in
  `packages/shared-types`, `packages/domain-templates`, `packages/core`, or the type layers
  of `packages/ai` and `packages/governance`.
- Do **not** create shared React UI packages until both apps are stable in the monorepo.
- Use **pnpm workspaces** as the package manager.
- Do **not** use Turborepo in the initial monorepo shell unless explicitly approved.
- Old repos stay as backups until the monorepo is stable and deployed for 30+ days.

---

## 4. Safe Read-Only Inspection

During audit, planning, and migration preparation tasks, Claude may run read-only
inspection commands on both repos **without asking every time**.

Allowed inspection targets:

- `C:\Users\sonaeko\Documents\GitHub\GuideForge`
- `C:\Users\sonaeko\Documents\GitHub\Techsperts`

Allowed read-only commands:

```
ls / dir / find
grep / rg
cat / type / head / tail
git status --short
git branch --show-current
git diff --name-only
git log --oneline
```

**Never print secret values.** Do not read or print `.env`, `.env.local`, or any secrets
file. If env files exist, only report that they exist. Use env variable names only.

---

## 5. Techsperts Access Rule

Techsperts may be inspected for migration planning purposes.

**Do not edit Techsperts source code** unless the prompt explicitly says to edit Techsperts.

**Do not move Techsperts files** unless the prompt explicitly says to perform the monorepo
move.

---

## 6. Bash / Command Rules

### Allowed automatically (no approval needed)

- `ls`, `dir`, `find` — file listing and discovery
- `grep`, `rg` — content search
- `cat`, `head`, `tail`, `type` — file reading
- `git status --short`, `git branch --show-current`, `git diff --name-only`, `git log --oneline` — read-only git inspection

### Requires explicit user approval before running

- `pnpm install` / `npm install` — package installation
- `npx` — any npx command
- `pnpm run build` / `npm run build` / `next build` / `vite build` — builds
- `pnpm run test` / `npm test` — test suites
- `git push` — remote pushes
- `git commit` — commits (always confirm message with user first)
- Any deploy commands
- `rm` / `del` / file deletion commands
- Supabase SQL or database commands
- `curl`, `wget`, or any outbound network fetch

---

## 7. GuideForge Rules

When working in GuideForge:

- Preserve the **structured knowledge builder** direction: networks, hubs, collections,
  guides, checklists, SOPs, troubleshooting flows.
- Preserve **Forge Rules / Forged / Starter Build Queue** product language.
- Do **not** auto-create guides, auto-generate, or auto-save without user review.
- Do **not** auto-publish. Everything is **review-first**.
- Do **not** expose private drafts on public surfaces.
- Keep generation **proposal-only** — the user confirms before anything is saved.
- TypeScript must stay at **0 errors**. Run `npx tsc --noEmit` after any code change.
- Do **not** add features, refactors, or abstractions beyond the specific task.
- Do **not** mark flows as passing unless the user actually tested them.

Key docs for GuideForge code work:

- `docs/GUIDEFORGE_AI_BUILDER_CORE.md` — before touching AI generation
- `docs/GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md` — current product snapshot
- `docs/GUIDEFORGE_PRODUCT_ROADMAP.md` — before adding features or changing direction
- `docs/GUIDEFORGE_TEST_FINDINGS.md` — before claiming any flow passes

---

## 8. Techsperts Rules

When working with Techsperts (only when explicitly instructed):

- Preserve **diagnosis-first UX**: symptom → likely cause → fix → verify → escalate.
- Preserve **Guided Fix**, live support, and on-site visit paths.
- Preserve **Verified / provisional AI solution** language.
- Preserve **safety-first repair guidance** — battery, electrical, water, data-loss warnings
  are non-skippable.
- Do **not** weaken verification or governance patterns.
- Do **not** import GuideForge UI components or product language into Techsperts.

---

## 9. Shared Core Rules

Shared core concepts should eventually include (in extraction order):

1. `docs/` — cross-product architecture and vocabulary docs
2. `packages/shared-types` — neutral TypeScript types (no React)
3. `packages/domain-templates` — domain scaffold shapes: tech repair, gaming, SOP, home, creator
4. `packages/core` — neutral lifecycle constants and vocabulary helpers
5. `packages/ai` — AI contract types and generation schemas (framework-neutral types first)
6. `packages/governance` — neutral status constants, role capability interface, lifecycle types
7. `packages/ai` provider routing — cost-control hooks and mock helpers
8. `packages/design-system` — neutral tokens and status badge primitives **last**

Do **not** extract runtime database clients early. Do **not** extract app UI pages, routing,
or auth flows. Each extraction is its own dedicated bundle with typecheck + build verification.

---

## 10. No Guessing Rule

Before changing any shared, migration-sensitive, or cross-product code:

1. Inspect both app usages — grep for the symbol in both repos.
2. Identify all affected files.
3. Report expected impact to the user.
4. Make the smallest safe change.
5. Do **not** invent missing architecture or assume what the other app does.
6. Do **not** mark untested flows as passing.

---

## 11. Current Next Migration Tasks

Before creating the monorepo shell (Phase 3), all five of these must be completed in
dedicated bundles — do not combine them:

1. **Techsperts Supabase env cleanup** — replace hardcoded credentials in
   `utils/supabase/info.tsx` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
2. **GuideForge root scratch-file cleanup** — audit/remove the 6 loose `.tsx` files and
   ~35 loose `.md` files at the GuideForge repo root
3. **package.json name cleanup** — rename `my-project` → `guideforge` (GuideForge),
   `@figma/my-make-file` → `techsperts` (Techsperts)
4. **Techsperts `utils/` reorganization** — move `utils/` folder from repo root into `src/`
5. **Both repos committed/pushed** to clean `main` before shell creation

Do not start Phase 3 until all five are done. See `docs/MONOREPO_MIGRATION_CHECKLIST.md`.

---

## 12. Reporting Requirement

At the end of every migration-related task, report:

1. Files inspected
2. Files created
3. Files changed
4. Whether GuideForge source changed
5. Whether Techsperts source changed
6. Whether any behavior changed
7. Whether any files moved
8. Whether any packages were installed
9. Whether any secrets were avoided
10. Recommended next step

---

## Tech Stack Reference

### GuideForge

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4 — App Router |
| React | 19 |
| TypeScript | 5.7.3 |
| Package manager | pnpm |
| CSS | Tailwind v4 (postcss plugin) |
| Database | Supabase (postgres + RLS) |
| AI | OpenAI via server-side Next.js API routes |
| Components | Radix UI + shadcn-style primitives |
| Deployment | Vercel |

### Techsperts (reference only)

| Layer | Technology |
|-------|-----------|
| Framework | **Vite 6.3.5 SPA** — NOT Next.js |
| Routing | React Router DOM v7 |
| React | 18.3.1 |
| Package manager | pnpm |
| CSS | Tailwind v4 (vite plugin) |
| Database | Supabase (separate project) |
| AI | OpenAI via Supabase edge functions (Deno runtime) |
| Deployment | Vercel (SPA rewrite rule) |

---

## Continuation Prompt

Copy and paste this when opening a new session on this project:

```
I am continuing work on GuideForge / sonaeko-platform migration.

Read CLAUDE.md first, then:
- docs/GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md (product snapshot)
- docs/MONOREPO_MIGRATION_CHECKLIST.md (current migration phase)

Current status:
- GuideForge is in Step 6: manual testing and quality tuning.
- TypeScript is clean at 0 errors.
- Platform migration planning docs are complete (Phase 1 done).
- Repo audit is complete (Phase 2 done).
- Working on pre-migration cleanup tasks before Phase 3 (monorepo shell).

Do not start new features until priority retests are done.
Do not start Phase 3 until all five pre-migration cleanup tasks are confirmed.
```
