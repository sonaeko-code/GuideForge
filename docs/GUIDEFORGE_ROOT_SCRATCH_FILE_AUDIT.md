# GuideForge Root Scratch File Audit

> Pre-migration cleanup — Phase 2 of the `sonaeko-platform` pre-migration tasks.
> Completed: 2026-05-18
>
> Pair with `MONOREPO_MIGRATION_CHECKLIST.md` (current migration phase) and
> `MONOREPO_MIGRATION_DECISIONS.md` (Decision 9 Task 2).

---

## Purpose

This audit prepares GuideForge for the future monorepo move by cleaning loose root-level
scratch files so the future `apps/guideforge/` folder is clean before it is created.

**No app behavior changed. No app source files were deleted or modified.**

---

## Inventory

Total root-level non-config files inspected: **46** (39 `.md`, 6 `.tsx`, 1 `.ts`/`.d.ts`)

After excluding package files, config files, lockfiles, and `node_modules`, the actionable
inventory is:

| File | Type | Category | Action | Reason |
|------|------|----------|--------|--------|
| `README.md` | .md | keep-root | keep | Official project readme |
| `CLAUDE.md` | .md | keep-root | keep | Claude Code project instructions — actively used |
| `BRAND.md` | .md | keep-root | keep | Brand guide — referenced by design and docs |
| `next-env.d.ts` | .ts | keep-root | keep | Next.js auto-generated type declarations — must stay at root |
| `PHASE1_QUESTLINE_ANALYSIS.md` | .md | move-to-docs | move → `docs/` | Referenced 4× by `docs/GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` |
| `AUTOMATION_DESIGN.md` | .md | move-to-archive | move → `docs/archive/` | Historical AI session design doc; no longer referenced |
| `CRASH_FIX_VERIFICATION.md` | .md | move-to-archive | move → `docs/archive/` | Historical crash fix verification record |
| `EDITOR_CRASH_FIX.md` | .md | move-to-archive | move → `docs/archive/` | Historical crash fix record |
| `GENERATE_NETWORK_SKELETON_MVP_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical MVP summary |
| `GENERATION_FLOW_IMPLEMENTATION.md` | .md | move-to-archive | move → `docs/archive/` | Historical implementation record |
| `GENERATION_FLOW_TESTING.md` | .md | move-to-archive | move → `docs/archive/` | Historical testing record |
| `GUIDE_GENERATION_FIXES.md` | .md | move-to-archive | move → `docs/archive/` | Historical fix record |
| `GUIDE_PERSISTENCE_DEBUGGING.md` | .md | move-to-archive | move → `docs/archive/` | Historical debugging record |
| `GUIDE_PERSISTENCE_FIX_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical fix summary |
| `GUIDE_TYPE_SECTIONS_MAPPING.md` | .md | move-to-archive | move → `docs/archive/` | Guide type section reference; may have residual value |
| `IMPLEMENTATION_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical implementation summary |
| `MANUAL_GUIDE_PERSISTENCE_ANALYSIS.md` | .md | move-to-archive | move → `docs/archive/` | Historical persistence analysis |
| `PERSISTENCE_ADAPTER_LAYER.md` | .md | move-to-archive | move → `docs/archive/` | Historical persistence adapter design |
| `PHASE10_BUILD_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical build report |
| `PHASE10_COMPLETION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical completion report |
| `PHASE1_NETWORK_SKELETON_INSPECTION.md` | .md | move-to-archive | move → `docs/archive/` | Historical inspection report |
| `PHASES_1_3_COMPLETION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical completion report |
| `PUBLIC_FRONTEND_FOUNDATION.md` | .md | move-to-archive | move → `docs/archive/` | Historical implementation record |
| `SUPABASE_BROWSER_PERSISTENCE.md` | .md | move-to-archive | move → `docs/archive/` | Historical Supabase integration record |
| `SUPABASE_IMPLEMENTATION_GUIDE.md` | .md | move-to-archive | move → `docs/archive/` | Historical implementation guide |
| `SUPABASE_INTEGRATION_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical integration summary |
| `SUPABASE_PHASE1_FINALIZED.md` | .md | move-to-archive | move → `docs/archive/` | Historical Supabase phase 1 record |
| `SUPABASE_PHASE1_IMPLEMENTATION.md` | .md | move-to-archive | move → `docs/archive/` | Historical Supabase phase 1 record |
| `SUPABASE_SCHEMA_PLAN.md` | .md | move-to-archive | move → `docs/archive/` | Scratch schema plan ("review only, no implementation yet") |
| `TESTING_GUIDE_GENERATION.md` | .md | move-to-archive | move → `docs/archive/` | Historical testing guide |
| `TEST_FLOW_QUICK_REF.md` | .md | move-to-archive | move → `docs/archive/` | Historical quick test reference |
| `GUIDEFORGE_AI_BUILDER_MIGRATION_PASS1_COMPLETION_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical completion summary |
| `GUIDEFORGE_AI_BUILDER_UNIFICATION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical unification report |
| `GUIDEFORGE_CHECKLIST_MIGRATION_PASS1_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical migration pass report |
| `IMPLEMENTATION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical implementation report |
| `LANE_1B3_COMPLETION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical lane completion report |
| `LANE_1D_COMPLETION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical lane completion report |
| `PASS_2_COMPLETION_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical pass completion report |
| `WORKSPACE_UNIFICATION_PASS_2_REPORT.md` | .md | move-to-archive | move → `docs/archive/` | Historical workspace unification report |
| `WORKSPACE_UNIFICATION_PASS_SUMMARY.md` | .md | move-to-archive | move → `docs/archive/` | Historical workspace unification summary |
| `collection-new-page.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `app/builder/network/[networkId]/collection/new/page.tsx` |
| `dashboard-page.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `app/builder/network/[networkId]/dashboard/` |
| `guide-edit-page.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `app/builder/network/[networkId]/guide/[guideId]/edit/page.tsx` |
| `guide-editor-loader.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `components/guideforge/builder/guide-editor-loader.tsx` |
| `guide-editor.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `components/guideforge/builder/guide-editor.tsx` |
| `site-header.tsx` | .tsx | delete-scratch | delete | Unreferenced root prototype; real version at `components/guideforge/site-header.tsx` |

---

## Import / Reference Checks

### .tsx files

All 6 root `.tsx` files were checked for imports or references:

- `grep` across `app/`, `components/`, `lib/` confirmed zero import references to any root `.tsx` filename.
- Each file has a live counterpart at its correct app path (see Reason column above).
- None are part of Next.js app routing — they are not inside `app/` and have no `page.tsx` path role.
- All 6 are confirmed safe to delete.

### .md files

- `PHASE1_QUESTLINE_ANALYSIS.md` — referenced 4× by `docs/GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md`. Moved to `docs/` (not archive) so references remain valid.
- All other root `.md` files — no references found in any docs or code.

---

## Actions Taken

### Moved to `docs/`

| File | Destination |
|------|-------------|
| `PHASE1_QUESTLINE_ANALYSIS.md` | `docs/PHASE1_QUESTLINE_ANALYSIS.md` |

No reference updates required — `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` already uses the bare filename and both files are now in `docs/`.

### Moved to `docs/archive/`

35 historical root `.md` files (see inventory table above for full list).

### Deleted

6 unreferenced root `.tsx` prototype files (see inventory table above for full list).

### Kept at root

| File | Reason |
|------|--------|
| `README.md` | Official project readme |
| `CLAUDE.md` | Claude Code project instructions |
| `BRAND.md` | Brand guide |
| `next-env.d.ts` | Next.js auto-generated type declarations |

---

## Related docs

- `MONOREPO_MIGRATION_CHECKLIST.md` — current migration phase
- `MONOREPO_MIGRATION_DECISIONS.md` — Decision 9 Task 2 (this task)
- `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` — references `PHASE1_QUESTLINE_ANALYSIS.md`
