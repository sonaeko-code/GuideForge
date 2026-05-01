# GuideForge Supabase Schema Plan - REVISED

**Status**: Revised planning phase - Review only. No implementation yet.

**Date**: April 2026

**Scope**: Supabase Phase 1 - Core persistence for draft guides and Forge Rules validation. Public QuestLine pages remain on localStorage for Phase 2.

---

## 1. Schema Overview

GuideForge maintains a 5-level hierarchy:
```
Network → Hub → Collection → Guide → GuideStep
```

### Key Changes from Original Plan

1. **No denormalized ID arrays** - Use normal foreign keys only (hub_ids, collection_ids arrays removed)
2. **Profiles table instead of users** - Align with Supabase auth.users; use profiles for display metadata
3. **network_forge_rules join table** - Proper N:M relationship with enabled/required flags
4. **Separate Forge Rules check structure** - forge_rule_check_runs + forge_rule_check_results for staleness detection
5. **Simplified MVP status** - Only: draft, ready, published, archived
6. **Verification separate from status** - unverified, rules_passed, reviewed, forge_verified, forged
7. **MVP scope: drafts only** - First pass replaces localStorage draft persistence only
8. **Generalized design** - Works for GuideForge, QuestLine (gaming), Techsperts (repair/SOP)

### Core Principles

- **Multi-Network Design**: All tables include `network_id` foreign key
- **Clean Foreign Keys**: Normal 1:N relationships, no denormalization for MVP
- **Audit Trail Ready**: All tables include `created_at`, `updated_at`, user tracking
- **Status & Verification Decoupled**: Lifecycle (`status`) separate from trust (`verification`)
- **Forge Rules as Configuration**: Per-network rules with historical check runs
- **Generation Events for Analytics**: Track AI generation and publish events

---

## 2. Revised Table List (10 tables)

1. **profiles** - Auth-aligned user display metadata
2. **networks** - Top-level namespace (gaming network, repair hub, SOP, etc.)
3. **hubs** - Thematic groupings (game, product, department, topic)
4. **collections** - Guide categories within a hub
5. **guides** - Complete guide documents with status/verification
6. **guide_steps** - Individual sections/steps within a guide
7. **forge_rules** - Reusable validation rules (global library)
8. **network_forge_rules** - N:M join table: which rules apply to which network
9. **forge_rule_check_runs** - One record per validation session (staleness tracking)
10. **forge_rule_check_results** - One record per rule check result (detailed validation data)

---

## 3. Table-by-Table Plan (Revised)

### **3.1 profiles**

User display metadata aligned with Supabase auth.users.

**Purpose**: Store user profile, display name, avatar, bio, role.

**Columns**:
```sql
id (uuid, primary key) -- references auth.users.id later
display_name (text)
handle (text, unique, nullable) - e.g., "sonaeko"
avatar_url (text, nullable)
bio (text, nullable)
role (text) - enum: viewer, contributor, moderator, admin
created_at (timestamp)
updated_at (timestamp)
```

**Relationships**:
- Auth.users reference (one-to-one, later)
- Guides created by this user

**Notes**: Do not include password or auth credentials. This is display-only metadata.

---

### **3.2 networks**

Top-level namespace for a GuideForge instance.

**Purpose**: Store network branding, visibility, configuration. Can be gaming network, repair documentation hub, SOP system, training platform, creator community, etc.

**Columns**:
```sql
id (uuid, primary key)
slug (text, unique) - e.g., "questline", "macbook-repair", "sales-sop"
name (text) - Display name
description (text)
type (text) - enum: gaming, repair, sop, creator, training, community
visibility (text) - enum: public, private, unlisted

-- Branding
primary_color (text, nullable) - e.g., "#D4A373"
accent_color (text, nullable)
theme (text, nullable) - enum: parchment, copper, neutral, industrial, soft, arcane, ember
logo_url (text, nullable)

-- Domain
domain (text, nullable) - e.g., "questline.guideforge.app"

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `← hubs` (1:N) - A network has many hubs
- `← network_forge_rules` (1:N) - A network enables a subset of rules
- `← generation_events` (1:N) - Track generation events per network

**MVP Notes**: In Phase 1, only draft guides are persisted. Public QuestLine guides remain on mock data.

---

### **3.3 hubs**

Thematic namespaces within a network.

**Purpose**: Group collections and guides by game/product/department/topic. Examples:
- Gaming: "Emberfall" (fantasy game), "Starfall Outriders" (sci-fi game)
- Repair: "MacBook Pro", "iPhone 14"
- SOP: "Sales Process", "Onboarding", "Engineering"

**Columns**:
```sql
id (uuid, primary key)
network_id (uuid, not null, foreign key → networks.id)
slug (text, unique per network) - e.g., "emberfall"
name (text) - e.g., "Emberfall"
description (text)
tagline (text, nullable) - e.g., "The realm of ancient magic"

hub_kind (text) - enum: game, product, department, topic, channel, other
banner_url (text, nullable)

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `→ networks` (N:1) - Many hubs belong to one network
- `← collections` (1:N) - A hub has many collections
- `← guides` (1:N) - Guides directly in hub (collection_id may be null)

**Notes**: No denormalized collection_ids or guide_ids arrays in MVP.

---

### **3.4 collections**

Logical groupings within a hub for organizing guides by category.

**Purpose**: Organize guides by category/section. Set default guide type. Examples:
- Gaming: "Character Builds", "Dungeons", "Patch Notes"
- Repair: "Disassembly", "Troubleshooting", "Reassembly"
- SOP: "Onboarding", "Best Practices", "Escalation"

**Columns**:
```sql
id (uuid, primary key)
network_id (uuid, not null, foreign key → networks.id)
hub_id (uuid, not null, foreign key → hubs.id)
slug (text, unique per hub) - e.g., "character-builds"
name (text)
description (text)

default_guide_type (text, nullable) - Guide type to suggest when creating new guides
icon_name (text, nullable) - Icon identifier for UI

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `→ networks` (N:1)
- `→ hubs` (N:1)
- `← guides` (1:N) - A collection has many guides (collection_id not null)

**Notes**: No denormalized guide_ids array in MVP.

---

### **3.5 guides**

Full guide documents with all metadata, status, verification, and Forge Rules results.

**Purpose**: Store complete guide content with status/verification/rules tracking.

**Columns**:
```sql
id (uuid, primary key)
network_id (uuid, not null, foreign key → networks.id)
hub_id (uuid, not null, foreign key → hubs.id)
collection_id (uuid, nullable, foreign key → collections.id) - null if directly in hub
slug (text, unique per network) - e.g., "best-fire-warden-beginner-build"

-- Core content
title (text)
summary (text) - 2-3 sentence overview
type (text) - enum: character-build, walkthrough, boss-guide, repair-guide, sop, etc.
difficulty (text, nullable) - enum: beginner, intermediate, advanced, expert

-- Author metadata
author_name (text)
author_avatar_url (text, nullable)

-- Lifecycle status (MVP only: draft, ready, published, archived)
status (text) - enum: draft, ready, published, archived
published_at (timestamp, nullable)

-- Verification/trust (separate from status)
verification (text) - enum: unverified, rules_passed, reviewed, forge_verified, forged
verified_at (timestamp, nullable)
verified_by (uuid, nullable, references profiles.id)

-- Forge Rules tracking
latest_check_run_id (uuid, nullable, references forge_rule_check_runs.id)
last_checked_at (timestamp, nullable)
all_rules_passed (boolean, nullable) - Cache for UI

-- Content
body (text, nullable) - Full markdown body (optional, if not using steps)
steps_count (integer) - Denormalized count for quick filtering

-- Denormalized for performance (Phase 2+)
views_count (integer, default 0)
rating_avg (numeric, nullable)

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `→ networks` (N:1)
- `→ hubs` (N:1)
- `→ collections` (N:1, nullable)
- `← guide_steps` (1:N) - A guide has many steps
- `← forge_rule_check_runs` (1:N) - Check history
- `← generation_events` (1:N) - Generation/edit events

**Notes**: 
- MVP `status` simplified to: draft, ready, published, archived
- Future statuses (in-review, needs-update, deprecated) added in Phase 2
- Verification separate: unverified, rules_passed, reviewed, forge_verified, forged
- `latest_check_run_id` enables staleness detection

---

### **3.6 guide_steps**

Individual sections/steps within a guide.

**Purpose**: Store structured guide content as ordered steps/sections.

**Columns**:
```sql
id (uuid, primary key)
guide_id (uuid, not null, foreign key → guides.id)
network_id (uuid, not null, foreign key → networks.id)
step_number (integer) - Order within guide

title (text)
kind (text) - enum: intro, section, step, note, warning, tip, example, conclusion
body (text) - Markdown content

image_url (text, nullable)
video_url (text, nullable)

created_at (timestamp)
updated_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `→ guides` (N:1)
- `→ networks` (N:1)

**Notes**: Steps ordered by (guide_id, step_number) for deterministic ordering.

---

### **3.7 forge_rules**

Reusable validation rules - a global library of rules that can be enabled per-network.

**Purpose**: Define validation rules once, enable selectively per-network. Allows:
- Gaming network to require "difficulty" field
- Repair network to require "tools_needed" section
- SOP network to require "approval_required" field

**Columns**:
```sql
id (uuid, primary key)
rule_id (text, unique) - Machine-friendly identifier, e.g., "descriptive-title", "game-name-present"
label (text) - Human-friendly label, e.g., "Descriptive Title"
category (text) - enum: content, metadata, structure, safety, performance
description (text) - Explanation of what this rule validates

applies_to (text[]) - Array of guide types that this rule applies to
                     e.g., ["character-build", "walkthrough"]
                     null = applies to all types

created_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `← network_forge_rules` (1:N) - This rule is enabled/configured in N networks

**Notes**: Rules are global; network configuration determines enabled/required status.

---

### **3.8 network_forge_rules** (N:M Join Table)

Maps which Forge Rules are enabled for which networks, with configuration.

**Purpose**: Determine which rules apply to a specific network and their configuration (enabled, required, display order).

**Columns**:
```sql
id (uuid, primary key)
network_id (uuid, not null, foreign key → networks.id)
forge_rule_id (uuid, not null, foreign key → forge_rules.id)

enabled (boolean, default true) - Is this rule active for the network?
required (boolean, default false) - Must all guides pass this rule?
display_order (integer) - Order to display in UI

created_at (timestamp)
updated_at (timestamp)

-- Constraint: unique(network_id, forge_rule_id)
```

**Relationships**:
- `→ networks` (N:1)
- `→ forge_rules` (N:1)

**Notes**: 
- Replace the old denormalized `networks.forge_rule_ids` array
- Allows per-network configuration: Gaming might require difficulty, Repair might not
- `display_order` controls rule presentation order in UI

---

### **3.9 forge_rule_check_runs**

One record per validation session - enables staleness detection.

**Purpose**: Track when guides were validated, what rules were checked, and if results are stale. Identifies when content changed since last check.

**Columns**:
```sql
id (uuid, primary key)
guide_id (uuid, not null, foreign key → guides.id)
network_id (uuid, not null, foreign key → networks.id)

-- Content hash for staleness detection
content_hash (text) - SHA256 hash of (title + summary + version + steps)
                     Used to detect if content changed since this check

-- Check metadata
total_rules (integer) - How many rules were checked
passed_rules (integer) - How many rules passed
all_passed (boolean) - Cache: all_rules_passed = (passed_rules == total_rules)

checked_at (timestamp) - When validation occurred
created_by (uuid, nullable, references profiles.id)
created_at (timestamp)
```

**Relationships**:
- `→ guides` (N:1)
- `→ networks` (N:1)
- `← forge_rule_check_results` (1:N) - One result record per rule checked

**Notes**:
- Content hash enables MVP staleness detection without re-running validation
- If content_hash changes, results are stale
- Multiple check runs per guide for history

---

### **3.10 forge_rule_check_results**

One record per rule check result - detailed validation data.

**Purpose**: Store individual rule validation results with reasoning.

**Columns**:
```sql
id (uuid, primary key)
check_run_id (uuid, not null, foreign key → forge_rule_check_runs.id)
forge_rule_id (uuid, not null, foreign key → forge_rules.id)
network_id (uuid, not null, foreign key → networks.id)

passed (boolean) - Did this guide pass this rule?
reason (text, nullable) - Explanation if failed, e.g., "Title is too short (5 chars, need 8)"

created_at (timestamp)
```

**Relationships**:
- `→ forge_rule_check_runs` (N:1)
- `→ forge_rules` (N:1)
- `→ networks` (N:1)

**Notes**:
- Immutable records (no updates)
- Reason provides user-facing feedback for failed checks
- Indexed on (check_run_id, forge_rule_id) for quick lookups

---

### **3.11 generation_events** (Optional Phase 1)

Track AI generation, manual edits, and publish events for analytics.

**Purpose**: Event log for guide lifecycle - generation, editing, publishing.

**Columns**:
```sql
id (uuid, primary key)
network_id (uuid, not null, foreign key → networks.id)
guide_id (uuid, not null, foreign key → guides.id)

event_type (text) - enum: generated, edited, published, archived
event_data (jsonb) - Event-specific metadata, e.g., {"generator": "ai-sdk-6", "prompt_tokens": 150}

created_at (timestamp)
created_by (uuid, nullable, references profiles.id)
```

**Relationships**:
- `→ networks` (N:1)
- `→ guides` (N:1)

**Notes**: Low priority for MVP. Can defer to Phase 2 if time-constrained.

---

## 4. Relationship Diagram (Revised)

```
auth.users (external)
    ↓
profiles (display metadata)
    ↑
    └─ guides.created_by
    └─ forge_rule_check_runs.created_by
    └─ networks.created_by
    └─ etc.

networks (1)
    ├── hubs (1:N) ──── collections (1:N) ──── guides (1:N) ──── guide_steps (1:N)
    │
    └── network_forge_rules (1:N) ──┐
                                    ├── forge_rules (N:M)
                                    └── mapped rules per network
    │
    └── guides (1:N, via hub) ──── forge_rule_check_runs (1:N)
                                    └── forge_rule_check_results (1:N)
                                        └── forge_rules
    │
    └── generation_events (1:N)

Staleness Detection:
  - When user edits guide: title, summary, version, steps change
  - Content hash no longer matches forge_rule_check_runs.content_hash
  - UI shows: "Results Stale — Re-check Needed"
  - User clicks "Re-check" → new fork_rule_check_run + results
```

---

## 5. SQL Draft (Revised MVP)

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES (aligned with Supabase auth.users)
-- ============================================================================

create table public.profiles (
  id uuid primary key,
  display_name text,
  handle text unique,
  avatar_url text,
  bio text,
  role text check (role in ('viewer', 'contributor', 'moderator', 'admin')) default 'contributor',
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select to authenticated using (true);

-- ============================================================================
-- 2. NETWORKS
-- ============================================================================

create table public.networks (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  type text check (type in ('gaming', 'repair', 'sop', 'creator', 'training', 'community')) not null,
  visibility text check (visibility in ('public', 'private', 'unlisted')) default 'public',
  
  primary_color text,
  accent_color text,
  theme text check (theme in ('parchment', 'copper', 'neutral', 'industrial', 'soft', 'arcane', 'ember')),
  logo_url text,
  
  domain text unique,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id)
);

alter table public.networks enable row level security;

create policy "networks_public_read" on public.networks
  for select using (visibility = 'public' or auth.uid() = created_by);

-- ============================================================================
-- 3. HUBS
-- ============================================================================

create table public.hubs (
  id uuid primary key default uuid_generate_v4(),
  network_id uuid not null references public.networks(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  tagline text,
  hub_kind text check (hub_kind in ('game', 'product', 'department', 'topic', 'channel', 'other')) not null,
  banner_url text,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  
  unique(network_id, slug)
);

alter table public.hubs enable row level security;

create policy "hubs_read" on public.hubs
  for select using (exists (
    select 1 from public.networks n 
    where n.id = hubs.network_id and (n.visibility = 'public' or auth.uid() = n.created_by)
  ));

-- ============================================================================
-- 4. COLLECTIONS
-- ============================================================================

create table public.collections (
  id uuid primary key default uuid_generate_v4(),
  network_id uuid not null references public.networks(id) on delete cascade,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  default_guide_type text,
  icon_name text,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  
  unique(hub_id, slug)
);

alter table public.collections enable row level security;

create policy "collections_read" on public.collections
  for select using (exists (
    select 1 from public.networks n 
    where n.id = collections.network_id and (n.visibility = 'public' or auth.uid() = n.created_by)
  ));

-- ============================================================================
-- 5. GUIDES
-- ============================================================================

create table public.guides (
  id uuid primary key default uuid_generate_v4(),
  network_id uuid not null references public.networks(id) on delete cascade,
  hub_id uuid not null references public.hubs(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete set null,
  slug text not null,
  
  title text not null,
  summary text,
  type text not null,
  difficulty text,
  
  author_name text,
  author_avatar_url text,
  
  status text check (status in ('draft', 'ready', 'published', 'archived')) default 'draft',
  published_at timestamp with time zone,
  
  verification text check (verification in ('unverified', 'rules_passed', 'reviewed', 'forge_verified', 'forged')) default 'unverified',
  verified_at timestamp with time zone,
  verified_by uuid references public.profiles(id),
  
  latest_check_run_id uuid,
  last_checked_at timestamp with time zone,
  all_rules_passed boolean,
  
  body text,
  steps_count integer default 0,
  
  views_count integer default 0,
  rating_avg numeric(3,2),
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  
  unique(network_id, slug)
);

alter table public.guides enable row level security;

create policy "guides_draft_private" on public.guides
  for select using (
    status != 'draft' or auth.uid() = created_by
  );

create policy "guides_published_public" on public.guides
  for select using (status = 'published');

-- ============================================================================
-- 6. GUIDE_STEPS
-- ============================================================================

create table public.guide_steps (
  id uuid primary key default uuid_generate_v4(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  step_number integer not null,
  
  title text not null,
  kind text check (kind in ('intro', 'section', 'step', 'note', 'warning', 'tip', 'example', 'conclusion')) default 'section',
  body text,
  
  image_url text,
  video_url text,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  
  unique(guide_id, step_number)
);

alter table public.guide_steps enable row level security;

create policy "guide_steps_read" on public.guide_steps
  for select using (exists (
    select 1 from public.guides g 
    where g.id = guide_steps.guide_id and (g.status = 'published' or auth.uid() = g.created_by)
  ));

-- ============================================================================
-- 7. FORGE_RULES (global rule library)
-- ============================================================================

create table public.forge_rules (
  id uuid primary key default uuid_generate_v4(),
  rule_id text unique not null,
  label text not null,
  category text check (category in ('content', 'metadata', 'structure', 'safety', 'performance')),
  description text,
  applies_to text[],
  
  created_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id)
);

alter table public.forge_rules enable row level security;

create policy "forge_rules_public_read" on public.forge_rules
  for select using (true);

-- ============================================================================
-- 8. NETWORK_FORGE_RULES (N:M join table)
-- ============================================================================

create table public.network_forge_rules (
  id uuid primary key default uuid_generate_v4(),
  network_id uuid not null references public.networks(id) on delete cascade,
  forge_rule_id uuid not null references public.forge_rules(id) on delete cascade,
  
  enabled boolean default true,
  required boolean default false,
  display_order integer,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique(network_id, forge_rule_id)
);

alter table public.network_forge_rules enable row level security;

create policy "network_forge_rules_read" on public.network_forge_rules
  for select using (exists (
    select 1 from public.networks n 
    where n.id = network_forge_rules.network_id and (n.visibility = 'public' or auth.uid() = n.created_by)
  ));

-- ============================================================================
-- 9. FORGE_RULE_CHECK_RUNS (staleness detection)
-- ============================================================================

create table public.forge_rule_check_runs (
  id uuid primary key default uuid_generate_v4(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  
  content_hash text not null, -- SHA256 of (title + summary + version + steps)
  
  total_rules integer,
  passed_rules integer,
  all_passed boolean,
  
  checked_at timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.forge_rule_check_runs enable row level security;

create policy "forge_rule_check_runs_read" on public.forge_rule_check_runs
  for select using (exists (
    select 1 from public.guides g 
    where g.id = forge_rule_check_runs.guide_id and (g.status = 'published' or auth.uid() = g.created_by)
  ));

create index idx_forge_rule_check_runs_guide_id on public.forge_rule_check_runs(guide_id);
create index idx_forge_rule_check_runs_created_at on public.forge_rule_check_runs(created_at desc);

-- ============================================================================
-- 10. FORGE_RULE_CHECK_RESULTS (detailed validation)
-- ============================================================================

create table public.forge_rule_check_results (
  id uuid primary key default uuid_generate_v4(),
  check_run_id uuid not null references public.forge_rule_check_runs(id) on delete cascade,
  forge_rule_id uuid not null references public.forge_rules(id) on delete cascade,
  network_id uuid not null references public.networks(id) on delete cascade,
  
  passed boolean not null,
  reason text,
  
  created_at timestamp with time zone default now()
);

alter table public.forge_rule_check_results enable row level security;

create policy "forge_rule_check_results_read" on public.forge_rule_check_results
  for select using (exists (
    select 1 from public.forge_rule_check_runs run
    join public.guides g on g.id = run.guide_id
    where run.id = forge_rule_check_results.check_run_id and (g.status = 'published' or auth.uid() = g.created_by)
  ));

create index idx_forge_rule_check_results_check_run_id on public.forge_rule_check_results(check_run_id);
create index idx_forge_rule_check_results_rule_id on public.forge_rule_check_results(forge_rule_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_guides_network_id on public.guides(network_id);
create index idx_guides_hub_id on public.guides(hub_id);
create index idx_guides_collection_id on public.guides(collection_id);
create index idx_guides_created_by on public.guides(created_by);
create index idx_guides_status on public.guides(status);
create index idx_guides_created_at on public.guides(created_at desc);

create index idx_hubs_network_id on public.hubs(network_id);
create index idx_collections_hub_id on public.collections(hub_id);
create index idx_collections_network_id on public.collections(network_id);

create index idx_network_forge_rules_network_id on public.network_forge_rules(network_id);
create index idx_network_forge_rules_forge_rule_id on public.network_forge_rules(forge_rule_id);
```

---

## 6. Revised Implementation Order (MVP Phase 1 Only)

### Scope: Replace localStorage draft persistence

**Goal**: Drafts created in the builder are saved to Supabase, not localStorage.

**Order**:

1. **Create Supabase project** (user responsibility, not v0)
   - Provision managed Postgres
   - Create public schema
   - Generate service role key and anon key

2. **Run schema creation** (user runs provided SQL)
   - Create all 10 tables: profiles, networks, hubs, collections, guides, guide_steps, forge_rules, network_forge_rules, forge_rule_check_runs, forge_rule_check_results
   - Create indexes
   - Create RLS policies (public read for published content, authenticated edit for drafts)

3. **Seed data** (optional for testing)
   - Create test network: e.g., "local-test"
   - Create test hubs: "Emberfall", "Starfall"
   - Create test collections: "Character Builds", "Dungeons"
   - Load forge_rules library
   - Configure network_forge_rules for test network

4. **Update GuideForge storage layer** (v0 code changes)
   - Create `lib/supabase/client.ts` - Supabase client initialization
   - Replace `lib/guideforge/guide-drafts-storage.ts` functions:
     - `saveGuideDraft()` → POST to `guides` table
     - `loadGuideDraft()` → GET from `guides` table
     - `getDraftsByNetwork()` → Query `guides` where status='draft'
     - `deleteDraft()` → DELETE from `guides` table
   - Keep localStorage functions for fallback/offline mode

5. **Update guide-editor component** (v0 code changes)
   - Wire `handleSaveDraft()` to call Supabase `saveGuideDraft()`
   - Wire `handleLoadDraft()` to call Supabase `loadGuideDraft()`
   - Show loading states while saving to Supabase
   - Handle errors: show toast if save fails, offer fallback

6. **Update builder home/draft-workspace** (v0 code changes)
   - Load drafts from `queries.getDraftsByNetwork()` instead of localStorage
   - Show drafts in UI with Supabase data
   - Delete drafts via Supabase DELETE

7. **Testing**
   - Create draft guide → saved to Supabase
   - Reload page → draft loads from Supabase
   - Edit draft → changes persist to Supabase
   - Delete draft → removed from Supabase
   - Network offline → fallback to localStorage

### NOT in Phase 1:
- Public QuestLine guides remain on mock data / localStorage
- Generation events (optional, can add later)
- Advanced RLS policies for teams/permissions
- Analytics / usage tracking
- Mod tools / content review workflows

---

## 7. Frontend Changes Required (High Level)

Files that will need updates when Supabase is connected:

1. **Storage Layer**:
   - `lib/guideforge/guide-drafts-storage.ts` - Migrate from localStorage to Supabase

2. **Components**:
   - `components/guideforge/builder/guide-editor.tsx` - Call Supabase save/load
   - `components/guideforge/builder/draft-workspace.tsx` - Query Supabase drafts
   - `components/guideforge/builder/builder-workspace.tsx` - Hook up Supabase queries

3. **API Routes** (if needed):
   - `app/api/guideforge/drafts/[draftId].ts` - GET/PUT/DELETE draft
   - `app/api/guideforge/forge-rules/check.ts` - POST validation check

4. **Config**:
   - `.env.local` - Add SUPABASE_URL, SUPABASE_ANON_KEY (user adds this)

---

## 8. Risks & Questions (Revised)

### Architectural Risks

1. **Auth Integration Timing**
   - **Risk**: Supabase auth not yet connected; created_by field will be null
   - **Mitigation**: Use session storage or mock user ID for MVP; upgrade when auth ready
   - **Question**: When should we connect Supabase auth? (separate project phase?)

2. **Offline-First Design**
   - **Risk**: NetworkForge builder is offline-first (localStorage); Supabase adds latency
   - **Mitigation**: Implement optimistic updates; keep localStorage cache; sync in background
   - **Question**: Should drafts save to localStorage immediately, then sync to Supabase?

3. **Content Hash for Staleness**
   - **Risk**: SHA256 hashing guide content on every edit is expensive
   - **Mitigation**: Hash on "Re-check" button only, not on every keystroke
   - **Question**: Should we compute hash on frontend or backend?

### Data Model Risks

4. **Network-First vs. Guide-First Queries**
   - **Risk**: Most queries filter by (network_id, status); might slow without composite indexes
   - **Mitigation**: Create composite indexes on (network_id, status, created_at)
   - **Question**: Do we need additional denormalization for performance?

5. **Forge Rules Check Run Retention**
   - **Risk**: Check runs accumulate over time; table grows unbounded
   - **Mitigation**: Archive old runs after 90 days; keep recent runs for staleness tracking
   - **Question**: What's the retention policy for check runs?

6. **Denormalization Trade-offs**
   - **Risk**: Removed ID arrays; queries now require joins
   - **Mitigation**: Joins on foreign keys are fast with indexes; trade simplicity for performance
   - **Question**: If performance degrades, add `guides_count` to hubs?

### Integration Risks

7. **Supabase Pricing Model**
   - **Risk**: Large datasets (many drafts, check runs) might exceed free tier
   - **Mitigation**: Estimate row counts; archive old data; upgrade tier if needed
   - **Question**: What are the storage/compute budgets for Phase 1?

8. **RLS Policy Complexity**
   - **Risk**: Policies checking multiple joins (guides → networks → users) are slow
   - **Mitigation**: Start with simple policies; optimize after profiling
   - **Question**: Should we simplify RLS for MVP and enhance later?

### Operational Questions

9. **Seed Data Strategy**
   - **Risk**: How do we populate test networks/hubs/collections for testing?
   - **Mitigation**: Provide SQL seed script; docs for manual setup
   - **Question**: Should seed data be idempotent (safe to run multiple times)?

10. **Validation Determinism**
    - **Risk**: validateForgeRules() might change over time; old check runs become invalid
    - **Mitigation**: Version the validation rules; store rule version in check run
    - **Question**: Should we add `forge_rules_version` to forge_rule_check_runs?

11. **Preview vs. Published**
    - **Risk**: MVP only handles drafts; public QuestLine stays on mock data
    - **Mitigation**: Clear separation: Supabase for builder drafts, mock data for public guides
    - **Question**: When do we migrate public guides to Supabase? (Phase 2)

12. **Concurrent Edits**
    - **Risk**: Two users editing the same draft simultaneously
    - **Mitigation**: Last-write-wins (simple); or implement conflict-free data structure (complex)
    - **Question**: Do we need conflict resolution or is last-write-wins acceptable?

13. **Performance at Scale**
    - **Risk**: 1000+ drafts, 100+ networks, lots of concurrent check runs
    - **Mitigation**: Add caching layer (Redis); pagination in UI; background jobs for heavy queries
    - **Question**: What are the scaling limits? Should we add caching upfront or wait?

---

## 9. Success Criteria

MVP Phase 1 is complete when:

- ✓ All 10 tables created in Supabase
- ✓ RLS policies enabled and tested
- ✓ Draft save/load working end-to-end (editor → Supabase → draft list)
- ✓ Forge Rules check runs and results stored correctly
- ✓ Staleness detection working (content change detected, marked stale)
- ✓ Public QuestLine guides still work (mock data, no regression)
- ✓ Tests pass: offline fallback, error handling, concurrent saves
- ✓ Documentation complete: schema, API, RLS, migration guide

---

## 10. Next Steps (Not in Scope)

After Phase 1 MVP:

- **Phase 2**: Migrate public QuestLine guides to Supabase
- **Phase 3**: Add Supabase auth (profiles linked to auth.users)
- **Phase 4**: Add generation_events analytics, advanced RLS for teams
- **Phase 5**: Add mod tools, content review workflows, performance optimization
