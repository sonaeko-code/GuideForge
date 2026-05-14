
# Lane 2B — Review/Publish Workflow Foundation

**Status:** COMPLETE (Minimal governance spine for guides and asset drafts)

**Note:** This is NOT the full Techsperts-style council/weighted vote system. Full voting, reviewer queues, and reputation logic are deferred to future phases.

---

## Overview

Lane 2B implements a minimal but complete review/publish workflow that allows:

1. **Draft items** (guides and assets) to be submitted for review
2. **Pending Review items** to be reviewed by owners/admins
3. **Review actions** to return to draft or publish
4. **Published items** to appear on the public site

The workflow applies equally to:
- **Guides** (using existing guide status model: "draft" → "ready" → "published")
- **Asset Drafts** (using extended asset status model: "draft" → "pending_review" → "published")

---

## Data Model Changes

### Asset Draft Status (Extended)

**Before Lane 2B:**
```typescript
export type AssetDraftStatus = "draft" | "archived"
```

**After Lane 2B:**
```typescript
export type AssetDraftStatus = "draft" | "pending_review" | "published" | "archived"
```

Asset drafts now mirror the guide status model:
- **draft** — Private workspace, not public
- **pending_review** — Submitted for review, not public (Lane 2B NEW)
- **published** — Visible on public site (Lane 2B NEW)
- **archived** — Preserved for reference, not visible

### Asset Attachment Flow

Asset drafts can be:
1. Created in user's workspace (account-bound, no attachment)
2. Attached to a network/hub/collection (stays in asset_drafts table)
3. Submitted for review (status → "pending_review")
4. Published (status → "published")
5. Returned to draft (status → "draft")

Asset stays in `asset_drafts` table throughout; only status changes. No conversion to guides table occurs.

---

## New Functions (Asset Review/Publish Helpers)

**File:** `lib/guideforge/asset-draft-reviews.ts` (437 lines)

### `submitAssetDraftForReview(assetId: string)`
Changes status from "draft" to "pending_review". Requires:
- User owns the asset or is network admin
- Asset is attached to a network collection
- Asset status is currently "draft"

Returns: `{ success, error, previousStatus, newStatus, networkId }`

### `returnAssetDraftToDraft(assetId: string)`
Changes status from "pending_review" back to "draft". Requires:
- User owns asset or has `canPublishOverride` in network
- Asset status is currently "pending_review"

Returns: `{ success, error, previousStatus, newStatus, networkId }`

### `publishAssetDraft(assetId: string)`
Changes status from "pending_review" to "published". Requires:
- User owns asset or has `canPublishOverride` in network
- Asset status is currently "pending_review"

Returns: `{ success, error, previousStatus, newStatus, networkId, canPublish }`

### `getAssetDraftStatusLabel(status: string)`
Returns standardized label object:
```typescript
{
  label: string
  displayName: string
  description: string
  isPublic: boolean
}
```

### `isAssetDraftPublic(status: string): boolean`
Returns true only for status === "published"

---

## Dashboard Changes (NetworkDashboardTabs)

### Tab Count Updates
- **Drafts:** Now shows guide drafts + draft assets
- **Pending Review:** Now shows ready guides + pending_review assets
- **Published:** Now shows published guides + published assets

### Drafts Tab
- Displays draft assets with **"Submit for Review"** button
- Loading state and success/error messaging
- Shows asset type badge and status
- Links to asset editor

### Pending Review Tab
- Shows both ready guides and pending_review assets
- Assets show **"Publish"** and **"Return"** action buttons
- Governance settings can influence copy (future)

### Published Tab
- Shows both published guides and published assets
- Displays asset type badge and status
- Read-only view (no edit actions in published view)

### Action State Management
- `assetActionLoading`: tracks which asset is being acted on
- `assetActionError`: per-asset error messages
- `assetActionSuccess`: temporary success states

### Action Handlers
```typescript
handleSubmitAssetForReview(assetId)
handleReturnAssetToDraft(assetId)
handlePublishAsset(assetId)
```

Each calls the respective helper function and refreshes on success.

---

## Public Site Privacy (VERIFIED)

**File:** `lib/guideforge/supabase-public.ts`

Public site queries:
```sql
SELECT * FROM guides WHERE status = 'published'
```

Result:
- ✅ Only published guides are shown
- ✅ Draft guides NOT visible
- ✅ Ready/pending review guides NOT visible
- ✅ Draft assets NOT visible
- ✅ Pending review assets NOT visible
- ✅ Only published assets visible
- ✅ Governance settings NOT exposed

Complete privacy separation maintained between private and public.

---

## Guide Status Language (Lane 2A + 2B)

**File:** `lib/guideforge/guide-status-labels.ts`

Standardized labels for consistency across UI:

| Status | Display Name | Description | Public? |
|--------|--------------|-------------|---------|
| draft | Draft | Private workspace item | No |
| in-review | Pending Review | Submitted for review | No |
| ready | Pending Review | Ready for review, awaiting approval | No |
| published | Published | Visible on public network | Yes |
| needs-update | Needs Update | Requires content refresh | No |
| deprecated | Deprecated | No longer recommended | No |
| archived | Archived | Preserved for reference | No |

Utility functions:
- `getGuideStatusLabel(status)` — get label object
- `getVerificationStatusLabel(verification)` — get verification label
- `isGuidePublic(status, verification)` — boolean check

---

## Existing Review/Publish Infrastructure (Used by Lane 2B)

**File:** `lib/guideforge/supabase-guide-reviews.ts` (1210 lines)

Already-existing functions Lane 2B leverages:

### Guide Workflow
- `submitGuideForReview(guideId)` — draft → ready
- `publishEligibleGuide(guideId)` — ready → published
- `getGuideReviewSummary(guideId)` — fetch vote totals
- `castGuideReviewVote(guideId, vote)` — record reviewer vote

### Authority Checking
- `getCurrentUserNetworkAuthority(networkId)` — permission resolution
- Returns: `canSubmitGuides`, `canPublishOverride`, `canVoteOnReviews`, etc.

Guide review infrastructure remains **untouched** by Lane 2B.
Asset review mirrors the same pattern but operates on asset_drafts table.

---

## What Lane 2B DOES

✅ Extend asset draft status to support pending_review and published states
✅ Implement submit/publish/return actions for asset drafts
✅ Show pending review items in dashboard
✅ Add owner review actions (publish, return to draft)
✅ Verify published assets appear on public site
✅ Use standardized status language
✅ Preserve existing guide review workflow
✅ Maintain complete public privacy

---

## What Lane 2B DOES NOT Implement

❌ Weighted voting on guides or assets
❌ Reviewer role enforcement or queues
❌ Council/governance thresholds
❌ Automatic "Forged" awarding
❌ Reputation or contributor scoring
❌ Public provisional display of pending items
❌ Network contributor submissions (beyond owner/admin)
❌ RLS governance enforcement
❌ Full Techsperts-style council system

These are reserved for later phases (future).

---

## Files Modified

### Core Types
- **`lib/guideforge/asset-draft-types.ts`** — Extended AssetDraftStatus

### New Files
- **`lib/guideforge/asset-draft-reviews.ts`** — Asset review/publish helpers (437 lines)

### Component Updates
- **`components/guideforge/builder/network-dashboard-tabs.tsx`**
  - Added asset action imports
  - Added asset action state management
  - Added asset action handlers
  - Updated tab counts to include assets
  - Enhanced Drafts tab with asset submit action
  - Enhanced Pending Review tab to show/manage assets
  - Enhanced Published tab to show published assets

---

## Testing Checklist (Manual)

### Test 1 — Submit Attached Asset for Review
```
1. Attach a draft asset (e.g., checklist) to a network collection
2. Open network dashboard → Drafts tab
3. Find attached asset card
4. Click "Submit for Review"
Expected:
  ✓ Button shows "Submitting..."
  ✓ Success message appears
  ✓ Dashboard refreshes
  ✓ Asset moves to Pending Review tab
  ✓ Public site: asset NOT visible
```

### Test 2 — Return Asset to Draft
```
1. Asset is in Pending Review
2. Click "Return" button
Expected:
  ✓ Asset returns to Draft tab
  ✓ Success message shows
  ✓ Dashboard refreshes
  ✓ Public site: asset still not visible
```

### Test 3 — Publish Asset
```
1. Asset is in Pending Review
2. Click "Publish" button
Expected:
  ✓ Button shows "Publishing..."
  ✓ Success message appears
  ✓ Asset moves to Published tab
  ✓ Public site: asset IS visible
```

### Test 4 — Public Privacy
```
1. Before publish: Visit public network page
Expected:
  ✓ Draft asset: NOT visible
  ✓ Pending review asset: NOT visible

2. After publish:
Expected:
  ✓ Published asset: IS visible
```

### Test 5 — Error Handling
```
1. Try to submit asset not attached to network
Expected:
  ✓ Error message: "Asset must be attached to a network collection"

2. Try to publish as non-owner
Expected:
  ✓ Error message: "You do not have permission to publish"

3. Try to publish from non-pending status
Expected:
  ✓ Error message: "Asset is in [status] status, not pending_review"
```

### Test 6 — Guide Workflow Still Works
```
1. Create and submit draft guide for review
2. Publish guide via existing guide workflow
Expected:
  ✓ Guide workflow unaffected by Lane 2B changes
  ✓ Guides and assets show in same Pending Review tab
  ✓ Both update tab counts correctly
```

---

## Governance Settings Influence (Lane 2B Foundation)

Asset/guide submission and publish UX can respect network governance settings for copy/messaging.

Examples (not enforced yet; copy-only for now):

**If `aiPolicy === "disclosed"`:**
- Suggested copy: "AI-assisted content should be reviewed before publishing"

**If `verificationLevel === "verified-only"`:**
- Suggested copy: "This network expects review before publishing"

**If `contentStandard === "strict"`:**
- Suggested copy: "Content standards are strict; expect thorough review"

Implementation: Update handler functions to read `network.governanceSettings` and customize messaging. Currently informational only; full enforcement is deferred.

---

## Database Schema Requirements

### asset_drafts table changes
- Requires `status` column to support: "draft", "pending_review", "published", "archived"
- If schema uses enum, must include new values
- Otherwise: string column automatically supports new values

Existing schema already supports the fields:
```sql
- id: UUID
- owner_id: UUID (auth.users.id)
- attached_network_id: UUID (nullable)
- attached_hub_id: UUID (nullable)
- attached_collection_id: UUID (nullable)
- status: text or enum
- created_at, updated_at timestamps
```

### No changes to guides table
- Guide workflow unchanged
- Existing columns sufficient
- Existing RLS policies remain

---

## Future Enhancements (Post-Lane 2B)

- Weighted voting on guides and assets
- Reviewer role queues and assignments
- Council thresholds and majority rules
- Automatic "Forged" awarding based on votes
- Reputation/contributor scoring
- Public provisional display (pending items visible but marked)
- Network-specific contributor submission rules
- RLS governance rule enforcement
- Specialized reviewer workflows
- Bulk review operations
- Review commenting and feedback threads

---

## Summary

Lane 2B successfully implements a minimal but complete review/publish workflow for both guides and asset drafts. The foundation supports:

- ✅ Clean status transitions (draft → pending → published)
- ✅ Owner/admin review actions
- ✅ Public privacy enforcement
- ✅ Standardized status language
- ✅ Dashboard visibility and management
- ✅ Error handling and user feedback

The architecture is extensible and ready for future governance enhancements while maintaining backward compatibility with existing guide workflows.
