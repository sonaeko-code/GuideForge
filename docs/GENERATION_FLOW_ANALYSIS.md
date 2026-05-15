# GuideForge Generation Flow Analysis

## CURRENT GENERATION FLOWS (BEFORE UNIFICATION)

### Flow 1: Network Guide Generation
**Location:** `/builder/network/[networkId]/generate`
**Component:** `generator-client.tsx`

- **Input:** Prompt + GuideType + Difficulty via form
- **Hub/Collection:** User selects from dropdown (with query param support)
- **AI/Mock:** Mode selector (mock | ai)
- **Schema:** `GenerationRequest` → `GenerationResponse`
- **Preview:** JSON display with structure
- **Save Target:** `createAndSaveGuideDraft` to target collection
- **Duplicate Logic:**
  - Query param sanitization/validation
  - Hub/collection state management
  - Mock generation via `generateMockResponse()`
  - AI generation via fetch to `/api/guideforge/generate-guide`

### Flow 2: Single Guide Asset Generation
**Location:** `/builder/generate-asset/single_guide`
**Component:** `generate-single-guide-client.tsx`

- **Input:** Title + Audience + Purpose + Tone + etc. via `SingleGuideIntakeRequest`
- **Hub/Collection:** NOT USED (standalone asset)
- **AI/Mock:** Only mock mode via `generateSingleGuideMock()`
- **Schema:** `SingleGuideIntakeRequest` → `GeneratedSingleGuide`
- **Preview:** `StructuredAssetProposal` component
- **Save Target:** `saveStructuredAsset()` to workspace assets
- **Intake Ladder:** AIIntakeLadder for smart field suggestions
- **Duplicate Logic:**
  - Intake session hydration
  - Form field prefilling
  - Rough idea parsing

### Flow 3: Checklist Generation
**Location:** `/builder/generate-asset/checklist`
**Component:** `generate-checklist-client.tsx`

- **Input:** Title + Audience + Purpose + Tone + NumberOfSections/Items via `ChecklistIntakeRequest`
- **Hub/Collection:** NOT USED (standalone asset)
- **AI/Mock:** Both modes via `generateChecklist()` (centralish)
- **Schema:** `ChecklistIntakeRequest` → `GeneratedChecklist`
- **Preview:** `StructuredAssetProposal` component
- **Save Target:** `saveStructuredAsset()` to workspace assets
- **Intake Ladder:** AIIntakeLadder for smart field suggestions
- **Duplicate Logic:**
  - Pending proposal restoration from sessionStorage
  - Intake session hydration
  - Form field prefilling
  - Debug tools for development

### Flow 4: Network Smart Fill / Scaffold Generation
**Location:** `/builder/network/new` (within create-network-form)
**Component:** `create-network-form.tsx`

- **Input:** Rough network idea via `SmartFillNetwork` heuristic
- **Hub/Collection:** Auto-generates suggested scaffold
- **AI/Mock:** Heuristic only (not AI)
- **Schema:** Rough idea → `SmartFillScaffoldSuggestion`
- **Preview:** Inline scaffold preview in form
- **Save Target:** `createNetwork()` with scaffold hubs/collections
- **Duplicate Logic:**
  - Idea parsing/routing logic (similar to asset builders)
  - Form prefilling from parsed data

## KEY DUPLICATIONS IDENTIFIED

1. **Idea Parsing:** Network Smart Fill, Single Guide Ladder, and Checklist Ladder all parse rough ideas but with different logic
2. **Intake Session Hydration:** Single Guide and Checklist both restore from `readIntakeSession()`
3. **Mock Generation:** Network guide uses `generateMockResponse()`, assets use `generateSingleGuideMock()` / `generateChecklistMock()`
4. **AI Generation:** Network guide has inline AI handler; Checklist uses centralized `generateChecklist()`; Single Guide only has mock
5. **Error Handling:** Each flow has its own error messages and recovery logic
6. **Form State Management:** Each has similar patterns for tracking generation state, loading, errors, proposals

## CURRENT CRASH

**File:** `generator-client.tsx` line 68
**Issue:** `initialCollectionId` is undefined
```javascript
const [selectedCollectionId, setSelectedCollectionId] = useState<string>(initialCollectionId)
```
Should be derived from query params like `initialHubId` is.

## UNIFICATION OPPORTUNITIES

1. Create `GuideForgeBuilderCore` contract that all flows use
2. Centralize idea parsing/routing
3. Use consistent mode terminology (Mock Preview / AI Generate)
4. Create shared intake hydration logic
5. Standardize error handling and recovery
6. Create builder-kind-specific request/response wrappers around core
