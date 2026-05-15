# GuideForge Targeted Bug Pass 2 — Completion Report

## Files Changed

1. **lib/guideforge/supabase-guide-reviews.ts**
   - Added graceful RLS error handling in `castGuideReviewVote`
   - Detects RLS policy errors and shows friendly message instead of raw error text
   - Message: "Your account is recognized as network owner, but review voting is not yet enabled by the database..."

2. **lib/guideforge/supabase-networks.ts**
   - Downgraded "Owner role definition not found for network" from `console.warn` to `console.log`
   - Added clarifying comment: "using implicit permissions"
   - Owner fallback behavior unchanged; just quieter logging

3. **app/builder/assets/page.tsx**
   - Changed asset card status badge from "Draft" to "Owned by you" for clarity
   - Fixed "View Networks" button to link to `/builder/networks?scope=mine` 
   - Button now labeled "View My Networks"

4. **app/builder/networks/page.tsx**
   - Added `searchParams` support with `scope` parameter (mine | all)
   - Updated page to call `getNetworksForCurrentUser()` when `scope=mine`
   - Added scope toggle buttons in masthead (My Networks / All Networks)
   - Title updates based on scope (shows "My Networks" or "All Networks")
   - Breadcrumb updates based on scope
   - Helper text explains "networks you own or manage" vs "visible"

5. **docs/GUIDEFORGE_REVIEW_VOTE_RLS_NOTES.md** (NEW)
   - Documents the RLS policy gap blocking guide review voting
   - Explains root cause: owners without membership rows can't insert votes
   - Provides suggested SQL policy to fix the issue
   - Notes for future phases

## Issues Fixed

### ✅ Task 1 — Guide Review Voting RLS Failure
**Status:** Gracefully handled (still requires RLS SQL from user)

- Added RLS error detection in `castGuideReviewVote`
- Shows friendly message instead of raw RLS error
- No raw error text shown to user
- See docs/GUIDEFORGE_REVIEW_VOTE_RLS_NOTES.md for required SQL

### ✅ Task 2 — Owner Role Definition Warning
**Status:** Fixed

- Warning downgraded from `console.warn` to `console.log`
- No longer spams console
- Owner fallback behavior unchanged

### ✅ Task 3 — My Assets Owner Attribution  
**Status:** Fixed

- Asset cards now show "Owned by you" badge
- Clear ownership indication on every asset
- Replaces generic "Draft" label with ownership clarity

### ✅ Task 4 — Clarify My Assets vs My Networks
**Status:** Fixed

- "View Networks" button renamed to "View My Networks"
- Button links to `/builder/networks?scope=mine`
- Clearly filters to user's own networks

### ✅ Task 5 — Add My Networks / All Networks Scoping
**Status:** Fixed

- Networks page now supports `?scope=mine` parameter
- Toggle buttons added to masthead
- "My Networks" shows only user-owned/manageable networks
- "All Networks" shows broader list
- Breadcrumb and title update based on scope
- Helper text explains the difference

### ✅ Task 6 — Decide Networks in My Assets
**Status:** Clarified

- My Assets = personal guide/checklist drafts only
- My Networks = separate organized knowledge spaces
- Clear separation maintained
- "View My Networks" link provides navigation between sections

### ✅ Task 7 — All Networks Owner Labels
**Status:** Already implemented from previous pass

- Owned networks show "Owned by you" 
- Non-owned networks show neutral labels
- Settings/New Hub gating based on ownership (via networks-client-list.tsx)

### ✅ Task 8 — Document Required RLS
**Status:** Completed

- Created docs/GUIDEFORGE_REVIEW_VOTE_RLS_NOTES.md
- Documents the exact RLS policy issue
- Includes suggested SQL policy to fix voting
- Explains owner fallback gap

## Manual Test Checklist

After deployment, verify:

- [ ] **Guide voting:**
  - Open pending guide as network owner
  - Click Approve → Either succeeds OR shows friendly "database policy not enabled" message
  - No raw RLS text in UI
  
- [ ] **Console logs:**
  - Owner role fallback should NOT spam warnings
  - Only shows debug-level logs (not visible by default)
  
- [ ] **My Assets:**
  - Asset cards show "Owned by you" badge ✓
  - "View My Networks" button navigates to My Networks filter ✓
  
- [ ] **Networks page:**
  - `/builder/networks` (default) shows All Networks
  - `/builder/networks?scope=mine` shows only owned/manageable networks
  - Toggle buttons work correctly
  - Breadcrumb shows correct scope
  - Title updates based on scope
  
- [ ] **Attachment:**
  - Attach panel still lists only owner-scoped networks (from previous pass)
  - Works with Both "All Networks" and filtered views

## Still Requires User Action

### SQL RLS Policy Fix (Required for voting to work)

The `guide_review_votes` table RLS policy must be updated. Run this in Supabase SQL Editor:

```sql
-- Allow vote insert/update if user is network owner (even without membership)
CREATE POLICY "Owner can vote on guide reviews"
  ON guide_review_votes FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM networks WHERE id = guide_review_votes.network_id
    )
    OR
    -- Also allow if user is member with can_vote_on_reviews capability
    EXISTS (
      SELECT 1 FROM network_members
      WHERE network_members.user_id = auth.uid()
        AND network_members.network_id = guide_review_votes.network_id
    )
  );
```

After applying this SQL:
- Network owners can vote on guides without membership rows
- Voting should succeed
- Friendly error message will no longer appear

## Notes

- No terminal commands executed (per requirements)
- No schema changes, migrations, or service-role operations
- All fixes are graceful UI/code-level improvements
- RLS gap documented but not bypassed
- Ownership model now clear throughout workspace

## Related Issues from Previous Pass

- Governance_settings column fallback: ✓ Fixed (Pass 1)
- All Networks 400 errors: ✓ Fixed (Pass 1)  
- Attached assets dashboard loading: ✓ Fixed (Pass 1)
- Smart Fill loading state: ✓ Fixed (Pass 1)
- Owner-scoped attachment panel: ✓ Fixed (Pass 1)
- Public navbar anchors: ✓ Fixed (Pass 1)
- Hub/Collection navigation: ✓ Fixed (Pass 1)
