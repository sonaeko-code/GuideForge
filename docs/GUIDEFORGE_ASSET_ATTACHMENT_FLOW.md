# GuideForge Asset-to-Network Attachment Flow

## Overview

Lane 1C.2 completes the asset-to-network attachment bridge. Users can now attach assets to collections and view them in the network dashboard's private workspace. Attached assets remain draft/private and never appear publicly.

## Data Model

### Asset Attachment Fields

`AssetDraft` type includes three nullable fields that support attachment:
- `attachedNetworkId` (string | null)
- `attachedHubId` (string | null)
- `attachedCollectionId` (string | null)

These fields are persisted to the `asset_drafts` table in Supabase and managed by `updateAssetDraft()` helper.

### Asset Privacy & Draft Status

- **Attached assets remain private drafts** until explicitly published through the publish/review workflow
- Assets attached to a collection are internal to that collection; they do NOT appear on public site
- Public site continues to show only published guides (from `guides` table), never querying `asset_drafts`
- Dashboard surfaces attached assets under the collection they're attached to in the Drafts tab

### One Asset, One Attachment

- An asset can only be attached to one collection at a time
- Changing attachment updates existing attachment fields (does not create duplicate)
- UI prevents duplicate attachment to the same collection with friendly message

## User Flow

### 1. From Asset Detail Page

1. User opens My Assets and selects an asset
2. Clicks "Attach to Network" button
3. Attachment panel opens with 3-step selector:
   - Select Network (auto-loads user's networks)
   - Select Hub (auto-loads hubs for selected network)
   - Select Collection (auto-loads collections for selected hub)
4. Clicks "Attach to Collection"
5. Asset is updated with attachment IDs
6. Success message shown, panel closes
7. Asset detail updates to show green "Attached to Network" card

### 2. Viewing in Network Dashboard

1. Open network dashboard
2. Click "Drafts" tab
3. Scroll to "Attached Draft Assets" section
4. See grid of attached assets with:
   - Asset type badge (Guide, Checklist, etc.)
   - Title and summary
   - "Draft" status badge
   - Edit link to open asset detail
5. Collection card shows count: "2 guides · 3 assets"

### 3. Empty States & Errors

**No Networks:**
- "You don't have any networks yet. Create a network first."

**Network has no Hubs:**
- "This network has no hubs yet. Create a hub first."

**Hub has no Collections:**
- "This hub has no collections yet. Create a collection first."

**Duplicate Attachment Attempt:**
- "This asset is already attached to that collection. Select a different collection to move it."

### 4. Re-attach or Change

If asset is already attached, users can:
- Click "Change" button to re-select a different collection
- Select a new network/hub/collection
- Save the change
- Asset's attachment IDs update to new location

## Implementation Details

### Files Created

- `components/guideforge/builder/attach-to-network-panel.tsx` — Attachment panel for network/hub/collection selection

### Files Modified

- `app/builder/assets/[assetId]/page.tsx` — Added attachment panel UI, improved "Attached" display
- `lib/guideforge/supabase-networks.ts` — Added `getAttachedAssetsForCollection()` helper
- `app/builder/network/[networkId]/dashboard/page.tsx` — Load attached assets for all collections
- `components/guideforge/builder/network-dashboard-tabs.tsx` — Display attached assets in Drafts tab, show asset counts in collection cards

### Data Flow: Dashboard

1. Dashboard page loads network + hubs + collections via `loadNetworkBuilderContext()`
2. For each collection, call `getAttachedAssetsForCollection(collectionId)`
3. Build `attachedAssetsMap: Record<string, AssetDraft[]>`
4. Pass map to `NetworkDashboardTabs` component
5. Drafts tab displays attached assets in grid
6. Collection cards show asset count in footer

### Dashboard Display

**Drafts Tab:**
- "Draft Guides" section shows guide-based drafts
- "Attached Draft Assets" section shows all attached assets (guides, checklists, etc.)
- Each asset card has:
  - Package icon to distinguish from guides
  - Asset type badge
  - "Draft" status badge
  - Edit button links to `/builder/assets/[assetId]`

**Collections Tab:**
- Each collection card shows count: "3 guides · 2 assets"
- Only shows if collection has attached assets
- Makes visible which collections have attached resources

### Integration Points

**Asset Detail Page:**
- Shows "Attach to Network" or "Change" button based on attachment state
- Green card with collection info when attached
- Opens `AttachToNetworkPanel` component on click
- Calls `updateAssetDraft()` to persist attachment

**Dashboard:**
- Drafts tab queries attached assets via `getAttachedAssetsForCollection()` helper
- Displays with package icon to distinguish from guides
- Collections tab shows asset count if any attached

**Public Site:**
- No changes; continues to show only published guides
- Attached drafts are never rendered publicly
- `supabase-public.ts` only queries `guides` table, never `asset_drafts`

## Data Safety

### Attachment Validation

- Asset must exist and belong to current user (enforced by RLS)
- Selected network must exist and belong to current user
- Selected hub must exist and belong to that network
- Selected collection must exist and belong to that hub
- All validation happens in-panel before update

### Duplicate Prevention

- UI checks if trying to attach to same collection
- Shows friendly message: "This asset is already attached to that collection..."
- One-asset-one-attachment model: changing updates existing fields, doesn't create duplicate

### Public Privacy

- `supabase-public.ts` ONLY queries `guides` table with `status = 'published'`
- Never queries `asset_drafts` table
- Attached draft assets are 100% private, cannot leak publicly
- No schema changes or RLS modifications needed

## Manual Test Plan

### Test 1: Attach Checklist and See in Dashboard

1. Open `/builder/assets`
2. Create or select a checklist asset
3. Click "Attach to Network"
4. Select a network → hub → collection
5. Verify green "Attached to Network" card shows
6. Open network dashboard
7. Expected: Checklist appears in Drafts tab under "Attached Draft Assets"
8. Expected: Collection card footer shows asset count

### Test 2: Attach Single Guide and See in Dashboard

1. Open `/builder/assets`
2. Create or select a single guide asset
3. Attach to a different collection
4. Open network dashboard
5. Expected: Guide appears in Drafts tab under "Attached Draft Assets"
6. Expected: Can click "Edit" to return to asset detail page

### Test 3: Change Attachment

1. Asset is already attached to Collection A
2. Click "Change" on asset detail
3. Select Collection B
4. Verify attachment changes (Collection A no longer shows it)
5. Collection B now shows it

### Test 4: Duplicate Attachment Prevention

1. Asset is already attached to Collection A
2. Click "Change"
3. Select same Collection A again
4. Try to attach
5. Expected: Error message "This asset is already attached to that collection..."
6. Select different collection
7. Expected: Attach succeeds

### Test 5: Public Privacy

1. Attach an asset to a collection
2. Open public site `/n/[networkSlug]`
3. Expected: Attached draft asset is NOT visible publicly
4. Expected: Public page shows only published guides, if any

## Future Enhancements

- Show attached asset names in collection detail view
- Bulk attach multiple assets to same collection
- Attach button in My Assets list (currently detail-page only)
- Asset attachment history/audit log
- Option to publish attached asset directly to collection without separate publish flow

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
