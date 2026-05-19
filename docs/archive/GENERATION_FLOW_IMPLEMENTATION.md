# GuideForge Generation Flow - Complete Implementation

## Overview

The mock generation flow is now fully wired end-to-end. Users can generate guide drafts, see them in the editor, and modify them before saving. All code is TypeScript-safe with zero compilation errors.

## Architecture: Generation → Storage → Editor

```
Generate Page
  ↓ (user generates guide)
  ├→ generateMockResponse() produces GeneratedGuide
  ├→ handleSendToEditor() saves to localStorage
  └→ Redirect to /builder/network/[networkId]/guide/[draftId]/edit
        ↓
    Guide Editor Page (Server Component)
      ├→ GuideEditorLoader (Client Component)
      │   ├→ loadGuideDraft(draftId) from localStorage
      │   └→ Fallback to mock data if not found
      └→ GuideEditor (Client Component)
          ├→ Display guide data
          ├→ Edit sections + regenerate with Sparkles button
          ├→ Apply Forge Rules checklist
          └→ Publish guide
```

## Files Changed/Created

### New Files
1. **lib/guideforge/guide-drafts-storage.ts** (64 lines)
   - `saveGuideDraft(guide)` → saves to localStorage, returns draftId
   - `loadGuideDraft(draftId)` → retrieves from localStorage
   - Helper functions: `hasDraft()`, `deleteDraft()`, `clearAllDrafts()`
   - Uses key format: `guideforge:drafts:[draftId]`

2. **components/guideforge/builder/guide-editor-loader.tsx** (46 lines)
   - Client-side wrapper component
   - Hydrates guide from localStorage on mount
   - Falls back to mock data (FIRE_WARDEN_GUIDE) if draft not found
   - Shows loading state while fetching

### Modified Files
1. **app/builder/network/[networkId]/generate/page.tsx**
   - Import: `saveGuideDraft` from guide-drafts-storage
   - `handleSendToEditor()`: Now saves generated guide to localStorage before redirecting
   - Converts `GeneratedGuide` to `Guide`-compatible object with required fields
   - Generates unique `draftId` using timestamp

2. **app/builder/network/[networkId]/guide/[guideId]/edit/page.tsx**
   - Changed from server-side guide loading to client-side
   - Now uses `<GuideEditorLoader>` instead of direct `<GuideEditor>`
   - Passes `guideId` (draftId) to loader
   - Provides FIRE_WARDEN_GUIDE as fallback

3. **components/guideforge/builder/guide-editor.tsx**
   - Added: `currentStep` variable calculation
   - Added: `allStepsHaveContent` variable calculation
   - These were missing but referenced in the JSX

4. **app/builder/network/[networkId]/dashboard/page.tsx**
   - Fixed both "Generate Guide" and "Create Guide" buttons to route to `/generate`
   - Removed nonexistent `/guide/new` route
   - Fixed empty state button routing

5. **lib/guideforge/mock-generator.ts**
   - Fixed `ThemeDirection` type casting (was string, now explicitly typed)
   - Fixed `warning` and `custom` arrays (were strings, now arrays of strings)

## Data Flow Example

### Step 1: User Generates Guide
```typescript
// In Generate Page
User fills form → Click "Generate Mock Structured Guide"
→ generateMockResponse(formState) produces:
{
  guide: {
    title: "Beginner's Guide to Emberfall",
    slug: "beginners-guide-emberfall",
    summary: "Learn the basics...",
    sections: [...],
    requirements: [...],
    ...
  }
}
```

### Step 2: User Sends to Editor
```typescript
// In handleSendToEditor()
draftId = saveGuideDraft(guideData)  // Returns "draft_1704067200000"
localStorage["guideforge:drafts:draft_1704067200000"] = JSON.stringify(guide)
router.push("/builder/network/network_questline/guide/draft_1704067200000/edit")
```

### Step 3: Editor Loads Draft
```typescript
// In GuideEditorLoader (useEffect)
const draft = loadGuideDraft("draft_1704067200000")
// Retrieves from localStorage
if (draft) {
  setGuide(draft)  // Use loaded draft
} else {
  // Fall back to FIRE_WARDEN_GUIDE
}
```

### Step 4: User Edits in Editor
```typescript
// In GuideEditor
- View all sections
- Click section refresh icon → regenerate with generateAlternateSectionContent()
- Click "Apply Forge Rules" → run mock checklist
- Edit title, summary, sections manually
- (Publishing saves to Supabase - TODO)
```

## Complete User Flow

1. **Dashboard**: User clicks "Generate Guide" or "Create Guide"
2. **Generate Page**: `/builder/network/network_questline/generate`
   - Fill form (guide type, difficulty, hub, collection, prompt)
   - Click "Generate Mock Structured Guide"
   - See JSON preview of generated guide
   - Click "Send to Editor"
3. **Editor Page**: `/builder/network/network_questline/guide/draft_TIMESTAMP/edit`
   - Guide loaded from localStorage
   - Can see title, summary, all sections
   - Regenerate individual sections with Sparkles button
   - Edit any field manually
   - Apply Forge Rules to check against network standards
   - (Click Publish when ready)

## localStorage Schema

```javascript
// Key format
"guideforge:drafts:draft_1704067200000"

// Value format (full Guide object)
{
  "id": "draft_1704067200000",
  "title": "...",
  "slug": "...",
  "summary": "...",
  "type": "beginner-guide",
  "difficulty": "beginner",
  "estimatedMinutes": 18,
  "sections": [...],
  "requirements": [...],
  "warnings": [...],
  "status": "draft",
  "createdAt": "2024-01-01T...",
  "updatedAt": "2024-01-01T...",
  "networkId": "network_questline",
  ...
}
```

## Testing the Flow

### Test 1: Generate and Send to Editor
1. Navigate to `/builder/network/network_questline/generate`
2. Fill form with:
   - Guide Type: "beginner-guide"
   - Difficulty: "beginner"
   - Hub: "Emberfall"
   - Collection: "Character Builds"
   - Prompt: "Create a guide about something"
3. Click "Generate Mock Structured Guide"
4. See JSON preview populate
5. Click "Send to Editor"
6. Should redirect to `/builder/network/network_questline/guide/draft_TIMESTAMP/edit`
7. Guide should load and display

### Test 2: Section Regeneration
1. In editor, click refresh icon on any section
2. Section text should change
3. Card should highlight green
4. "Generated draft updated" message should appear
5. Highlight should fade after 2 seconds

### Test 3: Fallback (No Draft)
1. Manually navigate to `/builder/network/network_questline/guide/fake_id/edit`
2. Should load FIRE_WARDEN_GUIDE fallback (mock data)

### Test 4: localStorage Persistence
1. Generate guide and go to editor
2. Open DevTools → Application → localStorage
3. Look for key: `guideforge:drafts:draft_XXXXX`
4. Refresh page - guide data should persist

## Integration Points (For Later)

### When Supabase is Ready
- Replace localStorage with Supabase guides table
- Update `loadGuideDraft()` to query: `SELECT * FROM guides WHERE id = $1`
- Update `saveGuideDraft()` to insert: `INSERT INTO guides (...) VALUES (...)`
- Add user_id filtering (RLS policy)

### When OpenAI is Connected
- Replace `generateMockResponse()` with real API call
- Add credit deduction logic
- Add generation history tracking

### When Publishing Works
- Publish button → save draft to Supabase with status="published"
- Update guide visibility in public network
- Show "Published" badge instead of "Draft"

## Known Limitations (By Design)

1. **localStorage Only**: Drafts are lost if browser cache is cleared or different device is used
2. **No Persistence Across Devices**: Can't share drafts between devices without Supabase
3. **No Versioning**: Only latest draft saved (no history)
4. **No Collaboration**: Each user has their own localStorage drafts

These are acceptable for the MVP mock implementation and will be solved by Supabase integration.

## TypeScript Status

- All files type-safe (✓ 0 errors)
- Types aligned with existing schemas
- Guide conversion handles GeneratedGuide → Guide compatibility
- Ready for production-like testing

## What Works Now

- Generate guide from form
- Save generated guide to browser storage
- Load guide in editor
- Regenerate sections
- Manually edit all fields
- Apply Forge Rules checklist
- Navigation flow complete

## Next Steps (Post-MVP)

1. **Supabase Integration**: Replace localStorage with database
2. **OpenAI Integration**: Replace mock generator with real API
3. **Authentication**: Add user_id to drafts, RLS policies
4. **Publishing**: Implement "Publish" button to save public guides
5. **Credit System**: Track generation costs per user
6. **Guide Sharing**: Share draft links with team members

---

## Summary

The generation flow is now complete and functional end-to-end. Users can generate guide drafts, see them immediately in the editor with all the mock generation features (section regeneration, Forge Rules checking), edit them, and the experience feels complete. All data flows through localStorage as a MVP storage layer. The architecture is clean and ready to swap localStorage for Supabase when database integration is ready.
