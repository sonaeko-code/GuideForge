# GuideForge Data Spine Contract

## Purpose

This document establishes the core data flows and persistence contracts for the GuideForge builder. It protects against regressions by documenting the stable, audited-working path from network creation through guide publication. All major features (dashboard loading, guide generation, section editing, status transitions) depend on these contracts. Do not change these flows without explicit review and approval.

---

## Core Hierarchy

```
QuestLine (Network)
  ├─ Hub
  │   ├─ Collection
  │   │   └─ Guide (Supabase Draft)
  │   │       └─ Section / Step (guide_steps table)
```

All guide persistence flows through Supabase first, with localStorage as an emergency dev fallback only.

---

## Confirmed Stable Flow (Audited and Working)

1. **Dashboard loads Supabase guides** by collection_id
2. **Generate Guide** creates a real Supabase Draft (not localStorage-only)
3. **Send to Editor** only routes after Supabase persistence AND Supabase-only verification
4. **Draft appears in dashboard** with correct count
5. **Mark Ready** moves Draft → Ready in Supabase
6. **Publish** moves Ready → Published in Supabase
7. **Dashboard buckets** use normalized status mappings
8. **Section edits** persist to Supabase guide_steps table
9. **Reload** restores all guides and sections from Supabase
10. **localStorage fallback** returns error, never success

---

## Dashboard Loading Contract

Dashboard guide loading MUST follow this exact chain:

```
networkId 
  → loadNetworkBuilderContext(networkId)
    → get hubs + collections
  → getGuidesForNetworkCollectionsWithDiagnostics(collections)
    → extract collectionIds
    → SELECT * FROM guides WHERE collection_id IN (collectionIds)
  → normalize guide statuses
  → filter into Dashboard buckets (Drafts / Ready / Published)
```

### Rules

- **Dashboard must be Supabase-first**: Direct Supabase query only. No localStorage fallback in guide loading path.
- **No mock data**: Do not load guides from mock-data in builder dashboard.
- **Single source of truth**: All dashboard buckets derive from the same loaded guide array.
- **Normalized filtering**: All buckets use `normalizeGuideStatus()` for consistent status mapping.
- **Collection ID format**: Collection IDs must be valid UUIDs (36 chars with dashes) from Supabase.

### Implementation

File: `app/builder/network/[networkId]/dashboard/page.tsx`
- Calls `loadNetworkBuilderContext(networkId)` to get hubs and collections
- Calls `getGuidesForNetworkCollectionsWithDiagnostics(collections)`
- Passes guides array to `NetworkDashboardTabs` component
- TabsComponent filters using `filterGuidesByStatus(guides, status)` which calls `normalizeGuideStatus()`

---

## Status Contract

All guide statuses normalize to three canonical buckets:

| Raw Status | Normalized | Bucket |
|-----------|------------|--------|
| `draft` | `draft` | Drafts |
| `ready` | `ready` | Ready |
| `ready_to_publish` | `ready` | Ready |
| `published` | `published` | Published |
| `active` | `published` | Published |

### Rules

- **Normalization is centralized**: File `lib/guideforge/utils.ts` function `normalizeGuideStatus()`
- **All filtering uses normalization**: Dashboard tabs, queries, filtering must call `normalizeGuideStatus()`
- **Do not hardcode mappings**: Always use the centralized function
- **Status field in Supabase**: Stores the raw value (e.g., `"published"` or `"active"`)

### Implementation

File: `lib/guideforge/utils.ts` lines 38-48
```typescript
export function normalizeGuideStatus(status: string): "draft" | "ready" | "published" {
  if (status === "draft") return "draft"
  if (status === "ready" || status === "ready_to_publish") return "ready"
  if (status === "published" || status === "active") return "published"
  return "draft" // safe default
}
```

---

## Generated Guide Save Contract

Generated guides must persist to Supabase as drafts before routing to the editor.

### Rules

- **Generated guides must INSERT into Supabase**: Not just localStorage
- **A local UUID does not mean persistence**: guide.id format (UUID) ≠ guide exists in Supabase
- **Check Supabase before UPDATE/INSERT**:
  - Query: `SELECT id FROM guides WHERE id = guide.id`
  - If found: UPDATE mode
  - If not found: INSERT mode
- **Use canonical Supabase ID**: If INSERT returns different id, use that for guide_steps
- **guide_steps must use canonical ID**: Reference the id from Supabase INSERT/UPDATE response
- **Verification must query Supabase directly**: Use `verifyGuideInSupabase()`, never fall back to localStorage
- **localStorage fallback must not count as success**: Returns `source: "localStorage"`, signal failure
- **Only route on verified Supabase success**: `createAndSaveGuideDraft` returns `verified: true` only if Supabase save AND Supabase verification both pass

### Implementation

File: `lib/guideforge/supabase-persistence.ts` (SupabasePersistenceAdapter.saveDraft)
- Lines 346-380: Mode selection checks Supabase before choosing UPDATE vs INSERT
- Lines 400-442: UPDATE operation uses `.select()` to verify row updated
- Lines 415-520: INSERT operation tries with id, retries without id if schema disallows
- Line 424, 512, 554, 571, 605: Uses `canonicalGuideId` (from Supabase response) for guide_steps and verification

File: `lib/guideforge/create-and-save-guide-draft.ts`
- Lines 218-252: Rejects localStorage fallback as failure before returning result
- Lines 238-265: Uses `verifyGuideInSupabase()` for Supabase-only verification
- Returns `verified: true` ONLY if `source === "supabase"` AND verification passes

File: `components/guideforge/builder/generator-client.tsx`
- Lines 180-194: Validates collectionId is UUID before save attempt
- Line 244: Only routes if `verified === true`
- Shows real error message if verification fails

---

## Editor Save Contract

Existing guides must load from Supabase, edits must persist, and success requires confirmation.

### Rules

- **Load from Supabase**: File `lib/guideforge/supabase-persistence.ts` `loadDraft()` queries guide + guide_steps
- **Section edits persist to guide_steps**: Autosave calls `saveGuideDraft()` which DELETEs old steps and INSERTs new
- **Autosave must not wipe sections**: Hydration guard prevents autosave on initial load
  - Gate: `if (!hasHydratedRef.current || !userEditedRef.current) return`
  - Only autosave AFTER hydration complete AND user has edited
- **Success states require Supabase confirmation**: Only show "Saved" when `source === "supabase"`
- **Show real errors**: If `source === "localStorage"`, show error: "Autosave failed — localStorage only"

### Implementation

File: `components/guideforge/builder/guide-editor.tsx`
- Line 102-114: Hydration tracking (`hasHydratedRef`, `userEditedRef`) prevents autosave on initial load
- Line 176: Calls `saveGuideDraft(updatedGuide)` on edit with 1500ms debounce
- Line 188-207: Only shows success if `source === "supabase"`, shows error if `source === "localStorage"`

File: `lib/guideforge/supabase-persistence.ts` saveDraft method
- DELETE old guide_steps: `await supabase.from("guide_steps").delete().eq("guide_id", canonicalGuideId)`
- INSERT new guide_steps: `await supabase.from("guide_steps").insert(stepsData)`
- Verify: Uses `verifyGuideInSupabase()` before returning success

---

## Status Update Contract

Mark Ready and Publish transitions use `updateGuideStatus()` with full Supabase confirmation.

### Rules

- **Use updateGuideStatus function**: File `lib/guideforge/supabase-persistence.ts` lines 1116-1179
- **Do NOT use .single() blindly**: Use `.maybeSingle()` when zero rows are possible
- **Verify update succeeded**: Check that `.select()` returns data, not just error field
- **No fake success**: Do not claim success unless Supabase confirms the update
- **Show real errors**: Display actual Supabase error messages to user
- **Update both status and timestamp**: Set `status`, `updated_at`, and `published_at` (if transitioning to published)

### Implementation

File: `lib/guideforge/supabase-persistence.ts` updateGuideStatus (lines 1116-1179)
```typescript
const { data, error } = await supabase
  .from("guides")
  .update({ status, updated_at: now, published_at: now })
  .eq("id", guideId)
  .select("*")
  .maybeSingle()  // NOT .single() — allows zero rows without error

if (error || !data) {
  return { success: false, error: "..." }
}
return { success: true, guide: data }
```

File: `components/guideforge/builder/guide-editor.tsx` (Mark Ready handler, lines 368-391)
- Calls `updateGuideStatus(guide.id, "ready")`
- Checks `result.success` before updating local state
- Shows error if `!result.success`

---

## localStorage / Mock Data Contract

localStorage is an emergency dev fallback only. Mock data must not influence production builder.

### Rules

- **localStorage is NOT dashboard persistence**: Do not load guides from localStorage for dashboard counts
- **localStorage can be dev/emergency fallback only**: When Supabase is unavailable
- **Mock data must not influence production builder**: Do not load guides from mock-data in any builder flow
- **Any local-only save must be visibly labeled**: Error message must say "localStorage only"
- **Local-only save must not route as verified**: `verified: false` prevents editor routing
- **Supabase errors must not be hidden**: Show real Supabase error messages in UI

### Boundaries (Audited and Confirmed Safe)

| Flow | Persistence Source | Fallback | Route Allowed |
|------|-------------------|----------|---------------|
| Dashboard loads guides | Supabase only | None | N/A |
| Send to Editor | Supabase verified | None | Only if verified |
| Mark Ready | Supabase confirmed | None | Only if success |
| Publish | Supabase confirmed | None | Only if success |
| Editor autosave | Supabase or localStorage | localStorage on Supabase error | No routing; error shown |

---

## Anti-Regression Rules for v0/Figma/AI Tools

**CRITICAL**: These rules prevent regressions. Enforce strictly.

1. **Do not reintroduce dashboard localStorage loading**
   - Dashboard must query Supabase directly
   - Never load guides from localStorage for dashboard counts

2. **Do not route after generated save unless Supabase-only verification passes**
   - Must check `verified: true` before router.push
   - Verification must query Supabase directly, not fall back to localStorage

3. **Do not treat id shape as persistence**
   - A guide.id with UUID format does NOT mean it exists in Supabase
   - Always check Supabase first before choosing UPDATE vs INSERT

4. **Do not choose UPDATE only because guide.id is a UUID**
   - Query Supabase to verify row exists
   - Only UPDATE if row found
   - Otherwise INSERT

5. **Do not use mock QuestLine guides in builder dashboard**
   - Builder dashboard must use real Supabase data
   - Mock data only for development/testing in isolation

6. **Do not hide Supabase errors**
   - Always display real Supabase error messages to user
   - Do not silently fall back to localStorage without showing error

7. **Do not change schema without explicit approval**
   - guides table structure, guide_steps table structure, status values
   - Any schema change requires discussion

8. **Do not change status normalization mappings**
   - mappings: draft→draft, ready/ready_to_publish→ready, published/active→published
   - If change needed, update centralized function and all dashboard buckets

---

## Manual Verification Checklist

Use this checklist to verify GuideForge flows are working correctly:

### 1. Dashboard Loads Existing Guides
- [ ] Navigate to `/builder/network/{networkId}/dashboard`
- [ ] Verify existing guides appear with correct counts in Drafts/Ready/Published tabs
- [ ] Reload page (Cmd+R)
- [ ] Counts persist (proves Supabase persistence)

### 2. Generate Guide → Send to Editor Increases Draft Count
- [ ] Navigate to `/builder/network/{networkId}/generate`
- [ ] Generate a guide
- [ ] Click "Send to Editor"
- [ ] Confirm no error appears
- [ ] Editor loads with guide content
- [ ] Return to dashboard
- [ ] Verify "Drafts" count increased by 1
- [ ] Refresh dashboard — count persists

### 3. Mark Ready Moves Draft → Ready
- [ ] Open a Draft guide in editor
- [ ] Click "Mark Ready" button
- [ ] Confirm no error appears
- [ ] Verify button changes to "Ready" state
- [ ] Return to dashboard
- [ ] Verify guide moved from "Drafts" to "Ready" tabs

### 4. Publish Moves Ready → Published
- [ ] Open a Ready guide in editor
- [ ] Click "Publish" button
- [ ] Confirm no error appears
- [ ] Verify guide status changes
- [ ] Return to dashboard
- [ ] Verify guide moved to "Published" tab
- [ ] Open "Published" tab to confirm guide appears

### 5. Reload Preserves Counts and Status
- [ ] Navigate to dashboard
- [ ] Note current counts for Drafts/Ready/Published
- [ ] Reload page (Cmd+R)
- [ ] Verify counts are identical
- [ ] Verify each tab still shows same guides

### 6. Section Edits Persist After Reload
- [ ] Open a Draft guide in editor
- [ ] Edit a section title or body
- [ ] Wait for "Saved" toast (autosave completes)
- [ ] Reload page (Cmd+R)
- [ ] Verify edited section content remains
- [ ] Close editor, reopen same guide
- [ ] Verify edits persist

### 7. localStorage-Only Save Never Appears as Dashboard Success
- [ ] (This requires Supabase to be unavailable, which is exceptional)
- [ ] If Supabase becomes unavailable while editing:
  - [ ] Autosave shows error: "Autosave failed — localStorage only"
  - [ ] Dashboard count does NOT increase
  - [ ] When Supabase returns, count increases once guide syncs

---

## References

- **Dashboard Page**: `app/builder/network/[networkId]/dashboard/page.tsx`
- **Supabase Persistence**: `lib/guideforge/supabase-persistence.ts`
- **Guide Save Function**: `lib/guideforge/create-and-save-guide-draft.ts`
- **Status Utils**: `lib/guideforge/utils.ts`
- **Editor Component**: `components/guideforge/builder/guide-editor.tsx`
- **Generator Client**: `components/guideforge/builder/generator-client.tsx`

---

## Summary

The GuideForge Data Spine Contract ensures:

1. **Dashboard is Supabase-first** — Direct Supabase queries, no mock data or localStorage
2. **Generated guides persist to Supabase** — Not localStorage-only
3. **Routing requires Supabase verification** — Not just id shape validation
4. **Status updates require Supabase confirmation** — Real errors shown, no fake success
5. **Section edits persist to guide_steps** — Survive reload and reopen
6. **localStorage is transparent dev fallback** — Explicitly labeled as local-only, not silent
7. **All flows use normalized status** — Consistent bucketing across dashboard

Adhere to these rules to maintain a stable, audited, production-ready builder.
