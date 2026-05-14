# GuideForge Asset-to-Network Attachment Flow

## Overview

Lane 1C implements the missing bridge between saved assets (Checklists, Single Guides) and Networks. Users can now attach existing assets to network collections, making them part of the network's content structure without publishing them publicly.

## Data Model

### Asset Attachment Fields

`AssetDraft` type already includes three nullable fields that support attachment:
- `attachedNetworkId` (string | null)
- `attachedHubId` (string | null)
- `attachedCollectionId` (string | null)

These fields are persisted to the `asset_drafts` table in Supabase and managed by `updateAssetDraft()` helper.

### Asset Privacy & Draft Status

- **Attached assets remain private drafts** until explicitly published through the publish/review workflow
- Assets attached to a collection are internal to that collection; they do NOT appear on public site
- Public site continues to show only published guides, not drafts or attached assets
- Dashboard surfaces attached assets under the collection they're attached to

## User Flow

### 1. From Asset Detail Page

1. User opens My Assets and selects an asset
2. Clicks "Attach" button in the "Attach to Network" card
3. Attachment panel opens with 3-step selector:
   - Select Network (auto-loads user's networks)
   - Select Hub (auto-loads hubs for selected network)
   - Select Collection (auto-loads collections for selected hub)
4. Clicks "Attach to Collection"
5. Asset is updated with attachment IDs
6. Success message shown, panel closes
7. Dashboard should update to show attachment

### 2. Empty States & Errors

**No Networks:**
- "You don't have any networks yet. Create a network first."

**Network has no Hubs:**
- "This network has no hubs yet. Create a hub first."

**Hub has no Collections:**
- "This hub has no collections yet. Create a collection first."

### 3. Re-attach or Change

If asset is already attached, users can:
- Click "Change" button to re-select a different collection
- Select a new network/hub/collection
- Save the change
- Asset's attachment IDs update

## Implementation Details

### Files Created

- `components/guideforge/builder/attach-to-network-panel.tsx` — New modal/panel for attachment selection
- `docs/GUIDEFORGE_ASSET_ATTACHMENT_FLOW.md` — This documentation

### Files Modified

- `app/builder/assets/[assetId]/page.tsx` — Added "Attach to Network" button and panel UI
- `lib/guideforge/supabase-networks.ts` — Added `getAttachedAssetsForCollection()` helper

### Integration Points

**Asset Detail Page:**
- Button: "Attach to Network" or "Change"
- Opens `AttachToNetworkPanel` component
- Passes current attachment state and asset ID
- Calls `updateAssetDraft()` to persist attachment

**Dashboard (Future):**
- Guides tab should query attached assets and display them
- Show indicator that guide is from attached asset

**Public Site:**
- No changes; continues to show only published guides
- Attached drafts are never rendered publicly

## Data Safety

### Attachment Validation

- Asset must exist and belong to current user (enforced by RLS)
- Selected network must exist and belong to current user
- Selected hub must exist and belong to that network
- Selected collection must exist and belong to that hub
- All validation happens in-panel before update

### Duplicate Prevention

- No duplicate attachment checks at UI level (same asset can attach to multiple collections if user explicitly does so)
- Frontend displays "Already attached" only if re-opening panel with same asset/collection

### Cascade Behavior

- Deleting asset: no impact on network (asset just removed from collection)
- Deleting collection: doesn't delete attached assets (they become "orphaned" until re-attached)
- Deleting hub: doesn't delete collections or attached assets

## Save UX

### Loading States

- While fetching networks/hubs/collections: spinner + "Loading..."
- While attaching: button disabled, "Attaching..." text

### Success State

- "Asset attached successfully!" message
- Checkmark icon
- Panel auto-closes after 1.5 seconds
- Asset detail page refreshes to show updated attachment status

### Error Handling

- All Supabase errors caught and shown as friendly messages
- No raw database errors exposed to user
- Error persists in panel so user can retry without losing progress

## Future Enhancements

1. **Dashboard Display** — Show attached assets in Guides tab with special badge
2. **Bulk Attachment** — Attach multiple assets at once from My Assets list
3. **Attachment History** — Track when asset was attached/detached
4. **Archive Before Delete** — Prompt user to detach before deleting an asset with attachment
5. **Network Transfer** — Move attached asset from one collection to another more easily

## Notes

- **No Schema Changes**: Attachment fields already exist in asset_drafts table
- **No Migrations**: No database migrations required
- **RLS Safe**: All queries respect row-level security policies
- **SSR Safe**: Panel component is client-only ("use client")
- **Backward Compat**: Assets without attachment work as before (fields default to null)

## Testing Checklist

**Manual Test 1 — Attach Checklist**
1. Open My Assets
2. Open "Daily Medication Checklist"
3. Click "Attach" button
4. Select Home Systems network → Routine hub → Medication collection
5. Click "Attach to Collection"
6. Expect: Success message, panel closes, "Attached to Network" status shown

**Manual Test 2 — Attach Single Guide**
1. Open My Assets
2. Open "Publishing Your YouTube Gameplay Video"
3. Click "Attach"
4. Select Creator Workflow network → Production hub → Content collection
5. Attach
6. Expect: Success, asset marked as attached

**Manual Test 3 — Error: No Networks**
1. Sign up new user with no networks
2. Open any asset
3. Click "Attach"
4. Expect: Error message "You don't have any networks yet. Create a network first."

**Manual Test 4 — Public Privacy**
1. Attach an asset to a collection
2. Open /n/[networkSlug] (public site)
3. Expect: Asset does NOT appear on public site (draft not published)
4. Expect: Dashboard shows "No published guides yet"

**Manual Test 5 — Re-attach**
1. Attach asset to Collection A
2. Click "Change" button
3. Select Collection B
4. Expect: Attachment updates to new collection
