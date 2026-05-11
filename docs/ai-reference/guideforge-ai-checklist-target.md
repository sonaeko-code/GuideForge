# GuideForge AI Checklist Target Architecture

## Goal

Implement a **Techsperts-inspired verified-first pattern** for GuideForge checklist generation. Prioritize reuse of existing drafts, call AI only when needed, and treat AI output as proposable draft content (not auto-published).

## Current State (as of this fix)

- **Model:** gpt-4o-mini (fast, cost-effective)
- **Approach:** One AI call, no repair loops (MVP)
- **Output:** Draft/proposal (not published until user confirms)
- **Error Handling:** Structured JSON, timeout protection
- **Database:** Existing asset_drafts table (no schema changes needed)

## Target Flow

```
User clicks "Generate AI Checklist"
  ↓
Check for existing draft (reuse if available)
  ↓
If draft exists & user accepts: Use existing draft
If no suitable draft: Proceed to AI generation
  ↓
Call OpenAI with timeout protection (10s)
  ↓
Validate schema, validate quality
  ↓
Save as new draft (asset_drafts table)
  ↓
Show draft to user with "AI Generated" badge
  ↓
User can review, edit, save, or discard
  ↓
User promotes draft to published guide (or deletes)
```

## Implementation Phases

### Phase 1: MVP (Current - this fix)
- [x] Model: gpt-4o-mini
- [x] One AI call only
- [x] Timeout protection (10s OpenAI, 15s route)
- [x] Structured JSON errors (never Vercel 504)
- [x] No repair loops
- [x] Save to existing asset_drafts

### Phase 2: Draft Reuse (Future)
- [ ] Before AI call, check asset_drafts for similar/recent draft
- [ ] If found, offer user: "Use existing draft" or "Generate new"
- [ ] Reuse exact match without calling AI again
- [ ] Reduces API calls and latency

### Phase 3: Quality Metrics (Future)
- [ ] Track validation failure rates by model/prompt
- [ ] Surface metrics in admin dashboard
- [ ] Use metrics to inform KB curation or model selection

### Phase 4: KB Integration (Future)
- [ ] Migrate high-quality verified drafts → KB guides
- [ ] Mark KB guides as `source: "kb"` (verified)
- [ ] Maintain provisional guides as `source: "provisional"`
- [ ] Copy Techsperts' verified-first lookup pattern

## Data Schema

No schema changes needed. Uses existing tables:

### asset_drafts (Existing)
```typescript
{
  id: string
  guideId: string
  title: string
  sections: Array<{
    sectionTitle: string
    items: Array<{ itemTitle: string }>
  }>
  source: "mock" | "openai" | "manual" | "provisional" // future: "provisional"
  generatedAt?: timestamp
  // ... existing fields
}
```

### Future: KB Guides Table (Not built yet)
```typescript
{
  id: string
  title: string
  sections: Array<{
    sectionTitle: string
    items: Array<{ itemTitle: string }>
  }>
  source: "kb" (verified guides)
  verifiedAt: timestamp
  verifiedBy: string
  // ... metadata
}
```

## AI Input Shape

```typescript
{
  title: string // e.g., "Onboard a new team member"
  audience: string // e.g., "HR Managers"
  purpose: string // e.g., "Structured process"
  goal: string // e.g., "Ensure consistency"
  tone: string // e.g., "professional"
  numberOfSections: number // 1-8
  itemsPerSection: number // 1-12
  useCase: string // optional context
  optionalContext: string // optional details
}
```

## AI Output Shape (Simple)

```typescript
{
  title: string
  sections: Array<{
    sectionTitle: string
    items: Array<{ itemTitle: string }>
  }>
}
```

## Constraints

- **Max Tokens:** 2000 (MVP, controlled output size)
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Model:** gpt-4o-mini (fast, cost-effective)
- **Timeout:** 10s OpenAI call, 15s route total
- **Retries:** None (MVP: fail fast, let user retry)

## Validation Rules

### Schema Validation
- title: non-empty string
- sections: array with 1-8 items
- each section has sectionTitle and items array (1-12 items)
- each item has itemTitle

### Quality Validation
- title: not generic (not "Checklist", "Guide", "Steps")
- items: not too short (min 5 chars), not too generic
- coverage: at least 3 sections with substantive items
- variety: items aren't just repetitions of the title

## Error Responses

All errors return JSON (never HTML 504):

```typescript
// Timeout
{
  success: false
  error: "AI generation is taking too long. Please try again."
  stage: "openai_timeout"
}

// Validation
{
  success: false
  error: "AI returned an incomplete checklist. Please try again or use Mock Preview."
}

// Quality
{
  success: false
  error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview."
}
```

## User Workflow

1. Navigate to checklist builder
2. Fill in form (title, audience, purpose, goal)
3. Select AI Generate or Mock Preview
4. If AI Generate:
   - Calls `/api/guideforge/generate-checklist`
   - Receives draft or error
   - If success: Shows draft with "AI Generated" badge
   - User can review, edit, save, or discard
5. If Mock Preview: Shows sample data immediately

## Success Metrics (Future)

- AI call success rate (% that pass validation)
- Average generation time (target: <5s)
- User acceptance rate (% of generated drafts that are saved)
- Cost per generation (gpt-4o-mini baseline)
- Reuse rate (% of requests that match existing draft)

## Future Enhancements

- **Reuse Draft Cache:** Check similar prompts before calling AI
- **Quality Feedback:** Users rate generated drafts → informs model selection
- **KB Migration:** High-quality drafts promoted to verified KB guides
- **A/B Testing:** Compare model performance (gpt-4o-mini vs. newer models)
- **Prompt Optimization:** Refine prompt based on validation failure patterns
