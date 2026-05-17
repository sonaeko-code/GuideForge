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
| `network_guide` | Guide belonging to a network hub/collection | ⏳ Stub — active flow in `generator-client.tsx` |
| `network_scaffold` | Hubs + collections + starter guides for a new network | ⏳ Stub — active flow in `smart-fill-network.ts` + `forge-rules-editor.tsx` |

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
- Generate: `generateMockResponse()` or `fetch("/api/guideforge/generate-guide")`
- Save: `createAndSaveGuideDraft()` → redirect to guide editor
- **Not yet on builder core.** Use `toNetworkGuideBuilderRequest()` adapter when migrating.

### Network Scaffold (`/builder/network/new` → `forge-rules-editor`)
- Entry: `create-network-form.tsx`
- Fill: Quick Fill → `smartFillNetwork()` (heuristic — not the AI Smart Fill from AIIntakeLadder)
- Scaffold: `SmartFillScaffoldSuggestion` with hubs, collections, and `starterGuideIdeas` (proposal-only)
- Save: `forge-rules-editor.tsx` → `createNetworkScaffold()` → `save-network-skeleton.ts`
- **Not yet on builder core.** `starterGuideIdeas` are shown in the preview but not persisted in this bundle.

---

## Forge Rules

Forge Rules are governance metadata (verification level, content standard, AI policy). They are:
- Collected in Step 4 (`forge-rules-editor.tsx`) of the wizard
- Stored in `WizardDraft` in sessionStorage during creation
- Passed as `rules` in `GuideForgeBuilderRequest` for future AI calls
- **Not yet persisted to Supabase** — no schema column exists for this yet

---

## What Remains to Migrate

1. **Network guide generator** — move `generateMockResponse()` and `/api/guideforge/generate-guide` calls into `generateNetworkGuide()` handler in `ai-builder-core.ts`
2. **Network scaffold with AI** — add an `/api/guideforge/generate-scaffold` endpoint for AI-powered scaffold generation and wire it to `generateNetworkScaffold()` in `ai-builder-core.ts`
3. **Forge Rules persistence** — requires a Supabase schema column

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
