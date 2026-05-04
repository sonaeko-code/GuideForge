## GuideForge Stabilization - Quick Test Flow

### 1. Drafts Tab Filtering
```
✓ Draft guides only (status === "draft")
✓ No published guides leak in
✓ Console: "[v0] DraftList loaded | draft count: X"
```

### 2. Ready Tab
```
✓ New 6th tab: Drafts | Ready | Published | Guides | Hubs | Collections
✓ Ready tab shows only status === "ready" guides
✓ Blue badge shows count
✓ Empty state shows "No guides ready yet"
```

### 3. Stat Cards (5-column grid)
```
✓ Hubs count
✓ Collections count
✓ Drafts count (amber)
✓ Ready count (blue) — NEW
✓ Published count (emerald)
```

### 4. Duplicate Buttons Removed
```
✓ No "Generate Guide" button in header
✓ No "Create Manual Guide" button in header
✓ CTA buttons only in tab empty states
```

### 5. New Guide Form Blank Start
```
✓ Navigate to /builder/network/[networkId]/guide/new
✓ All fields empty (title="", description="", requirements="")
✓ Reload page — form stays blank (no template text)
✓ Previous behavior: Form showed "Best Fire Warden..." (FIXED)
```

### 6. Status Transition Logs
```
✓ Mark Ready: "[v0] Status transition requested: draft → ready"
✓ Mark Ready Failed: "[v0] Status transition blocked: draft → ready (forge rules errors)"
✓ Publish: "[v0] Status transition requested: ready → published | guideId: [id]"
```

### 7. Network Isolation
```
✓ Network A: guides show only in Network A dashboard
✓ Network B: guides show only in Network B dashboard
✓ No cross-network data leakage
✓ Stats show 0 for empty networks
```

### Files Changed
```
1. components/guideforge/builder/draft-list.tsx
2. app/builder/network/[networkId]/dashboard/page.tsx
3. components/guideforge/builder/network-dashboard-tabs.tsx
4. components/guideforge/builder/create-guide-form.tsx
5. app/builder/network/[networkId]/guide/new/page.tsx
6. components/guideforge/builder/guide-editor.tsx
7. lib/guideforge/utils.ts (NEW)
8. lib/guideforge/starter-scaffolds.ts (NEW - dormant)
```

### No Changes To
```
✓ Schema (no migrations)
✓ Packages (no installs)
✓ Auth (no changes)
✓ Persistence (Supabase/localStorage untouched)
```
