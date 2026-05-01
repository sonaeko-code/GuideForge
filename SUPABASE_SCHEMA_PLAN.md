# GuideForge Supabase Schema Plan

**Status**: Planning phase - Review only. No implementation yet.

**Date**: April 2026

**Scope**: Supabase Phase 1 - Core persistence for Networks, Hubs, Collections, Guides, Forge Rules, and Generation Events.

---

## 1. Schema Overview

GuideForge maintains a strict 5-level hierarchy:
```
Network → Hub → Collection → Guide → GuideStep
```

Each level has independent metadata, relationships, and lifecycle tracking. The schema is generalized for **GuideForge** (builder), **QuestLine** (gaming), and future **Techsperts** (expert networks).

### Core Principles

1. **Multi-Network Design**: All tables include `network_id` foreign key
2. **Denormalization for Performance**: Reference IDs stored as arrays (e.g., `guide_ids` in `hubs`)
3. **Audit Trail Ready**: All tables include `created_at`, `updated_at`, and user tracking
4. **Status & Verification Decoupled**: `status` (lifecycle) and `verification` (trust) are independent
5. **Draft-to-Published Pipeline**: `status` column tracks progression through draft → ready → published
6. **Forge Rules as Configuration**: Rules defined per-network, checks stored as historical records
7. **Generation Events for Analytics**: Track AI generation, manual edits, and publish events

---

## 2. Table-by-Table Plan

### **2.1 networks**

The top-level namespace for a GuideForge instance or gaming hub network.

**Purpose**: Store network branding, visibility, and Forge Rules configuration.

**Columns**:
```
id (uuid, primary key)
slug (text, unique) - URL-friendly identifier, e.g. "questline"
name (text) - Display name, e.g. "QuestLine"
description (text)
type (text) - enum: gaming, repair, sop, creator, training, community
visibility (text) - enum: public, private, unlisted
domain (text, nullable) - e.g., "questline.guideforge.app"

branding.primary_color (text) - e.g., "#D4A373"
branding.accent_color (text, nullable)
branding.theme (text) - enum: parchment, copper, neutral, industrial, soft, arcane, ember
branding.logo_url (text, nullable)

forge_rule_ids (uuid[]) - References to enabled ForgeRules for this network
hub_ids (uuid[]) - Denormalized list of hub UUIDs

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable) - User who created the network
```

**Relationships**:
- `← hubs` (1:N) - A network has many hubs
- `← forge_rules_enabled` (N:M) - A network enables a subset of rules
- `← generation_events` (1:N) - Track guide generations per network

---

### **2.2 hubs**

Namespaces within a network. For gaming: "Emberfall". For repair: "MacBook Pro M1". For SOP: "Sales Department".

**Purpose**: Group collections and guides by theme/product/department.

**Columns**:
```
id (uuid, primary key)
network_id (uuid, foreign key → networks.id)
slug (text, unique per network) - e.g., "emberfall"
name (text) - e.g., "Emberfall"
description (text)
tagline (text, nullable) - e.g., "The realm of ancient magic"

hub_kind (text) - enum: game, product, department, topic, channel, other
banner_url (text, nullable)

collection_ids (uuid[]) - Denormalized list of collection UUIDs
guide_ids (uuid[]) - Denormalized list of all guide UUIDs in this hub

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable)
```

**Relationships**:
- `→ networks` (N:1) - Many hubs belong to one network
- `← collections` (1:N) - A hub has many collections
- `← guides` (1:N) - A hub has many guides

---

### **2.3 collections**

Logical groupings within a hub. For gaming: "Character Builds", "Dungeons", "Patch Notes". For repair: "Disassembly", "Troubleshooting". For SOP: "Onboarding", "Best Practices".

**Purpose**: Organize guides by category; set default guide type.

**Columns**:
```
id (uuid, primary key)
network_id (uuid, foreign key → networks.id)
hub_id (uuid, foreign key → hubs.id)
slug (text, unique per hub) - e.g., "character-builds"
name (text)
description (text)

default_guide_type (text) - enum from GuideType; default when creating new guides
guide_ids (uuid[]) - Denormalized list of guide UUIDs

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable)
```

**Relationships**:
- `→ networks` (N:1)
- `→ hubs` (N:1)
- `← guides` (1:N) - A collection has many guides

---

### **2.4 guides**

Full guide documents with all metadata, steps, and lifecycle tracking.

**Purpose**: Store complete guide content, status, verification, and Forge Rules results.

**Columns**:
```
id (uuid, primary key)
network_id (uuid, foreign key → networks.id)
hub_id (uuid, foreign key → hubs.id)
collection_id (uuid, foreign key → collections.id)
slug (text, unique per network) - e.g., "best-fire-warden-beginner-build"

title (text)
summary (text) - 2-3 sentence overview
type (text) - enum: character-build, walkthrough, boss-guide, beginner-guide, etc.
difficulty (text) - enum: beginner, intermediate, advanced, expert

status (text) - enum: draft, in-review, ready, published, needs-update, deprecated, archived
verification (text) - enum: unverified, reviewed, expert-reviewed, community-proven, forge-verified, forged

requirements (text[]) - Free-form list of prerequisites
warnings (text[]) - Spoilers, dangerous steps, etc.

version (text, nullable) - e.g., "Patch 4.2"
estimated_minutes (integer, nullable) - Read/completion time

author_id (uuid, foreign key → users.id) - Who wrote it
reviewer_id (uuid, nullable, foreign key → users.id) - Who reviewed it

created_at (timestamp)
updated_at (timestamp)
published_at (timestamp, nullable)
created_by (uuid, nullable)
updated_by (uuid, nullable)
```

**Relationships**:
- `→ networks` (N:1)
- `→ hubs` (N:1)
- `→ collections` (N:1)
- `→ users` (N:1) as author
- `→ users` (N:1, nullable) as reviewer
- `← guide_steps` (1:N) - A guide has many steps
- `← forge_rule_check_results` (1:N) - Check history for this guide

---

### **2.5 guide_steps**

Individual sections/steps within a guide. These are ordered and keyed by `kind`.

**Purpose**: Store guide content, order, and metadata per section.

**Columns**:
```
id (uuid, primary key)
guide_id (uuid, foreign key → guides.id)
order (integer) - 1, 2, 3, ... for display order
kind (text) - enum: overview, strengths, weaknesses, gear, skill-priority, rotation, leveling, mistakes, patch-notes, final-tips, requirements, warning, custom

title (text) - e.g., "Strengths"
body (text) - Markdown content
is_spoiler (boolean, default: false)
callout (text, nullable) - Optional inline callout, e.g., "Requires patch 4.2+"

created_at (timestamp)
updated_at (timestamp)
```

**Relationships**:
- `→ guides` (N:1)

---

### **2.6 forge_rules**

Master list of rules available to apply to guides in any network.

**Purpose**: Define the universal rule catalog; each network selects which rules to enable.

**Columns**:
```
id (uuid, primary key)
label (text) - e.g., "Descriptive Title"
description (text) - Full explanation for rule editor
category (text) - enum: metadata, structure, tone, safety, lifecycle
applies_to (text[]) - enum array: ["gaming", "repair", "sop", ...] - default networks for this rule
is_required (boolean) - If true, guide cannot be published without passing

created_at (timestamp)
created_by (uuid, nullable)
```

**Relationships**:
- `← forge_rule_checks` (1:N) - Check history for this rule
- `← networks` (N:M via network.forge_rule_ids)

---

### **2.7 forge_rule_check_results**

Historical record of every Forge Rules validation run.

**Purpose**: Track validation history, debug staleness, and generate reports.

**Columns**:
```
id (uuid, primary key)
guide_id (uuid, foreign key → guides.id)
forge_rule_id (uuid, foreign key → forge_rules.id)
network_id (uuid, foreign key → networks.id)

passed (boolean)
reason (text, nullable) - Explanation if failed, e.g., "Title too short"

check_timestamp (timestamp) - When the check ran
created_at (timestamp)

-- For analytics/debug:
content_hash (text) - Hash of guide title+summary+version at check time
-- This allows staleness detection: if current content hash differs, results are stale
```

**Relationships**:
- `→ guides` (N:1)
- `→ forge_rules` (N:1)
- `→ networks` (N:1)

---

### **2.8 generation_events**

Track AI-generated guides, manual edits, publishes, and other significant events.

**Purpose**: Analytics, audit trail, and regeneration history.

**Columns**:
```
id (uuid, primary key)
network_id (uuid, foreign key → networks.id)
guide_id (uuid, nullable, foreign key → guides.id) - May be null for failed generations
event_type (text) - enum: guide_generated, guide_edited, guide_published, section_regenerated, guide_forged, review_completed

prompt (text, nullable) - User input or AI prompt that triggered generation
model_used (text, nullable) - e.g., "gpt-4", "gpt-3.5-turbo"
tokens_used (integer, nullable)

metadata (jsonb) - Flexible object for event-specific data:
  {
    "prompt": "...",
    "sections_count": 6,
    "generation_mode": "full" | "section",
    "section_kind": "strengths" (if section_regenerated),
    "user_edited_summary": true,
    ...
  }

created_at (timestamp)
created_by (uuid, nullable)
```

**Relationships**:
- `→ networks` (N:1)
- `→ guides` (N:1, nullable)

---

### **2.9 users** (Minimal for MVP)

When Supabase Auth is connected, user records sync from `auth.users`.

**Purpose**: Author/reviewer attribution and activity tracking.

**Columns**:
```
id (uuid, primary key) - Matches auth.users.id
email (text, unique)
display_name (text, nullable)
handle (text, unique, nullable) - e.g., "riley.ashford"
avatar_url (text, nullable)
bio (text, nullable)
role (text) - enum: user, moderator, curator, admin

created_at (timestamp)
updated_at (timestamp)
```

**Relationships**:
- `← guides` (1:N) as author
- `← guides` (1:N) as reviewer
- `← generation_events` (1:N)

---

## 3. Relationship Map

```
┌─────────────────────────────────────────────────────────────┐
│                       networks                               │
│  (slug, type, visibility, branding, forge_rule_ids)        │
└──┬──────────────────────────────────────────────────────────┘
   │
   ├──→ hubs (1:N)
   │    │
   │    └──→ collections (1:N)
   │         │
   │         └──→ guides (1:N)
   │              │
   │              ├──→ guide_steps (1:N)
   │              ├──→ users (N:1 as author)
   │              ├──→ users (N:1 nullable as reviewer)
   │              └──→ forge_rule_check_results (1:N)
   │                   │
   │                   └──→ forge_rules (N:1)
   │
   ├──→ forge_rules (N:M via network.forge_rule_ids)
   │
   └──→ generation_events (1:N)
        │
        └──→ guides (N:1 nullable)
```

---

## 4. Status Model

**Guide Lifecycle**:

```
draft → in-review → ready → published
  ↓                  ↑
  └──→ needs-update──┘

published → deprecated
published → archived
```

**Transitions**:
- `draft` → `in-review`: User clicks "Mark Ready" (requires Forge Rules to pass)
- `in-review` → `ready`: Reviewer approves (manual step, future)
- `ready` → `published`: User publishes to public (requires Supabase connection)
- `published` → `needs-update`: Guide becomes outdated (patch, new info, etc.)
- `published` → `deprecated`: Superseded by new guide
- Any → `archived`: Soft delete; guides remain queryable but hidden from default listings

**Storage**:
- `guides.status` column contains the current state
- No separate status history table for MVP (can add `status_history` table later)

---

## 5. Verification Model

**Trust Tiers** (independent of lifecycle status):

```
unverified
  ↓
reviewed (community review or single reviewer)
  ↓
expert-reviewed (expert domain reviewer)
  ↓
community-proven (high upvotes/positive feedback)
  ↓
forge-verified (passed all Forge Rules + required review)
  ↓
forged (highest trust: forge-verified + sustained community validation)
```

**Storage**:
- `guides.verification` column tracks current tier
- No separate verification history table for MVP

**Forge Rules Connection**:
- A guide can only reach `forge-verified` if all required Forge Rules pass
- Verification tier is manually set by reviewers (not automatic)

---

## 6. Forge Rules Strategy

### Rules Per Network

Each network enables a subset of the universal `forge_rules` catalog:

```sql
-- In networks table:
forge_rule_ids (uuid[]) -- e.g., [rule_1, rule_2, rule_5, rule_8]
```

### Check Pipeline

1. User clicks "Check Rules" in editor → `validateForgeRules()` runs in client
2. Deterministic validation against live guide content (no randomization)
3. Results stored as `forge_rule_check_results` records in Supabase
4. User can click "Re-check" anytime; each check creates a new record
5. "Mark Ready" button checks:
   - All required Forge Rules passed
   - Results are not stale (content changed since last check)

### Staleness Detection

- `forge_rule_check_results.check_timestamp` tracks when validation ran
- `forge_rule_check_results.content_hash` stores hash of guide title+summary+version at check time
- Client compares current content hash to stored hash; if different, results are stale
- Stale results block "Mark Ready" → forces re-check

---

## 7. RLS Strategy (Review Only - Not Implemented)

Assuming Supabase Auth with `auth.users` table.

### Public (Unauthenticated)

```sql
-- Readable:
- networks WHERE visibility = 'public'
- hubs WHERE hub.network_id IN public networks
- collections WHERE collection.hub_id IN readable hubs
- guides WHERE status = 'published' AND guide.hub_id IN readable hubs
- guide_steps WHERE guide_id IN readable guides

-- Not readable:
- drafts, in-review, or ready guides (even if status != published)
```

### Authenticated Users

```sql
-- Can read:
- All public guides (same as above)
- Draft/in-review guides they authored
- Their own network/hub/collection drafts (if they have network access)

-- Can create/edit:
- Guides in their networks (via network_id + user_id match)
- Guide steps only if guide owner or reviewer
- Generation events (own only)

-- Moderators/Curators:
- Can view any guide regardless of status
- Can transition status (draft → in-review, etc.)
- Can set verification tier

-- Admins:
- Full read/write/delete access
```

### Detailed RLS Policies (for future implementation)

```sql
-- guides: users can read published guides OR drafts they own
CREATE POLICY "guides_select" ON guides
  FOR SELECT USING (
    status = 'published' 
    OR author_id = auth.uid()
    OR reviewer_id = auth.uid()
  );

-- guides: users can update only their own drafts
CREATE POLICY "guides_update" ON guides
  FOR UPDATE USING (author_id = auth.uid() AND status = 'draft');

-- guide_steps: can only edit if guide is owned by user and status = 'draft'
CREATE POLICY "guide_steps_update" ON guide_steps
  FOR UPDATE USING (
    guide_id IN (
      SELECT id FROM guides 
      WHERE author_id = auth.uid() AND status = 'draft'
    )
  );
```

---

## 8. Migration Order

### Phase 1: Core Tables (Weeks 1-2)

1. `networks` - Top-level namespace
2. `hubs` - Organize by product/game
3. `collections` - Organize by category
4. `guides` - Core content
5. `guide_steps` - Guide sections
6. `users` - Basic user records (sync with Auth)

### Phase 2: Forge Rules & Validation (Weeks 2-3)

7. `forge_rules` - Rule definitions
8. `forge_rule_check_results` - Validation history

### Phase 3: Analytics & Events (Week 3)

9. `generation_events` - Track all edits and generations

### Phase 4: Secondary Tables (Week 4+)

- `favorites` (if adding favorites feature)
- `feedback` (if adding rating/feedback)
- `subscriptions` (if adding notifications)

---

## 9. localStorage → Supabase Mapping

### Current localStorage Structure

```
guideforge:drafts:[draftId] → Full Guide object
  {
    id, collectionId, hubId, networkId, slug,
    title, summary, type, difficulty, status, verification,
    requirements[], warnings[], version, estimatedMinutes,
    steps: GuideStep[], author, reviewer,
    forgeRulesCheckResult[], forgeRulesCheckTimestamp,
    createdAt, updatedAt, publishedAt
  }
```

### Mapping to Supabase

| localStorage Field | Supabase Table | Column | Notes |
|---|---|---|---|
| `id` | guides | id | UUID, primary key |
| `networkId` | guides | network_id | Foreign key |
| `hubId` | guides | hub_id | Foreign key |
| `collectionId` | guides | collection_id | Foreign key |
| `slug` | guides | slug | Unique per network |
| `title` | guides | title | |
| `summary` | guides | summary | |
| `type` | guides | type | |
| `difficulty` | guides | difficulty | |
| `status` | guides | status | |
| `verification` | guides | verification | |
| `requirements[]` | guides | requirements | Array column |
| `warnings[]` | guides | warnings | Array column |
| `version` | guides | version | |
| `estimatedMinutes` | guides | estimated_minutes | |
| `steps: GuideStep[]` | guide_steps | (rows) | One row per step |
| `steps[].id` | guide_steps | id | |
| `steps[].guideId` | guide_steps | guide_id | Foreign key |
| `steps[].order` | guide_steps | order | |
| `steps[].kind` | guide_steps | kind | |
| `steps[].title` | guide_steps | title | |
| `steps[].body` | guide_steps | body | |
| `steps[].isSpoiler` | guide_steps | is_spoiler | |
| `steps[].callout` | guide_steps | callout | |
| `author` | guides | author_id | Foreign key to users |
| `reviewer` | guides | reviewer_id | Foreign key to users (nullable) |
| `forgeRulesCheckResult[]` | forge_rule_check_results | (rows) | One row per rule checked |
| `forgeRulesCheckTimestamp` | forge_rule_check_results | check_timestamp | Latest timestamp |
| `createdAt` | guides | created_at | |
| `updatedAt` | guides | updated_at | |
| `publishedAt` | guides | published_at | |

---

## 10. Frontend Files That Will Change

### Core Changes (Essential)

**Storage Layer** → Replace localStorage functions:
- `/lib/guideforge/guide-drafts-storage.ts` → Wrap Supabase queries
  - `saveGuideDraft(guide)` → `INSERT guide` + `INSERT guide_steps` + `INSERT forge_rule_check_results`
  - `loadGuideDraft(draftId)` → `SELECT guide + JOIN guide_steps + JOIN forge_rule_check_results`
  - `deleteDraft(draftId)` → `DELETE guide` (cascade to steps/checks)
  - `getDraftsByNetwork(networkId)` → `SELECT * WHERE network_id = $1 AND status = 'draft'`

**Data Loading** → Replace mock data:
- `/lib/guideforge/mock-data.ts` → Replace with Supabase queries
  - `MOCK_NETWORKS` → `SELECT * FROM networks`
  - `MOCK_HUBS` → `SELECT * FROM hubs WHERE network_id = $1`
  - `MOCK_COLLECTIONS` → `SELECT * FROM collections WHERE hub_id = $1`
  - `MOCK_GUIDES` → `SELECT * FROM guides WHERE collection_id = $1`

### Editor & Builder Components

- `/components/guideforge/builder/guide-editor.tsx` → Add Supabase client call on save
- `/components/guideforge/builder/draft-workspace.tsx` → Use real query instead of `getDraftsByNetwork`
- `/components/guideforge/builder/network-workspace.tsx` → Load real hubs/collections
- `/app/builder/network/[networkId]/dashboard/page.tsx` → Fetch from Supabase, not mock data

### Generation Pipeline

- `/lib/guideforge/mock-generator.ts` → Stays largely same (local validation)
- `/app/builder/network/[networkId]/generate/page.tsx` → Save generated guides to Supabase instead of localStorage
  - POST `/api/guides` endpoint to handle guide creation + forge rules check

### Public Pages

- `/n/questline/[slug]` pages → Query Supabase for public guides
- `/n/questline/[slug]/guide/[guideSlug]` → Fetch guide + steps from Supabase

### New API Routes Needed

- `POST /api/guides` - Create guide (with Forge Rules check)
- `PATCH /api/guides/[id]` - Update guide
- `DELETE /api/guides/[id]` - Delete guide
- `GET /api/guides/[id]/forge-rules-check` - Run validation
- `GET /api/networks/[id]/hubs` - Get hubs for network
- `GET /api/hubs/[id]/collections` - Get collections for hub
- `GET /api/collections/[id]/guides` - Get guides for collection

---

## 11. SQL Draft (Review Only)

```sql
-- ============================================
-- GuideForge Supabase Schema Draft
-- Review Only - Do Not Execute
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- ============================================
-- 1. USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  handle TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user', -- user, moderator, curator, admin
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. NETWORKS
-- ============================================

CREATE TABLE networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- gaming, repair, sop, creator, training, community
  visibility TEXT DEFAULT 'public', -- public, private, unlisted
  domain TEXT,
  
  -- Branding (could be JSONB, but here as columns for clarity)
  branding_primary_color TEXT DEFAULT '#D4A373',
  branding_accent_color TEXT,
  branding_theme TEXT DEFAULT 'parchment', -- parchment, copper, neutral, ...
  branding_logo_url TEXT,
  
  -- Denormalized IDs
  forge_rule_ids UUID[] DEFAULT '{}',
  hub_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. HUBS
-- ============================================

CREATE TABLE hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tagline TEXT,
  hub_kind TEXT DEFAULT 'game', -- game, product, department, topic, channel, other
  banner_url TEXT,
  
  -- Denormalized IDs
  collection_ids UUID[] DEFAULT '{}',
  guide_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(network_id, slug)
);

-- ============================================
-- 4. COLLECTIONS
-- ============================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_guide_type TEXT, -- character-build, walkthrough, boss-guide, ...
  
  -- Denormalized IDs
  guide_ids UUID[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(hub_id, slug)
);

-- ============================================
-- 5. GUIDES
-- ============================================

CREATE TABLE guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  
  title TEXT NOT NULL,
  summary TEXT,
  type TEXT NOT NULL, -- character-build, walkthrough, boss-guide, ...
  difficulty TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
  
  status TEXT DEFAULT 'draft', -- draft, in-review, ready, published, needs-update, deprecated, archived
  verification TEXT DEFAULT 'unverified', -- unverified, reviewed, expert-reviewed, community-proven, forge-verified, forged
  
  requirements TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  
  version TEXT,
  estimated_minutes INTEGER,
  
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE(network_id, slug)
);

-- Index for common queries
CREATE INDEX idx_guides_network_status ON guides(network_id, status);
CREATE INDEX idx_guides_hub_status ON guides(hub_id, status);
CREATE INDEX idx_guides_collection ON guides(collection_id);
CREATE INDEX idx_guides_author ON guides(author_id);

-- ============================================
-- 6. GUIDE_STEPS
-- ============================================

CREATE TABLE guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  
  "order" INTEGER NOT NULL,
  kind TEXT NOT NULL, -- overview, strengths, weaknesses, gear, skill-priority, rotation, ...
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_spoiler BOOLEAN DEFAULT FALSE,
  callout TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sequential retrieval
CREATE INDEX idx_guide_steps_guide_order ON guide_steps(guide_id, "order");

-- ============================================
-- 7. FORGE_RULES (Master Catalog)
-- ============================================

CREATE TABLE forge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- metadata, structure, tone, safety, lifecycle
  applies_to TEXT[] NOT NULL, -- Array of network types: gaming, repair, sop, ...
  is_required BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 8. FORGE_RULE_CHECK_RESULTS
-- ============================================

CREATE TABLE forge_rule_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  forge_rule_id UUID NOT NULL REFERENCES forge_rules(id) ON DELETE CASCADE,
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  passed BOOLEAN NOT NULL,
  reason TEXT,
  
  check_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  content_hash TEXT, -- SHA256 hash of guide.title + guide.summary + guide.version
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching latest results per guide+rule
CREATE INDEX idx_forge_check_guide_rule ON forge_rule_check_results(guide_id, forge_rule_id, check_timestamp DESC);
CREATE INDEX idx_forge_check_network ON forge_rule_check_results(network_id, check_timestamp DESC);

-- ============================================
-- 9. GENERATION_EVENTS (Analytics)
-- ============================================

CREATE TABLE generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES guides(id) ON DELETE SET NULL,
  
  event_type TEXT NOT NULL, -- guide_generated, guide_edited, guide_published, section_regenerated, guide_forged, review_completed
  
  prompt TEXT,
  model_used TEXT, -- gpt-4, gpt-3.5-turbo, etc.
  tokens_used INTEGER,
  
  metadata JSONB DEFAULT '{}', -- flexible object for event-specific data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_generation_events_network ON generation_events(network_id, created_at DESC);
CREATE INDEX idx_generation_events_guide ON generation_events(guide_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER handle_networks_updated_at BEFORE UPDATE ON networks
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();

CREATE TRIGGER handle_hubs_updated_at BEFORE UPDATE ON hubs
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();

CREATE TRIGGER handle_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();

CREATE TRIGGER handle_guides_updated_at BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();

CREATE TRIGGER handle_guide_steps_updated_at BEFORE UPDATE ON guide_steps
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();

CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION moddatetime.update_updated_at();
```

---

## 12. Migration Plan: localStorage → Supabase

### Step 1: Schema Creation (Manual)
- User provides Supabase project connection details
- Run SQL schema above in Supabase console
- Verify tables created, indexes ready

### Step 2: Seed Initial Data (One-time Script)

Create `/scripts/migrate-to-supabase.ts`:

```typescript
// Pseudo-code:
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// 1. Insert mock networks
const networks = await supabase.from('networks').insert([...]);

// 2. Insert mock hubs
const hubs = await supabase.from('hubs').insert([...]);

// 3. Insert mock collections
const collections = await supabase.from('collections').insert([...]);

// 4. Insert mock guides + steps
for (const guide of mockGuides) {
  const { data: guideData } = await supabase
    .from('guides')
    .insert([...])
    .select();
  
  const stepsData = guide.steps.map(s => ({ ...s, guide_id: guideData[0].id }));
  await supabase.from('guide_steps').insert(stepsData);
}

// 5. Insert forge rules
await supabase.from('forge_rules').insert([...]);
```

Run script once to populate Supabase with mock data from current codebase.

### Step 3: Update Storage Layer

Replace `/lib/guideforge/guide-drafts-storage.ts`:

```typescript
// Before (localStorage):
export function saveGuideDraft(guide: Guide): string {
  const key = `${STORAGE_PREFIX}${guide.id}`;
  localStorage.setItem(key, JSON.stringify(guide));
  return guide.id;
}

// After (Supabase):
export async function saveGuideDraft(guide: Guide): Promise<string> {
  const supabase = createClient(url, key);
  
  // Save guide
  const { data: guideData, error: guideError } = await supabase
    .from('guides')
    .upsert(guide)
    .select();
  
  if (guideError) throw guideError;
  
  // Save steps (delete old, insert new)
  await supabase
    .from('guide_steps')
    .delete()
    .eq('guide_id', guide.id);
  
  const stepsData = guide.steps.map(s => ({
    ...s,
    guide_id: guide.id,
  }));
  
  const { error: stepsError } = await supabase
    .from('guide_steps')
    .insert(stepsData);
  
  if (stepsError) throw stepsError;
  
  return guide.id;
}
```

### Step 4: Update Data Loading

Replace `/lib/guideforge/mock-data.ts` with dynamic queries:

```typescript
// Before (mock data):
export const MOCK_NETWORKS = [...];
export const MOCK_HUBS = [...];

// After (Supabase):
export async function getNetworks() {
  const supabase = createClient(url, key);
  const { data } = await supabase.from('networks').select();
  return data || [];
}

export async function getHubs(networkId: string) {
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from('hubs')
    .select()
    .eq('network_id', networkId);
  return data || [];
}
```

### Step 5: Add Supabase Client Setup

Create `/lib/guideforge/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add env vars to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 6: Update Editor Component

Modify `/components/guideforge/builder/guide-editor.tsx`:

```typescript
// In handlePublishDraft():
const updatedGuide: Guide = { ...guide, status: 'ready', ... };
// Before:
saveGuideDraft(updatedGuide);
// After:
await saveGuideDraft(updatedGuide); // Now async

// Add error handling:
try {
  await saveGuideDraft(updatedGuide);
  setMarkedReady(true);
} catch (error) {
  setMarkReadyError(true);
  console.error('Failed to mark ready:', error);
}
```

### Step 7: Test & Rollback

- Test draft creation, editing, viewing in staging environment
- Verify Forge Rules checks still work
- Fallback: localStorage still present; easy to revert if issues

---

## 13. Risks & Questions Before Implementation

### Architectural Risks

1. **Denormalization Trade-off**: Arrays like `hub_ids` in `networks` provide fast reads but risk inconsistency if hubs deleted. Solution: Add trigger to update parent array on hub delete.

2. **Cascade Delete Complexity**: Should deleting a network cascade to all hubs/collections/guides? Or soft-delete with `archived` status? → Recommend: Soft delete via status column + cleanup script for true purges.

3. **Auth Integration**: Schema assumes Supabase Auth user IDs exist. If Auth connected later, orphaned records possible. → Solution: Add nullable `user_id` fields initially; require auth later.

4. **Forge Rules Versioning**: If rule text changes, old check results may not reflect current rule. Need version column? → For MVP: Accept this limitation. Add `rule_version` column later if needed.

### Performance Risks

1. **Querying Nested Data**: Fetching a guide + 10 steps + forge rule results requires 3+ queries (N+1 problem). → Solution: Use `SELECT *, guide_steps(*), forge_rule_check_results(*)` with Supabase joins.

2. **Array Columns**: Querying `forge_rule_ids` array with containment checks (`forge_rule_ids @> ARRAY['rule_1']`) may be slow at scale. → For MVP: Acceptable. Separate `network_forge_rules` junction table if needed later.

3. **Index Coverage**: Queries like "All published guides in hub" need `idx_guides_hub_status`. → Verify indexes added.

### Data Risks

1. **Content Hash for Staleness**: What if hash algorithm changes or is wrong? → Solution: Accept potential false-negatives (user re-checks manually). Good enough for MVP.

2. **Migration Script**: One-time seed script may fail partway. → Solution: Add idempotency; safe to re-run if interrupted.

3. **Timezone Handling**: Guide timestamps in ISO format (UTC). Supabase timestamps with time zone. Ensure conversion correct. → Use `TIMESTAMP WITH TIME ZONE` everywhere; app handles UTC.

### Integration Risks

1. **OpenAI Integration Later**: Generated guides must have `created_by = null` initially? Or default to system user? → Solution: Create `system` user record; assign generations there.

2. **Auth Later**: Current users in mock data (Riley, Nova, etc.) have hardcoded UUIDs. If real auth later, IDs won't match. → Solution: Update mock data IDs to match future auth IDs, or treat mocks as separate test users.

3. **Environment Variable Secrets**: Supabase anon key is public; should be safe per RLS policies. → Solution: Implement RLS strictly; test before production.

### Operational Questions

1. **Backup Strategy**: Does Supabase auto-backup? When? → Verify backup plan with user before going live.

2. **Rate Limits**: Supabase free tier has limits. If guide generation spikes, will hit limits? → Plan for upgrade path or caching layer.

3. **Real-time Sync**: Schema doesn't include `realtime` subscriptions. If needed later, which tables? → Defer to Phase 2.

### MVP Scope Questions

1. **User Management**: Schema includes `users` table, but no sign-up/sign-in UI yet. Should we include placeholder or stub? → Recommended: Stub `users` table; auth UI in Phase 2.

2. **Collections Editing**: Can users create collections? Or only admins? → For MVP: Hardcoded collections via seed data. UI in Phase 2.

3. **Publish to Public**: Schema supports `published` status, but no public URL routing yet. Should guide creation skip to `draft` only? → Recommended: Yes; `published` status set manually by admins for demo purposes.

4. **Workflow Approval**: `in-review` status implies review queue, but no review UI. Should this status exist for MVP? → Recommended: Simplify to `draft` → `ready` → `published` for MVP. Add `in-review` in Phase 2.

---

## Summary

This schema provides a production-ready foundation for GuideForge while remaining flexible for QuestLine (gaming), Techsperts (expert networks), and repair/SOP use cases. The key design decisions:

1. **5-level hierarchy** (Network → Hub → Collection → Guide → Step) enforced via foreign keys
2. **Denormalized ID arrays** for fast reads with trade-off on consistency
3. **Separate status and verification** tiers for flexibility
4. **Deterministic Forge Rules** with staleness detection
5. **Generation event tracking** for analytics and audit trail
6. **RLS-ready** structure, with policies to be added when auth implemented

**Next Steps**:
- [ ] User reviews schema for business logic alignment
- [ ] Confirm environment variables and Supabase project details
- [ ] Create seed data migration script
- [ ] Update frontend layer (async/await for all storage calls)
- [ ] Test end-to-end in staging Supabase project
- [ ] Deploy to production with fallback to localStorage
