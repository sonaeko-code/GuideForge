# GuideForge Current Build State

**Last Updated**: May 4, 2026  
**Status**: Stable - All critical persistence flows audited and verified  
**Checkpoint**: Ready for feature development

---

## Stable Confirmed Flows

These flows have been systematically audited and verified to work correctly with Supabase persistence:

1. **Dashboard loads Supabase guides by collection_id**
   - Flow: `networkId → hubs → collections → WHERE collection_id IN (ids)`
   - Source: `getGuidesForNetworkCollectionsWithDiagnostics()` in `supabase-networks.ts`
   - Verified: Dashboard counts update correctly on guide status changes

2. **Generate Guide creates real Supabase Draft**
   - Flow: AI generation → collect form data → saveGuideDraft → Supabase INSERT/UPDATE
   - Source: `createAndSaveGuideDraft()` → `SupabasePersistenceAdapter.saveDraft()`
   - Verified: Generated guides appear in dashboard Drafts tab immediately

3. **Send to Editor routes only after Supabase save and verification**
   - Flow: Collection UUID validation → Supabase save → verifyGuideInSupabase() → router.push
   - Source: `generator-client.tsx` + `create-and-save-guide-draft.ts`
   - Verified: Editor loads guide with correct sections from Supabase

4. **Draft appears in dashboard**
   - Flow: Supabase guide inserted with `status: "draft"` → normalizeGuideStatus → Drafts tab
   - Source: Dashboard tabs filter via `filterGuidesByStatus(guides, "draft")`
   - Verified: Count increases when guide sent to editor

5. **Mark Ready moves Draft → Ready**
   - Flow: Editor button click → `updateGuideStatus("ready")` → Supabase UPDATE confirmed
   - Source: `supabase-persistence.ts` line 1116+
   - Verified: Local state updates, dashboard Drafts count decreases, Ready count increases

6. **Publish moves Ready → Published**
   - Flow: Editor button click → `updateGuideStatus("published")` → Supabase confirmed
   - Source: `supabase-persistence.ts` line 1116+
   - Verified: Dashboard counts update, guide appears in Published tab

7. **Section edits persist across reload**
   - Flow: Edit section → autosave debounce → DELETE old guide_steps → INSERT new guide_steps → verify
   - Source: `guide-editor.tsx` autosave + `saveDraft()` guide_steps handling
   - Verified: Sections intact after page reload and dashboard reopen

8. **Add section persists across reload**
   - Flow: Add section button → new step created → autosave → INSERT guide_steps → verify
   - Source: `guide-editor.tsx` + `supabase-persistence.ts` saveDraft method
   - Verified: New sections remain after reload

9. **localStorage fallback does not count as production success**
   - Flow: Supabase unavailable → save to localStorage → return `source: "localStorage", error: "..."`
   - Source: All persistence adapters + verification checks
   - Verified: Dashboard never increments, Send to Editor blocks, autosave shows error

---

## Do Not Break

These are the critical paths that must never be changed without explicit architectural review:

### Dashboard Loading
- **File**: `app/builder/network/[networkId]/dashboard/page.tsx`
- **Path**: Direct Supabase query via `getGuidesForNetworkCollectionsWithDiagnostics()`
- **Rule**: Do NOT introduce mock data, localStorage, or client-side filtering in dashboard load path
- **Why**: Dashboard counts are the source of truth for persistent guides

### Generated Guide Supabase Persistence
- **File**: `lib/guideforge/create-and-save-guide-draft.ts` + `supabase-persistence.ts`
- **Path**: INSERT vs UPDATE mode selection with Supabase existence check
- **Rule**: Do NOT bypass mode selection or skip Supabase save → verification chain
- **Why**: Generated guides must reliably appear on dashboard

### Supabase-Only Verification
- **File**: `lib/guideforge/supabase-persistence.ts` `verifyGuideInSupabase()`
- **Path**: Direct Supabase query, no localStorage fallback
- **Rule**: Do NOT allow verification to fall back to localStorage
- **Why**: Proof of Supabase persistence required before routing/success

### Canonical Guide ID
- **File**: `lib/guideforge/supabase-persistence.ts` saveDraft method
- **Path**: Track canonicalGuideId from Supabase response for guide_steps and verification
- **Rule**: Do NOT use input guide.id if it differs from Supabase-returned id
- **Why**: Ensures guide_steps reference correct guide if schema generates IDs

### updateGuideStatus Confirmation
- **File**: `lib/guideforge/supabase-persistence.ts` updateGuideStatus
- **Path**: `.select("*").maybeSingle()` to confirm update succeeded
- **Rule**: Do NOT remove confirmation check or use `.single()` without error handling
- **Why**: Prevents false success on missing guides

### Status Normalization
- **File**: `lib/guideforge/utils.ts` normalizeGuideStatus
- **Path**: Centralized mapping: draft→draft, ready/ready_to_publish→ready, published/active→published
- **Rule**: Do NOT bypass normalization or create new status values
- **Why**: Ensures consistent dashboard tab bucketing

### localStorage Boundaries
- **File**: `lib/guideforge/persistence.ts` getPersistenceAdapter + all callers
- **Path**: localStorage only as fallback when Supabase unavailable, explicit error returned
- **Rule**: Do NOT hide localStorage as successful persistence for dashboard counts
- **Why**: Dashboard must only show guides confirmed in Supabase

---

## Current Known Next Work

These are planned improvements that respect the stable data spine:

1. **Clean up diagnostics naming** (if any remain)
   - The `getGuidesForNetworkCollectionsWithDiagnostics` function name references early debug work
   - Can be renamed when diagnostics panel is fully removed

2. **Verify manual guide creation uses same path**
   - Ensure guides created via form (not generated) follow same Supabase persistence
   - Confirm same autosave, verification, and dashboard integration

3. **Improve section editor UX**
   - Add section validation
   - Improve autosave feedback
   - Add undo/redo support
   - (Non-breaking improvements)

4. **Add deterministic Network Scaffold Builder**
   - After persistence is confirmed stable
   - Will use same guide persistence paths

---

## Manual Regression Checklist

Before committing any changes, verify these flows work end-to-end:

1. **Dashboard loads existing guides**
   ```
   Navigate to /builder/network/{networkId}/dashboard
   Verify: Existing guides appear with correct counts in all tabs
   Verify: Counts persist after page reload
   ```

2. **Generate → Draft**
   ```
   Go to /builder/network/{networkId}/generate
   Generate a guide and click "Send to Editor"
   Verify: Routes to editor (no error)
   Verify: Dashboard Drafts count increased by 1
   ```

3. **Draft → Ready**
   ```
   Open editor for draft guide
   Click "Mark Ready" button
   Verify: Local state updates (button gone, section shows "Ready")
   Verify: Dashboard Drafts count decreased, Ready count increased
   ```

4. **Ready → Published**
   ```
   Open editor for ready guide
   Click "Publish" button
   Confirm dialog
   Verify: Routes to dashboard with published tab active
   Verify: Ready count decreased, Published count increased
   ```

5. **Edit section → reload persists**
   ```
   Edit section title or body
   Wait for autosave (toast shows "Saved")
   Reload page (Cmd+R)
   Verify: Section edits are present
   ```

6. **Add section → reload persists**
   ```
   Click "Add Section" button
   Fill in section title/body
   Wait for autosave
   Reload page
   Verify: New section is present
   ```

7. **Reload dashboard preserves counts**
   ```
   Note current counts (Drafts, Ready, Published)
   Reload dashboard page
   Verify: Counts are identical
   (Confirms Supabase is source of truth)
   ```

---

## Files Modified / Created This Cycle

1. **Created**: `docs/guideforge-data-spine-contract.md` - Complete persistence contract
2. **Modified**: `app/builder/network/[networkId]/dashboard/page.tsx` - Added contract reference
3. **Modified**: `lib/guideforge/supabase-persistence.ts` - Added verification functions, hardened save mode selection
4. **Modified**: `lib/guideforge/create-and-save-guide-draft.ts` - Added localStorage rejection, Supabase-only verification
5. **Modified**: `components/guideforge/builder/generator-client.tsx` - Added collection UUID validation
6. **Modified**: `components/guideforge/builder/guide-editor.tsx` - Added currentStep derivation
7. **Modified**: `lib/guideforge/utils.ts` - Added contract documentation
8. **Modified**: `lib/guideforge/supabase-networks.ts` - Added contract documentation
9. **Modified**: `components/guideforge/builder/network-dashboard-tabs.tsx` - Removed unused import
10. **Removed**: `components/guideforge/builder/dashboard-diagnostics.tsx` - Temporary debug UI (still in codebase, unused)

---

## Summary

All critical GuideForge data persistence flows are stable and verified to work correctly with Supabase. The system is production-ready for the following operations:

- ✓ Dashboard displays guides from Supabase
- ✓ Generated guides persist to Supabase and appear on dashboard
- ✓ Guides can transition through status workflow (Draft → Ready → Published)
- ✓ Section edits persist across reloads
- ✓ localStorage fallback is transparent and labeled as non-production

The Data Spine Contract (`docs/guideforge-data-spine-contract.md`) documents all critical paths and anti-regression rules. Refer to it before making any changes to persistence, dashboard loading, or status workflows.

New feature work can proceed with confidence that the foundation is stable.
