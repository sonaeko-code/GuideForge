# GuideForge AI Builder Architecture

## Overview

GuideForge uses a **single shared AI Builder Core** that serves all generation flows. This prevents duplication of generation logic, error handling, and mode switching across multiple pages and components.

This is analogous to Techsperts' diagnosis/intake intelligence layer — a central brain that understands how to generate structured content for different contexts.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         GuideForge AI Builder Core                         │
│         (lib/guideforge/ai-builder-core.ts)               │
│                                                             │
│  • Unified GuideForgeBuilderRequest contract               │
│  • Routes by builder kind                                 │
│  • Applies context & Forge Rules                          │
│  • Returns GuideForgeBuilderResult                        │
│  • Handles mock and AI modes                              │
│                                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Network Guide    Single Guide     Checklist
    Generator        Asset Generator   Generator
    (page + client)   (page + client)   (page + client)
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    Mock Generator              AI Generation Client
    (mock-generator.ts)          (ai-generation-client.ts)
         │                               │
         └───────────────┬───────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        Client-Side             Server Endpoint
        (immediate)             (/api/guideforge/*)
```

## Builder Kinds

Currently implemented:
- **network_guide** — Guide generation within a network's hub/collection
- **single_guide_asset** — Standalone guide asset in workspace
- **checklist_asset** — Standalone checklist asset in workspace

Future (placeholder):
- **network_scaffold** — Smart-fill network structure generation
- **recipe_asset** — Structured recipe creation
- **sop_asset** — Standard Operating Procedure generation
- **troubleshooting_asset** — Troubleshooting flow generation

## Builder Request Contract

```typescript
interface GuideForgeBuilderRequest {
  kind: GuideForgeBuilderKind           // What to build
  prompt: string                         // User's input
  mode: "mock" | "ai"                   // Generation mode
  
  networkContext?: NetworkContext        // For network_guide
  assetContext?: AssetContext            // For standalone assets
  userContext?: UserContext              // User info
  outputPreferences?: OutputPreferences  // Style/format hints
  
  formData?: Record<string, any>        // Raw form data
}
```

## Builder Result Contract

```typescript
interface GuideForgeBuilderResult {
  kind: GuideForgeBuilderKind
  mode: GenerationMode
  success: boolean
  
  // On success
  title?: string
  summary?: string
  structuredPayload?: GeneratedGuide | GeneratedChecklist | ...
  
  // Context
  assumptions?: string[]
  missingInfo?: string[]
  warnings?: string[]
  
  // Save instructions
  saveTargetHint?: {
    type: "network_collection" | "workspace_asset" | "network_scaffold"
    targetId?: string
  }
  
  // On error
  error?: string
  stage?: string  // validation | generation | normalization | etc
}
```

## Flow: User Generates a Network Guide

1. User navigates to `/builder/network/[networkId]/generate`
2. Page loads `GeneratorClient` with network context (hubs, collections)
3. User fills form: prompt, guide type, difficulty, selects hub + collection
4. User clicks "Mock Preview" or "AI Generate"
5. `GeneratorClient` creates `GuideForgeBuilderRequest`:
   ```javascript
   {
     kind: "network_guide",
     prompt: "Dragon slaying strategy guide",
     mode: "mock",  // or "ai"
     networkContext: { networkId, hubId, collectionId, forgeRules },
     outputPreferences: { difficulty: "intermediate" },
     formData: { guideType: "boss-guide", ... }
   }
   ```
6. `GeneratorClient` calls `generateGuideForgeDraft(request)`
7. Core routes to `generateNetworkGuide()` handler
8. Handler calls appropriate mock or AI generation logic
9. Core normalizes output into `GuideForgeBuilderResult`
10. `GeneratorClient` displays JSON preview
11. User clicks "Send to Editor"
12. `GeneratorClient` uses `saveTargetHint` to route to correct save function

## Generation Modes

### Mock Preview
- **Client-side** — No API call required
- **Instant** — ~600ms for visual feedback
- **Purpose** — Quick preview of structure, test form flow
- **Output** — Realistic placeholder content using templates

### AI Generate
- **Server-side** — Calls OpenAI/Claude via `/api/guideforge/*` endpoint
- **Requires API key** — Configured via environment
- **Slower** — 5-30 seconds depending on provider
- **Purpose** — Real AI-generated content
- **Fallback** — Can suggest "Try Mock Preview instead" on error

## Consistency Across Flows

All builder flows use the same language and patterns:

| Element | Language |
|---------|----------|
| Mode selection | "Mock Preview" / "AI Generate" |
| In progress | "Generating..." |
| Timeout | "AI generation is taking too long. Try again or use Mock Preview." |
| Preview heading | "Generated draft preview" |
| Action button | "Send to Editor" or "Save to Workspace" |
| Error | Friendly message with recovery path |

## Migration Path

### Phase 1: Establish Core (✅ COMPLETE)
- Core created with unified contract in `ai-builder-core.ts`
- Unified `GuideForgeBuilderRequest` and `GuideForgeBuilderResult` contracts defined
- Placeholder handlers exist for all builder kinds

### Phase 2: Migrate Checklist (✅ COMPLETE — Migration Pass 1)
- **Checklist Asset Builder** fully migrated to core
- `generateChecklistClient.tsx` calls `generateGuideForgeDraft({ kind: "checklist_asset", ... })`
- Handler `generateChecklistAsset()` reuses existing mock and AI generators
- All features preserved: Mock Preview ✅, AI Generate ✅, Smart Fill ✅, Save ✅
- No breaking changes, backward compatible

### Phase 3: Migrate Single Guide Asset (PLANNED)
- Similar complexity to checklist but smaller scope
- Location: `/builder/generate-asset/single_guide`
- Component: `generate-single-guide-client.tsx`

### Phase 4: Migrate Network Guide (PLANNED)
- Largest migration, most complex generation logic
- Location: `/builder/network/[networkId]/generate`
- Component: `generator-client.tsx`

### Phase 5: Future Builders (PLANNED)
- Network Scaffold Smart Fill (heuristic-based prefill)
- Recipe Asset generation
- SOP and Troubleshooting Asset generation

## Advantages

1. **Single source of truth** — One generation entry point
2. **Consistent error handling** — All flows handle errors the same way
3. **Easier testing** — Test core separately from UI
4. **Future-proof** — New builder types just add a case
5. **Shared intelligence** — Idea parsing, Forge Rules, context apply everywhere
6. **Better UX** — Consistent language and patterns across all builders

## Files

- `lib/guideforge/ai-builder-core.ts` — Core contract and routing
- `lib/guideforge/generation-schemas.ts` — Generated asset shapes
- `lib/guideforge/mock-generator.ts` — Mock generation for network guides
- `lib/guideforge/mock-asset-generator.ts` — Mock generation for assets
- `lib/guideforge/ai-generation-client.ts` — AI generation helpers
- `components/guideforge/builder/generator-client.tsx` — Network guide UI (being migrated)
- `components/guideforge/builder/generate-single-guide-client.tsx` — Single guide UI
- `components/guideforge/builder/generate-checklist-client.tsx` — Checklist UI
