# Monorepo Migration Checklist

> Step-by-step checklist for moving GuideForge and Techsperts into a shared platform monorepo.
> **Do not begin any phase here until the previous phase is complete and verified.**
> Each phase should be its own deliberate session, not part of a feature build.
>
> Pair with `PLATFORM_MONOREPO_PLAN.md` (architecture plan),
> `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` (shared concepts),
> and `AI_ASSISTANT_MONOREPO_PROTOCOL.md` (assistant rules).

---

## Phase 0 — Preconditions

Before any migration work begins, confirm all of the following:

- [ ] GuideForge repo committed and pushed to remote with a clean working tree
- [ ] Techsperts repo committed and pushed to remote with a clean working tree
- [ ] Both apps have known working deployment URLs confirmed manually
- [ ] Current env vars documented privately outside the repos (not committed)
- [ ] Old GuideForge repo retained as backup — do not delete
- [ ] Old Techsperts repo retained as backup — do not delete
- [ ] New repo / folder name chosen and agreed: `sonaeko-platform`
- [ ] Both app owners (same person for now) have approved starting the migration

---

## Phase 1 — Documentation / Architecture

This phase is complete when all five planning docs exist and have been reviewed.

- [x] Platform monorepo plan created (`PLATFORM_MONOREPO_PLAN.md`)
- [x] Shared core doc created (`GUIDEFORGE_TECHSPERTS_SHARED_CORE.md`)
- [x] Vocabulary map created (`SHARED_ENGINE_VOCABULARY_MAP.md`)
- [x] Migration checklist created (this file)
- [x] AI assistant protocol created (`AI_ASSISTANT_MONOREPO_PROTOCOL.md`)
- [ ] Planning docs reviewed and approved by the product owner
- [x] Pointers to planning docs added to existing GuideForge docs (CURRENT_BUILD_OVERVIEW, AI_BUILDER_CORE, OVERNIGHT_HANDOFF updated)

---

## Phase 2 — Repo Audit

Audit both repos side by side before touching any files. This phase produces a written
audit summary — not just a mental check.

**Audit doc:** `GUIDEFORGE_TECHSPERTS_REPO_AUDIT.md` — created 2026-05-18.

**Critical finding from audit:** Techsperts is NOT a Next.js app. It is a Vite SPA with
react-router-dom v7. This is the most significant migration risk. Framework alignment
must be resolved before moving apps. See Open Questions in the audit doc.

### GuideForge audit
- [x] Document top-level folder structure
- [x] Identify Next.js version and app router vs pages router (Next.js 16.2.4, App Router)
- [x] Identify package manager and lockfile (pnpm, pnpm-lock.yaml)
- [x] List all env vars required (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY, AI_COST_CAP_EXCEEDED)
- [x] Identify Supabase client files and configuration
- [x] Identify AI integration files (provider routing, prompt builders, generation routes)
- [x] Identify governance / review lifecycle files
- [x] Identify domain-template files
- [x] Identify guide generation profile files
- [x] List all docs in the `docs/` folder (50+ docs documented)
- [x] Note any config files at project root (next.config.mjs, tsconfig.json, pnpm-lock.yaml)

### Techsperts audit
- [x] Document top-level folder structure
- [x] Identify framework — **Vite 6.3.5 + react-router-dom 7 (NOT Next.js)**
- [x] Identify package manager and lockfile (pnpm, pnpm-lock.yaml)
- [x] List all env vars required (VITE_SUPABASE_URL; OPENAI_API_KEY in Deno edge function; hardcoded credentials in utils/supabase/info.tsx)
- [x] Identify Supabase client files and configuration
- [x] Identify AI integration files (edge function, generateProvisionalGuide, decisionEngine)
- [x] Identify governance / review lifecycle files (roleAuthority, roleCapabilities, provisionalStore)
- [x] Identify domain-template files (partial — inferDeviceType fragment)
- [x] List all docs in the `docs/` folder (2 docs)
- [x] Note any config files at project root (vite.config.ts, vercel.json, postcss.config.mjs, pnpm-lock.yaml)

### Cross-app comparison
- [x] Compare frameworks — **MISMATCH: Next.js vs Vite SPA** — open question #1
- [x] Compare package managers — ✅ Both pnpm
- [x] Compare React versions — **MISMATCH: 19 vs 18.3.1** — open question #2
- [x] Identify shared concept duplicates (types, governance, AI provisional pattern — documented)
- [x] Identify version conflicts (Radix UI minor versions differ; Supabase minor versions differ)
- [x] List packages that will need hoisting (Radix UI, Tailwind, clsx, tailwind-merge, sonner, uuid after version alignment)

### Pre-migration tasks surfaced by audit (must be resolved before Phase 3)
- [x] Answer Open Question #1: framework alignment decision → **mixed-framework monorepo** (Decision 1)
- [x] Answer Open Question #2: React version alignment decision → **no forced alignment during initial move** (Decision 2)
- [x] Replace Techsperts `utils/supabase/info.tsx` hardcoded credentials with proper env vars (Decision 4 — completed 2026-05-18)
- [x] Reorganize Techsperts `utils/` folder (currently at repo root outside `src/`) (Decision 9 Task 4 — completed 2026-05-18, moved to src/utils/)
- [x] Audit and clean GuideForge root loose scratch `.md` and `.tsx` files (Decision 9 Task 2 — completed 2026-05-18)
- [x] Rename `package.json` names: `my-project` → `guideforge`, `@figma/my-make-file` → `techsperts` (Decision 9 Task 3 — completed 2026-05-18)

### Migration decisions
- [x] Framework strategy decided: mixed-framework monorepo first (GuideForge: Next.js; Techsperts: Vite)
- [x] React alignment strategy decided: no forced alignment during initial move; shared packages must be framework-neutral
- [x] Package manager strategy decided: pnpm workspaces; no Turborepo in initial shell
- [x] Old repo backup strategy decided: keep old repos; archive only after 30-day stable window
- [x] Initial extraction strategy decided: docs → types → templates → core → AI contracts → governance → design-system
- [x] Deployment strategy decided: each app keeps its own Vercel project; root directories updated to `apps/*`
- [x] First shell scope decided: structure + app move only; no logic extraction in same session
- [x] Techsperts Supabase env cleanup completed (required before Phase 3) — completed 2026-05-18
- [x] GuideForge root scratch-file audit completed (required before Phase 3) — completed 2026-05-18
- [x] package.json names cleaned (required before Phase 3) — GuideForge: `guideforge`, Techsperts: `techsperts` — completed 2026-05-18
- [x] Techsperts `utils/` reorganization completed (required before Phase 3) — completed 2026-05-18
- [x] Both repos committed/pushed to clean `main` (required before Phase 3) — completed 2026-05-18
- [x] Monorepo shell creation approved

**Decision doc:** `MONOREPO_MIGRATION_DECISIONS.md` — created 2026-05-18.

---

## Phase 3 — Create Monorepo Shell

**Status: ✅ Completed 2026-05-18**

Create the `sonaeko-platform` folder and root files. No app code moves in this phase.

- [x] Create `sonaeko-platform/` folder and initialize as a git repo
- [x] Create `sonaeko-platform/apps/` folder
- [x] Create `sonaeko-platform/packages/` folder (empty subfolders: core, ai, governance, domain-templates, design-system, shared-types)
- [x] Create `sonaeko-platform/docs/` folder
- [x] Create root `package.json` with workspace config
- [x] Create `pnpm-workspace.yaml` listing `apps/*` and `packages/*`
- [x] Decide whether to add `turbo.json` now or later — **deferred**
- [x] Commit the shell with a clear commit message — committed 2026-05-18 (commit `1950b2a`)

**Shell location:** `C:\Users\sonaeko\Documents\GitHub\sonaeko-platform`
**Shell report:** `docs/MONOREPO_SHELL_CREATION_REPORT.md`

---

## Phase 4 — Move Apps Without Behavior Changes

**Status: ✅ Completed 2026-05-18** (combined with Phase 3 — both apps copied as part of shell creation)

Copy or move each app into `apps/`. **No behavior changes. No rewritten imports. No
extracted packages.** Preserve every config exactly as it is.

- [x] Copy GuideForge repo contents to `apps/guideforge/`
- [x] Preserve `apps/guideforge/package.json` unchanged
- [x] Preserve `apps/guideforge/next.config.*` unchanged
- [x] Preserve `apps/guideforge/tsconfig.json` unchanged
- [x] Preserve `apps/guideforge/.env.local` (not copied — stays in source repo only)
- [x] Copy Techsperts repo contents to `apps/techsperts/`
- [x] Preserve `apps/techsperts/package.json` unchanged
- [x] Preserve all Techsperts config files unchanged
- [x] No imports rewritten — apps copied as-is (Techsperts import updates were pre-migration cleanup, not monorepo-copy changes)
- [x] Commit the move with a clear commit message — combined with Phase 3 commit `1950b2a`

**Excluded from copy:** `node_modules/`, `.next/`, `dist/`, `.vercel/`, `.git/`, `.env.local`, `.env`
**Included:** `package.json`, `pnpm-lock.yaml`, `.env.example`, all app source, all config files

---

## Phase 5 — Verify Each App

Before extracting anything, confirm each app builds, typechecks, and runs locally from its
new location in `apps/`.

- [x] Install dependencies: `pnpm install` at workspace root — completed 2026-05-18 (430 packages; 2 warnings noted)
- [x] Run `npx tsc --noEmit` for GuideForge — **0 errors** (2026-05-18)
- [x] Run `next build` for GuideForge — **clean build, 32 pages, 0 errors** (2026-05-18) — stale `pnpm-workspace.yaml` removed; Turbopack warning cleared
- [x] Run `next dev` for GuideForge — **Ready in 261ms at http://localhost:3000** (2026-05-18) — `.env.local` detected and loaded
- [x] Run `npx tsc --noEmit` for Techsperts — **no typecheck script** (Vite passthrough confirmed; Decision 2)
- [x] Run `vite build` for Techsperts — **clean build, 2342 modules, 3.52s** (2026-05-18) — 1 pre-existing chunk-size warning (not caused by migration; bundle 1.45 MB)
- [x] Run `vite` for Techsperts — **Ready in 264ms at http://localhost:5173** (2026-05-18)
- [ ] Confirm Vercel root directory requirements for each app
- [ ] Update GuideForge Vercel project root directory to `apps/guideforge`
- [ ] Update Techsperts Vercel project root directory to `apps/techsperts`
- [ ] Deploy GuideForge from monorepo and confirm deployment URL works
- [ ] Deploy Techsperts from monorepo and confirm deployment URL works

---

## Phase 6 — Extract Shared Docs / Types

Only after both apps build and deploy cleanly from `apps/`.

- [ ] Move cross-product architecture docs to `docs/` at monorepo root
- [ ] Create `packages/shared-types/` with `package.json` and `index.ts`
- [ ] Extract neutral core type definitions (Guide, Checklist, SOP, TroubleshootingFlow)
- [ ] Extract domain profile types
- [ ] Extract generation contract types (builder request / response shapes)
- [ ] Extract governance / status mapping types
- [ ] Update import paths in both apps to reference `@platform/shared-types`
- [ ] Run typecheck for both apps after import update — confirm 0 errors
- [ ] Run builds for both apps — confirm clean

---

## Phase 7 — Extract Shared Engine Logic

Only after Phase 6 is stable. Extract one package at a time.

### Domain templates
- [ ] Create `packages/domain-templates/`
- [ ] Extract domain scaffold shapes (tech repair, gaming, SOP, home, creator)
- [ ] Update GuideForge `smart-fill-network.ts` and scaffold route to import from package
- [ ] Add Techsperts imports if Techsperts adapter is ready
- [ ] Typecheck and build both apps

### Generation contracts (AI package)
- [ ] Create `packages/ai/`
- [ ] Extract prompt contract types and generation schemas
- [ ] Extract provider routing logic (`resolveGuideForgeProviderRoute`)
- [ ] Extract mock generation helpers
- [ ] Update GuideForge AI builder imports
- [ ] Typecheck and build both apps

### Governance helpers
- [ ] Create `packages/governance/`
- [ ] Extract neutral status constants and lifecycle helpers
- [ ] Extract review lifecycle model
- [ ] Add product-label mapping helpers per app
- [ ] Update imports in both apps
- [ ] Typecheck and build both apps

### Design system (optional / later)
- [ ] Create `packages/design-system/`
- [ ] Extract design tokens
- [ ] Extract status badge and chip primitives
- [ ] Keep app-specific layouts separate
- [ ] Typecheck and build both apps

---

## Phase 8 — Deployment Cutover

- [ ] Confirm Vercel projects are using correct root directories (`apps/guideforge`, `apps/techsperts`)
- [ ] Confirm env vars are set correctly per app in Vercel
- [ ] Deploy GuideForge from monorepo — confirm production URL works
- [ ] Deploy Techsperts from monorepo — confirm production URL works
- [ ] Test both apps end-to-end in production
- [ ] Keep old individual repos for at least 30 days after stable deploy
- [ ] After confirmed stable: archive old repos (do not delete)

---

## Never Do During Migration

These are hard stops. If a pull request or AI suggestion involves any of the following,
pause and request human approval:

- [ ] Do not delete old repos during migration
- [ ] Do not combine databases
- [ ] Do not rewrite Supabase schema as part of migration
- [ ] Do not remove product-specific branding or language
- [ ] Do not bulk-extract everything at once — one package at a time
- [ ] Do not let AI tools re-architect without human sign-off
- [ ] Do not skip typecheck + build verification after each extraction step
- [ ] Do not merge apps into one UI
- [ ] Do not force shared styling between apps

---

## Related docs

- `PLATFORM_MONOREPO_PLAN.md` — architecture plan and target structure
- `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping
- `SHARED_ENGINE_VOCABULARY_MAP.md` — neutral-to-product terminology map
- `AI_ASSISTANT_MONOREPO_PROTOCOL.md` — assistant operating rules inside the monorepo
