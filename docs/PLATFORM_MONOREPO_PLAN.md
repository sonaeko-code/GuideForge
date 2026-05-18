# Platform Monorepo Plan

> Architecture plan for moving GuideForge, Techsperts, and future products toward a single
> shared platform workspace.
> **This is a planning document only.** No files should be moved, no code should change,
> and no packages should be installed until a dedicated migration session is approved.
>
> Pair with `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` (shared engine concepts),
> `SHARED_ENGINE_VOCABULARY_MAP.md` (terminology), `MONOREPO_MIGRATION_CHECKLIST.md`
> (step-by-step checklist), and `AI_ASSISTANT_MONOREPO_PROTOCOL.md` (assistant rules).

---

## 1. Purpose

The platform monorepo exists so GuideForge, Techsperts, and future products can share one
core engine without becoming one website.

The goal is:

- **one workspace** — a single repository where all products live side by side
- **multiple apps** — each product remains its own deployable application with its own UI,
  branding, and product language
- **shared packages** — common logic, schemas, types, AI contracts, governance patterns,
  and domain templates live once and are imported by each app that needs them
- **shared docs** — architecture and vocabulary docs that apply across all products
- **shared concepts** — intake routing, structured asset lifecycle, AI generation contracts,
  governance/trust lifecycle, and status language stay consistent across products
- **product-specific UI and branding** — GuideForge and Techsperts do not look identical
  and must not be forced to

The two driving problems this solves:

1. **Drift** — without a shared engine, GuideForge and Techsperts will independently develop
   conflicting schemas, governance patterns, and AI contracts that grow harder to reconcile.
2. **Duplication** — domain templates, AI prompt contracts, governance lifecycle logic,
   and status badge helpers should not be copy-pasted across two codebases.

---

## 2. Target Structure

```
sonaeko-platform/
├─ apps/
│  ├─ guideforge/          # Structured knowledge builder (moved from GuideForge repo)
│  ├─ techsperts/          # Tech repair / support product (moved from Techsperts repo)
│  └─ questline/           # Optional future: public gaming guide network
│
├─ packages/
│  ├─ core/                # Shared engine concepts: asset lifecycle, schemas, status, constants
│  ├─ ai/                  # Shared AI contracts: prompt contracts, provider routing, cost control
│  ├─ governance/          # Shared trust/review: review lifecycle, verification lifecycle, badges
│  ├─ domain-templates/    # Shared domain shapes: tech repair, gaming, SOP, home, creator
│  ├─ design-system/       # Shared UI primitives: tokens, badges, status chips, cards
│  └─ shared-types/        # Shared TypeScript types: core types, generation contracts, governance
│
├─ docs/                   # Cross-product architecture and vocabulary docs
├─ package.json            # Root workspace manifest
├─ pnpm-workspace.yaml     # pnpm workspace definition
└─ turbo.json              # (optional, decide later) Turborepo pipeline config
```

### Initial framework reality

The first version of this monorepo will be **mixed-framework**:

- `apps/guideforge` — **Next.js 16 App Router**, React 19, server-side API routes for AI
- `apps/techsperts` — **Vite 6 SPA**, React Router DOM v7, React 18.3.1, Supabase edge
  functions (Deno) for AI

This is intentional. Migrating Techsperts from Vite to Next.js is a separate major
project and must not be combined with the initial monorepo move.

**Consequences for shared packages:**
- Early shared packages (`packages/shared-types`, `packages/domain-templates`,
  `packages/core`, `packages/ai` contracts, `packages/governance`) must be **pure
  TypeScript with no React dependency**.
- `packages/design-system` is deferred until after both apps are stable in the monorepo,
  because shared React UI creates peer-dependency version conflicts between React 19 and
  React 18.
- Each app's build system (Next.js build vs Vite build) stays independent.

A future Techsperts Next.js migration can be planned only after both apps run stably from
`apps/*` and deploy cleanly. That is a separate decision, not part of this plan.

---

## 3. Product Boundaries

### GuideForge

Structured knowledge / network builder:

- networks, hubs, collections, guides, checklists, SOPs, troubleshooting flows
- Forge Rules — network governance (verification level, content standard, AI policy)
- Starter Build Queue — session-only launch plan handoff
- public network publishing — `/n/[networkSlug]` routes
- review / publish governance — draft → pending → published lifecycle
- creator workspace — private drafts and asset management
- Forge / Forged branding and product language

### Techsperts

Tech repair / support product:

- user diagnosis — symptom intake, likely scenarios
- Guided Fix — structured repair walkthrough
- live support and on-site visit escalation
- verified solutions — council-reviewed KB entries
- technician workflows — senior technician / council roles
- device / problem taxonomy — strict matching by device family and problem area
- pricing / service area flows
- repair safety language — battery, electrical, water, data-loss warnings
- resolution outcomes — was the fix delivered via KB, AI assist, or technician?
- Verified branding and product language

### QuestLine

Future / proof gaming network (powered by GuideForge):

- game guide networks — builds, boss guides, patch notes
- beginner paths — first-hour roadmaps and leveling guides
- public / community-facing guide site
- editorial and community layer on top of GuideForge network engine
- QuestLine branding and product language

---

## 4. Shared Package Responsibilities

### packages/core

Shared engine concepts. The language-neutral layer that all apps import without adopting
the other app's product language:

- structured asset lifecycle (intake → draft → review → published → archived)
- guide / checklist / SOP / troubleshooting-flow shapes
- network / domain / hub / collection structural concepts
- status lifecycle constants (draft, provisional, in-review, published, deprecated)
- validation helpers
- neutral vocabulary and shared constants
- no product-specific branding

### packages/ai

Shared AI contracts. All AI generation flows across all apps should route through or align
with these contracts:

- prompt contracts — neutral generation request shape
- generation schemas — structured output shapes, validated before returning to UI
- provider routing — mock / openai / anthropic resolution with cost-control hooks
- mock generation — deterministic output for tests and previews
- response validation and repair prompts
- model-selection policy — which provider/model for which task type
- cost-control hooks — prefer cache hits / verified lookup before any AI call

### packages/governance

Shared trust / review concepts. Both apps need a governance lifecycle; the labels differ
but the underlying model is the same:

- review lifecycle concept — who can review, what weight each role carries
- verification lifecycle — path from provisional to trusted
- Forged / Verified label mapping — same trust concept, different product labels
- role / capability concepts — reviewer roles without app-specific naming
- public / private trust status language
- future: review weights, council quorum rules

### packages/domain-templates

Shared domain scaffold templates used by both Quick Fill (GuideForge) and future Techsperts
intake routing:

- tech repair / Techsperts-style — Safety, Diagnostics, Device Issues, Tools, Walkthroughs
- gaming / QuestLine-style — Builds, Bosses, Patch Notes, Beginner Guides, Gear
- SOP / business
- home / family systems
- creator / community workflow
- future domains (legal, health, education, etc.)

### packages/design-system

Shared UI primitives where appropriate. This package should lower the cost of keeping both
apps visually coherent on neutral chrome without forcing them to look identical:

- design tokens (spacing, radius, shadows — neutral)
- status badges and chips (draft, verified, forged, provisional)
- accessible card primitives
- accessible button and form primitives
- **Do not** force GuideForge and Techsperts to share app-specific layouts or navigation

### packages/shared-types

Shared TypeScript type definitions. The single source of truth for types that span apps:

- neutral core asset types (Guide, Checklist, SOP, TroubleshootingFlow, NetworkScaffold)
- domain profile types
- generation contract types (builder request, builder response)
- governance / status mapping types
- role / permission concept types
- **Do not** include app-specific UI state types here

---

## 5. Migration Principle

**First move structure. Then extract shared types/docs. Then extract shared logic.**

The first monorepo migration should preserve behavior end-to-end. Neither app should change
what it does during the move; only where it lives changes.

Do not rewrite both apps at the same time the initial move happens. A behavior-preserving
move followed by incremental extraction is far safer than a combined migration-and-refactor.

Migration order:
1. Documentation and architecture alignment (this phase)
2. Repo audit — side-by-side file and dependency comparison
3. Create monorepo shell — folder structure, root manifests, workspace config
4. Move apps into `apps/` without behavior changes
5. Verify each app builds and deploys from `apps/`
6. Extract shared docs and types into `packages/shared-types`
7. Extract shared engine logic incrementally (domain templates → AI contracts → governance)
8. Deployment cutover per app

---

## 6. Vercel / Deployment Notes

- Each app should have its own Vercel project.
- GuideForge Vercel project root directory should become `apps/guideforge` after migration.
- Techsperts Vercel project root directory should become `apps/techsperts` after migration.
- Old individual repos should remain as backups until both apps are confirmed stable inside
  the monorepo and deploying cleanly from their new root directories.
- Environment variables remain app-specific at first — each app's `.env.local` and Vercel
  env var settings stay separate until the monorepo is proven stable.
- Do not centralize env vars until both apps run inside the monorepo and are stable.
- Do not share Supabase projects between apps until a deliberate data-architecture decision
  is made with a dedicated migration plan.

---

## 7. What Not To Do

These guardrails apply to every phase of the migration:

- **Do not merge apps into one UI.** GuideForge and Techsperts are different products.
- **Do not combine databases immediately.** Each app keeps its own Supabase project.
- **Do not rewrite Supabase schemas** as part of the migration.
- **Do not extract runtime logic** before both apps are stable in `apps/` and building cleanly.
- **Do not force shared styling.** The design-system package should provide primitives, not templates.
- **Do not remove product-specific language.** Forged stays in GuideForge; Verified stays in Techsperts.
- **Do not auto-publish or weaken governance.** Both apps maintain review-first / verification-first.
- **Do not replace Techsperts with GuideForge.** Techsperts is a separate product with its own surface.
- **Do not bulk-extract everything at once.** Extract one package at a time, verify, then continue.
- **Do not let AI tools re-architect without approval.** Every structural change requires human sign-off.
- **Do not delete old repos** until both apps are stable in the monorepo and deploying cleanly.
- **Do not skip running typechecks and builds after every extraction step.**

---

## Related docs

- `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping between products
- `SHARED_ENGINE_VOCABULARY_MAP.md` — durable terminology map for assistants and contributors
- `MONOREPO_MIGRATION_CHECKLIST.md` — step-by-step migration checklist
- `AI_ASSISTANT_MONOREPO_PROTOCOL.md` — operating rules for AI assistants in the monorepo
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — GuideForge patterns → Techsperts adapter spec
- `GUIDEFORGE_AI_BUILDER_CORE.md` — GuideForge AI builder architecture and contracts
- `GUIDEFORGE_PRODUCT_ROADMAP.md` — GuideForge product direction and current step
