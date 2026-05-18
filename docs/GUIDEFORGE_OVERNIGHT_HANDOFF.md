# GuideForge Overnight Handoff

> Continuation document after a major productive build session.
> Pair with `GUIDEFORGE_TEST_FINDINGS.md` (the triage log) and
> `GUIDEFORGE_PRODUCT_ROADMAP.md` (the ten-step roadmap).

---

## Status Summary

GuideForge is currently in **Step 6: full manual testing and quality tuning**.

The project has reached a stable TypeScript baseline:
- `npx tsc --noEmit` reports **0 TypeScript errors**.
- Recent work focused on network creation reliability, AI scaffold reliability, launch-plan handoff, domain-aware scaffolds, and domain-aware guide generation profiles.

No flow has been re-tested manually since the latest bundles landed. Treat this handoff as "code is ready for a fresh manual pass," not "verified."

---

## Current Product Direction

GuideForge remains the **structured knowledge engine**.

**QuestLine** is the gaming guide/community network proof/demo powered by GuideForge.

**Techsperts** is a repair/support knowledge product that can reuse GuideForge patterns:
- diagnosis-first guide structure
- safety-first repair guidance
- checklists and SOPs
- review/publish governance
- Forge Rules
- verified / provisional status language
- AI provider / cost-control patterns

GuideForge does **not** replace Techsperts. It provides reusable engine patterns. Techsperts retains its diagnosis-first flow, technician escalation, and repair-specific governance.

---

## What Changed Tonight

### 1. Network Creation Reliability
- Legacy `networks.hub_ids` post-insert update removed (the column does not exist in the live schema).
- Repeated 400 console errors during scaffold save are addressed.
- Noisy `[v0]` payload/result logs gated behind `DEBUG_NETWORK_SAVE` / `DEBUG_SCAFFOLD` flags; real `console.error` calls preserved.
- AI scaffold timeout copy improved to *"AI scaffold took too long. Your prompt is still saved — use Quick Fill or try AI Draft again."*
- Network Launch Plan setup preview made more prominent with an explicit hint that the full plan appears on the dashboard.

### 2. AI Draft Scaffold Hardening
- Defensive `extractJsonObject()` strips markdown fences and leading prose; raw provider text never leaks to the UI.
- AI output normalization tightened: 5 hubs max, 3 collections per hub, 1 starter idea per collection, 8 starter ideas total.
- Hub names and within-hub collection names de-duplicated via " (2)", " (3)", … suffixes.
- `visibility` forced to `"private"` regardless of model output.
- Post-normalization no-hubs guard returns `code: "invalid_response"` rather than handing the UI an empty scaffold.
- Friendly error UI: bold headline, preserved-state line, conditional Quick Fill / continue-with-current-scaffold hint, collapsed raw error details.
- Distinct success copy: Quick Fill shows **"Filled locally (no AI): …"**, AI shows **"AI drafted: … — review before saving"**.
- Scaffold remains proposal-only — nothing auto-saved, nothing auto-published.

### 3. Starter Guide Creation Pipeline
- Launch Plan dashboard panel relabeled as **"Starter Build Queue"** ("Recommended first guides"), with explicit "suggestions only" copy and per-card guide type + difficulty.
- "Create this guide" handoff carries richer context: `networkName`, `networkType`, `goal`, `reason`.
- The prompt sent to the Network Guide Generator is built by `buildStarterGuideHandoffPrompt()` and includes network name, type, hub + collection placement, format, optional goal/reason, and a closing "Do not publish automatically" instruction.
- Source tracking distinguishes `launch_plan_priority_guide` from `starter_guide_idea`; the generator renders a corresponding "Creating from Launch Plan" / "Creating from Starter Guide Idea" context card.
- Session-only **"Started in this session"** marker (sessionStorage key `guideforge:startedGuideTitles:{networkId}`); button label flips to "Continue draft" / "Continue from idea" after click. Never persisted to Supabase.
- No auto-generation / no auto-save / no auto-publish.

### 4. Domain-Aware Scaffold Templates
Five domains tuned end-to-end (registry → keyword detection → hub defaults → collection seeds → starter guide ideas → build-plan first steps):
- **gaming / QuestLine-style**
- **tech repair / Techsperts-style**
- **SOP / business**
- **home / family**
- **creator / community**

Highlights:
- Tech repair defaults are now **Safety Procedures, Diagnostics & Testing, Common Device Issues, Tools & Equipment, Repair Walkthroughs** with device-specific collections (Phone Repair, Computer Troubleshooting, Wi-Fi & Network Issues, Printer Problems).
- Gaming defaults gained **Gear & Farming** and a dedicated **PvP / Competitive** path.
- SOP defaults gained **Customer Support, Quality Control, Escalation & Issues, Sales & Follow-Up**.
- Home gained **Meal Planning** and **Budgeting & Finances**.
- Creator gained **Community Management** and **Brand & Sponsorships**.
- AI scaffold route adds a compact per-domain shape hint (`DOMAIN_SHAPE_HINTS`) when the requested type is recognized; tokens kept compact.
- Templates remain proposal-only and fully editable in the Starter Pages step.

### 5. Domain-Aware Guide Generation Profiles
- New `lib/guideforge/guide-generation-profiles.ts` registry with six profiles: gaming, tech_repair, small_business, home_systems, creator_workflow, general.
- `resolveGuideGenerationProfile({ networkType, guideType, prompt, hubName, collectionName })` — precedence: networkType (UI registry id OR DB NetworkType) → prompt/hub/collection keyword detection → `general`.
- AI prompt receives a compact `DOMAIN PROFILE` block (tone, must-include, avoid, preferred sections, quality rules, safety notes) via `buildNetworkGuidePrompt`. Only injected when the profile is non-general so the prompt stays compact.
- Mock Preview now uses profile-specific section structures via `generateMockResponse(request, profile?)` — swaps the gaming-leaning `MOCK_TEMPLATES` for the profile's preferred sections; domain-specific deterministic body text for the most safety- and structure-critical sections.
- Generator context card shows **"Generation profile: {label}"** when the profile is non-general.
- **Tech repair profile** is safety-first / diagnosis-first / escalation-aware: Safety First → Symptoms → Tools & Requirements → Initial Triage → Step-by-Step Fix → Verify the Repair → When to Escalate → Documentation Notes.
- **Gaming profile** is QuestLine-style: Overview → When to Use This → Requirements / Setup → Step-by-Step Strategy → Common Mistakes → Quick Reference → Next Steps.
- **SOP / home / creator** profiles each have their own preferred sections.
- Profile guidance is proposal-only — no auto-generate, no auto-publish.

---

## Current Files of Interest

### Docs
- `docs/GUIDEFORGE_PRODUCT_ROADMAP.md`
- `docs/GUIDEFORGE_FULL_TEST_PLAN.md`
- `docs/GUIDEFORGE_TEST_FINDINGS.md`
- `docs/GUIDEFORGE_AI_BUILDER_CORE.md`
- `docs/GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md`
- `docs/GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md`

### Core logic
- `lib/guideforge/network-types.ts` — domain registry (keywords + labels)
- `lib/guideforge/smart-fill-network.ts` — Quick Fill, hub defaults, collection seeds, starter guide ideas, build plan first steps
- `lib/guideforge/guide-generation-profiles.ts` — domain profile registry + resolver + prompt renderer
- `lib/guideforge/ai-builder-core.ts` — `generateNetworkGuide`, `toNetworkGuideBuilderRequest`, network-context flow
- `lib/guideforge/ai-prompts.ts` — `buildNetworkGuidePrompt` with optional `profileInstructions`
- `lib/guideforge/mock-generator.ts` — `generateMockResponse(request, profile?)` and `buildProfileSections`
- `lib/guideforge/intake-session.ts` — `StarterGuideIdeaHandoff` + `buildStarterGuideHandoffPrompt` + started-this-session helpers
- `lib/guideforge/create-network-scaffold.ts` — scaffold orchestration, gated debug logs, hub/collection error context

### UI / routes
- `components/guideforge/builder/create-network-form.tsx` — Quick Fill, AI Draft Scaffold, Launch Plan preview, success copy with `Template: …` label
- `components/guideforge/builder/generator-client.tsx` — Network Guide Generator, handoff context card with "Generation profile: …", `networkType` prop
- `components/guideforge/builder/network-dashboard-tabs.tsx` — Launch Plan / Starter Build Queue, Suggested starter guides, started-session marker
- `components/guideforge/builder/starter-pages-editor.tsx` — empty-hubs state
- `app/builder/network/[networkId]/generate/page.tsx` — passes `networkType={ctx.network.type}`
- `app/api/guideforge/generate-network-scaffold/route.ts` — defensive JSON extraction, normalized scaffold, domain shape hints
- `app/api/guideforge/generate-guide/route.ts` — accepts `networkType / hubName / collectionName`, resolves profile, injects guidance

---

## Manual Retest Priority

### Retest 1 — Flow 1: Network Creation / Quick Fill
Tech repair prompt:
> *Build a tech repair guide network for home users and junior technicians. Include hubs for phone repair, computer troubleshooting, Wi-Fi issues, printer problems, safety warnings, tool requirements, and step-by-step repair checklists.*

Expected:
- Template label: **Tech Repair / Troubleshooting Network**
- Prompt remains in the textarea
- Broad network name (e.g., "Home Tech Repair Guide Network", not "Phone Repair Hub")
- Hubs cover **Safety, Diagnostics, Common Device Issues, Tools, Repair Walkthroughs**
- **No repeated 400s** in the console during hub creation
- **No noisy `[v0]`** payload/result logs
- Starter Pages editor works (rename, reorder, remove)
- Forge Rules editor works
- Create Network completes
- Dashboard loads

### Retest 2 — Flow 2: AI Draft Scaffold
Use the same tech repair prompt with AI Draft Scaffold.

Expected:
- Prompt remains in the textarea
- AI either succeeds with domain-appropriate scaffold OR fails gracefully
- No form wipe on failure
- Quick Fill remains usable
- Success / failure copy is clear ("AI drafted: …" green; "AI Draft did not finish. Your prompt and current setup are still saved here." red)
- No raw provider text shown anywhere

### Retest 3 — Gaming Quick Fill
Prompt:
> *Build a network for World of Warcraft character builds, raid guides, patch notes, and beginner tutorials.*

Expected:
- Template label: **Gaming Guide Network**
- Hubs include **Beginner Guides, Builds & Loadouts, Boss Guides, Patch Notes, Gear & Farming**
- QuestLine-like starter guide ideas (First-Hour Beginner Roadmap, Beginner-Friendly Build Starter Guide, First Boss Mechanics Checklist, Patch Summary & Player Impact Guide, Gear Priority Guide)
- Build plan first steps make sense (beginner path → high-value build → boss / encounter reference → patch / gear summary)

### Retest 4 — Flow 6: Launch Plan → Create This Guide

**For tech repair:**
- Click *Safety Procedures Before Any Repair*, *Initial Triage Checklist*, or *Wi-Fi Troubleshooting Starter Guide* from the Starter Build Queue
- Generator opens
- Context card shows **"Creating from Launch Plan"**
- **Generation profile: Techsperts-style Tech Repair**
- Mock Preview sections:
  - Safety First
  - Symptoms
  - Tools & Requirements
  - Initial Triage
  - Step-by-Step Fix
  - Verify the Repair
  - When to Escalate
  - Documentation Notes
- Initial Triage **appears before** Step-by-Step Fix
- No auto-generation
- No auto-publish
- Send to Editor opens the draft/private editor

**For gaming:**
- Click a beginner / build / boss / patch starter item
- **Generation profile: QuestLine-style Gaming**
- Mock Preview sections:
  - Overview
  - When to Use This
  - Requirements / Setup
  - Step-by-Step Strategy
  - Common Mistakes
  - Quick Reference
  - Next Steps

### Retest 5 — SOP / Creator / Home Smoke Tests

**SOP prompt:**
> *Build a network for a service business onboarding process, customer intake, daily operations, quality checks, and escalation procedures.*

**Creator prompt:**
> *Build a creator community network for YouTube publishing, Discord management, content planning, analytics, and sponsorship readiness.*

**Home prompt:**
> *Build a family home systems network for weekly chores, meal planning, school routines, maintenance, budgeting, and emergency prep.*

Expected for each:
- Domain template is sensible (right hubs, right defaults)
- Starter guide ideas are not generic / repeated
- Mock Preview sections match the profile (Purpose / Owner / Procedure / Escalation for SOP; Goal / Workflow / Publishing Checklist / Community Follow-Up for creator; Goal / Supplies / Steps / Family Roles / Repeat Schedule for home)

---

## Known Deferred Work

- Full manual test phase still pending — Retests 1–5 above are the primary backlog.
- Standalone Single Guide / Checklist builders are **not yet aligned** with domain-aware guide generation profiles (they go through a different code path: `single_guide_asset` / `checklist_asset` builder kinds + `mock-asset-generator.ts`).
- Durable planning persistence remains **future Step 7** — starter ideas and build plans stay session-only.
- Bulk generation from launch plan remains **future Step 8** — user still creates one guide at a time.
- QuestLine template productization remains **future Step 9** — the current QuestLine pages are editorially hardcoded, not yet a reusable template.
- Techsperts adapter implementation remains future and is **separate from this GuideForge repo**.
- Provider routing / cost-control expansion remains future (`anthropic` reserved but not enabled).
- Real SVG / brand asset integration remains future (forged badge, wordmark, etc.).
- Responsive / mobile bug pass remains **after** core flow testing.

---

## Guardrails for Next Assistant

- **Do not** start a new feature lane until Retest 1–4 are completed.
- If P0 / P1 issues appear during retesting, fix those first before any other work.
- **Do not mark any flow as Pass** unless the user actually tested it and reports the result.
- **Do not persist** starter guide ideas or build plans to Supabase until a dedicated schema planning pass is approved.
- Keep generation **proposal-only** and **review-first** — no auto-create, no auto-save, no auto-publish.
- Keep Techsperts and QuestLine described as **powered-by GuideForge examples**, not replacements.
- Keep TypeScript at **0 errors**. Run `npx tsc --noEmit` after any code change.

---

## Recommended Next Chat Prompt

**Continuation Prompt** — copy/paste this when opening the next session:

```
I am continuing work on GuideForge.

Current status:
- TypeScript is clean at 0 errors.
- GuideForge is in Step 6: manual testing and quality tuning.
- Tonight we added network creation reliability fixes, AI scaffold hardening, Starter Build Queue handoff, domain-aware scaffold templates, and domain-aware guide generation profiles.
- GuideForge is still the structured knowledge engine.
- QuestLine is the gaming network proof/demo powered by GuideForge.
- Techsperts is a separate repair/support product that can reuse GuideForge patterns.

Do not start new features yet.
First help me retest:
1. Network Creation / Quick Fill
2. AI Draft Scaffold
3. Gaming Quick Fill
4. Launch Plan → Create This Guide
5. Domain-specific Mock Preview sections

Use docs/GUIDEFORGE_OVERNIGHT_HANDOFF.md and docs/GUIDEFORGE_TEST_FINDINGS.md as ground truth.

When I paste screenshots/logs/results:
- classify severity
- update the test findings
- suggest a targeted fix bundle
- do not invent pass/fail results
```

---

## Related docs

- `GUIDEFORGE_PRODUCT_ROADMAP.md` — current step, ten-step roadmap, near-term lanes, non-goals, guardrails
- `GUIDEFORGE_FULL_TEST_PLAN.md` — 14 test areas; the master manual test plan
- `GUIDEFORGE_TEST_FINDINGS.md` — triage log + Open Bug Queue + Next Fix Bundle Recommendation
- `GUIDEFORGE_AI_BUILDER_CORE.md` — architecture / contract for AI generation
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — Techsperts reuse spec
- `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` — QuestLine template spec
- `GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md` — durable current-state snapshot for future-session handoff

Platform planning docs (documentation only — no files have moved):

- `PLATFORM_MONOREPO_PLAN.md` — platform monorepo architecture plan
- `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping
- `SHARED_ENGINE_VOCABULARY_MAP.md` — neutral-to-product terminology map
- `MONOREPO_MIGRATION_CHECKLIST.md` — step-by-step migration checklist
- `AI_ASSISTANT_MONOREPO_PROTOCOL.md` — assistant operating rules inside the monorepo
