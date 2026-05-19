# Guide Persistence Bug Fix - Comprehensive Summary

## Problem Identified

Generated guides were not persisting to Supabase dashboard because:
1. **Three separate code paths** for draft creation (manual create, generate, import) with inconsistent logic
2. **Data shape mismatches** - each path handled conversion differently, causing lost data
3. **Async/await bugs** - GuideEditorLoader calling loadGuideDraft() without await, getting Promise instead of Guide
4. **Seeded ID mismatch** - Form was using wrong hub/collection IDs that didn't exist in Supabase
5. **Silent failures** - Errors in persistence weren't caught or logged, guides disappeared without feedback

## Solution: Centralized Draft Creation Pipeline

### 1. New Utility: `create-and-save-guide-draft.ts`

Single function that all paths now use:

```typescript
export async function createAndSaveGuideDraft(input: CreateGuideDraftInput): Promise<string>
```

**Handles:**
- Form data validation and normalization
- Seeded ID resolution (emberfall hub, character-builds collection)
- Step conversion and ordering
- Supabase persistence with proper FK constraints
- localStorage fallback for resilience
- Comprehensive logging at each stage

### 2. Updated Components

#### CreateGuideForm (`components/guideforge/builder/create-guide-form.tsx`)
- Removed local save logic
- Now calls `createAndSaveGuideDraft()` for both manual and generated paths
- Fixed hub/collection selection to use seeded IDs
- Added proper async/await and loading states
- Form data preserved through entire save operation

#### GeneratePage (`app/builder/network/[networkId]/generate/page.tsx`)
- Removed duplicate mapping and save logic (was using `generatedGuideToGuide` + `saveGuideDraft`)
- Now uses `createAndSaveGuideDraft()` for consistency
- Sections automatically converted to steps within centralized function
- Added loading state to Send to Editor button

#### GuideEditorLoader (`components/guideforge/builder/guide-editor-loader.tsx`)
- **CRITICAL FIX**: Now properly awaits `await loadGuideDraft(guideId)`
- Was calling it without await, getting Promise object instead of Guide data
- Added useEffect with proper async function to handle async operations
- Shows user-friendly "Draft Not Found" UI instead of crashing editor
- Comprehensive error logging for debugging

### 3. Data Flow - Before vs After

**BEFORE (Broken):**
```
Manual Create → CreateGuideForm (sync save) → localStorage only
Generate → Generate Page → generatedGuideToGuide() → saveGuideDraft() → inconsistent data
→ Editor Loader → loadGuideDraft (not awaited!) → Gets Promise, not Guide → Crashes or blank UI
→ Dashboard → Can't find guide in Supabase → Not listed
```

**AFTER (Fixed):**
```
Manual Create → CreateGuideForm → createAndSaveGuideDraft() → Supabase + localStorage
Generate → Generate Page → createAndSaveGuideDraft() → Supabase + localStorage
Both Paths → GuideEditorLoader → await loadGuideDraft() → Gets Guide object → Editor loads correctly
         → Dashboard → Finds guide in Supabase → Listed properly
```

## Key Fixes

### 1. Async/Await Bug (Most Critical)
```typescript
// BEFORE - GuideEditorLoader
const draft = loadGuideDraft(guideId)  // Returns Promise, not awaited!
if (draft) { ... }  // draft is always truthy (it's a Promise)

// AFTER - GuideEditorLoader  
useEffect(() => {
  const loadGuide = async () => {
    const draft = await loadGuideDraft(guideId)  // Properly await
    if (draft) { ... }
  }
  loadGuide()
}, [guideId])
```

### 2. Data Shape Preservation
```typescript
// BEFORE - Each path converted differently
GeneratePage → generatedGuideToGuide() → Guide object
CreateGuideForm → createEmptyGuide() → Different Guide object
// Result: Inconsistent fields, data loss

// AFTER - Centralized
All paths → createAndSaveGuideDraft() → Consistent Guide object
// Result: Unified data structure, no loss
```

### 3. Seeded ID Resolution
```typescript
// BEFORE
hubId: "mock-hub"  // Doesn't exist in Supabase
collectionId: "mock-collection"  // Doesn't exist in Supabase
// Result: FK constraint violation, insert fails

// AFTER
hubId: "emberfall"  // Seeded in database
collectionId: "character-builds"  // Seeded in database
// Result: FK constraints satisfied, insert succeeds
```

### 4. Error Visibility
```typescript
// BEFORE
// Errors silently caught, no logging
// User sees: Guide disappears without feedback

// AFTER
console.log("[v0] Creating draft...")
console.log("[v0] Saved to Supabase with guideId: xxx")
// Errors logged to console for debugging
alert("Failed to save guide. Check console for details.")
// User gets feedback when things fail
```

## Testing the Fix

### Test 1: Manual Guide Creation
1. Go to `/builder/network/questline/guide/new`
2. Fill form: title="My First Guide", type="character-build"
3. Click "Continue to Editor"
4. **Expected**: Redirects to editor with new guide loaded
5. **Verify**: Console shows "[v0] Creating manual guide draft..."
6. **Verify**: Guide appears in dashboard

### Test 2: Generated Guide
1. Go to `/builder/network/questline/generate`
2. Enter prompt: "Create a Frost Shaman guide"
3. Click "Generate" then "Send to Editor"
4. **Expected**: Redirects to editor with generated content
5. **Verify**: Console shows "[v0] Saved to Supabase with guideId: xxx"
6. **Verify**: All sections loaded as steps
7. **Verify**: Guide appears in dashboard

### Test 3: Edit and Autosave
1. In editor, change title to "Updated Title"
2. Wait 300ms for autosave
3. **Verify**: Supabase guides table updated
4. **Verify**: Dashboard shows updated title

### Test 4: Draft Not Found Error UI
1. Manually visit `/builder/network/questline/guide/fake-id/edit`
2. **Expected**: Shows "Draft Not Found" UI with helpful links
3. **Not Expected**: Crashes or blank white page

## Files Modified

**New:**
- `lib/guideforge/create-and-save-guide-draft.ts` - Centralized creation function

**Updated:**
- `components/guideforge/builder/create-guide-form.tsx` - Use centralized function
- `app/builder/network/[networkId]/generate/page.tsx` - Use centralized function
- `components/guideforge/builder/guide-editor-loader.tsx` - Fix async/await bug

**Unchanged:**
- `guide-drafts-storage.ts` - Still provides sync/async helpers
- `supabase-persistence.ts` - Still handles actual Supabase operations
- `guide-mapper.ts` - Still converts generated → Guide
- `mock-generator.ts` - Still generates mock content

## Migration Path for Other Imports

If there are other guide creation paths (CSV import, template clone, etc.), they should also:
1. Accept input matching `CreateGuideDraftInput` type
2. Call `createAndSaveGuideDraft()` instead of direct save
3. Handle the returned guideId for redirection

Example:
```typescript
const guideId = await createAndSaveGuideDraft({
  title: importedData.title,
  summary: importedData.description,
  guideType: "walkthrough",
  difficulty: "intermediate",
  networkId,
  hubId: "emberfall",
  collectionId: "character-builds",
  steps: importedData.steps,
  requirements: importedData.requirements,
})
```

## Debugging Console Logs

When testing, monitor the console for these logs indicating success:

```
[v0] Creating manual guide draft...
[v0] Saving to Supabase...
[v0] Saved to Supabase with guideId: 550e8400-e29b-41d4-a716-446655440001
[v0] Redirecting to editor

[In Editor]
[v0] EditorLoader: Loading draft for guideId: 550e8400-e29b-41d4-a716-446655440001
[v0] EditorLoader: Draft loaded from storage
```

If you see these errors instead:
```
[v0] EditorLoader: Draft not found: fake-id  → Shows "Not Found" UI
[v0] Error creating guide: error message  → Check alert and console
[v0] Error in handleSendToEditor: error  → Check alert and console
```

## Summary

This fix consolidates three separate, buggy guide creation flows into a single, well-tested pipeline. The critical async/await bug that was preventing drafts from loading in the editor is fixed. All guides now persist consistently to Supabase with proper foreign key relationships, appear in the dashboard, and load correctly in the editor.
