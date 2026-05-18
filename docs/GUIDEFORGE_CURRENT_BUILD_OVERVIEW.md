# GuideForge Current Build Overview

> A single, durable snapshot of where GuideForge is right now. Designed for
> future ChatGPT / Claude / v0 sessions to read first so they can pick up the
> work without re-grepping the codebase.
>
> Pair with `GUIDEFORGE_OVERNIGHT_HANDOFF.md` (what just changed),
> `GUIDEFORGE_TEST_FINDINGS.md` (live triage log), and
> `GUIDEFORGE_PRODUCT_ROADMAP.md` (the ten-step roadmap).

---

## 1. Executive Summary

GuideForge is currently a structured knowledge-building platform that helps users turn rough prompts into organized guide networks.

It is intended to become the engine / infrastructure for:
- **QuestLine-style gaming guide networks**
- **Techsperts-style repair / support knowledge systems**
- **SOP / business playbooks**
- **home / family systems**
- **creator / community workflow networks**
- future structured knowledge networks

Current project phase:
- **Step 6 of 10**
- Manual testing and quality tuning
- TypeScript baseline is **clean at 0 errors** as of the recent stabilization pass
- Feature work should pause until the highest-priority manual test findings are known

---

## 2. Product North Star

GuideForge should eventually support this flow:

```
Prompt
  → AI understands the network type
  → creates a network scaffold
  → creates hubs
  → creates collections
  → suggests starter guides
  → creates a launch plan
  → user reviews
  → user creates draft guides one by one (or later, in controlled batches)
  → guides go through review / publish governance
  → public structured knowledge site is produced
```

Important:
- GuideForge is **review-first**.
- It should **not auto-publish**.
- It should **not create bulk content** without user confirmation.
- Starter guide ideas and build plans are **session / proposal-level** until a later persistence pass.

---

## 3. Platform Relationship

| Product | Role |
|---|---|
| **GuideForge** | Structured knowledge engine / infrastructure. |
| **QuestLine** | Gaming guide / community network proof / demo powered by GuideForge. |
| **Techsperts** | Separate repair / support product that can reuse GuideForge patterns. |

GuideForge does **not** replace Techsperts. Techsperts keeps its diagnosis-first repair flow, technician escalation, and repair-specific governance.

GuideForge can inform Techsperts through:
- diagnosis-first guide structure
- safety-first repair guidance
- checklist / SOP asset types
- review / publish governance
- Forge Rules
- verified / provisional status language
- AI provider / cost-control patterns
- structured knowledge organization

---

## 4. Major Systems Currently Present

### Creator Workspace
- Private workspace for generated / saved assets.
- **My Assets** area.
- Standalone guide / checklist drafts.
- View / edit / attach-to-network flows.

### Network Builder
- Network creation flow at `/builder/network/new`.
- **Quick Fill** — heuristic, instant, prompt-preserving.
- **AI Draft Scaffold** — `POST /api/guideforge/generate-network-scaffold`.
- **Starter Pages editor** — rename / reorder / remove / add hubs and collections.
- **Forge Rules setup** — verification level, content standard, AI policy (sessionStorage during creation).
- Dashboard after create.

### Networks / Hubs / Collections
- Networks contain hubs.
- Hubs contain collections.
- Collections hold guides / assets.
- Dashboard shows stats and tabs (Drafts / Pending Review / Published / Guides / Hubs / Collections).
- Public pages exist for published network content under `/n/[networkSlug]`.

### Single Guide Builder
- Standalone guide generation at `/builder/generate-asset/single_guide`.
- Save to workspace.
- Asset detail pages.

### Checklist Builder
- Standalone checklist generation at `/builder/generate-asset/checklist`.
- Save to workspace.
- Asset detail pages.

### Network Guide Generator
- Generate guides inside a network context at `/builder/network/[id]/generate`.
- Supports **Mock Preview** and **AI Generate**.
- Receives context from manual prompt or **Launch Plan handoff**.
- User must Send to Editor before saving.
- **No auto-publish**.

### Review / Publish Flow
- Draft / private flow exists.
- Submit / review / publish flow exists with vote weights, eligibility checks, and publish guards.
- Public visibility depends on publish status.
- Pending / private content stays hidden publicly.

### Public Network Pages
- Public network route exists at `/n/[networkSlug]`.
- Public hub / guide pages exist.
- Private / pending content remains hidden.

---

## 5. Documentation Added

| Doc | Purpose |
|---|---|
| `GUIDEFORGE_PRODUCT_ROADMAP.md` | Product direction, 10-step roadmap, active Step 6 testing phase. |
| `GUIDEFORGE_FULL_TEST_PLAN.md` | Manual test plan covering 14 areas. |
| `GUIDEFORGE_TEST_FINDINGS.md` | Triage log for manual testing. Do **not** mark flows as Pass unless the user tested them. |
| `GUIDEFORGE_AI_BUILDER_CORE.md` | Architecture / contract doc for AI builder flows. |
| `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` | How GuideForge patterns could power Techsperts later. |
| `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` | QuestLine as a GuideForge-powered gaming template. |
| `GUIDEFORGE_OVERNIGHT_HANDOFF.md` | Immediate continuation doc after the latest build session. |

---

## 6. Recent Stabilization Work

### TypeScript Stabilization
- Project reached **0 TypeScript errors**.
- Major clusters cleaned:
  - asset detail page
  - network hub / collection builder pages
  - public `app/n` routes
  - Supabase persistence typing
  - builder component types
  - remaining lib / helper types

### Network Creation Reliability
- Legacy `networks.hub_ids` post-insert update removed (column does not exist in the live schema).
- Repeated 400 console errors during scaffold save addressed.
- Noisy `[v0]` payload / result logs gated behind `DEBUG_NETWORK_SAVE` / `DEBUG_SCAFFOLD` flags. Real `console.error` calls preserved.
- Network creation flow preserved.
- Quick Fill preserved.
- Dashboard load preserved.

### AI Draft Scaffold Reliability
- Defensive JSON extraction (`extractJsonObject`) tolerates markdown fences and leading prose.
- Raw provider text no longer exposed to the UI.
- Output normalization limits added (5 hubs, 3 collections per hub, 1 starter idea per collection, 8 total).
- Duplicate hub / collection name handling via " (2)", " (3)", … suffixes.
- AI failure copy improved (*"AI Draft did not finish. Your prompt and current setup are still saved here."*).
- Prompt / form state preserved on failure.
- Quick Fill remains usable as a fallback.

---

## 7. Starter Build Queue / Launch Plan Improvements

The Network Launch Plan was improved into a more useful **Starter Build Queue**.

Current behavior:
- Launch plan recommends first guides.
- Cards show title, placement, type / difficulty where available.
- User can click **"Create draft"** (priority guide) or **"Create from idea"** (suggested starter ideas panel).
- Handoff opens the Network Guide Generator with a **"Creating from Launch Plan"** / **"Creating from Starter Guide Idea"** context card.
- Generator receives **richer context**: network name, network type, hub, collection, guide type, difficulty, optional goal and reason.
- User still must click **Mock Preview** or **AI Generate**.
- Nothing is saved until **Send to Editor**.
- Nothing is published automatically.
- **"Started this session"** marker is **session-only** (sessionStorage; not persisted to Supabase).

Important:
- This is **not** durable planning persistence yet.
- This is **not** bulk generation yet.
- This is a controlled bridge from scaffold planning to guide drafting.

---

## 8. Domain-Aware Scaffold Templates

GuideForge has domain-aware network scaffolding shared by Quick Fill and AI Draft Scaffold.

Supported domains:
- gaming / QuestLine-style
- tech repair / Techsperts-style
- SOP / business
- home / family
- creator / community

### Gaming / QuestLine-style
**Hubs** should include:
- Beginner Guides
- Builds & Loadouts
- Bosses / Encounters
- Patch Notes
- Gear & Farming
- PvP / Competitive (when the prompt is competitive)

**Starter ideas** should include:
- First-Hour Beginner Roadmap
- Beginner-Friendly Build Starter Guide
- Boss Mechanics Quick Reference
- Patch Summary & Player Impact Guide
- Gear Priority Guide for Fresh Max-Level Characters

### Tech Repair / Techsperts-style
**Hubs** should include:
- Safety Procedures
- Diagnostics & Testing (triage)
- Common Device Issues
- Tools & Equipment
- Repair Walkthroughs
- Preventive Maintenance
- Escalation & Support

**Starter ideas** should include:
- Safety Procedures Before Any Repair
- Initial Triage Checklist
- Common Issues Quick Reference
- Required Tools Overview
- Wi-Fi Troubleshooting Starter Guide
- Printer Troubleshooting Checklist

### SOP / Business
**Hubs** should include:
- Onboarding
- Daily Operations
- Customer Support
- Quality Control
- Escalation & Issues
- Team Training

### Home / Family
**Hubs** should include:
- Family Routines (chores)
- Meal Planning
- Seasonal Maintenance
- School / Kids routines
- Budgeting & Finances
- Emergency & Safety

### Creator / Community
**Hubs** should include:
- Content Planning
- Publishing
- Community Management (Discord / comments)
- Analytics & Growth
- Brand & Sponsorships
- Platform guides

---

## 9. Domain-Aware Guide Generation Profiles

GuideForge has guide generation profiles that shape generated drafts.

**Key file:** `lib/guideforge/guide-generation-profiles.ts`

Profiles:
- **QuestLine-style Gaming**
- **Techsperts-style Tech Repair**
- **SOP / Business Process**
- **Home / Family Systems**
- **Creator / Community Workflow**
- **General**

Profiles affect:
- AI prompt instructions (compact `DOMAIN PROFILE` block in `buildNetworkGuidePrompt`)
- Mock Preview section structure (`generateMockResponse(request, profile?)` swaps default templates)
- Generator context card label ("Generation profile: …")
- Tone
- Must-include guidance
- Preferred sections
- Safety / quality rules where relevant

### Tech repair profile
- Safety-first
- Diagnosis-first (initial triage before any fix)
- Tools / requirements
- Step-by-step fix
- Verification
- Escalation criteria
- Provisional until reviewed (safety notes call this out explicitly)

### Gaming profile
- Player-facing
- When to use this
- Requirements / setup
- Step-by-step strategy
- Common mistakes
- Quick reference
- Next steps

### SOP profile
- Purpose
- Trigger / when to use this SOP
- Owner / roles
- Inputs required
- Procedure
- Quality check
- Escalation
- Review cadence

### Home profile
- Goal
- When to do this
- Supplies
- Steps
- Family roles
- Troubleshooting
- Repeat schedule

### Creator profile
- Goal
- Before you start
- Workflow
- Publishing checklist
- Community follow-up
- Analytics review
- Reuse template

---

## 10. Current Known Deferred Work

- Full manual testing still pending — Retests 1–5 below are the immediate backlog.
- Standalone Single Guide / Checklist builders are **not yet** fully aligned with domain-aware generation profiles (they use a different builder kind / mock generator path).
- **Durable planning persistence** is future Step 7 (starter ideas / build plans stay session-only until then).
- **Bulk draft generation** from launch plan is future Step 8.
- **QuestLine** full template / productization is future Step 9 (current QuestLine pages are editorially hardcoded).
- **Techsperts adapter** implementation is future and **separate** from this GuideForge repo.
- **Provider routing / cost-control** expansion is future (`anthropic` reserved but not enabled).
- **Real brand / SVG asset integration** is future (forged badge, wordmark, etc.).
- **Responsive / mobile** pass should happen after core flow testing.
- Monetization remains later.
- Full public-site template generation remains future.

---

## 11. Current Testing Status

**Manual testing is active but incomplete.**

Test findings are tracked in:
- `docs/GUIDEFORGE_TEST_FINDINGS.md`

**Do not mark flows as Pass unless actually tested by the user.**

Current priority retests:
1. **Flow 1 — Network Creation / Quick Fill**
2. **Flow 2 — AI Draft Scaffold**
3. **Gaming Quick Fill**
4. **Flow 6 — Launch Plan → Create This Guide**
5. **SOP / Creator / Home smoke tests**

### Tech repair prompt
> *Build a tech repair guide network for home users and junior technicians. Include hubs for phone repair, computer troubleshooting, Wi-Fi issues, printer problems, safety warnings, tool requirements, and step-by-step repair checklists.*

### Gaming prompt
> *Build a network for World of Warcraft character builds, raid guides, patch notes, and beginner tutorials.*

---

## 12. Recommended Next Work Order

1. **Retest Flow 1 and Flow 2** with the tech repair prompt.
2. **Retest gaming Quick Fill** with the WoW prompt.
3. **Retest Flow 6 Launch Plan → Create This Guide** for both tech repair and gaming (verify the "Generation profile: …" line and profile-specific Mock Preview sections).
4. **Log findings** in `docs/GUIDEFORGE_TEST_FINDINGS.md`.
5. **Fix P0 / P1 issues only** in tightly scoped follow-up bundles.
6. **Continue Flows 3–14** from the full test plan after the core flows are clean.
7. **Only after the core flows pass** should new feature lanes resume.
8. Next likely feature lane after testing (pick one, with the user):
   - Align standalone Single Guide / Checklist builders with domain-aware generation profiles
   - Begin durable planning persistence design (Step 7)
   - Begin QuestLine template productization (Step 9)

---

## 13. Guardrails for Future AI Assistants

- **Do not re-architect** the app.
- **Do not rename tables.**
- **Do not weaken** public / private visibility rules.
- **Do not auto-publish.**
- **Do not bulk-generate** without explicit approval.
- **Do not persist** starter guide ideas / build plans until schema planning is approved.
- **Do not mark untested flows** as passing.
- **Keep GuideForge as the engine.**
- **Keep QuestLine** as a powered-by GuideForge demo / template.
- **Keep Techsperts** as a separate product that can reuse GuideForge patterns.
- **Keep TypeScript at 0 errors.** Run `npx tsc --noEmit` after any code change.
- **Prefer focused bundles** based on real test findings, not speculative refactors.

---

## 14. Continuation Prompt

Copy / paste this when opening the next session:

```
I am continuing GuideForge after the current build overview.

Use these docs as ground truth:
- docs/GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md
- docs/GUIDEFORGE_OVERNIGHT_HANDOFF.md
- docs/GUIDEFORGE_TEST_FINDINGS.md
- docs/GUIDEFORGE_PRODUCT_ROADMAP.md
- docs/GUIDEFORGE_AI_BUILDER_CORE.md

Current status:
- GuideForge is in Step 6: manual testing and quality tuning.
- TypeScript was clean at 0 errors after the recent stabilization passes.
- Recent work added network creation reliability fixes, AI scaffold hardening, Starter Build Queue handoff, domain-aware scaffold templates, and domain-aware guide generation profiles.
- Do not start a new feature lane until the priority retests are done.

Help me retest:
1. Flow 1 — Network Creation / Quick Fill
2. Flow 2 — AI Draft Scaffold
3. Gaming Quick Fill
4. Flow 6 — Launch Plan → Create This Guide
5. SOP / Creator / Home smoke tests

When I paste results:
- classify severity
- update test findings
- suggest a targeted fix bundle
- do not invent pass/fail results
```

---

## Related docs

- `GUIDEFORGE_PRODUCT_ROADMAP.md` — current step, ten-step roadmap, near-term lanes, non-goals, guardrails
- `GUIDEFORGE_FULL_TEST_PLAN.md` — 14 test areas; master manual test plan
- `GUIDEFORGE_TEST_FINDINGS.md` — triage log + Open Bug Queue + Next Fix Bundle Recommendation
- `GUIDEFORGE_AI_BUILDER_CORE.md` — architecture / contract for AI generation
- `GUIDEFORGE_OVERNIGHT_HANDOFF.md` — what changed in the latest build session + continuation prompt
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — Techsperts reuse spec
- `GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md` — QuestLine template spec
- `current-build-state.md` — audited Supabase persistence flows (pre-stabilization snapshot)
