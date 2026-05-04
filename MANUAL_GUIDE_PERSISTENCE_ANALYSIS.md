# Manual Guide Creation Data Persistence Analysis

## Summary: Where Fields Are Being Lost

### Fields Collected in Create Manual Guide Form
1. **Hub** - collected ✓
2. **Collection** - collected ✓
3. **Guide Title** - collected ✓
4. **Guide Type** (type: GuideType) - collected ✓
5. **Audience** (array of strings) - collected ✓
6. **Difficulty** (difficulty: DifficultyLevel) - collected ✓
7. **Requirements** - collected ✓
8. **Short Description** - collected as `description` ✓

### Data Flow Trace

#### Step 1: Create Guide Form → `handleContinueToEditor`
- Calls: `createAndSaveGuideDraft({title, summary: description, guideType, difficulty, networkId, hubId: selectedHubId, collectionId: selectedCollectionId, requirements, warnings: []})`
- **ISSUE**: Missing `audience` parameter - not passed to `createAndSaveGuideDraft`
- **ISSUE**: Requirements passed as array, but guide type and difficulty included

#### Step 2: `createAndSaveGuideDraft` Function
- Input interface: `CreateGuideDraftInput` includes: `title`, `summary`, `guideType`, `difficulty`, `networkId`, `hubId`, `collectionId`, `requirements`, `warnings`, `steps`, `audience`, `version`, `estimatedMinutes`, `authorId`
- **Field Status:**
  - `guideType` ✓ received
  - `difficulty` ✓ received
  - `audience` ✗ NOT received (missing from call)
  - `summary` ✓ received
  - `requirements` ✓ received

#### Step 3: Building Guide Object
- In `createAndSaveGuideDraft`, Guide object built with:
  ```
  type: input.guideType,  // ✓ Maps correctly
  difficulty: input.difficulty,  // ✓ Maps correctly
  summary: input.summary,  // ✓ Maps correctly
  requirements: input.requirements,  // ✓ Maps correctly
  ```
- **ISSUE**: `audience` field NOT included in Guide interface - no place to store it
- **ISSUE**: Starter sections created from `input.summary` only, guide type not used to seed type-specific sections

#### Step 4: Saving to Supabase
- `saveGuideDraft(guide)` saves using `supabase-persistence.ts`
- Normalizations:
  - `guideType` → normalized to Supabase `type` enum (character-build → "build", boss-guide → "strategy", etc.)
  - `difficulty` → normalized to Supabase difficulty (beginner/intermediate/advanced/expert)
  - `summary` → saved directly
  - `requirements` → saved directly

#### Step 5: Loading in Editor
- `guide-editor-loader.tsx` loads via `loadGuideDraft(guideId)`
- Editor initializes state from loaded guide:
  - `title` ✓
  - `summary` ✓
  - `requirements` ✓
  - `status` ✓
  - `steps` ✓
  - **MISSING**: `type` / `guideType` not displayed
  - **MISSING**: `difficulty` not displayed
  - **MISSING**: `audience` not stored/loaded

#### Step 6: Editor Display
- Renders: title, requirements, steps
- **NOT DISPLAYED:**
  - Guide type (should show "Boss Guide" badge)
  - Difficulty (should show "Advanced" badge)
  - Audience tags (not stored, so can't display)
  - Summary field (only appears as Overview section text)
  - Hub/Collection context

---

## Issues Identified

### Issue 1: Audience Array Lost
- **Root Cause**: Not included in `Guide` interface; no schema field to store it
- **Impact**: User selects Intermediate + Advanced, but it's never saved
- **Solution**: Store in metadata or as a new optional field; for now, add console warning

### Issue 2: Guide Type Not Displayed in Editor
- **Root Cause**: Loaded into `guide.type` but editor doesn't display or allow editing it
- **Impact**: Editor shows only title/requirements; user can't see or change guide type
- **Solution**: Add read-only type badge + editable dropdown in editor UI

### Issue 3: Difficulty Not Displayed in Editor
- **Root Cause**: Loaded into `guide.difficulty` but editor doesn't display or allow editing it
- **Impact**: Editor shows status badge but not difficulty; user can't change it
- **Solution**: Add difficulty selector in editor UI, update on autosave

### Issue 4: Summary Only Becomes Overview Section
- **Root Cause**: `createAndSaveGuideDraft` seeds first section with `input.summary` as body, but doesn't preserve summary field
- **Impact**: Guide card shows no summary; summary is only visible in editor as section text
- **Solution**: Preserve `summary` field; use it for both overview section AND card display

### Issue 5: Guide Type Not Seeding Type-Specific Sections
- **Root Cause**: Manual guide creation (no steps) only creates generic "Overview" section
- **Impact**: Boss Guide should have "Boss Mechanics", "Phase Breakdown", etc., but all guides get generic Overview
- **Solution**: Use `getStarterSectionsForGuideType()` to seed type-specific sections

### Issue 6: Hub/Collection Context Not Visible
- **Root Cause**: Loaded into `guide.hubId`/`guide.collectionId` but not displayed
- **Impact**: User doesn't see "Editing guide in: Emberfall > Boss Strategies"
- **Solution**: Display as read-only context row near title

### Issue 7: No Quick-Create Collection Flow
- **Root Cause**: If network has no collections, user is blocked
- **Impact**: UX friction for new networks
- **Solution**: Add inline "Create collection" flow in create form (optional for stabilization pass)

---

## Files That Need Changes

1. **create-guide-form.tsx** - Pass `audience` to `createAndSaveGuideDraft`
2. **create-and-save-guide-draft.ts** - Use guide type to seed starter sections
3. **guide-editor.tsx** - Display and edit type, difficulty, audience, summary, hub/collection
4. **guide-editor-loader.tsx** - Enhanced logging for reloaded fields
5. **lib/guideforge/utils.ts** - Add `getStarterSectionsForGuideType()` helper
6. **lib/guideforge/types.ts** - Optionally add `audience` field to Guide interface

---

## Where to Store Audience (Temporary)

Since Guide interface has no audience field:
- Option A: Store in metadata/config JSON (if available) - NOT VISIBLE TO USER, data at risk
- Option B: Add optional `audience?: string[]` field to Guide interface - SAFE, proper storage
- Option C: Store in separate table (out of scope for stabilization)
- **Recommendation for now**: Add optional field to Guide interface, store it, but note as Phase 2 if no persistence needed
