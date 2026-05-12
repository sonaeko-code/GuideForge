# Scalable Generation Architecture for GuideForge

This document outlines the future generation model for GuideForge, designed to support assets of all sizes without timing out, enable staged user review, and scale to networks, hubs, and collections.

## Current State (Phase 1)

### Small Asset Generation
- **Scope**: Single Guides and Checklists up to 5 sections, 5 items per section
- **Method**: One AI call (GPT-4o-mini via Vercel AI Gateway)
- **Route**: `POST /api/guideforge/generate-{asset-type}`
- **Speed**: 10–25 seconds
- **Cost**: ~$0.02–0.05 per asset
- **User Experience**: 
  - User fills intake form or uses Smart Fill
  - Click "Generate"
  - Waits for single AI response
  - Reviews proposal
  - Saves to workspace

### Intake Refinement (Smart Fill)
- **Route**: `POST /api/guideforge/intake-refine`
- **Purpose**: Extract structured fields from user's rough idea
- **Method**: One AI call to parse and infer guide metadata
- **Output**: Pre-filled form fields ready for generation
- **Benefits**: Faster drafting for users; pre-seeded context improves generation quality

### Mock Generation (Fallback)
- **Routes**: `generateSingleGuideMock`, `generateChecklistMock` in `lib/guideforge/mock-asset-generator.ts`
- **Purpose**: Provide instant preview and fallback if AI is unavailable
- **Quality**: Generic placeholders; useful for testing, not production
- **Used When**: `provider === "mock"` or AI generation fails

---

## Proposed Future Phases

### Phase 2: Large Checklist Outline Mode

**Problem**: Checklists with 6+ sections or 8+ items per section take >30 seconds or timeout.

**Solution**: Two-step outline-first generation.

**Flow**:
1. User specifies large checklist (e.g., 8 sections, 10 items each)
2. Click "Generate Outline"
3. **Step 1 (5–8 sec)**: AI generates section titles and item placeholders only
   - No detailed descriptions or tips
   - Faster, cheaper, no timeout risk
   - Output: `{ sections: [{ title, items: [{ label, description: "" }] }] }`
4. User reviews outline structure
5. Click "Expand Details" or save as-is
6. **Step 2 (if expand)**: AI generates missing descriptions/tips in batches
   - See Phase 3

**Routes to Add**:
- `POST /api/guideforge/checklist-outline` — Generate outline only
- `POST /api/guideforge/checklist-expand-section` — Expand one section's details

**Benefits**:
- No timeouts for large checklists
- User can approve structure before expensive detail generation
- Cheaper: outline is ~20% the cost of full generation

---

### Phase 3: Section-Batched Generation

**Problem**: Expanding a 50-item checklist in one call is expensive and slow.

**Solution**: Batch section expansion with staged prompts.

**Flow**:
1. User has outline with empty sections
2. Click "Expand All Details"
3. **Step 1**: Queue sections for batch processing
   - Split into chunks of 2–3 sections per call
   - Total: 3–4 AI calls instead of 1 giant call
   - Total time: 20–40 seconds instead of 60+ seconds
4. **Step 2**: Combine results into full checklist
5. **Step 3**: User reviews expanded draft before save

**Routes to Add**:
- `POST /api/guideforge/checklist-batch-expand` — Expand N sections in parallel/sequence
  - Input: `{ outlineId, sectionIndices: [0, 1, 2], concurrency: 2 }`
  - Output: Stream or wait for all sections

**Cost Estimate**:
- Outline: $0.005 per checklist
- Expansion: $0.01–0.02 per section
- Total: $0.10–0.25 for 8 sections × 10 items

**Benefits**:
- Scales to 50+ item checklists
- Consistent quality via smaller prompts
- User can review each batch

---

### Phase 4: Large Guide Batched Generation

**Problem**: Guides with 20+ steps are rare but should be supported.

**Solution**: Chapter-based outline + batch step expansion.

**Flow**:
1. User specifies 15+ step guide
2. Click "Generate"
3. **Step 1 (5 sec)**: AI generates chapter breakdown
   - Input: Guide idea, suggested # chapters
   - Output: `{ chapters: [{ title, stepCount, focus }] }`
4. **Step 2 (20–30 sec)**: AI generates steps within each chapter
   - Each chapter = 1 API call
   - Parallel or sequential based on concurrency setting
5. **Step 3**: Combine chapters into full guide
6. User reviews before save

**Routes to Add**:
- `POST /api/guideforge/single-guide-outline` — Generate chapter structure
- `POST /api/guideforge/single-guide-batch-expand` — Expand chapters to steps

**Cost Estimate**:
- Outline: $0.01
- Expansion: $0.02–0.04 per chapter
- Total: $0.10–0.20 for 4 chapters

**Benefits**:
- Supports guides with 30+ steps
- Better organization via chapters
- Chunks for review and refinement

---

### Phase 5: Network Blueprint Generation

**Problem**: Networks require coordinated generation of multiple assets (hubs, collections, guides, checklists).

**Solution**: Blueprint-first generation with staged asset creation.

**Flow**:
1. User specifies network idea ("A comprehensive Python learning network")
2. Click "Generate Network Blueprint"
3. **Step 1 (8–12 sec)**: AI generates network structure
   - Input: Network idea, scope, audience
   - Output: `{ title, summary, hubs: [{ title, collections: [{ title, assetCount }] }] }`
   - No assets generated yet; just metadata
4. **Step 2 (5–10 sec)**: User reviews blueprint
5. Click "Generate Network"
6. **Step 3** (optional, staged): Generate hubs/collections/starter assets
   - Each hub = 1 call to generate metadata
   - Each collection = optional call to generate asset list
   - Optional: Generate 1–2 starter assets per hub as examples

**Routes to Add**:
- `POST /api/guideforge/network-blueprint` — Generate network outline
- `POST /api/guideforge/network-generate-hub` — Generate one hub with collections
- `POST /api/guideforge/network-generate-assets` — Generate starter assets for a hub

**Cost Estimate**:
- Blueprint: $0.05
- Hub generation: $0.02–0.05 per hub
- Total: $0.20–0.50 for a 5-hub network blueprint

**Benefits**:
- Users see full structure before commitment
- Incremental asset generation reduces latency
- Aligns with user mental model (network → hubs → collections → assets)

---

### Phase 6: Staged Hub/Collection/Asset Generation

**Problem**: Publishing a full network takes too long if all assets are generated at once.

**Solution**: Publish blueprint first, generate assets on-demand or in background.

**Flow**:
1. User has approved network blueprint
2. Click "Publish"
3. **Step 1**: Publish network + hubs + collections (no assets yet)
4. **Step 2** (background/on-demand):
   - Generate starter assets for each hub in a queue
   - Show progress bar: "Generating hub assets... 2 of 8 complete"
   - Allow user to browse network while generation continues
5. **Step 3**: When user visits a hub, show generated assets + option to "Generate More"

**Routes to Add**:
- `POST /api/guideforge/queue-network-generation` — Queue hub assets for generation
- `GET /api/guideforge/network-generation-status/{networkId}` — Poll progress
- Webhook/subscription: Asset ready notifications

**Database Changes**:
- Add `generation_queue` table (assetType, status, eta, error)
- Add `AssetDraft.generationQueueId` for tracking

**Cost Estimate**:
- Spread over time; billed as assets are generated
- User pays only for assets they use

**Benefits**:
- Publish instantly; content available incrementally
- Better UX: no 2–5 minute wait for full network
- Reduces perceived latency; more responsive

---

## Cost Control Rules

### Model Selection
- **Small assets** (under 3 min runtime): Use `gpt-4o-mini` (fast, cheap)
- **Large assets** (outline/batch stage): Use `gpt-4o-mini` for all stages; break into smaller prompts
- **Network blueprint**: Use `gpt-4o-mini` for structure, `gpt-4` only if user pays for "premium generation"

### Token Budget
- **Single guide**: Max 4,000 input tokens (~1,500 words user input + prompt)
- **Single checklist**: Max 3,000 input tokens
- **Network blueprint**: Max 2,000 input tokens (minimal detail)

### Timeout Rules
- **Small generation**: 30-second timeout (current)
- **Outline generation**: 15-second timeout (faster, cheaper)
- **Batch expansion**: 45-second timeout per batch (multiple calls OK)
- **Network blueprint**: 20-second timeout

### Fallback Behavior
- If AI generation fails: Try mock generation
- If mock fails: Show error + offer to try again or contact support
- If user cancels: Don't bill for partial generation

### Caching & Drafts
- Cache generation results during proposal review (no re-generation if user navigates away and back)
- Store drafts in `asset_drafts` table with `generation_id` reference
- Allow user to download proposal JSON for offline storage

---

## Implementation Roadmap

| Phase | Effort | Timeline | User Impact |
|-------|--------|----------|-------------|
| 1 (Current) | Complete | Now | Small guides/checklists work |
| 2 | Medium | Q2 2026 | Large checklists with outline mode |
| 3 | Medium | Q3 2026 | Batch expansion for checklists |
| 4 | Medium | Q3 2026 | Large guides with chapters |
| 5 | High | Q4 2026 | Network blueprints |
| 6 | High | Q1 2027 | Staged network publishing |

---

## Monitoring & Analytics

### Metrics to Track
- Generation success rate (% of requests that complete without error)
- Average generation time by asset type
- Token usage per asset (monitor for prompt bloat)
- User abandonment rate (% who start generation but don't save)
- Cache hit rate (% of repeated generations served from cache)

### Logging
- Log every generation request with: asset type, complexity, tokens used, duration, status
- Flag slow generations for investigation (> 30 sec for small, > 60 sec for large)
- Alert on failure spikes

### Dashboard
- "Generation Health" panel: success rate, avg time, error log
- "Popular Patterns": Most-generated asset types, typical sizes
- "Cost Analysis": Tokens/cost per asset type, batch vs. single efficiency

---

## Design Decisions & Rationale

### Why Outline-First for Large Assets?
- Prevents timeouts by splitting generation into smaller, parallelizable steps
- Improves user experience: users see structure before waiting for details
- Reduces cost: outline is cheap; user can choose not to expand if satisfied

### Why Batch by Sections/Chapters?
- Smaller prompts = more consistent quality (less context loss)
- Parallelizable: can generate sections in parallel (future optimization)
- Checkpoints: user can review mid-way and request changes

### Why Network Blueprint Separate from Asset Generation?
- Network structure is fast to generate; assets are slow
- Users want to see network layout before committing to asset creation
- Enables incremental growth: publish skeleton, fill in content over time

### Why Keep Mock Generation?
- Fallback when AI is unavailable
- Useful for testing & development
- Users can preview interface without API costs

---

## Open Questions for Future Refinement

1. **Concurrency**: Should batch expansion run sections in parallel or serial? (Cost vs. latency tradeoff)
2. **User Preferences**: Should users be able to specify "quality level" (cheap/fast vs. detailed/thorough)?
3. **Feedback Loop**: Should users be able to give feedback on generated content to improve future generations?
4. **Versioning**: Should users be able to regenerate assets and merge versions?
5. **Permissions**: Who can generate networks/hubs? Should there be generation quotas per user?

---

## References

- Current generation routes: `app/api/guideforge/generate-*.ts`
- Intake refinement: `app/api/guideforge/intake-refine/route.ts`
- Mock generation: `lib/guideforge/mock-asset-generator.ts`
- AI config: `lib/guideforge/ai-generation-config.ts`
- Types: `lib/guideforge/ai-generation-types.ts`, `lib/guideforge/generation-schemas.ts`
