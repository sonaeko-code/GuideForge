# Phase 1: QuestLine Pattern Analysis Report

## Overview
QuestLine is a highly polished, fully designed public guide network with specific branding, theming, and editorial content. The goal is to extract the **reusable layout/structure patterns** while keeping hardcoded content separate.

## HARDCODED QuestLine Content (Do NOT copy to other networks)

### QuestLine Network Page (`/n/questline/page.tsx`)
**Hardcoded Elements:**
- QuestLineMark logo in masthead (specific brand icon)
- "Issue No. 04" label (QuestLine-specific editorial framing)
- "An editorial guide network" description (QuestLine voice)
- Stats showing "In review" count + "Last patch 4.2" (QuestLine-specific metrics)
- QUESTLINE_NEWS sidebar with latest dispatches (QuestLine-specific content source)
- Game types filtered specifically for QuestLine games
- News category formatting hardcoded for QUESTLINE_NEWS structure
- Latest patch lookup (g.type === "patch-notes")

**Hardcoded Data Sources:**
- QUESTLINE_NETWORK constant
- QUESTLINE_NEWS array
- getHubsByNetwork(network.id) for hardcoded mock games

### QuestLine Hub Page (`/n/questline/emberfall/page.tsx`)
**Hardcoded Elements:**
- GameBanner component with tone="ember" (Emberfall-specific theming)
- "Game Hub" label and hub.hubKind badge (QuestLine game hub concept)
- Patch version hardcoded to "4.2"
- QUESTLINE_NEWS filter for hubSlug === hub.slug (QuestLine-specific)
- Section labeled "Patch coverage" → "Latest from Emberfall" (hub-specific voice)
- hub.collectionIds.length in mock data (assumes collectionIds field)
- CollectionIcon component usage (QuestLine visual design)

**Hardcoded Data Sources:**
- EMBERFALL_HUB constant
- getGuidesByCollection() helper (specific to Emberfall)
- getGuidesByHub() helper
- QUESTLINE_NEWS data

### Reusable QuestLine Layout Components
Found in QuestLine pages but suitable for generic networks:

1. **SectionHeading** (line 605 in QuestLine network page)
   ```tsx
   function SectionHeading({ eyebrow, title, icon, action }: SectionHeadingProps) {
     return (
       <div className="border-b border-foreground/15 pb-3">
         <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
           {icon}
           {eyebrow}
         </div>
         <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
           {title}
         </h2>
       </div>
     )
   }
   ```
   **Status:** REUSABLE - Generic section header with optional icon

2. **MediaPlaceholder** component
   - Used throughout for guide thumbnails
   - Supports variants: "image", "spark", "patch"
   - Supports tones: "primary", "default", "ink", "cyan"
   - Status: REUSABLE - Already generic placeholder

3. **GameBanner** component
   - Used for featured guides and hub cards
   - Takes tone prop for theming
   - Status: PARTIALLY REUSABLE - tone values are game-specific (ember, etc)

4. **DifficultyBadge**
   - Shows difficulty level (beginner, intermediate, advanced, expert)
   - Status: REUSABLE

5. **Published/Verified Badge Pattern**
   ```tsx
   {featured.verification === "forge-verified" && (
     <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
       <Shield className="size-3" aria-hidden="true" />
       Forged
     </Badge>
   )}
   ```
   **Status:** REUSABLE - Shows verification status

## Reusable Layout Patterns

### Network Page Structure
```
1. Masthead
   - Network name
   - Description/tagline
   - Stats (hubs count, forged count, etc)

2. Featured Guide Section
   - Large editorial card
   - 2-3 column layout
   - Media placeholder
   - Title + summary
   - Author/reviewer byline
   - Difficulty + verified badge
   - Version + read time

3. Hub Cards Section
   - Title "Featured Games/Hubs"
   - Grid of hub cards (4 wide on desktop)
   - Each hub shows: name, tagline, collections count
   - Hover effect with arrow

4. Recently Published Section
   - Title "Recently Forged/Published"
   - Grid of guide cards (3 wide)
   - Each card shows: thumbnail, type, title, difficulty
   - Verified badge if applicable

5. Beginner Section (if beginner guides exist)
   - Title "Start Here"
   - Cards with thumbnail + text
   - Show beginner label + read time

6. Verified/Forged Section (if verified guides exist)
   - Title "Verified Guides"
   - Similar grid to recently published
   - Highlight verified status
```

### Hub Page Structure
```
1. Breadcrumb (generic)
   - Network / Hub

2. Hub Hero
   - GameBanner or simple hero
   - Hub name + description
   - Stats: collections count, verified count, last updated

3. Collections Section
   - "Explore by category"
   - Grid of collection cards
   - Each shows: collection name, description, guide count
   - Links to first guide in collection

4. Featured Guide
   - Same as network page featured layout

5. Latest Guides
   - Grid of recent guides

6. Beginner Path (if exists)
   - "Start Here / New to [hub]?"
   - Cards with thumbnail + text

7. Patch/News Section (QuestLine-specific)
   - Not needed for generic networks

8. Forged Guides (if exist)
   - Highlighted section for verified guides
```

## Filtering & Data Patterns

### Published-Only Filtering (Triple Layer)
```typescript
// Layer 1: Supabase query
const supabaseGuides = await loadPublishedGuides()  // Uses status === "published"

// Layer 2: Mock fallback
MOCK_GUIDES.filter(g => g.status === "published")

// Layer 3: Derived sections
const beginnerGuides = allPublishedGuides.filter(g => g.difficulty === "beginner")
```

### Section Derivation Pattern
```typescript
const featured = guides.find((g) => g.verification === "forge-verified") ?? guides[0]
const recent = [...guides]
  .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - ...)
  .slice(0, 6)
const beginner = guides.filter((g) => g.difficulty === "beginner")
const forged = guides.filter((g) => g.verification === "forge-verified")
```

### Conditional Section Rendering
```typescript
{beginnerGuides.length > 0 && (
  <section>
    {/* Beginner path section */}
  </section>
)}

{forged.length > 0 && (
  <section>
    {/* Verified guides section */}
  </section>
)}
```

## Data Loading Pattern

```typescript
// Load from Supabase with mock fallback
const supabaseGuides = await loadPublishedGuides()
const allPublishedGuides = supabaseGuides.length > 0 
  ? supabaseGuides 
  : MOCK_GUIDES.filter(g => g.status === "published")

// Load collections with mock fallback
let collections = await getCollectionsByHubId(hub.id)
if (collections.length === 0) {
  collections = getCollectionsByHub(hub.id)
}
```

## Existing Generic Pages Status

### `/n/[networkSlug]/page.tsx`
- Partially aligned with QuestLine patterns
- Currently has: masthead, hubs grid, recent guides, beginner section, forged section
- Missing: featured guide section, section headers that match QuestLine quality
- Issue: Uses generic text labels instead of SectionHeading component
- Issue: Hub cards less polished than QuestLine

### `/n/[networkSlug]/[hubSlug]/page.tsx`
- Partially aligned with QuestLine patterns
- Has basic structure but needs refinement
- Missing: SectionHeading component usage
- Missing: Featured guide large card layout
- Issue: Collections section could be more like QuestLine

### `/n/[networkSlug]/[hubSlug]/[guideSlug]/page.tsx`
- Good structure, needs slight alignment
- Has editorial layout, breadcrumbs, requirements, steps
- Good: Related guides section
- Issue: Could improve with SectionHeading for related guides title

## Reusable Component Extraction Recommendation

### Should Extract (Small, Safe, Reusable)
1. **SectionHeading** component (line 605)
   - Takes eyebrow, title, icon (optional), action (optional)
   - Generic styling that works for all sections
   - No QuestLine-specific logic
   - Already defined inline in QuestLine page

2. **PublishedBadge** helper
   - Simple JSX pattern for showing verified/forged status
   - Can be a small utility component

3. **GuideCard** component
   - Reusable card for grid layouts
   - Shows: thumbnail, type, title, difficulty, verification
   - Optional variants for different layouts

### Should NOT Extract (High Risk)
- GameBanner (too tied to specific theming/tones)
- MediaPlaceholder (already generic but tone system is specific)
- CollectionIcon (too QuestLine-specific)

## Summary

**Hardcoded Content to Preserve:**
- QuestLine brand (QuestLineMark, theme, voice, specific stats)
- QuestLine news/dispatches system
- Game-specific hub logic
- Patch notes specific logic

**Reusable Patterns to Apply to Generic Networks:**
- SectionHeading structure and styling
- Featured guide large editorial layout
- Hub card grid layout
- Guide card grid layout
- Published-only filtering (3-layer pattern)
- Conditional section rendering
- Section derivation logic (featured, recent, beginner, forged)
- Masthead structure (network name, description, stats)
- Empty state handling

**Next Steps:**
1. Extract SectionHeading component to shared location
2. Update generic network page to use SectionHeading
3. Add featured guide section to generic network page
4. Improve generic hub page with better layout alignment
5. Polish guide cards and collections display
6. Ensure all pages use consistent pattern for data loading
