# Testing Guide Generation and Persistence

## Quick Start - Test the Complete Flow

### Prerequisites
- Supabase configured with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Database has tables: guides, guide_steps, hubs, collections, networks, profiles
- Seeded data loaded: embedfall hub, character-builds collection, questline network
- Dev server running: `npm run dev`

### Test 1: Generate a Frost Shaman Guide

**Steps:**
1. Open browser console (F12)
2. Navigate to `http://localhost:3000/builder/network/questline/generate`
3. Fill the form:
   - Guide Type: "guide"
   - Difficulty: "intermediate"
   - Prompt: "Create a Frost Shaman guide for Emberfall"
4. Click "Generate"
5. **Check console** - should see:
   ```
   [v0] Generated mock guide: {
     title: "Complete Frost Shaman Guide for Emberfall",
     slug: "complete-frost-shaman-guide-for-emberfall",
     summary: "A comprehensive Frost Shaman build for Emberfall...",
     type: "guide",
     difficulty: "intermediate",
     sectionsCount: 5,
     requirements: [...],
     targetHubId: undefined,
     targetCollectionId: undefined
   }
   ```
6. Click "Send to Editor"
7. **Check console** - should see:
   ```
   [v0] Mapped guide before save: {
     id: "550e8400-e29b-41d4-a716-446655440001",
     title: "Complete Frost Shaman Guide for Emberfall",
     summary: "A comprehensive Frost Shaman build...",
     stepsCount: 5,
     status: "draft",
     networkId: "questline",
     hubId: "emberfall",
     collectionId: "character-builds"
   }
   [v0] Supabase guides insert payload: {...}
   [v0] Supabase guide_steps insert payload: [...]
   [v0] Saved guide with draftId: 550e8400-e29b-41d4-a716-446655440001
   ```
8. **Verify redirect** - should be at `/builder/network/questline/guide/550e8400-e29b-41d4-a716-446655440001/edit`
9. **Check console** - should see:
   ```
   [v0] Loading draft from Supabase: 550e8400-e29b-41d4-a716-446655440001
   [v0] Loaded guide from Supabase: {...}
   [v0] Loaded 5 steps from Supabase
   [v0] Reconstructed guide from Supabase: {
     id: "550e8400-e29b-41d4-a716-446655440001",
     title: "Complete Frost Shaman Guide for Emberfall",
     summary: "A comprehensive Frost Shaman build...",
     stepsCount: 5
   }
   ```
10. **Verify guide loads** - title, summary, and 5 steps visible in editor

### Test 2: Edit and Autosave

**Steps:**
1. In the guide editor, change the title to "Advanced Frost Shaman for Emberfall"
2. Wait 300ms for autosave to trigger
3. **Check console** - should see:
   ```
   [v0] Supabase guides insert payload: {...}
   [v0] Supabase guide_steps insert payload: [...]
   [v0] Saved guide to Supabase: 550e8400-e29b-41d4-a716-446655440001
   ```
4. Open Supabase dashboard and check `guides` table
5. **Verify** - title is updated to "Advanced Frost Shaman for Emberfall"

### Test 3: Dashboard Shows Generated Guide

**Steps:**
1. Navigate to `http://localhost:3000/builder/network/questline/dashboard`
2. Scroll to "Draft Workspace" section
3. **Verify** - the generated guide appears in the list with:
   - Title: "Advanced Frost Shaman for Emberfall" (or your updated title)
   - Network: questline
   - Status: draft
4. **Check console** - should see:
   ```
   [v0] Loaded 1 drafts from Supabase for network: questline
   ```

### Test 4: Click Guide in Dashboard to Open Editor

**Steps:**
1. Click on the guide in the dashboard
2. **Verify** - redirected to editor
3. **Verify** - guide content is loaded and correct

## Troubleshooting

### Issue: Title is generic (e.g., "Complete Guide") instead of contextual

**Check:**
- Prompt is being sent to generateTitle()
- generateTitle() is extracting keywords correctly
- Check console for `[v0] Generated mock guide:` log with title

**Fix:**
- Ensure prompt contains keywords: "Frost", "Fire", "Shadow", "Holy", "Ranger"
- Or update generateTitle() to recognize more keywords

### Issue: Guide doesn't appear in dashboard after generation

**Check:**
1. Console shows "Saved guide with draftId: uuid" ✓
2. Console shows no Supabase errors ✓
3. Supabase dashboard has entry in guides table ✓
4. Supabase dashboard has entries in guide_steps table ✓
5. guide.hub_id = "emberfall" ✓
6. guide.collection_id = "character-builds" ✓
7. guide.network_id = "questline" ✓

**If guides table is empty:**
- Check if Supabase env vars are set correctly
- Check if NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are in Vercel project settings
- Check if Supabase project has the guides table created
- Check if RLS policies allow anon key writes

**If dashboard still doesn't show guide:**
- Clear browser cache
- Refresh page (Ctrl+Shift+R)
- Check console for load errors
- Verify draft-workspace component is properly loading drafts

### Issue: "Error in handleSendToEditor" message

**Check console for:**
1. Full error message and stack trace
2. Logs before error occurred
3. Network tab for Supabase API errors
4. Is Supabase configured? (check env vars)

**Common causes:**
- Invalid hub_id or collection_id doesn't exist
- Invalid network_id doesn't exist
- FK constraint violation
- Supabase RLS policy denies insert

### Issue: Steps not loading in editor

**Check:**
1. Console shows "Loaded N steps from Supabase" with N > 0 ✓
2. Supabase dashboard has entries in guide_steps table ✓
3. guide_steps.guide_id matches guides.id ✓

**If steps missing:**
- Check guide_steps table for entries with correct guide_id
- Verify steps were inserted during save (check console for insert payload)
- Check RLS policies on guide_steps table

## Expected Console Output - Complete Flow

```
[v0] Generated mock guide: {
  title: "Complete Frost Shaman Guide for Emberfall",
  slug: "complete-frost-shaman-guide-for-emberfall",
  summary: "A comprehensive Frost Shaman build for Emberfall designed to help you understand core mechanics, optimal rotations, gear selection, and strategies. Learn best practices, avoid common mistakes, and master this guide.",
  type: "guide",
  difficulty: "intermediate",
  sectionsCount: 5,
  requirements: ["Level 30+", "Completion of main questline"],
  targetHubId: undefined,
  targetCollectionId: undefined
}

[v0] Mapped guide before save: {
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "Complete Frost Shaman Guide for Emberfall",
  summary: "A comprehensive Frost Shaman build for Emberfall designed to help you understand core mechanics, optimal rotations, gear selection, and strategies. Learn best practices, avoid common mistakes, and master this guide.",
  stepsCount: 5,
  status: "draft",
  networkId: "questline",
  hubId: "emberfall",
  collectionId: "character-builds"
}

[v0] Supabase configured: true
[v0] Using seeded dev profile: 550e8400-e29b-41d4-a716-446655440000
[v0] Supabase guides insert payload: {
  id: "550e8400-e29b-41d4-a716-446655440001",
  collection_id: "character-builds",
  hub_id: "emberfall",
  network_id: "questline",
  title: "Complete Frost Shaman Guide for Emberfall",
  slug: "complete-frost-shaman-guide-for-emberfall",
  summary: "A comprehensive Frost Shaman build...",
  type: "guide",
  difficulty: "intermediate",
  status: "draft",
  author_id: "550e8400-e29b-41d4-a716-446655440000",
  created_at: "2026-05-01T12:00:00.000Z",
  updated_at: "2026-05-01T12:00:00.000Z",
  verification_status: "unverified",
  version: "1.0"
}
[v0] Supabase guide_steps insert payload: [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    guide_id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Getting Started",
    body: "Start with the basics. This section covers fundamental concepts and mechanics you need to know.",
    kind: "intro",
    order_index: 0,
    created_at: "2026-05-01T12:00:00.000Z",
    updated_at: "2026-05-01T12:00:00.000Z"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    guide_id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Core Mechanics",
    body: "Understand the core mechanics that drive gameplay.",
    kind: "section",
    order_index: 1,
    created_at: "2026-05-01T12:00:00.000Z",
    updated_at: "2026-05-01T12:00:00.000Z"
  },
  ...
]
[v0] Saved guide to Supabase: 550e8400-e29b-41d4-a716-446655440001
[v0] Saved guide with draftId: 550e8400-e29b-41d4-a716-446655440001

[Redirect to editor page]

[v0] Loading draft from Supabase: 550e8400-e29b-41d4-a716-446655440001
[v0] Loaded guide from Supabase: {
  id: "550e8400-e29b-41d4-a716-446655440001",
  collection_id: "character-builds",
  hub_id: "emberfall",
  network_id: "questline",
  title: "Complete Frost Shaman Guide for Emberfall",
  slug: "complete-frost-shaman-guide-for-emberfall",
  summary: "A comprehensive Frost Shaman build...",
  type: "guide",
  difficulty: "intermediate",
  status: "draft",
  author_id: "550e8400-e29b-41d4-a716-446655440000",
  created_at: "2026-05-01T12:00:00.000Z",
  updated_at: "2026-05-01T12:00:00.000Z",
  verification_status: "unverified",
  version: "1.0"
}
[v0] Loaded 5 steps from Supabase
[v0] Steps data: [
  { id: "550e8400-e29b-41d4-a716-446655440001", guide_id: "550e8400-e29b-41d4-a716-446655440001", order_index: 0, title: "Getting Started", body: "...", kind: "intro" },
  { id: "550e8400-e29b-41d4-a716-446655440002", guide_id: "550e8400-e29b-41d4-a716-446655440001", order_index: 1, title: "Core Mechanics", body: "...", kind: "section" },
  ...
]
[v0] Reconstructed guide from Supabase: {
  id: "550e8400-e29b-41d4-a716-446655440001",
  title: "Complete Frost Shaman Guide for Emberfall",
  summary: "A comprehensive Frost Shaman build...",
  stepsCount: 5
}
```

## Database Verification

### Guides Table
```sql
SELECT id, title, hub_id, collection_id, network_id, status, author_id 
FROM guides 
WHERE network_id = 'questline'
ORDER BY created_at DESC LIMIT 1;
```

**Expected result:**
| id | title | hub_id | collection_id | network_id | status | author_id |
|----|-------|--------|---------------|------------|--------|-----------|
| 550e8400-e29b-41d4-a716-446655440001 | Complete Frost Shaman Guide for Emberfall | emberfall | character-builds | questline | draft | 550e8400-e29b-41d4-a716-446655440000 |

### Guide Steps Table
```sql
SELECT guide_id, order_index, title, kind
FROM guide_steps
WHERE guide_id = '550e8400-e29b-41d4-a716-446655440001'
ORDER BY order_index ASC;
```

**Expected result:**
| guide_id | order_index | title | kind |
|----------|-------------|-------|------|
| 550e8400-e29b-41d4-a716-446655440001 | 0 | Getting Started | intro |
| 550e8400-e29b-41d4-a716-446655440001 | 1 | Core Mechanics | section |
| 550e8400-e29b-41d4-a716-446655440001 | 2 | Tips & Tricks | tip |
| 550e8400-e29b-41d4-a716-446655440001 | 3 | Advanced Strategies | section |
| 550e8400-e29b-41d4-a716-446655440001 | 4 | Summary & Next Steps | summary |

## Summary

The guide generation and persistence flow is complete and testable. Follow the test procedures above to verify each component works correctly. Use the console logs to trace the flow and debug any issues. Check the database to verify data is persisted correctly.
