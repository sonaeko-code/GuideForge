# Guide Type to Sections Mapping

This document outlines the starter sections provided for each guide type when creating a new manual guide.

## Overview

When a user creates a new manual guide and selects a guide type, the editor automatically seeds the guide with type-specific starter sections. These provide a template structure that guides users on what content to include.

## Guide Type Sections

### character-build
Used for character/build guides, class guides, and equipment setups.

**Starter Sections:**
1. **Overview** - Describe the overall character build and its playstyle.
2. **Strengths** - List the key advantages of this build.
3. **Weaknesses** - List the key disadvantages and when to avoid this build.
4. **Gear** - Recommended equipment and itemization.
5. **Rotation** - Combat rotation and ability prioritization.

**Use Cases:** 
- RPG character builds
- Game class guides
- Equipment optimization guides

---

### walkthrough
Used for step-by-step guides through game areas, dungeons, or questlines.

**Starter Sections:**
1. **Overview** - Walkthrough of the area or questline.
2. **Step 1** - First section of the walkthrough.
3. **Step 2** - Continue the walkthrough...
4. **Tips** - Helpful tips and strategies.

**Use Cases:**
- Game level/area walkthroughs
- Dungeon guides
- Quest completion guides

---

### boss-guide
Used for defeating specific bosses or challenging encounters.

**Starter Sections:**
1. **Overview** - Boss mechanics and general strategy.
2. **Phase 1** - Describe phase 1 mechanics and strategy.
3. **Phase 2** - Describe phase 2 mechanics and strategy.
4. **Common Mistakes** - List common mistakes to avoid.
5. **Final Tips** - Additional strategy and advice.

**Use Cases:**
- Single boss encounter guides
- Raid encounter guides
- Challenge fight strategies

---

### beginner-guide
Used for introductory guides for new players or beginners to a topic.

**Starter Sections:**
1. **Overview** - Introduction for newcomers.
2. **Getting Started** - First steps in the game.
3. **Key Concepts** - Fundamental concepts explained.
4. **FAQ** - Frequently asked questions.

**Use Cases:**
- Game beginner guides
- New player onboarding
- Topic introduction guides

---

### patch-notes
Used for documenting patch updates and changes.

**Starter Sections:**
1. **Overview** - Summary of patch highlights.
2. **New Features** - New content and features.
3. **Balance Changes** - Buffs and nerfs.
4. **Bug Fixes** - Issues fixed in this patch.

**Use Cases:**
- Game patch documentation
- Version release notes
- Update announcements

---

### news
Used for news articles and announcements.

**Starter Sections:**
1. **Overview** - News headline and summary.
2. **Details** - Detailed information.
3. **Impact** - How this affects players.

**Use Cases:**
- Community announcements
- Game news articles
- Important notices

---

### repair-procedure
Used for repair and maintenance instructions.

**Starter Sections:**
1. **Overview** - What will be repaired and tools needed.
2. **Steps** - Step-by-step repair instructions.
3. **Troubleshooting** - Common issues and solutions.

**Use Cases:**
- Hardware repair guides
- Device maintenance procedures
- Technical fixes

---

### sop (Standard Operating Procedure)
Used for business and process documentation.

**Starter Sections:**
1. **Overview** - Standard Operating Procedure overview.
2. **Process** - Detailed process steps.
3. **Quality Checks** - Verification steps.

**Use Cases:**
- Business process documentation
- Workflow procedures
- Compliance documentation

---

### tutorial
Used for teaching a skill or concept step-by-step.

**Starter Sections:**
1. **Overview** - What this tutorial covers.
2. **Basics** - Basic concepts.
3. **Practice** - Exercises and practice.

**Use Cases:**
- Software tutorials
- Skill-building guides
- Educational content

---

### reference
Used for reference material and lookup guides.

**Starter Sections:**
1. **Overview** - Reference document overview.
2. **Content** - Reference content and data.

**Use Cases:**
- Data reference guides
- API documentation
- Lookup tables and charts

---

## Implementation Details

**Location:** `/lib/guideforge/starter-scaffolds.ts`

**Function:** `getStarterSectionsForGuideType(guideType: GuideType, guideId: string): GuideStep[]`

**Usage:**
```typescript
// Called automatically when creating a new manual guide
import { getStarterSectionsForGuideType } from "@/lib/guideforge/starter-scaffolds"

const sections = getStarterSectionsForGuideType("boss-guide", guideId)
// Returns an array of GuideStep objects seeded with boss-guide template
```

## Data Flow

1. User clicks "Create Manual Guide" → `/guide/new` page
2. User selects guide type (e.g., "boss-guide") and fills out basic info
3. Form submits to `createAndSaveGuideDraft()` with `guideType: "boss-guide"`
4. `createAndSaveGuideDraft()` calls `getStarterSectionsForGuideType("boss-guide", guideId)`
5. Guide is saved with the 5 starter sections pre-populated
6. Editor opens with all sections visible and ready to edit

## Future Enhancements (Phase 2)

- **AI-powered sections:** Generate section content based on guide type and description
- **Custom templates:** Allow networks to define custom section templates per guide type
- **Section recommendations:** Suggest additional sections based on content analysis
- **Template library:** Share and reuse custom templates across networks

