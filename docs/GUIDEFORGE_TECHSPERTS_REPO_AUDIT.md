# GuideForge ↔ Techsperts Repo Audit

> Phase 2 of the `sonaeko-platform` monorepo migration plan.
> This document compares the current GuideForge and Techsperts repos before any files are moved.
>
> **No files have been moved. No code behavior changed.**
>
> Pair with `PLATFORM_MONOREPO_PLAN.md` (architecture plan),
> `MONOREPO_MIGRATION_CHECKLIST.md` (checklist), and
> `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` (shared concept mapping).

---

## Purpose

This audit prepares for the future `sonaeko-platform` monorepo. It establishes ground truth
for both repos — framework, package manager, folder structure, env vars, AI integration,
governance, and design system — before any migration work begins.

The goal is to surface differences and risks early so the migration plan can account for
them, not discover them after files have been moved.

---

## Repo Locations

| Field | GuideForge | Techsperts |
|-------|-----------|-----------|
| Path | `C:\Users\sonaeko\Documents\GitHub\GuideForge` | `C:\Users\sonaeko\Documents\GitHub\Techsperts` |
| Found | ✅ Yes | ✅ Yes |
| Current branch | `main` | `main` |
| Git status (docs changes) | Modified: 3 docs files + `.claude/settings.local.json`; 5 new docs untracked (this audit bundle) | Clean |

Both repos are on `main`. GuideForge has the pending platform planning docs from the previous
session not yet committed. Techsperts is clean.

---

## Package / Framework Summary

> **Critical finding: these are not the same framework.**
> GuideForge is a Next.js App Router application.
> Techsperts is a Vite SPA with react-router-dom.
> This is the single largest migration risk and must be resolved before moving apps.

| Area | GuideForge | Techsperts | Notes |
|------|-----------|-----------|-------|
| **Framework** | **Next.js 16.2.4** | **Vite 6.3.5 + react-router-dom 7.12.0** | CRITICAL difference — not both Next.js |
| **React** | 19 | 18.3.1 (peerDependencies) | Version mismatch — needs alignment |
| **TypeScript** | 5.7.3 (explicit devDependency) | Not listed as devDependency; .tsx/.ts used via Vite passthrough | Techsperts has no tsconfig.json in root |
| **Package manager** | pnpm (pnpm-lock.yaml present) | pnpm (pnpm-lock.yaml present) | ✅ Same — good for monorepo |
| **Tailwind** | v4 via `@tailwindcss/postcss` | v4 via `@tailwindcss/vite` | Same version, different plugin — resolvable |
| **Supabase client** | `@supabase/supabase-js ^2.105.1` | `@supabase/supabase-js ^2.89.0` | Minor version drift — alignable |
| **UI components** | Radix UI (recent versions) + shadcn-style | Radix UI (older versions) + **MUI (Material UI v7)** | Techsperts has MUI on top of Radix |
| **AI integration** | OpenAI via **Next.js API routes** (server-side) | OpenAI via **Supabase edge functions** (Deno runtime) | CRITICAL difference — completely different runtime |
| **Env var pattern** | `process.env.NEXT_PUBLIC_*` / `process.env.*` | `import.meta.env.VITE_*` | Incompatible naming — must be resolved per-app |
| **Deployment** | Vercel — Next.js build | Vercel — SPA with rewrite rule (`vercel.json`) | Both Vercel; different build modes |
| **name in package.json** | `my-project` | `@figma/my-make-file` | Both need renaming in monorepo |
| **Routing** | Next.js App Router file-based routing | React Router DOM v7 (SPA client-side routing) | Completely different routing model |
| **Module type** | CommonJS / Next.js convention | `"type": "module"` (ESM) | Different module system |

**Important — Techsperts Supabase credentials:** `utils/supabase/info.tsx` is an
auto-generated file containing a hardcoded `projectId` and `publicAnonKey`. This is the
existing pattern for the browser-facing Supabase client. The `VITE_SUPABASE_URL` env var
is used only by the provisional guide generator (for edge function calls). When migrating,
the `info.tsx` credential file should be replaced with proper env vars and must never be
committed with live production keys.

---

## Folder Structure Summary

### GuideForge

```
GuideForge/
├─ app/                    # Next.js App Router
│  ├─ api/guideforge/      # Server-side API routes: generate-guide, generate-network-scaffold,
│  │                         generate-checklist, generate-single-guide, intake-refine
│  ├─ auth/                # Auth pages
│  ├─ account/             # User account pages
│  ├─ builder/             # Builder flow pages (network, generate-asset)
│  ├─ n/                   # Public network pages (/n/[networkSlug])
│  ├─ globals.css          # Design tokens (Tailwind v4, OKLCH palette, custom brand vars)
│  ├─ layout.tsx           # Root layout
│  └─ page.tsx             # Landing page
├─ components/
│  ├─ guideforge/          # Product components (builder, account, auth, brand, landing, public, shared)
│  ├─ questline/           # QuestLine editorial components
│  ├─ ui/                  # shadcn-style Radix primitives
│  └─ theme-provider.tsx
├─ lib/guideforge/         # Core logic (40+ files): AI builder, generation, mocks, Supabase persistence,
│                            governance, domain templates, guide profiles, provider routing, types
├─ hooks/                  # Custom React hooks
├─ docs/                   # 50+ documentation files including platform planning docs
├─ assets/                 # Static assets
├─ public/                 # Public folder
├─ next.config.mjs         # Next.js config (ignoreBuildErrors: true, images unoptimized)
├─ tsconfig.json           # TypeScript config
├─ pnpm-lock.yaml          # pnpm lockfile
└─ package.json
```

Notable: the root folder also contains many loose `*.md` files and `*.tsx` scratch files
(e.g. `guide-editor.tsx`, `dashboard-page.tsx`, `collection-new-page.tsx`) that appear to
be unused development artifacts. These should be audited before the monorepo move and either
placed correctly or removed.

### Techsperts

```
Techsperts/
├─ src/
│  ├─ app/
│  │  ├─ ai/               # AI decision engine (decisionEngine.ts — adaptive cost control)
│  │  ├─ auth/             # Auth helpers (getCurrentProfile, RequireAuth, RequireRole, RouteGuard)
│  │  ├─ components/       # 40+ components: diagnosis, guided-fix, admin, booking, chat, maps
│  │  ├─ guided-fix/       # Core guided fix engine:
│  │  │  ├─ adapters/      # solutionToGuidedFixPayload.ts
│  │  │  ├─ cache/         # provisionalStore.ts (localStorage cache, reuse-before-regenerate)
│  │  │  ├─ feedback/      # session.ts
│  │  │  ├─ generation/    # generateProvisionalGuide.ts (calls Supabase edge function)
│  │  │  ├─ helpers/       # solutionMatching.ts
│  │  │  ├─ kb/            # getBestGuidedFixPayload.ts (verified-first KB lookup)
│  │  │  └─ types.ts       # GuidedFixPayload, GuidedFixStep types
│  │  ├─ layouts/          # Page layouts
│  │  ├─ lib/              # roleAuthority.ts (DB-backed role capabilities)
│  │  ├─ pages/            # Route page components (AdminBookings, Diagnosis, Landing, etc.)
│  │  ├─ storage/          # BookingStore, caseStore, ProfileStore
│  │  ├─ types/            # ??? (exit code 2 — may be empty or missing)
│  │  ├─ utils/            # toScheduledAt.ts
│  │  ├─ App.css
│  │  ├─ App.tsx           # Root React component; SPA entry, routing
│  │  ├─ app_routes.ts     # Route definitions
│  │  ├─ GuidedFixDemo.tsx
│  │  └─ main.tsx          # Vite entry point
│  └─ styles/              # fonts.css, index.css, tailwind.css, theme.css
├─ utils/                  # Repo-root utilities (NOT inside src/)
│  ├─ roleCapabilities.ts  # Frontend-only role-to-capability mapping
│  └─ supabase/
│     ├─ client.tsx        # Supabase singleton client
│     ├─ info.tsx          # AUTOGENERATED — hardcoded projectId + publicAnonKey
│     └─ solutions.ts      # getSolutionDetail() RPC helper
├─ supabase/
│  ├─ functions/
│  │  └─ server/           # Deno/Hono edge function: AI generation (generate-solution-steps),
│  │                         chat support AI, KV store
│  └─ migrations/          # 2 SQL files (admin restore, submission queue fix)
├─ guidelines/             # Guidelines.md
├─ docs/                   # 2 docs (implementation summary, solution-draft-management-audit)
├─ index.html              # Vite SPA entry HTML
├─ vite.config.ts          # Vite config: react plugin, tailwind, @ alias
├─ postcss.config.mjs
├─ vercel.json             # SPA rewrite: all routes → /
├─ pnpm-lock.yaml
└─ package.json
```

Notable: the `utils/` folder lives at the repo root, outside `src/`. This must be
resolved during the monorepo move (either pull it into `src/` or re-export from `packages/`).

---

## Environment Variable Surface

### GuideForge (Next.js — server-side and client-side)

| Variable | Usage | Type |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client URL | Public (browser-safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Public (browser-safe) |
| `OPENAI_API_KEY` | OpenAI API calls in server-side API routes | Server-only (secret) |
| `AI_COST_CAP_EXCEEDED` | Cost-control flag — disables AI calls when set | Server-only |
| `NODE_ENV` | Environment check (dev/production) | Standard |

### Techsperts (Vite SPA — client-side + Deno edge function)

| Variable | Usage | Type |
|----------|-------|------|
| `VITE_SUPABASE_URL` | Edge function base URL (for provisional guide fetch) | Client-side (public) |
| `OPENAI_API_KEY` | OpenAI API calls inside Supabase edge function (Deno.env) | Deno env — server-only |
| `import.meta.env.DEV` | Dev mode check | Vite built-in |

**Note:** Techsperts browser Supabase client currently uses hardcoded credentials from
`utils/supabase/info.tsx` (auto-generated pattern). It does NOT use env vars for the
Supabase URL or anon key on the client side. This is a known pattern for the current
setup and must be replaced with proper env vars before or during the monorepo migration.

### Shared env concepts vs app-specific

| Concept | GuideForge | Techsperts | Shared? |
|---------|-----------|-----------|---------|
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | Hardcoded in info.tsx / `VITE_SUPABASE_URL` | Same concept, different mechanism |
| Supabase anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Hardcoded in info.tsx | Same concept, different mechanism |
| OpenAI key | `OPENAI_API_KEY` (Next.js env) | `OPENAI_API_KEY` (Deno env, edge function) | Same name, different runtime |
| Cost-control flag | `AI_COST_CAP_EXCEEDED` | Not present yet (adaptive engine is in-memory) | GuideForge-specific for now |
| App URL | None listed | `VITE_SUPABASE_URL` doubles as edge function base | App-specific |

---

## Supabase / Database Surface

### GuideForge — Supabase integration files

| File | Role |
|------|------|
| `lib/guideforge/supabase-client.ts` | Singleton Supabase client |
| `lib/guideforge/supabase-persistence.ts` | Core persistence layer |
| `lib/guideforge/supabase-networks.ts` | Network CRUD |
| `lib/guideforge/supabase-guide-reviews.ts` | Review submission and voting |
| `lib/guideforge/supabase-guide-revisions.ts` | Guide revision history |
| `lib/guideforge/supabase-profiles.ts` | User profiles |
| `lib/guideforge/supabase-public.ts` | Public read helpers |
| `lib/guideforge/guide-drafts-storage.ts` | Draft storage |
| `lib/guideforge/asset-draft-helpers.ts` | Asset draft CRUD |
| `lib/guideforge/save-structured-asset.ts` | Save asset to workspace |
| `lib/guideforge/save-network-skeleton.ts` | Save network scaffold |
| `docs/sql/` | SQL reference files |
| `docs/RLS_*.md` | RLS audit and deployment docs (extensive) |

Tables referenced in code include: `asset_drafts`, `networks`, `hubs`, `collections`,
`guides`, `profiles`, `guide_reviews`, `guide_revisions`. Review/vote/publish lifecycle
is implemented in `supabase-guide-reviews.ts`.

### Techsperts — Supabase integration files

| File | Role |
|------|------|
| `utils/supabase/client.tsx` | Singleton Supabase client (PKCE flow, singleton pattern) |
| `utils/supabase/info.tsx` | AUTOGENERATED — hardcoded projectId + publicAnonKey |
| `utils/supabase/solutions.ts` | `getSolutionDetail()` — verified-first RPC helper |
| `supabase/migrations/` | 2 SQL migration files |
| `supabase/functions/server/` | Edge function with KV store and AI generation |
| `src/app/lib/roleAuthority.ts` | DB-backed role authority (reads `role_registry` table) |

Tables referenced: `profiles`, `role_registry`, `problems`, `solutions` (via
`get_solution_detail` RPC). `SolutionDetail` schema includes: `id`, `problem_id`, `title`,
`overview`, `steps (JSONB)`, `status (draft|pending|active|rejected)`,
`verification (unverified|verified)`, `is_active`, `confidence_score`, `lineage_root`,
`is_revision`, `revision_of`.

### Supabase summary — likely shared concepts

| Concept | GuideForge | Techsperts | Extractable |
|---------|-----------|-----------|-------------|
| User profiles | `profiles` table | `profiles` table | Naming likely same, schema may differ |
| Role system | `role_capabilities.ts` in lib + DB queries | `role_registry` table + `roleAuthority.ts` | Same concept; DB-backed in Techsperts, more static in GuideForge |
| Verification/review lifecycle | `guide_reviews` table; vote weights | `solutions.verification`, council approval | Same pattern; different tables |
| Draft/publish lifecycle | `asset_drafts`, `status` field | `status (draft|pending|active|rejected)` | Closely aligned status states |
| Public/private visibility | RLS policies (extensive docs) | `is_active`, `is_test_mode` + RLS | Same intent; different mechanism |
| Content as JSONB steps | Guide sections as structured content | `steps JSONB` in solutions | Very similar shape |

**Both apps use separate Supabase projects.** Do not combine databases during migration.

---

## AI / Generation Surface

### GuideForge — AI files

| File | Role |
|------|------|
| `lib/guideforge/ai-builder-core.ts` | Core generation dispatcher; builder kinds |
| `lib/guideforge/ai-generation-client.ts` | Client-side generation caller |
| `lib/guideforge/ai-generation-config.ts` | Generation configuration |
| `lib/guideforge/ai-generation-types.ts` | Generation type definitions |
| `lib/guideforge/ai-generation-validation.ts` | Structured output validation + repair |
| `lib/guideforge/ai-prompts.ts` | Prompt builders (`buildNetworkGuidePrompt`, etc.) |
| `lib/guideforge/ai-provider-routing.ts` | Provider routing (openai/anthropic/mock resolution) |
| `lib/guideforge/guide-generation-profiles.ts` | Domain-aware generation profiles |
| `lib/guideforge/mock-generator.ts` | Mock network guide generator |
| `lib/guideforge/mock-asset-generator.ts` | Mock standalone asset generator |
| `lib/guideforge/generation-schemas.ts` | Zod schemas for structured AI output |
| `lib/guideforge/smart-fill-network.ts` | Heuristic Quick Fill (no AI call) |
| `app/api/guideforge/generate-guide/route.ts` | Server-side guide generation endpoint |
| `app/api/guideforge/generate-network-scaffold/route.ts` | Server-side scaffold endpoint |
| `app/api/guideforge/generate-checklist/route.ts` | Server-side checklist endpoint |
| `app/api/guideforge/generate-single-guide/route.ts` | Server-side single guide endpoint |
| `app/api/guideforge/intake-refine/route.ts` | AI-powered intake field extraction |

AI calls use OpenAI through **Next.js server-side API routes**. Provider routing is
extensible (`anthropic` reserved but not active). Cost-control hook exists at
`resolveGuideForgeProviderRoute()`. All AI output is provisional until reviewed.

### Techsperts — AI files

| File | Role |
|------|------|
| `src/app/guided-fix/generation/generateProvisionalGuide.ts` | Client calls Supabase edge function (`generate-solution-steps`) |
| `src/app/guided-fix/kb/getBestGuidedFixPayload.ts` | Verified-first KB lookup (Supabase query) |
| `src/app/guided-fix/cache/provisionalStore.ts` | localStorage cache; reuse-before-regenerate |
| `src/app/guided-fix/adapters/solutionToGuidedFixPayload.ts` | Convert DB solution → GuidedFixPayload |
| `src/app/ai/adaptive/decisionEngine.ts` | Adaptive cost control (KB success rate, AI success rate, escalation) |
| `supabase/functions/server/index.tsx` | Deno/Hono edge function; calls OpenAI for chat + solution steps |
| `supabase/functions/server/kv_store.tsx` | KV store for edge function state |

AI calls use OpenAI through **Supabase edge functions (Deno runtime)**, not Next.js API
routes. The adaptive decision engine controls when AI is called vs when KB is preferred.
All provisional AI output is marked and never auto-promoted to verified.

### AI surface overlap

| Concept | GuideForge | Techsperts | Extraction candidate |
|---------|-----------|-----------|---------------------|
| Provisional AI output concept | Draft — review before saving | `provisional` flag on GuidedFixPayload | ✅ `packages/ai` |
| Verified-first / cache-before-AI | `AI_COST_CAP_EXCEEDED` flag; mock preferred when flag set | `getBestGuidedFixPayloadFromDiagnosis()` + reuse cache | ✅ `packages/ai` cost-control pattern |
| Provider routing / model selection | `resolveGuideForgeProviderRoute()` | `decisionEngine.ts` (preferredModel: nano/mini/full) | ✅ `packages/ai` |
| Structured output validation | `ai-generation-validation.ts` | Implicit (edge function response shape) | ✅ `packages/ai` |
| Mock generation | `mock-generator.ts`, `mock-asset-generator.ts` | Not present (no offline mock path noted) | GuideForge-specific for now |
| Prompt contracts | `ai-prompts.ts`, `guide-generation-profiles.ts` | Prompt embedded in edge function | ✅ `packages/ai` (contracts, not implementations) |
| Domain templates | `smart-fill-network.ts`, `network-types.ts` | `inferDeviceType()` in generateProvisionalGuide | ✅ `packages/domain-templates` |

---

## Governance / Trust Surface

### GuideForge — governance files

| File | Role |
|------|------|
| `lib/guideforge/forge-rules.ts` | Forge Rules definition (verification level, content standard, AI policy) |
| `lib/guideforge/forge-rules-validator.ts` | Forge Rules validation helpers |
| `lib/guideforge/asset-draft-reviews.ts` | Review submission, vote counting, eligibility checks |
| `lib/guideforge/asset-draft-types.ts` | Draft asset type definitions with status |
| `lib/guideforge/guide-status-labels.ts` | Status → display label mapping |
| `lib/guideforge/role-capabilities.ts` | Role → capability mapping |
| `lib/guideforge/supabase-guide-reviews.ts` | DB-backed review and vote storage |
| `docs/GUIDEFORGE_GOVERNANCE_FOUNDATION.md` | Governance architecture doc |
| `docs/GUIDEFORGE_REVIEW_PUBLISH_WORKFLOW.md` | Review/publish workflow spec |
| `docs/guideforge-role-reputation-authority.md` | Role/reputation system |

### Techsperts — governance files

| File | Role |
|------|------|
| `utils/roleCapabilities.ts` | Frontend-only role → capability flags (canSubmitSolutions, canManageUsers, etc.) |
| `src/app/lib/roleAuthority.ts` | DB-backed role authority (reads `role_registry` table; caches 5 min) |
| `utils/supabase/solutions.ts` | `getSolutionDetail()` — verified-first RPC with lineage-root check |
| `src/app/guided-fix/cache/provisionalStore.ts` | Provisional verification states: unverified / under_review / verified |
| `supabase/migrations/*.sql` | Admin restore, submission queue schema |
| `SOLUTION_VERIFICATION_README.md` | Solution verification architecture doc |
| `SOLUTION_VERIFICATION_SQL_SETUP.sql` | Verification SQL setup |

### Governance overlap

| Concept | GuideForge | Techsperts | Extraction candidate |
|---------|-----------|-----------|---------------------|
| Role-to-capability mapping | `role-capabilities.ts` (static) + DB | `roleCapabilities.ts` (static) + `roleAuthority.ts` (DB) | ✅ `packages/governance` |
| Review lifecycle states | draft → review → published | draft → pending → active → rejected | ✅ `packages/governance` (neutral constants) |
| Verification states | Forged / unverified / provisional | unverified / under_review / verified | ✅ `packages/governance` |
| Verified-beats-unverified logic | Review vote + publish guard | `get_solution_detail` RPC with lineage check | ✅ `packages/governance` concept |
| Public/private visibility | RLS on published status | `is_active + is_test_mode` | Same intent; different enforcement |
| AI provisional flag | No auto-publish; draft until reviewed | `isProvisional: true` + disclaimerText | ✅ `packages/governance` |
| Base role weight | Review vote weight in `asset-draft-reviews.ts` | `base_weight` column in `role_registry` | ✅ Same concept |

---

## Design System Surface

### GuideForge design system

- **Token system:** Tailwind v4 OKLCH CSS custom properties in `app/globals.css`. Warm
  parchment/cream background, copper primary, graphite foreground. Named brand tokens:
  `--brass-*`, `--forge-*` etc. Dark mode supported via `.dark` class variant.
- **Component library:** shadcn-style Radix primitives in `components/ui/` (full set:
  accordion, button, badge, card, dialog, tabs, etc.)
- **Brand:** Copper/brass palette with "forge/foundry" feeling. `BRAND.md` present.
  Brand assets in `assets/`.
- **Design docs:** `GUIDEFORGE_DESIGN_SYSTEM_HANDOFF.md`, `GUIDEFORGE_DESIGN_SYSTEM_IMPLEMENTATION.md`,
  `GUIDEFORGE_VISUAL_SYSTEM_NOTES.md`

### Techsperts design system

- **Token system:** CSS custom properties in `src/styles/theme.css`. White/neutral
  background, dark primary (`#030213`). Clean, professional, neutral palette — not
  warm/forge-flavored.
- **Component library:** Radix UI primitives **AND** MUI (Material UI v7). Both are
  present. MUI is used for some admin/complex UI surfaces.
- **Brand:** No equivalent BRAND.md found. Style is clean/professional tech-support product.
- **Style files:** `fonts.css`, `index.css`, `tailwind.css`, `theme.css` in `src/styles/`
- `GUIDED_FIX_DESIGN_SYSTEM.md` exists inside `src/app/components/`

### Design system summary

| Aspect | Shareable? | Notes |
|--------|-----------|-------|
| Design tokens | Partially — neutral tokens only | Radii, spacing could share. Colors must NOT be forced shared. |
| Status badges / chips | ✅ Yes — same concept | Forged/Verified are the same badge with different labels |
| Card primitives | ✅ Yes — with label mapping | Both use card-style UI for guides/solutions |
| Button primitives | ✅ Yes | Both use Radix Slot / CVA patterns |
| Radix UI components | Partially — after version alignment | Versions are 1–2 minor versions apart |
| MUI components | ❌ No — Techsperts only | Do not import MUI into GuideForge |
| Color tokens | ❌ No | GuideForge: warm copper; Techsperts: cool neutral — must stay separate |
| App layouts / navigation | ❌ No | Completely different product surfaces |

---

## Candidate Shared Packages

| Package | Candidate Files / Concepts | From GuideForge | From Techsperts | Extraction Risk | Recommended Phase |
|---------|---------------------------|----------------|----------------|----------------|-------------------|
| `packages/shared-types` | Guide/Checklist/SOP/TroubleshootingFlow types; GuidedFixPayload overlap; status enum; role capability interface | `ai-generation-types.ts`, `asset-draft-types.ts`, `types.ts` | `guided-fix/types.ts`, `roleCapabilities.ts` | **Low** — purely additive types | Phase 6 (after apps stable) |
| `packages/domain-templates` | Domain scaffold shapes: tech repair, gaming, SOP, home, creator | `network-types.ts`, `smart-fill-network.ts` (templates section) | `inferDeviceType()` fragment in generateProvisionalGuide | **Low-Medium** — GuideForge templates are well-isolated | Phase 7 |
| `packages/ai` | Prompt contracts; structured output shapes; provider routing; provisional output concept; cost-control hooks | `ai-provider-routing.ts`, `generation-schemas.ts`, `ai-generation-validation.ts`, `ai-prompts.ts` contracts | `decisionEngine.ts` patterns, edge function contract shape | **Medium** — AI runtimes are completely different (Next.js vs Deno); extract contracts/types only first | Phase 7 (contracts/types before routing) |
| `packages/governance` | Review lifecycle constants; role capability interface; verification states; trust badge labels; weight model | `forge-rules.ts`, `role-capabilities.ts`, `guide-status-labels.ts`, `asset-draft-reviews.ts` (lifecycle constants) | `roleCapabilities.ts`, `lib/roleAuthority.ts`, `provisionalStore.ts` (ProvisionalVerification type) | **Medium** — DB tables differ; extract neutral constants and interfaces first | Phase 7 |
| `packages/core` | Neutral asset lifecycle constants; shared neutral vocabulary; base shape interfaces | Neutral portions of `types.ts`, `wizard-state.ts` | Neutral portions of `guided-fix/types.ts` | **Low-Medium** — requires careful separation of product-specific language | Phase 7 |
| `packages/design-system` | Neutral tokens (radius, spacing); status badge primitives; card and button primitives | `components/ui/` (neutral primitives only) | `src/styles/theme.css` (neutral tokens) | **High** — MUI in Techsperts; framework differences; color palettes must stay separate | Phase 7 — last; neutral tokens only |

---

## Do Not Move Yet

These must remain app-specific or require a separate dedicated migration decision:

- Supabase schema and migrations (both apps — each has its own DB)
- Auth flow (GuideForge uses Next.js middleware + Supabase; Techsperts uses RouteGuard + Supabase)
- Database clients and DB helper files until DB strategy is decided
- Next.js API routes (`app/api/`) — GuideForge-specific; Techsperts has no Next.js
- Supabase edge functions (`supabase/functions/`) — Techsperts-specific Deno runtime
- Public network pages (`app/n/`) — GuideForge product surface
- Diagnosis / symptom intake UI — Techsperts product surface
- Guided Fix customer flow — Techsperts product surface
- Booking / scheduling / pricing / service area — Techsperts product surface
- Technician dispatch and availability — Techsperts product surface
- MUI components — Techsperts-specific
- Hardcoded Supabase credentials (`utils/supabase/info.tsx`) — must be replaced with env vars before monorepo move
- Loose root-level `.md` and `.tsx` scratch files in GuideForge — audit before moving
- `utils/` folder at Techsperts root — must be reorganized into `src/` before or during move

---

## Recommended Migration Order

Based on this audit:

1. **Resolve open questions below first** (especially the framework difference and credential handling)
2. **Rename both `package.json` names** — `my-project` → `guideforge`, `@figma/my-make-file` → `techsperts`
3. **Replace Techsperts hardcoded credentials** with proper env vars before moving
4. **Audit and clean GuideForge root** — move or remove loose scratch `.md` and `.tsx` files
5. **Reorganize Techsperts `utils/`** — move into `src/` before the monorepo move
6. **Create monorepo shell** — `sonaeko-platform/`, `apps/`, `packages/`, `docs/`, root `package.json`, `pnpm-workspace.yaml`
7. **Move apps as-is** — copy GuideForge to `apps/guideforge/`, copy Techsperts to `apps/techsperts/`
8. **Verify each app independently** — `pnpm install`, `tsc --noEmit`, `next build` (GuideForge), `vite build` (Techsperts)
9. **Extract root docs** — cross-product platform docs to `sonaeko-platform/docs/`
10. **Extract shared vocabulary / types** — `packages/shared-types` (neutral types only)
11. **Extract domain templates** — `packages/domain-templates`
12. **Extract AI contracts** — `packages/ai` (types/contracts first; routing later)
13. **Extract governance constants** — `packages/governance`
14. **Design system primitives last** — `packages/design-system` (neutral tokens only; do not force MUI/Radix alignment)

---

## Open Questions

These must be answered before migration begins:

| # | Question | Impact |
|---|----------|--------|
| 1 | **Framework alignment: will Techsperts migrate to Next.js, or will the monorepo support both Vite and Next.js apps?** | Critical — determines how `apps/techsperts/` is built and deployed in the monorepo |
| 2 | **React version alignment: will Techsperts upgrade from 18.3.1 to React 19?** | High — affects shared package peer deps |
| 3 | **Techsperts TypeScript: is there an implicit tsconfig (inferred by Vite), or does a formal tsconfig need to be added before monorepo move?** | Medium — need to confirm before typecheck step |
| 4 | **Techsperts credentials: when will `utils/supabase/info.tsx` be replaced with proper env vars?** | High — should happen before monorepo move |
| 5 | **AI runtime boundary: Techsperts uses Deno edge functions; GuideForge uses Next.js server routes. Will AI routing eventually unify, or stay separate per-app?** | High — determines scope of `packages/ai` |
| 6 | **`utils/` folder location in Techsperts: will it be moved into `src/` before the monorepo move?** | Medium — affects import paths during move |
| 7 | **GuideForge root scratch files: which loose `.md` and `.tsx` files at the GuideForge root are actively used vs abandoned?** | Low-Medium — should be cleaned before moving |
| 8 | **MUI in Techsperts: is Material UI a long-term dependency, or will it be phased out in favor of shared Radix/shadcn primitives?** | Medium — determines scope of `packages/design-system` |
| 9 | **Supabase projects: are both apps using separate Supabase projects today, and will that stay true in the monorepo?** | High — confirms the no-shared-DB rule |
| 10 | **Vercel deployment: both apps currently deploy from their own repo roots. Has the Vercel root-directory config been confirmed as changeable to `apps/guideforge` and `apps/techsperts`?** | High — deployment must be verified before monorepo cutover |

---

## Related docs

- `PLATFORM_MONOREPO_PLAN.md` — target workspace structure and package responsibilities
- `MONOREPO_MIGRATION_CHECKLIST.md` — step-by-step migration checklist (Phase 2 items tracked there)
- `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping
- `SHARED_ENGINE_VOCABULARY_MAP.md` — terminology reference
- `AI_ASSISTANT_MONOREPO_PROTOCOL.md` — assistant operating rules inside the monorepo
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — detailed adapter spec for the Techsperts integration lane
