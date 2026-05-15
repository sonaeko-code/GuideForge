# LANE 2D — PUBLIC ASSET RENDERING BRIDGE
## Decision Report & Implementation Strategy

**Date:** 2026-05-14  
**Lane:** 2D (Public Asset Rendering)  
**Status:** DECISION MADE & READY TO IMPLEMENT

---

## TASK 1 — PUBLIC RENDERING STRATEGY DECISION

### Options Analyzed

**Option A: Convert asset_draft to guides table record**
- Pros: Reuses all existing guide rendering code
- Cons: Requires permanent conversion, duplication of data in guides table
- Risk: Schema complexity, potential data sync issues

**Option B: Publicly render published asset_drafts directly**
- Pros: Keeps asset_drafts as source of truth, no conversion needed, no duplication
- Cons: Requires new public rendering paths for each asset type
- Risk: Moderate — new rendering code but uses existing UI patterns

### Decision: **OPTION B — Direct Public Asset Rendering**

**Rationale:**
1. **Asset payloads are rich enough:** GeneratedSingleGuide has sections, GeneratedChecklist has sections and items — all renderable
2. **No schema changes needed:** asset_drafts table already persists all needed data in `payload` JSONB column
3. **Cleaner data flow:** asset_drafts stay attached to their network context (attachedNetworkId, attachedHubId, attachedCollectionId)
4. **Simpler to implement:** New public loaders for asset_drafts + new rendering component per asset type
5. **Future-proof:** Easier to add asset voting/verification features without moving data around
6. **Attachment metadata preserved:** Can use attachedNetworkId for privacy filtering

**Asset types that CAN render publicly (Phase 2D):**
- ✅ `single_guide` — has sections with title/body (identical to Guide steps)
- ✅ `checklist` — has sections with items (renderable as checklist page)

**Asset types deferred to future lanes:**
- ❌ `recipe` — requires recipe-specific UI (kitchen/prep time, ingredients formatting)
- ❌ `sop` — requires SOP-specific UI (procedureSteps, roles, approval flow)
- ❌ `troubleshooting_flow` — requires flow UI (decision tree rendering)

---

## IMPLEMENTATION STRATEGY

### Public Data Layer

**New function:** `supabase-public.ts`
```typescript
// Load published assets for a specific network
export async function loadPublishedAssets(
  networkId: string,
  assetType?: AssetType
): Promise<AssetDraft[]>

// Load single published asset detail
export async function loadPublishedAsset(
  assetId: string,
  networkId: string
): Promise<AssetDraft | null>
```

**Privacy filters enforced:**
- `status = 'published'` (only published)
- `attached_network_id = [networkId]` (only this network)
- `asset_type IN ('single_guide', 'checklist')` (only public-renderable types)
- Never show draft, pending_review, or archived

---

### Public Pages

#### Network Page (`/n/[networkSlug]`)
- Load published assets along with published guides
- Show separate "Published Assets" section if assets exist
- Use same GuideCard component for consistency
- Count assets in masthead stats

#### Asset Detail Page
**Route:** `/n/[networkSlug]/asset/[assetId]`
**Or:** `/n/[networkSlug]/[hubSlug]/asset/[assetId]` if hubSlug available

Two rendering components:
1. `PublicSingleGuideAsset` — renders GeneratedSingleGuide sections as readable steps
2. `PublicChecklistAsset` — renders GeneratedChecklist sections and items as checklist

---

### Private Dashboard Changes

Update dashboard copy:
- Drafts tab: Keep "Submit for Review" explanation
- Pending Review tab: Keep "Publish" explanation  
- **Published tab:** Change "Workspace Only" note to "Visible on public network"
- Add asset type indicator: "Checklist", "Single Guide", etc.

Status label in `asset-draft-reviews.ts`:
```typescript
case "published":
  return {
    label: "published",
    displayName: "Published",
    description: "Visible on public network",  // ← CHANGED from "Workspace Only"
    isPublic: true,  // ← CHANGED from false
  }
```

---

## PRIVACY GUARANTEES

✅ **Public queries filter status = 'published' AND attached_network_id = [current network]**  
✅ **Draft assets never shown**  
✅ **Pending review assets never shown**  
✅ **Unattached assets never shown**  
✅ **Other network's assets never shown**  
✅ **Only single_guide and checklist types shown publicly**  
✅ **Renders safe payload fields only (no internal notes)**  

---

## ASSET TYPES & PUBLIC RENDERING

### Single Guide (`single_guide`)
**Public page template:**
- Title
- Summary
- Audience (nice-to-have)
- Difficulty badge
- Requirements (collapsible)
- Warnings (highlighted)
- **Steps** (main content, from payload.steps array)
- Tags

**NOT shown:**
- assumptions
- missingInfo (drafty)

### Checklist (`checklist`)
**Public page template:**
- Title
- Summary
- Sections with items
- Completion criteria
- Tags

**NOT shown:**
- assumptions
- missingInfo (drafty)

---

## ROUTE PATTERN

```
/n/[networkSlug]/asset/[assetId]                    — Asset detail, auto-find hub
/n/[networkSlug]/[hubSlug]/asset/[assetId]          — Asset detail with explicit hub

OR simplified to:
/n/[networkSlug]/asset/[assetId]                    — Single pattern, simpler routing
```

**Chosen:** Single pattern — `/n/[networkSlug]/asset/[assetId]`  
Rationale: Simpler routing, asset attachment metadata provides hub/collection context anyway.

---

## FILES TO CREATE

1. **Loaders:**
   - `lib/guideforge/supabase-public.ts` — Add asset loading functions

2. **Components:**
   - `components/guideforge/public/public-single-guide-asset.tsx` — Single guide rendering
   - `components/guideforge/public/public-checklist-asset.tsx` — Checklist rendering

3. **Pages:**
   - `app/n/[networkSlug]/asset/[assetId]/page.tsx` — Asset detail page

## FILES TO MODIFY

1. **`app/n/[networkSlug]/page.tsx`**
   - Load published assets
   - Display in "Published Assets" section

2. **`lib/guideforge/asset-draft-reviews.ts`**
   - Update "published" status label to say "Visible on public network"
   - Set isPublic: true

3. **`components/guideforge/builder/network-dashboard-tabs.tsx`**
   - Update Published tab copy to remove "Workspace Only" warning

---

## WHAT IS NOT IN LANE 2D

- ❌ Recipe public rendering (asset type complexity)
- ❌ SOP public rendering (workflow complexity)
- ❌ Troubleshooting flow rendering (decision tree complexity)
- ❌ Council/voting on assets
- ❌ Automatic "Forged" badge
- ❌ Asset-to-guide conversion
- ❌ Public asset search/filter
- ❌ Related assets widget

These are deferred to future lanes.

---

## MANUAL TEST CHECKLIST

Test 1 — Publish checklist, verify public view:
- [ ] Attach Daily Medication Checklist to Home Systems
- [ ] Submit for Review
- [ ] Publish
- [ ] Open /n/home-systems/asset/[id]
- [ ] Expected: Readable checklist page with sections and items
- [ ] Expected: No raw JSON, no assumptions/missingInfo

Test 2 — Publish single guide, verify public view:
- [ ] Attach YouTube tutorial guide to Home Systems
- [ ] Submit for Review
- [ ] Publish
- [ ] Open /n/home-systems/asset/[id]
- [ ] Expected: Readable guide page with steps
- [ ] Expected: Requirements and warnings visible

Test 3 — Public network page shows published assets:
- [ ] Visit /n/home-systems
- [ ] Expected: Published checklist card visible in assets section
- [ ] Expected: Published guide card visible in assets section
- [ ] Expected: Card uses GuideCard component styling
- [ ] Click card, verify detail page loads

Test 4 — Private asset privacy:
- [ ] Set attached asset to Draft status
- [ ] Expected: Does not appear on /n/home-systems
- [ ] Set another to Pending Review
- [ ] Expected: Does not appear on /n/home-systems

Test 5 — Mock leakage check:
- [ ] Visit /n/home-systems
- [ ] Expected: No mock QuestLine content
- [ ] Only real created/published content shown

Test 6 — Different network isolation:
- [ ] Create asset in Network A, publish it
- [ ] Create Network B
- [ ] Expected: Network A asset does NOT appear on Network B public pages
- [ ] Attach asset to Network B collection
- [ ] Expected: Now appears on Network B public pages

Test 7 — Asset type filtering:
- [ ] Publish a Recipe asset
- [ ] Expected: Does NOT appear on public pages (not yet supported)
- [ ] Error handling gracefully skips unsupported types

---

## SUCCESS CRITERIA

✅ Published single_guide and checklist assets visible on public network page  
✅ Asset detail pages render correctly at /n/[slug]/asset/[id]  
✅ Draft/pending/archived assets never appear publicly  
✅ Assets only appear in their attached network  
✅ Dashboard copy reflects public availability  
✅ Privacy filtering enforced at query level  
✅ No raw JSON or draft-only fields visible to public  
✅ Existing guide pages untouched  
✅ No schema changes needed  

---

## NEXT STEPS

1. Inspect existing public rendering to understand component patterns
2. Create supabase-public.ts asset loaders
3. Create PublicSingleGuideAsset and PublicChecklistAsset components
4. Create /n/[slug]/asset/[id]/page.tsx
5. Update /n/[slug]/page.tsx to load and show published assets
6. Update status labels and dashboard copy
7. Test all 7 scenarios
8. Deploy

