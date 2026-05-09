# Generate Network Skeleton MVP — Phase 1 Inspection Report

## Existing Infrastructure

### Routes & Pages
- ✓ `/builder/network/[networkId]/generate/page.tsx` — Exists, loads network context
- ✓ `/builder/networks/page.tsx` — All Networks page (entry point for "Generate Network")
- ✓ `/builder/network/new/page.tsx` — Manual network creation (will remain untouched)
- ✓ `/builder/network/scaffold/page.tsx` — Scaffold-based network creation (can be reused)

### Client Components
- ✓ `GeneratorClient` — Guide generator UI for existing networks (can extend for network skeleton)
- ✓ `create-collection-form.tsx` — Collection creation form
- ✓ `create-hub-form.tsx` — Hub creation form
- ✓ `create-network-form.tsx` — Network creation form
- ✓ `create-network-scaffold.ts` — Orchestrates batch network/hub/collection creation

### Generation Infrastructure
- ✓ `generation-schemas.ts` — Full contract for GeneratedGuide, GeneratedHub, GeneratedNetwork, etc.
- ✓ `normalize-generated-guide.ts` — Converts GeneratedGuide → Guide
- ✓ `mock-generator.ts` — Mock implementation of guide generation (no real AI yet)
- ✓ `create-and-save-guide-draft.ts` — Saves generated guides as drafts to Supabase

### Creation Helpers
- ✓ `createNetwork(draft)` — Creates network in Supabase
- ✓ `createHub(networkId, data)` — Creates hub in Supabase
- ✓ `createCollection(networkId, hubId, data)` — Creates collection in Supabase
- ✓ `createNetworkScaffold(template, overrides)` — Orchestrates batch scaffold creation

### Data Contracts
- `GeneratedGuide` contract already supports:
  - title, slug, summary, type, difficulty, estimatedMinutes
  - sections (GeneratedGuideSection[]) → maps to steps
  - requirements, warnings, tags
  - targetNetworkId, targetHubId, targetCollectionId
  - author, reviewer, generatedAt, generatedBy

- `GeneratedHub` contract exists but is minimal
- `GeneratedNetwork` contract exists but is minimal
- `GenerationRequest` exists for guide generation — does NOT include network intake fields

## What Already Works
1. ✓ Guide generation (mock) works end-to-end
2. ✓ Guide generation UI has form fields: prompt, guideType, preferredDifficulty
3. ✓ Network/Hub/Collection creation helpers are proven
4. ✓ Batch scaffold creation works (uses same helpers)
5. ✓ Generated guides can be saved to Supabase as drafts
6. ✓ No dependencies on Vercel Supabase integration (using standard supabase-js)
7. ✓ GeneratorClient is modular and can be extended

## What Needs Building

### Phase 2: Entry Point
- Need: "Generate Network Skeleton" button on All Networks page
- Routes to: `/builder/network/generate` (new route, not network-specific)

### Phase 3: Intake UI
- Extend GenerationRequest contract for network-level intake
- Fields: topic, audience, purpose, tone, number of hubs, collections per hub, guide ideas per collection
- Create new GenerateNetworkSkeletonClient component

### Phase 4-5: Generation Function
- Create `generateNetworkSkeleton()` function that:
  - Calls mock or real AI
  - Returns structured network proposal (network + hubs + collections + guide ideas)
  - Uses the extended `GeneratedNetwork` contract
- Extend GeneratedNetwork to include `suggestedHubs[]` with nested collections and guide ideas

### Phase 6: Proposal Review UI
- Display: network, hubs, collections, guide ideas
- Stats: count of each
- Edit controls: remove individual items (MVP)

### Phase 7-9: Save & Dashboard Integration
- Implement `saveNetworkSkeleton()` using existing `createNetworkScaffold()`
- Create guide placeholders as drafts (using existing create-and-save-guide-draft)
- Route to network dashboard after save

## Summary for Handoff

| Item | Status | Notes |
|------|--------|-------|
| Entry point (/generate page) | Exists (for guides) | Can create new network-level `/builder/network/generate` |
| Intake UI | Partial (guide-only) | Need to extend for network skeleton |
| AI infrastructure | Ready (mock) | Mock generator exists, no OpenAI keys needed for MVP |
| Creation helpers | Complete | All network/hub/collection creation proven in production |
| Data contracts | Partial (guides complete, network/hub minimal) | Need to extend GeneratedNetwork/Hub for rich skeleton |
| Saving | Complete (guides) | Network scaffold creation already implemented |
| Build system | Complete | No new dependencies needed |

No schema changes required. No new packages needed. Reuse existing patterns.

## Next Steps
- Phase 2: Add entry point button & route
- Phase 3: Design intake form component
- Phase 4: Extend AI generation contract for networks
- Phase 5: Write `generateNetworkSkeleton()` using mock generator
- Phase 6: Build proposal review UI
- Phase 7-9: Implement save and dashboard flow
