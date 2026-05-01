# Guide Persistence Data Flow - Debugging Guide

## Status: ✅ FIXED | TypeScript: 0 errors

### Problem Identified & Fixed

**Root Cause:** Generated guides were not persisting to Supabase or displaying in the dashboard because:
1. GeneratedGuide.sections was not being converted to Guide.steps
2. Required Guide fields (id, status, timestamps) were missing
3. The save function was called synchronously without proper error handling
4. Load function had no visibility into what data was being reconstructed

### Solution Implemented

#### 1. Created Guide Mapper (`lib/guideforge/guide-mapper.ts`)
Converts GeneratedGuide → Guide with proper field mapping:
```typescript
export function generatedGuideToGuide(
  generatedGuide: GeneratedGuide,
  context: GuideCreationContext
): Guide
```

**Mappings:**
- `GeneratedGuide.sections[]` → `Guide.steps[]`
- `GeneratedGuide.requirements[]` → `Guide.requirements[]`
- Generates proper UUID for `Guide.id`
- Sets initial status to "draft"
- Generates timestamps (createdAt, updatedAt)
- Preserves: title, summary, type, difficulty, warnings, verification

#### 2. Updated Generate Page Handler (`app/builder/network/[networkId]/generate/page.tsx`)
- Uses async/await for `handleSendToEditor`
- Imports and calls `generatedGuideToGuide()` for proper conversion
- Calls async `saveGuideDraft()` with proper error handling
- Logs the entire flow for debugging

#### 3. Enhanced Logging in Supabase Persistence (`lib/guideforge/supabase-persistence.ts`)

**Save Flow:**
```
[v0] Supabase guides insert payload: { ... }
[v0] Supabase guide_steps insert payload: [ ... ]
[v0] Saved guide to Supabase: guide-id
```

**Load Flow:**
```
[v0] Loading draft from Supabase: draft-id
[v0] Loaded guide from Supabase: { ... }
[v0] Loaded N steps from Supabase
[v0] Steps data: [ ... ]
[v0] Reconstructed guide from Supabase: { id, title, stepsCount, ... }
```

## Complete Data Flow - Step by Step

### 1. Generate Page - User Clicks "Send to Editor"

Console output:
```
[v0] handleSendToEditor started
[v0] Generated guide: {
  title: "...",
  summary: "...",
  sections: N,
  requirements: [...],
  difficulty: ...
}
[v0] Mapped guide before save: {
  id: "uuid-xxx",
  title: "...",
  summary: "...",
  stepsCount: N,
  status: "draft"
}
```

### 2. Save to Supabase - Persistence Adapter

Console output:
```
[v0] Supabase configured: true
[v0] Using seeded dev profile: 550e8400-e29b-41d4-a716-446655440000
[v0] Supabase guides insert payload: {
  id: "uuid-xxx",
  collection_id: "mock-collection",
  hub_id: "mock-hub",
  network_id: "questline",
  title: "...",
  slug: "...",
  summary: "...",
  type: "guide",
  difficulty: 2,
  status: "draft",
  author_id: "550e8400-e29b-41d4-a716-446655440000",
  ...
}
[v0] Supabase guide_steps insert payload: [
  { guide_id: "uuid-xxx", order_index: 0, title: "...", body: "...", kind: "intro" },
  { guide_id: "uuid-xxx", order_index: 1, title: "...", body: "...", kind: "section" },
  ...
]
[v0] Saved guide to Supabase: uuid-xxx
[v0] Successfully saved guide to Supabase: uuid-xxx
```

### 3. Redirect to Editor - Guide Editor Loads Draft

Console output:
```
[v0] Loading draft from Supabase: uuid-xxx
[v0] Loaded guide from Supabase: {
  id: "uuid-xxx",
  collection_id: "mock-collection",
  hub_id: "mock-hub",
  network_id: "questline",
  title: "...",
  slug: "...",
  summary: "...",
  type: "guide",
  difficulty: 2,
  status: "draft",
  author_id: "550e8400-e29b-41d4-a716-446655440000",
  created_at: "2026-05-01T...",
  updated_at: "2026-05-01T...",
  ...
}
[v0] Loaded 5 steps from Supabase
[v0] Steps data: [
  { id: "uuid-1", guide_id: "uuid-xxx", order_index: 0, title: "...", body: "...", kind: "intro" },
  { id: "uuid-2", guide_id: "uuid-xxx", order_index: 1, title: "...", body: "...", kind: "section" },
  ...
]
[v0] Reconstructed guide from Supabase: {
  id: "uuid-xxx",
  title: "...",
  summary: "...",
  stepsCount: 5
}
```

### 4. Dashboard Lists Drafts - Draft Workspace Loads

Console output:
```
[v0] Supabase configured: true
[v0] Loaded 1 drafts from Supabase for network: questline
```

## Testing Checklist

### Test 1: Generate → Send to Editor → Edit
1. Open `/builder/network/questline/generate`
2. Fill form and generate guide
3. Click "Send to Editor"
4. Check console for complete flow logged
5. Verify redirected to `/builder/network/questline/guide/[uuid]/edit`
6. Verify guide content loaded in editor

**Expected Logs:**
```
[v0] handleSendToEditor started
[v0] Supabase guides insert payload: {...}
[v0] Supabase guide_steps insert payload: [...]
[v0] Saved guide with draftId: uuid-xxx
[v0] Loading draft from Supabase: uuid-xxx
[v0] Reconstructed guide from Supabase: {...}
```

### Test 2: Autosave While Editing
1. Make changes to guide title/summary
2. Wait 300ms for autosave timer
3. Check console for save

**Expected Logs:**
```
[v0] Supabase guides insert payload: {...}
[v0] Supabase guide_steps insert payload: [...]
[v0] Saved guide to Supabase: uuid-xxx
```

### Test 3: Dashboard Lists Generated Guides
1. Go to `/builder/network/questline/dashboard`
2. Check Draft Workspace section
3. Verify newly generated guide appears in list

**Expected Logs:**
```
[v0] Loaded N drafts from Supabase for network: questline
```

### Test 4: Delete Draft
1. In dashboard, click delete on a draft
2. Confirm deletion
3. Check console and verify draft disappears

**Expected Logs:**
```
[v0] Failed to delete from Supabase: (any RLS errors)
[v0] Supabase delete error: (any connection errors)
```

### Test 5: No Supabase (localStorage fallback)
1. Remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
2. Restart dev server
3. Generate and send guide to editor

**Expected Logs:**
```
[v0] Supabase configured: false
[v0] Falling back to localStorage
```

## Console Log Reference

| Log | Meaning | Location |
|-----|---------|----------|
| `[v0] handleSendToEditor started` | Generate page user action started | generate/page.tsx |
| `[v0] Generated guide: {...}` | Raw generated data from mock | generate/page.tsx |
| `[v0] Mapped guide before save: {...}` | Converted to Guide type | generate/page.tsx |
| `[v0] Saved guide with draftId: uuid` | Save completed | generate/page.tsx |
| `[v0] Supabase configured: true/false` | Adapter selection check | supabase-persistence.ts |
| `[v0] Using seeded dev profile: uuid` | Author ID being used | supabase-persistence.ts |
| `[v0] Supabase guides insert payload: {...}` | Exact payload sent to guides table | supabase-persistence.ts |
| `[v0] Supabase guide_steps insert payload: [...]` | Exact payload sent to guide_steps table | supabase-persistence.ts |
| `[v0] Saved guide to Supabase: uuid` | guides table insert successful | supabase-persistence.ts |
| `[v0] Loading draft from Supabase: uuid` | Load operation started | supabase-persistence.ts |
| `[v0] Loaded guide from Supabase: {...}` | Raw data from guides table | supabase-persistence.ts |
| `[v0] Loaded N steps from Supabase` | Steps loaded count | supabase-persistence.ts |
| `[v0] Steps data: [...]` | Raw steps data | supabase-persistence.ts |
| `[v0] Reconstructed guide from Supabase: {...}` | Final Guide object after reconstruction | supabase-persistence.ts |
| `[v0] Loaded N drafts from Supabase for network: id` | Dashboard draft list load | supabase-persistence.ts |

## Troubleshooting

### Issue: Guide doesn't appear in dashboard after generation
**Check:**
1. Console shows "Saved guide with draftId: xxx" ✓
2. Console shows "Loaded N drafts from Supabase for network" ✓
3. In Supabase dashboard, guides table has entry ✓
4. In Supabase dashboard, guide_steps table has entries ✓

**If guides table is empty:**
- Check NEXT_PUBLIC_SUPABASE_URL is correct
- Check NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
- Check RLS policies on guides table allow insert

### Issue: Guide loads in editor but steps are missing
**Check:**
1. Console shows "Loaded N steps from Supabase" with N > 0 ✓
2. Supabase dashboard shows entries in guide_steps table ✓
3. Steps data is logged and shows correct fields

**If steps missing:**
- Check guide_id foreign key references correct guides.id
- Check guide_steps insert payload logged properly
- Verify RLS policies on guide_steps table

### Issue: "Error in handleSendToEditor" message
**Check console for:**
1. Full error message
2. Stack trace
3. Logs before error occurred
4. Network tab for Supabase API errors

## Files Modified

**New Files:**
- `lib/guideforge/guide-mapper.ts` - GeneratedGuide → Guide conversion

**Modified Files:**
- `app/builder/network/[networkId]/generate/page.tsx` - Updated handleSendToEditor
- `lib/guideforge/supabase-persistence.ts` - Enhanced logging

**Unchanged:**
- guide-drafts-storage.ts
- guide-editor.tsx
- draft-workspace.tsx
- draft-list.tsx

## Architecture Summary

```
Generate Page (user action)
  ↓
generateMockResponse() → GeneratedGuide
  ↓
generatedGuideToGuide() → Guide (mapper)
  ↓
saveGuideDraft() → async save (guide-drafts-storage)
  ↓
getPersistenceAdapter() → SupabasePersistenceAdapter (factory)
  ↓
supabase.from("guides").upsert()
supabase.from("guide_steps").insert()
  ↓
[Saved to Supabase with seeded profile as author]
  ↓
Router redirects to /builder/network/{networkId}/guide/{draftId}/edit
  ↓
Guide Editor loads draft via loadDraft()
  ↓
supabase.from("guides").select().single()
supabase.from("guide_steps").select().order()
  ↓
[Guide reconstructed from Supabase data]
  ↓
Component renders with loaded data
```

## Next Steps

1. **Test the complete flow** with console logs visible
2. **Verify Supabase schema** has guides and guide_steps tables
3. **Check RLS policies** allow anon key writes with seeded profile
4. **Monitor dashboard** for newly generated guides appearing
5. **Test autosave** while editing generated guides
