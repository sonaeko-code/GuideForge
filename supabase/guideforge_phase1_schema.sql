-- GuideForge Phase 1 Schema
-- MVP focus: Supabase-backed draft persistence.
-- This does NOT replace public QuestLine pages yet.
--
-- IMPORTANT: Auth Strategy for Phase 1
-- - profiles.id is a standalone UUID primary key.
-- - profiles.id does NOT reference auth.users yet.
-- - This allows one seeded dev profile without requiring Supabase Auth.
-- - Phase 2 can add auth_user_id or migrate profiles.id to auth.users linkage.
-- - Direct client writes are intentionally not enabled in Phase 1.
-- - App writes should happen later through controlled server/API routes.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- UTILITY: updated_at trigger
-- ============================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- 1. PROFILES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Anonymous',
  handle text unique,
  avatar_url text,
  bio text,
  role text not null default 'user'
    check (role in ('user', 'moderator', 'admin')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 2. NETWORKS
-- ============================================================================

create table if not exists public.networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  type text not null default 'gaming'
    check (type in ('gaming', 'repair', 'sop', 'training', 'community', 'creator')),
  is_public boolean not null default false,
  primary_color text,
  accent_color text,
  theme text,
  logo_url text,
  domain text unique,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_networks_owner_id on public.networks(owner_id);
create index if not exists idx_networks_slug on public.networks(slug);
create index if not exists idx_networks_is_public on public.networks(is_public);

create trigger update_networks_updated_at
before update on public.networks
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 3. HUBS
-- ============================================================================

create table if not exists public.hubs (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  tagline text,
  hub_kind text not null default 'topic'
    check (hub_kind in ('game', 'product', 'department', 'topic', 'channel', 'other')),
  icon_emoji text,
  banner_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(network_id, slug)
);

create index if not exists idx_hubs_network_id on public.hubs(network_id);
create index if not exists idx_hubs_slug on public.hubs(slug);

create trigger update_hubs_updated_at
before update on public.hubs
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 4. COLLECTIONS
-- ============================================================================

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  hub_id uuid not null references public.hubs(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  default_guide_type text,
  icon_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(hub_id, slug)
);

create index if not exists idx_collections_hub_id on public.collections(hub_id);
create index if not exists idx_collections_slug on public.collections(slug);

create trigger update_collections_updated_at
before update on public.collections
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 5. GUIDES
-- ============================================================================

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete set null,
  title text not null,
  slug text not null,
  summary text,
  type text not null default 'guide'
    check (type in ('guide', 'build', 'strategy', 'quest', 'walkthrough', 'repair', 'sop', 'custom')),
  difficulty text
    check (difficulty in ('beginner', 'intermediate', 'advanced', 'expert')),
  version text,
  author_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'published', 'archived')),
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'rules_passed', 'reviewed', 'forge_verified', 'forged')),
  latest_check_run_id uuid,
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(collection_id, slug)
);

create index if not exists idx_guides_collection_id on public.guides(collection_id);
create index if not exists idx_guides_author_id on public.guides(author_id);
create index if not exists idx_guides_status on public.guides(status);
create index if not exists idx_guides_verification_status on public.guides(verification_status);
create index if not exists idx_guides_latest_check_run_id on public.guides(latest_check_run_id);

create trigger update_guides_updated_at
before update on public.guides
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 6. GUIDE STEPS
-- ============================================================================

create table if not exists public.guide_steps (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'section'
    check (kind in ('intro', 'section', 'step', 'tip', 'warning', 'summary', 'example', 'conclusion')),
  order_index integer not null,
  is_spoiler boolean not null default false,
  callout text,
  image_url text,
  video_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(guide_id, order_index)
);

create index if not exists idx_guide_steps_guide_id on public.guide_steps(guide_id);
create index if not exists idx_guide_steps_order on public.guide_steps(guide_id, order_index);

create trigger update_guide_steps_updated_at
before update on public.guide_steps
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 7. FORGE RULES
-- ============================================================================

create table if not exists public.forge_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  description text,
  category text
    check (category in ('content', 'metadata', 'formatting', 'verification', 'safety', 'structure')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_forge_rules_name on public.forge_rules(name);

create trigger update_forge_rules_updated_at
before update on public.forge_rules
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 8. NETWORK FORGE RULES
-- ============================================================================

create table if not exists public.network_forge_rules (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks(id) on delete cascade,
  forge_rule_id uuid not null references public.forge_rules(id) on delete cascade,
  enabled boolean not null default true,
  required boolean not null default false,
  display_order integer,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(network_id, forge_rule_id)
);

create index if not exists idx_network_forge_rules_network_id on public.network_forge_rules(network_id);
create index if not exists idx_network_forge_rules_forge_rule_id on public.network_forge_rules(forge_rule_id);

create trigger update_network_forge_rules_updated_at
before update on public.network_forge_rules
for each row execute function public.update_updated_at_column();

-- ============================================================================
-- 9. FORGE RULE CHECK RUNS
-- ============================================================================

create table if not exists public.forge_rule_check_runs (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  content_hash text,
  checked_at timestamp with time zone not null default now(),
  total_rules integer not null default 0,
  passed_rules integer not null default 0,
  passed boolean not null default false,
  created_at timestamp with time zone not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_forge_rule_check_runs_guide_id on public.forge_rule_check_runs(guide_id);
create index if not exists idx_forge_rule_check_runs_checked_at on public.forge_rule_check_runs(checked_at desc);

-- Add latest_check_run_id FK after forge_rule_check_runs exists.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'guides_latest_check_run_id_fkey'
      and table_schema = 'public'
      and table_name = 'guides'
  ) then
    alter table public.guides
    add constraint guides_latest_check_run_id_fkey
    foreign key (latest_check_run_id)
    references public.forge_rule_check_runs(id)
    on delete set null;
  end if;
end $$;

-- ============================================================================
-- 10. FORGE RULE CHECK RESULTS
-- ============================================================================

create table if not exists public.forge_rule_check_results (
  id uuid primary key default gen_random_uuid(),
  check_run_id uuid not null references public.forge_rule_check_runs(id) on delete cascade,
  forge_rule_id uuid not null references public.forge_rules(id) on delete cascade,
  passed boolean not null default false,
  reason text,
  created_at timestamp with time zone not null default now(),
  unique(check_run_id, forge_rule_id)
);

create index if not exists idx_forge_rule_check_results_check_run_id on public.forge_rule_check_results(check_run_id);
create index if not exists idx_forge_rule_check_results_forge_rule_id on public.forge_rule_check_results(forge_rule_id);

-- ============================================================================
-- 11. GENERATION EVENTS
-- ============================================================================

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid references public.guides(id) on delete set null,
  event_type text not null default 'generated'
    check (event_type in ('generated', 'edited', 'section_regenerated', 'marked_ready', 'published', 'archived', 'failed')),
  prompt text,
  model text,
  status text not null default 'completed'
    check (status in ('pending', 'completed', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_generation_events_guide_id on public.generation_events(guide_id);
create index if not exists idx_generation_events_status on public.generation_events(status);
create index if not exists idx_generation_events_created_at on public.generation_events(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.networks enable row level security;
alter table public.hubs enable row level security;
alter table public.collections enable row level security;
alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;
alter table public.forge_rules enable row level security;
alter table public.network_forge_rules enable row level security;
alter table public.forge_rule_check_runs enable row level security;
alter table public.forge_rule_check_results enable row level security;
alter table public.generation_events enable row level security;

-- ============================================================================
-- RLS POLICIES: READ-ORIENTED PHASE 1
-- ============================================================================
-- Phase 1 note:
-- - Public read policies are included for public content.
-- - Direct client INSERT/UPDATE/DELETE policies are intentionally not broad.
-- - Draft writes should later happen through controlled server/API routes.
-- - This keeps Vercel/v0 from relying on unsafe anonymous client writes.

-- Profiles: public read.
create policy "profiles_select_all"
on public.profiles
for select
using (true);

-- Networks: public networks visible to all; private visible to owner.
create policy "networks_select_public_or_owner"
on public.networks
for select
using (
  is_public = true
  or owner_id = auth.uid()
);

-- Hubs: inherit visibility from parent network.
create policy "hubs_select_by_network_visibility"
on public.hubs
for select
using (
  exists (
    select 1
    from public.networks n
    where n.id = hubs.network_id
      and (n.is_public = true or n.owner_id = auth.uid())
  )
);

-- Collections: inherit visibility from parent hub/network.
create policy "collections_select_by_network_visibility"
on public.collections
for select
using (
  exists (
    select 1
    from public.hubs h
    join public.networks n on n.id = h.network_id
    where h.id = collections.hub_id
      and (n.is_public = true or n.owner_id = auth.uid())
  )
);

-- Guides: published guides visible to all; drafts visible to author.
create policy "guides_select_published_or_author"
on public.guides
for select
using (
  status = 'published'
  or author_id = auth.uid()
);

-- Guide steps: inherit visibility from parent guide.
create policy "guide_steps_select_by_guide_visibility"
on public.guide_steps
for select
using (
  exists (
    select 1
    from public.guides g
    where g.id = guide_steps.guide_id
      and (g.status = 'published' or g.author_id = auth.uid())
  )
);

-- Forge rules: public read.
create policy "forge_rules_select_all"
on public.forge_rules
for select
using (true);

-- Network Forge Rules: visible if parent network is visible.
create policy "network_forge_rules_select_by_network_visibility"
on public.network_forge_rules
for select
using (
  exists (
    select 1
    from public.networks n
    where n.id = network_forge_rules.network_id
      and (n.is_public = true or n.owner_id = auth.uid())
  )
);

-- Check runs: visible if parent guide is visible.
create policy "forge_rule_check_runs_select_by_guide_visibility"
on public.forge_rule_check_runs
for select
using (
  exists (
    select 1
    from public.guides g
    where g.id = forge_rule_check_runs.guide_id
      and (g.status = 'published' or g.author_id = auth.uid())
  )
);

-- Check results: visible if parent check run/guide is visible.
create policy "forge_rule_check_results_select_by_guide_visibility"
on public.forge_rule_check_results
for select
using (
  exists (
    select 1
    from public.forge_rule_check_runs r
    join public.guides g on g.id = r.guide_id
    where r.id = forge_rule_check_results.check_run_id
      and (g.status = 'published' or g.author_id = auth.uid())
  )
);

-- Generation events: visible if parent guide is visible.
create policy "generation_events_select_by_guide_visibility"
on public.generation_events
for select
using (
  exists (
    select 1
    from public.guides g
    where g.id = generation_events.guide_id
      and (g.status = 'published' or g.author_id = auth.uid())
  )
);