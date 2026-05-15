# GuideForge Network Surface Rules

## Overview

This document defines the rules for coherent network surfaces across the GuideForge dashboard and public site. These rules ensure created networks maintain visual and functional consistency while preventing unintended mock data leakage.

## Core Principles

### Dashboard vs Public Site

- **Dashboard** (`/builder/network/[networkId]/dashboard`): Owner/admin management surface for network structure and guide lifecycle
- **Public Site** (`/n/[networkSlug]`): Reader-facing surface showing only published and publicly visible content

### Data Integrity

- **Network scoping**: All counts on the dashboard must reflect only data attached to the specific network, not global or unrelated data
- **No mock data leakage**: Real created networks must never display mock/gaming content from QuestLine or other demo data
- **QuestLine isolation**: The hardcoded QuestLine network (slug: `questline`) is the only exception to fallback to mock data

## Implementation Rules

### 1. Dashboard Counts Must Be Network-Scoped

**Where**: `app/builder/network/[networkId]/dashboard/page.tsx` → `NetworkDashboardTabs` component

**Rules**:
- Hubs count = `safeHubs.length` (only hubs for this network)
- Collections count = `safeCollections.length` (only collections for this network)
- Guides count = `filteredGuides.length` (only guides for this network's collections)
- Draft/Ready/Published counts = filtered from the network's guides only
- Archived guides should never inflate active counts

**Example**:
```tsx
const safeDrafts = filterGuidesByStatus(activeGuides, "draft")
const safeReady = filterGuidesByStatus(activeGuides, "ready")
const safePublished = filterGuidesByStatus(activeGuides, "published")

// Tabs show network-scoped counts
<TabsTrigger value="drafts">Drafts <span>{safeDrafts.length}</span></TabsTrigger>
```

### 2. View Public Site Button Must Use Correct Route

**Where**: Dashboard header, network cards

**Rule**:
- Always link to `/n/[networkSlug]` using `network.slug` from Supabase
- Never hardcode guideforge.app domain in actual links (visual copy OK)
- Disable button if slug is missing

**Example**:
```tsx
<Button asChild>
  <Link href={`/n/${network.slug}`}>
    View Public Site
  </Link>
</Button>
```

### 3. Public Network Page Must Not Show Mock Data

**Where**: `app/n/[networkSlug]/page.tsx`

**Rule**: Do NOT fall back to mock guides or mock hubs for created networks.
```tsx
// WRONG - This leaks mock gaming guides into created networks
const allPublishedGuides = supabaseGuides.length > 0 
  ? supabaseGuides 
  : MOCK_GUIDES.filter(g => g.status === "published")

// RIGHT - Only use real published guides from Supabase
const allPublishedGuides = supabaseGuides.length > 0 ? supabaseGuides : []
```

### 4. QuestLine Fallback Is Safe Because It's Hardcoded

**Where**: `app/n/[networkSlug]/page.tsx`

The hardcoded QuestLine network is intentionally loaded before any fallback logic. This ensures only `questline` slug ever triggers mock data fallback:

```tsx
// Hardcoded fallback for QuestLine ONLY
if (!network && networkSlug === "questline") {
  network = QUESTLINE_NETWORK
}

// Created networks return 404 if not found
if (!network) {
  notFound()
}

// Real created network hubs only - no fallback to getHubsByNetwork()
if (network.id) {
  hubs = await getHubsByNetworkId(network.id)
}
```

### 5. Network Theme Must Apply Safely

**Where**: `lib/guideforge/network-themes.ts`, `app/n/[networkSlug]/page.tsx`

**Rules**:
- Default theme to `"neutral"` if missing: `network.branding?.theme ?? "neutral"`
- All theme lookups must use `getNetworkTheme(themeId)` helper
- Theme should not contradict network type (no gaming icons in Home Systems)
- Always provide safe fallback Tailwind classes

### 6. Empty States Must Be Helpful and Minimal

**Dashboard empty states** (`network-dashboard-tabs.tsx`):
- Guides tab (no guides): "Create or attach your first guide"
- Collections tab (no collections): "Create your first collection" + link to create
- Hubs tab (no hubs): "Create your first hub" + link to create
- Collections tab (no hubs exist): "Create a hub first to add collections"

**Public empty states** (`app/n/[networkSlug]/page.tsx`):
- No published guides but has hubs: "No published guides yet. Check back soon."
- No hubs: "No hubs published yet for this network"
- Featured section when no guides: Show network description + empty messaging

### 7. Network Card Actions Must Be Consistent

**Where**: `components/guideforge/builder/networks-client-list.tsx`

**Expected actions** (in order):
1. Dashboard (primary)
2. Settings (secondary)
3. New Hub (conditional - only for owners/admins)
4. View Site (ghost variant - all users can view)

**Rules**:
- Dashboard button always available to managers
- Settings button available to managers only
- New Hub disabled with visual indicator for non-managers
- View Site available to all (uses `network.slug`)

### 8. Terminology Must Be Consistent

**Canonical terms**:
- "Network" - the entire guide collection (not "world", "site", "portal")
- "Hub" - a major category within a network
- "Collection" - guides grouped within a hub
- "Guide" - individual guide document
- "Public Site" - the reader-facing pages
- "Dashboard" - the owner/admin management surface

**Avoid**:
- Mixing "world" with "network"
- Using "site" for internal-only surfaces
- Using "portal" except in marketing copy

## Testing Checklist

Before deploying changes:

- [ ] Created network dashboard shows accurate counts matching displayed cards
- [ ] "View Public Site" button works and routes to `/n/[networkSlug]`
- [ ] Created network public page shows NO mock/gaming guides
- [ ] Created network public page shows proper empty states when no guides exist
- [ ] QuestLine network still loads mock data correctly when accessed
- [ ] Network theme applies without crashing
- [ ] Network card actions are visible and properly enabled/disabled
- [ ] All terminology uses canonical terms
- [ ] Empty states are minimal and helpful

## Related Documentation

- `docs/guideforge-data-spine-contract.md` - Guide persistence data flow
- `lib/guideforge/types.ts` - Type definitions
- `lib/guideforge/supabase-networks.ts` - Data loading helpers
