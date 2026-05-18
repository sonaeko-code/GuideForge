# GuideForge Product Roadmap

> Source of truth for product direction, current step, and near-term build lanes.
> Read alongside `GUIDEFORGE_AI_BUILDER_CORE.md` (architecture),
> `GUIDEFORGE_FULL_TEST_PLAN.md` (testing),
> `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` (reuse), and
> `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` (demo template).

---

## 1. Product North Star

GuideForge is a **structured knowledge engine** for building, organizing, governing, and publishing guide networks.

It turns rough prompts into:

- networks
- hubs
- collections
- guides
- checklists
- SOPs
- troubleshooting flows
- launch plans
- governed review/publish workflows
- public structured knowledge sites

The product direction is consistent across every builder:

> **Prompt first → AI interprets intent → builder kind supplies schema/rules/target → user reviews structured proposal → user saves/generates/publishes through the correct flow.**

No flow generates and saves content silently. No flow auto-publishes. Every proposal is reviewable.

---

## 2. Platform Relationship

| Product | Role |
|---------|------|
| **GuideForge** | Engine / infrastructure. Builders, schemas, governance, AI routing. |
| **QuestLine** | Public gaming guide network/site powered by GuideForge. Demo of the public surface. |
| **Techsperts** | Tech repair/support platform that reuses GuideForge patterns for verified KB content. Remains its own product. |

GuideForge does **not** replace Techsperts. It supplies reusable structured-knowledge patterns
(asset schemas, review/publish lifecycle, Forge Rules, provider routing, public/private visibility).
Techsperts retains its diagnosis-first flow, technician escalation, and repair-specific governance.

---

## 3. QuestLine Vision

QuestLine should become the proof / demo network powered by GuideForge.

Expected coverage:

- gaming networks
- game-specific hubs
- build guides
- boss guides
- patch notes
- beginner tutorials
- public guide cards (forged badge, verification states)
- network launch plan
- starter guide generation
- later: news / community / editorial layers

The long-term goal is that a user can say:

> "Build me a QuestLine-style site for this game/community."

…and GuideForge produces:

- network identity (name, tagline, theme)
- public site structure
- hubs
- collections
- starter guide ideas
- draft guides (for user review, never auto-published)
- launch plan
- governance / review rules
- public pages

See `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` for the productized template shape.

---

## 4. Techsperts Reuse Plan

Techsperts can adopt GuideForge patterns without re-architecting itself.

### Reusable GuideForge patterns
- structured guide schemas
- checklist / SOP asset types
- troubleshooting-flow asset type
- review / publish governance
- guide status lifecycle (draft → ready → published → archived)
- verification badge concepts
- Forge Rules (verification level, content standard, AI policy)
- AI provider routing / cost control
- network / hub / collection organization
- public / private knowledge surfaces

### Techsperts-specific differences
- diagnosis-first flow
- verified repair outcomes are gold-standard
- technician escalation
- support / job workflows
- device / problem taxonomy
- stricter safety warnings
- resolution channel tracking
- verified KB hit-rate metrics
- cost-control around AI fallback vs verified solution reuse

GuideForge informs and powers parts of Techsperts; Techsperts remains a **distinct product**
with repair/support-specific workflows. See `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md`.

---

## 5. Current Build State

The following surfaces are implemented (with the caveats noted below):

- Creator Workspace (workspace shell, navigation, dashboards)
- My Assets (asset cards, type badges, attached-network state)
- Networks, Hubs, Collections (create / browse / dashboard)
- Single Guide builder (`/builder/generate-asset/single_guide`)
- Checklist builder (`/builder/generate-asset/checklist`)
- Network Guide generator (`/builder/network/[networkId]/generate`)
- Quick Fill (heuristic, prompt-preserving)
- AI Draft Scaffold (`/api/guideforge/generate-network-scaffold`)
- Starter guide ideas (session-only)
- Network Launch Plan (session-only)
- "Create this guide" handoff from launch plan
- Starter Pages editor
- Forge Rules setup screen
- Review / publish flow (vote weights, eligibility, publish guards)
- Public network pages (`/n/[networkSlug]` and below)
- AI Provider Routing foundation (`lib/guideforge/ai-provider-routing.ts`)
- Network scaffold AI endpoint
- **TypeScript clean status — 0 errors as of this milestone**

### Honest caveats
- Some flows still need **runtime testing** — the build compiles, but end-to-end behavior has not been exhaustively re-verified after the cleanup bundles.
- Some features are **session-only** (starter guide ideas, network launch plan, build plan). They do not survive tab close and are not persisted to Supabase.
- Some governance pieces are **not fully persisted/enforced** — Forge Rules collected in the wizard live in sessionStorage during creation; no Supabase column yet (see `GUIDEFORGE_AI_BUILDER_CORE.md` § Forge Rules).
- See `docs/current-build-state.md` for the audited Supabase persistence flows.
- See `docs/guideforge_feature_surface_checklist.md` for surface-by-surface coverage detail.

---

## 6. Current Step

> **The project is approximately Step 5/10 moving into Step 6/10.**

- Step 5 = foundation / build stabilization (TypeScript clean).
- Step 6 = full end-to-end testing and quality tuning (next).

### Active testing phase
- **Step 6 is now active.**
- Manual test findings are tracked in [`GUIDEFORGE_TEST_FINDINGS.md`](./GUIDEFORGE_TEST_FINDINGS.md).
- New feature work should **pause** until P0/P1 findings are resolved.
- Starter Guide Creation Pipeline upgrade: launch-plan handoff into the Network Guide Generator now carries network name / type / goal / reason and renders a "Creating from Launch Plan" context card. Started-this-session UX marker added (session-only). Durable planning persistence remains future Step 7.
- Domain-aware scaffold templates added for gaming, tech repair, SOP/business, home/family, and creator/community networks. Quick Fill + AI Draft Scaffold share the same domain registry; per-type hub defaults, collection seeds, and starter guide ideas; AI route adds a compact per-domain shape hint. Templates remain proposal-only and editable.
- Domain-aware guide generation profiles added on top of scaffold templates. The Network Guide Generator now resolves a profile from networkType / guideType / prompt / hub / collection and injects domain-appropriate guidance (tone, must-include, preferred sections, safety notes) into both Mock Preview and the AI prompt — Techsperts-style tech repair guides are safety-first / diagnosis-first / escalation-aware; QuestLine-style gaming guides include "When to Use This / Common Mistakes / Quick Reference"; SOP / home / creator profiles enforce their own structure. Profile guidance is proposal-only; no auto-generate, no auto-publish. Durable planning / bulk generation remains future Step 7.

---

## 7. Ten-Step Roadmap

### Step 1 — App / workspace shell
**Status:** mostly complete.
Builder area, assets, networks, dashboards, public pages exist.

### Step 2 — Standalone asset generation
**Status:** mostly complete.
Single guide / checklist generation, save to workspace, asset details.

### Step 3 — Network structure builder
**Status:** mostly complete.
Networks, hubs, collections, dashboard, public pages.

### Step 4 — AI-assisted scaffold planning
**Status:** implemented but needs testing / tuning.
Quick Fill, AI Draft Scaffold, starter guide ideas, Network Launch Plan.

### Step 5 — Build stabilization
**Status:** major milestone reached.
TypeScript clean at 0 errors after several cleanup bundles.

### Step 6 — Full end-to-end testing and quality tuning
**Status:** next.
Test all major flows, fix runtime bugs, polish confusing UX. See `GUIDEFORGE_FULL_TEST_PLAN.md`.

### Step 7 — Durable network planning
**Status:** not done.
Starter guide ideas / build plans currently session-only; future schema pass needed to persist intentionally.

### Step 8 — Full network generation workflow
**Status:** not done.
Create multiple draft guides from scaffold / launch plan with user approval; no auto-publish.

### Step 9 — Productized network templates
**Status:** not done.
QuestLine template, Techsperts template, SOP / business / home / creator templates.

### Step 10 — Integration and launch packaging
**Status:** not done.
Package GuideForge as engine, QuestLine as demo network, Techsperts as repair/support powered-by use case.

---

## 8. Near-Term Build Lanes

| Lane | Description |
|------|-------------|
| **A. Full manual test phase** | Walk every surface in `GUIDEFORGE_FULL_TEST_PLAN.md`. |
| **B. Runtime bug fixes from testing** | Address whatever Lane A surfaces. No drift into features. |
| **C. AI scaffold output quality tuning** | Improve hub/collection naming, starter idea variety, type detection. |
| **D. Persisted network planning model** | Schema pass to persist starter ideas / build plans when user explicitly opts in. |
| **E. Bulk draft generation from starter guide ideas** | User-approved batch draft creation; no auto-publish. |
| **F. QuestLine template pass** | Productize hubs / collections / starter guides as a reusable template. |
| **G. Techsperts adapter / spec pass** | Implement the adapter described in `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md`. |
| **H. Forge Rules persistence / governance pass** | Persist Forge Rules per network; enforce at review/publish. |
| **I. Provider routing / cost control pass** | Add budget / quota logic; bring Anthropic online safely. |
| **J. Real brand / SVG asset integration pass** | Replace placeholders with real wordmark / forged badge artwork. |

---

## 9. Explicit Non-Goals Right Now

- ❌ no auto-publishing
- ❌ no bulk guide creation without review
- ❌ no schema changes without dedicated planning
- ❌ no Claude API calls until provider routing is intentionally expanded
- ❌ no replacing Techsperts with GuideForge
- ❌ no making every network look identical (QuestLine has bespoke editorial layers)
- ❌ no hiding governance / trust language
- ❌ no treating mock generation as real AI output (badge must say "Mock Preview")

---

## 10. Guardrails for Future AI Assistants

- **Do not rebuild one-off builders.** Extend AI Builder Core (`lib/guideforge/ai-builder-core.ts`).
- **Preserve prompt-first flow.** Never mutate, clear, or overwrite the user's prompt.
- **Keep scaffold / planning proposal-only** until the user confirms.
- **Do not auto-publish.** Every publish is an explicit user action.
- **Keep Forge Rules as governance context** — generation reads them, doesn't bypass them.
- **Keep starter guide ideas / build plans session-only** until a schema pass is approved.
- **Keep Techsperts and QuestLine as powered-by GuideForge examples** — not replacements.
- **Do not weaken public/private visibility rules.** Draft and pending content must not leak publicly.
- **Do not expose private drafts publicly.** Public surfaces show published-only content.
- **Do not rename tables or re-architect schema without approval.**

---

## Related docs

- `GUIDEFORGE_AI_BUILDER_CORE.md` — builder architecture and shared request shape
- `GUIDEFORGE_FULL_TEST_PLAN.md` — manual test plan for the next phase
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — how Techsperts can reuse GuideForge patterns
- `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` — productized gaming network template
- `current-build-state.md` — audited Supabase persistence flows
- `guideforge_feature_surface_checklist.md` — surface-by-surface coverage detail
