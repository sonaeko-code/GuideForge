# GuideForge AI Builder Core

Developer reference for the shared AI generation architecture.
**Read this before building a new generation flow.**

---

## Prompt-First Principle

The user's prompt is the source of truth. **Never mutate, clear, or overwrite it.**

- Quick Fill fills structured fields from the prompt. The prompt stays in the textarea.
- Suggest Structure fills guide type, difficulty, hub, and collection. The prompt stays unchanged.
- Generate creates a draft using the prompt + form context. The prompt is passed as-is.

---

## Builder Kinds

Defined in `lib/guideforge/ai-builder-core.ts` as `GuideForgeBuilderKind`:

| Kind | Description | Migration Status |
|------|-------------|-----------------|
| `single_guide_asset` | Step-by-step guide saved to workspace | ✅ Migrated — uses `generateGuideForgeDraft()` |
| `checklist_asset` | Multi-section checklist saved to workspace | ✅ Migrated — uses `generateGuideForgeDraft()` |
| `network_guide` | Guide belonging to a network hub/collection | ✅ Migrated — uses `generateGuideForgeDraft()` via `buildNetworkGuideGenerationRequest()` |
| `network_scaffold` | Hubs + collections + starter guides for a new network | ✅ AI mode active — `POST /api/guideforge/generate-network-scaffold` + Quick Fill via `smartFillNetwork()` |

---

## Shared Request Shape

```typescript
generateGuideForgeDraft({
  kind: GuideForgeBuilderKind,
  prompt: string,           // never mutated
  mode: "mock" | "ai" | "smart_fill",
  networkContext?: {
    networkId, networkName, networkType,
    hubId, hubName, collectionId, collectionName,
    forgeRules
  },
  assetContext?: {
    assetType, guideType, audience, difficulty
  },
  rules?: {
    forgeRules: string[],
    verificationRequired, contentStandard, aiPolicy
  },
  target?: {
    type: "workspace_asset" | "network_collection" | "network_scaffold",
    networkId, hubId, collectionId
  },
  formData?: Record<string, any>   // legacy pass-through for unmigrated flows
})
```

---

## Generation Modes

| Mode | Description | Network call? |
|------|-------------|--------------|
| `mock` | Local deterministic generation. Fast, no API key. | No |
| `ai` | OpenAI call. Validates structured output before returning. | Yes |
| `smart_fill` | Heuristic field extraction only. No content generation. | No |

**Mock mode never calls AI.** It uses `mock-asset-generator.ts` (assets) or `mock-generator.ts` (network guides).

**AI mode must validate output** against the relevant schema before returning to the UI. See `ai-generation-validation.ts` and `ai-prompts.ts` for repair prompts on validation failure.

---

## What Each Flow Currently Uses

### Single Guide Asset (`/builder/generate-asset/single_guide`)
- Entry: `generate-single-guide-client.tsx`
- Fill: `AIIntakeLadder` → Quick Fill (`parseRoughIdea`) or Smart Fill (`/api/guideforge/intake-refine`)
- Generate: `generateGuideForgeDraft({ kind: "single_guide_asset" })`
- Save: `StructuredAssetProposal` → `saveStructuredAssetToWorkspace()`
- Persistence: Supabase `asset_drafts`

### Checklist Asset (`/builder/generate-asset/checklist`)
- Entry: `generate-checklist-client.tsx`
- Fill: `AIIntakeLadder` (same as above)
- Generate: `generateGuideForgeDraft({ kind: "checklist_asset" })` → `generateChecklist()` via `ai-generation-client.ts`
- Save: `StructuredAssetProposal` → `saveStructuredAssetToWorkspace()`
- Persistence: Supabase `asset_drafts`

### Network Guide Generator (`/builder/network/[networkId]/generate`)
- Entry: `generator-client.tsx`
- Fill: Suggest Structure → `classifyNetworkGuidePrompt()` (heuristic, no AI)
- Generate: `generateGuideForgeDraft({ kind: "network_guide", mode })` via `buildNetworkGuideGenerationRequest()` + `toNetworkGuideBuilderRequest()` adapter
- formData: source metadata (`_source`) is merged onto the adapter output; existing adapter fields are preserved
- Save: `createAndSaveGuideDraft()` → redirect to guide editor
- Source tracking: `handoffSource` state distinguishes `"manual_prompt"` from `"starter_guide_idea"`; written to `formData._source` on every generation request
- AI mode calls `/api/guideforge/generate-guide` via relative URL — this is safe from the browser client; server-side callers must use an absolute URL
- Provider routing: `resolveGuideForgeProviderRoute({ mode, task: "network_guide" })` is called inside `generateNetworkGuide()`; its result drives `generatedBy` and is the extension point for adding Claude or other providers

### Network Scaffold (`/builder/network/new` → `forge-rules-editor`)
- Entry: `create-network-form.tsx`
- Fill: **Quick Fill** → `smartFillNetwork()` (heuristic, instant, no AI call) — or **AI Draft Scaffold** → `generateGuideForgeDraft({ kind: "network_scaffold", mode: "ai" })` → `POST /api/guideforge/generate-network-scaffold`
- Scaffold: `SmartFillScaffoldSuggestion` with hubs, collections, and `starterGuideIdeas` (proposal-only). AI output is adapted via `aiScaffoldToSmartFillSuggestion()` + `aiScaffoldToSmartFillResult()` before being passed to the same `scaffoldDraftFromSmartFill()` / `generateNetworkBuildPlan()` helpers used by Quick Fill.
- AI endpoint: returns `GeneratedNetworkScaffold` (name, description, type, theme, hubs with collections and starterGuideIdeas). Provider: openai via `resolveGuideForgeProviderRoute({ mode: "ai", task: "network_scaffold" })`.
- Domain scaffold templates: both Quick Fill (`smartFillNetwork()`) and AI Draft Scaffold use the same domain template registry (`NETWORK_TYPE_REGISTRY` in `network-types.ts`) for keyword detection, `typeSpecificKeywordToHub` + per-type `defaults` (in `smart-fill-network.ts`) for hub selection, and `HUB_TO_COLLECTIONS` + `COLLECTION_GUIDE_IDEAS` for collection / starter-guide shapes. The AI route adds a compact per-domain shape hint to the prompt (`DOMAIN_SHAPE_HINTS`) when the requested type is recognized. Currently covered: gaming (QuestLine-style), tech_repair (Techsperts-style), small_business (SOP), home_systems (home/family), creator_workflow (creator/community). All templates are proposal-only and fully editable in the Starter Pages step.
- Domain-aware guide generation profiles: `lib/guideforge/guide-generation-profiles.ts` resolves a `GuideGenerationProfile` from networkType + guideType + prompt + hub/collection (precedence: networkType → keyword detection → `general`). Profiles cover gaming (QuestLine-style), tech_repair (Techsperts-style), small_business (SOP), home_systems (home/family), creator_workflow (creator/community), and `general`. The profile drives: (a) a compact instruction block appended to the AI prompt via `buildNetworkGuidePrompt` (tone, must-include, avoid, preferred sections, safety notes); (b) Mock Preview section structure — `generateMockResponse(request, profile?)` swaps the gaming-leaning `MOCK_TEMPLATES` for the profile's preferred sections when the resolver returns a non-general domain. The generator UI shows a `Generation profile: …` line in the Launch Plan context card. Profile guidance is proposal-only: nothing is auto-generated, nothing is auto-published, nothing is saved until the user chooses Send to Editor.
- AI response handling (route-side hardening):
  - `extractJsonObject()` strips markdown fences and leading prose before `JSON.parse`. Raw provider output is never returned to the UI.
  - `normalizeNetworkScaffold()` enforces safe limits regardless of model output: 5 hubs max, 3 collections per hub, 1 starter idea per collection, 8 starter ideas total. Hub names + collection-within-hub names are de-duplicated by appending " (2)", " (3)", … . Visibility is always forced to `"private"` (scaffold creation is proposal-only).
  - A post-normalization no-hubs guard returns `code: "invalid_response"` rather than handing the UI an empty scaffold.
  - The route remains proposal-only — no guides, hubs, or networks are created by the AI route itself.
- Save: `forge-rules-editor.tsx` → `createNetworkScaffold()` → `save-network-skeleton.ts`
- No Supabase writes in the scaffold step. `starterGuideIdeas` are session-only — not auto-created.

---

## Forge Rules

Forge Rules are governance metadata (verification level, content standard, AI policy). They are:
- Collected in Step 4 (`forge-rules-editor.tsx`) of the wizard
- Stored in `WizardDraft` in sessionStorage during creation
- Passed as `rules` in `GuideForgeBuilderRequest` for future AI calls
- **Not yet persisted to Supabase** — no schema column exists for this yet

---

## AI Provider Routing

Defined in `lib/guideforge/ai-provider-routing.ts`.

### Types

| Type | Values | Description |
|------|--------|-------------|
| `GuideForgeAIProvider` | `"openai" \| "anthropic" \| "mock"` | All providers GuideForge can route to |
| `GuideForgeGenerationTask` | `"network_guide" \| "single_guide_asset" \| ...` | One per `GuideForgeBuilderKind` |
| `GuideForgeProviderMode` | `"mock" \| "ai"` | Caller's requested mode |
| `GuideForgeProviderRoute` | `{ provider, isRealAI, task, mode }` | Resolved route returned by the helper |

### Resolution rules

`resolveGuideForgeProviderRoute(input)`:
- `mode === "mock"` → `provider: "mock"`, `isRealAI: false`
- `requestedProvider === "anthropic"` → falls back to `"openai"` (reserved; not yet enabled)
- Default AI path → `provider: "openai"`, `isRealAI: true`

**Cost-control extension point:** Add budget/quota logic in `resolveGuideForgeProviderRoute()` before any API call reaches a route handler.

### Error normalization

`normalizeGuideForgeAIError(err, provider, task?)` maps the `AUTH_ERROR` / `QUOTA_ERROR` / `OPENAI_ERROR` strings used by all three `callOpenAI()` helpers into a typed `GuideForgeAIError` with a canonical `GuideForgeAIErrorCode`.

### Adding Claude (future)

1. Add `ANTHROPIC_API_KEY` to env
2. Implement a Claude route handler (e.g. `/api/guideforge/generate-guide-claude`)
3. Remove the fallback in `resolveGuideForgeProviderRoute()` for `"anthropic"`
4. Update `generateNetworkGuide()` in `ai-builder-core.ts` to branch on `route.provider`

---

## What Remains to Migrate

1. **Forge Rules persistence** — requires a Supabase schema column

---

## Terminology Reference

| Term | Meaning |
|------|---------|
| Quick Fill | Local heuristic field extraction from prompt. Instant, no network call. Prompt unchanged. |
| Smart Fill | AI-powered field extraction via `/api/guideforge/intake-refine`. Prompt unchanged. |
| Suggest Structure | Heuristic classification for network guide type, difficulty, hub, collection. Prompt unchanged. |
| Generate | Creates draft content (mock or AI). Returns a structured proposal for review. |
| Forge Rules | Network governance metadata. Context for generation, not a separate builder. |
| Scaffold | Hubs + collections + guide ideas generated for a new network. |
| Starter Guide Ideas | Proposal-only suggestions shown during scaffold preview. Not auto-created. |

---

## Intake Session Flow

When a user enters a rough idea at the Welcome screen:
1. `WelcomeIntakePanel` calls `routeIdea()` → recommends a builder path
2. `writeIntakeSession()` stores the idea + result in sessionStorage
3. The target builder page reads `readIntakeSession()` on mount
4. `clearIntakeSession()` is called after hydration

The intake idea is the prompt. It must not be cleared or mutated by the builder.

---

## Starter Guide Idea Handoff

Starter guide ideas are scaffold suggestions shown during network creation. They are **never persisted to Supabase** and **never auto-created**.

### Flow

1. `forge-rules-editor.tsx` creates the network and gets the new `networkId`.
2. It re-runs `smartFillNetwork(draft.roughIdea)` to re-derive the scaffold's `starterGuideIdeas`.
3. Top 6 ideas are written to sessionStorage via `writeNetworkStarterIdeas(networkId, ideas)`.
4. The network dashboard (`NetworkDashboardTabs`) reads these ideas on mount and shows a **Suggested starter guides** panel.
5. User clicks **Create from idea** (suggested starter ideas panel) or **Create draft** (launch-plan "Starter build queue") → the selected idea is written as a `StarterGuideIdeaHandoff` via `writeStarterGuideHandoff(networkId, handoff)`, then router navigates to the generator.
6. The handoff prompt is built via `buildStarterGuideHandoffPrompt()`, which produces a richer, domain-generic prompt that includes the network name + type, hub + collection placement, guide type/difficulty, and (for launch-plan handoffs) the launch goal + priority reason. The prompt always ends with "Do not publish automatically."
7. The handoff payload carries `source: "starter_guide_idea"` (suggested panel) or `source: "launch_plan_priority_guide"` (launch-plan queue). The generator reads + clears the handoff on mount, prefills prompt/guideType/difficulty/hub/collection, and renders a **"Creating from Launch Plan" / "Creating from Starter Guide Idea"** context card above the prompt with placement and a "Review before generating. Nothing is saved until you send to editor." note.
8. Source is forwarded into AI Builder Core via `_source` in `formData` (one of `manual_prompt | starter_guide_idea | launch_plan_priority_guide`).
9. No content is auto-generated. The user reviews all fields before clicking Generate. Mock Preview and AI Generate remain explicit user actions.
10. The dashboard tracks a session-only "Started in this session" marker per network using `addStartedGuideTitle` / `getStartedGuideTitles` (sessionStorage key `guideforge:startedGuideTitles:{networkId}`, keyed by lowercased idea title). Never written to Supabase; cleared on tab close.

### Storage Keys

| Key | Contents |
|-----|----------|
| `guideforge:starterGuideIdeas:{networkId}` | `NetworkStarterIdeas` — list of ideas for the panel |
| `guideforge:starterGuideHandoff:{networkId}` | `StarterGuideIdeaHandoff` — single selected idea for the generator |
| `guideforge:startedGuideTitles:{networkId}` | `string[]` — lowercased titles the user has clicked Create on this session (UX hint only) |

### Session-Only Guarantees

- Both keys use sessionStorage, not localStorage or Supabase.
- Ideas disappear after tab/browser close (expected — shown as a disclaimer).
- The panel is dismissible and clears the key.
- The handoff is single-use: the generator clears it immediately on read.
- If hub/collection cannot be matched by name, the generator shows a warning and leaves selects empty.
- No guides are created until the user explicitly clicks Generate and Send to Editor.

---

## Dashboard Panel Behavior

| Panel | Default state | When shown |
|-------|--------------|------------|
| Network Snapshot (stats + CTA) | Always visible | Always |
| Trust & Standards (Governance) | **Open by default** | Always (hideable via native `<details>`) |
| Network Launch Plan | Visible, compact | Only when sessionStorage key present |
| Suggested Starter Guides | Visible | Only when launch plan absent AND starter ideas present |
| Tabs (Drafts, Pending, Published…) | Always visible | Always |

Trust & Standards defaults open because governance is core to GuideForge's value proposition.
Network Launch Plan is the preferred session-only next-step panel when present.
Suggested Starter Guides is a fallback shown when no launch plan exists.
Create this guide still uses the session-only handoff (`writeStarterGuideHandoff`) regardless of which panel triggers it.

---

## Network Build Plan

The network build plan is a richer, type-aware planning layer generated alongside the scaffold. It is **never persisted to Supabase** and **never triggers any automatic actions**.

### What it contains

| Field | Description |
|-------|-------------|
| `goal` | One-sentence launch goal for the network type |
| `firstSteps` | Ordered list of 5 action items to take after saving |
| `priorityGuides` | Top 6 starter guides with reasons and creation order |
| `creationOrder` | Hub-level order strings (hub name + collections) |
| `readinessChecklist` | Pre-launch items with computed `done` state |
| `nextSteps` | 5 narrative steps shown at the bottom of the panel |

### Flow

1. `forge-rules-editor.tsx` calls `generateNetworkBuildPlan(sfResult)` after writing starter ideas.
2. The plan is written to sessionStorage via `writeNetworkBuildPlan(networkId, plan)`.
3. The network dashboard reads the plan on mount and shows a compact **Network launch plan** panel.
   - Always visible: goal, top 3 priority guides with **Create this guide** buttons, top 3 first steps.
   - Collapsed `<details>` ("View full launch plan"): remaining guides, remaining steps, checklist, next steps.
4. When `buildPlan` is present, the **Suggested starter guides** panel is suppressed — the build plan's priority guides already cover those ideas via the same `handleCreateFromIdea` handoff.
5. When `buildPlan` is absent but `starterIdeas` is present, **Suggested starter guides** shows as before.
6. The panel is dismissible; dismiss clears the sessionStorage key.
7. In the wizard preview step (`create-network-form.tsx`), a compact `<details open>` shows goal + top 3 first steps + top 3 priority guides; a nested closed `<details>` holds the rest.

### Storage Key

| Key | Contents |
|-----|----------|
| `guideforge:networkBuildPlan:{networkId}` | `NetworkBuildPlan` — full plan object |

### Session-Only Guarantees

- Uses sessionStorage. Disappears on tab/browser close.
- No Supabase writes.
- No auto-generation or auto-publishing.
- Panel is dismissible and clears only the sessionStorage key.
- `NetworkBuildPlanIdea` is a structural superset of `NetworkStarterIdeas["ideas"][number]` — can be passed directly to `handleCreateFromIdea`.
- **Starter guides and build plan ideas are the same data** (both come from `starterGuideIdeas[0]` of each collection). The build plan is the preferred entry point when present.

---

## Related docs

Higher-level product / planning / testing context lives in:

- [`GUIDEFORGE_PRODUCT_ROADMAP.md`](./GUIDEFORGE_PRODUCT_ROADMAP.md) — product north star, current step, ten-step roadmap, near-term lanes, non-goals, guardrails.
- [`GUIDEFORGE_FULL_TEST_PLAN.md`](./GUIDEFORGE_FULL_TEST_PLAN.md) — manual test plan to run after the TypeScript-clean milestone.
- [`GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md`](./GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md) — how GuideForge patterns can power Techsperts without replacing it.
- [`GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md`](./GUIDEFORGE_QUESTLINE_TEMPLATE_SPEC.md) — productized gaming network template.
- [`GUIDEFORGE_OVERNIGHT_HANDOFF.md`](./GUIDEFORGE_OVERNIGHT_HANDOFF.md) — handoff after the recent build session: what changed, retest priority, deferred work, continuation prompt.
- [`GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md`](./GUIDEFORGE_CURRENT_BUILD_OVERVIEW.md) — durable snapshot of where GuideForge is right now: major systems, recent work, deferred work, retest priority, continuation prompt.

Platform planning docs (the AI builder contracts in this file are the extraction target for `packages/ai`):

- [`PLATFORM_MONOREPO_PLAN.md`](./PLATFORM_MONOREPO_PLAN.md) — target workspace structure; `packages/ai` responsibilities defined there.
- [`GUIDEFORGE_TECHSPERTS_SHARED_CORE.md`](./GUIDEFORGE_TECHSPERTS_SHARED_CORE.md) — shared AI principle and extraction order.
- [`SHARED_ENGINE_VOCABULARY_MAP.md`](./SHARED_ENGINE_VOCABULARY_MAP.md) — neutral terminology for shared package boundaries.

This file (AI Builder Core) is the **architecture / contract** doc. The product / process docs and platform planning docs above are its context. All layers should agree before any new generation flow is built.
