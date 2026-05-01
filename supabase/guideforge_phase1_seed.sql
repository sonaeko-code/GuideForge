-- GuideForge Phase 1 Seed Data
-- Starter data for development and manual testing.
--
-- IMPORTANT: Auth-Light Design for Phase 1
-- - The seeded dev profile uses a fixed UUID.
-- - It does NOT require a real Supabase Auth user.
-- - profiles.id is standalone in Phase 1.
-- - Phase 2 can add auth_user_id linkage for real Supabase Auth.

-- ============================================================================
-- CONSTANTS
-- ============================================================================

-- Dev profile UUID:
-- 550e8400-e29b-41d4-a716-446655440000

-- ============================================================================
-- SEED PROFILE
-- ============================================================================

insert into public.profiles (
  id,
  display_name,
  handle,
  bio,
  role
)
values (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Dev Guide Author',
  'dev_author',
  'Development test profile for GuideForge Phase 1.',
  'user'
)
on conflict (id) do update
set
  display_name = excluded.display_name,
  handle = excluded.handle,
  bio = excluded.bio,
  role = excluded.role,
  updated_at = now();

-- ============================================================================
-- SEED NETWORK: QUESTLINE
-- ============================================================================

insert into public.networks (
  name,
  slug,
  description,
  owner_id,
  type,
  is_public,
  primary_color,
  accent_color,
  theme
)
values (
  'QuestLine',
  'questline',
  'A gaming guide network powered by GuideForge.',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'gaming',
  true,
  '#D4A373',
  '#C26A2E',
  'ember'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  owner_id = excluded.owner_id,
  type = excluded.type,
  is_public = excluded.is_public,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  theme = excluded.theme,
  updated_at = now();

-- ============================================================================
-- SEED HUBS
-- ============================================================================

insert into public.hubs (
  network_id,
  name,
  slug,
  description,
  tagline,
  hub_kind,
  icon_emoji
)
select
  n.id,
  'Emberfall',
  'emberfall',
  'Fire Warden builds, boss strategies, beginner paths, and patch-aware guides.',
  'Forge your path through flame and ruin.',
  'game',
  '🔥'
from public.networks n
where n.slug = 'questline'
on conflict (network_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  tagline = excluded.tagline,
  hub_kind = excluded.hub_kind,
  icon_emoji = excluded.icon_emoji,
  updated_at = now();

insert into public.hubs (
  network_id,
  name,
  slug,
  description,
  tagline,
  hub_kind,
  icon_emoji
)
select
  n.id,
  'StarFall Outriders',
  'starfall-outriders',
  'Sci-fi loadouts, squad tactics, mission strategies, and seasonal updates.',
  'Chart the frontier beyond the last signal.',
  'game',
  '⭐'
from public.networks n
where n.slug = 'questline'
on conflict (network_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  tagline = excluded.tagline,
  hub_kind = excluded.hub_kind,
  icon_emoji = excluded.icon_emoji,
  updated_at = now();

-- ============================================================================
-- SEED COLLECTIONS
-- ============================================================================

insert into public.collections (
  hub_id,
  name,
  slug,
  description,
  default_guide_type,
  icon_name
)
select
  h.id,
  'Character Builds',
  'character-builds',
  'Optimized build guides for different roles, playstyles, and patches.',
  'build',
  'swords'
from public.hubs h
where h.slug = 'emberfall'
on conflict (hub_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  default_guide_type = excluded.default_guide_type,
  icon_name = excluded.icon_name,
  updated_at = now();

insert into public.collections (
  hub_id,
  name,
  slug,
  description,
  default_guide_type,
  icon_name
)
select
  h.id,
  'Boss Strategies',
  'boss-strategies',
  'Structured boss guides covering phases, mechanics, positioning, and common mistakes.',
  'strategy',
  'shield'
from public.hubs h
where h.slug = 'emberfall'
on conflict (hub_id, slug) do update
set
  name = excluded.name,
  description = excluded.description,
  default_guide_type = excluded.default_guide_type,
  icon_name = excluded.icon_name,
  updated_at = now();

-- ============================================================================
-- SEED FORGE RULES
-- ============================================================================

insert into public.forge_rules (
  name,
  label,
  description,
  category
)
values
  (
    'game_name_present',
    'Game Name Present',
    'Guide must be associated with a specific hub/game through metadata, tags, summary, or title.',
    'metadata'
  ),
  (
    'descriptive_title',
    'Descriptive Title',
    'Guide title must be specific enough to explain what the reader will get.',
    'content'
  ),
  (
    'has_summary',
    'Has Summary',
    'Guide must include a meaningful summary explaining scope and audience.',
    'content'
  ),
  (
    'patch_version',
    'Patch/Version',
    'Guide should specify the patch, version, release, or applicability window.',
    'metadata'
  ),
  (
    'has_sections',
    'Has Sections',
    'Guide must include structured sections or steps.',
    'structure'
  ),
  (
    'spoiler_tagging',
    'Spoiler Tagging',
    'Guides with major spoilers should clearly mark spoiler content.',
    'formatting'
  ),
  (
    'difficulty_rating',
    'Difficulty Rating',
    'Guide should specify an appropriate difficulty level.',
    'metadata'
  ),
  (
    'requirements_listed',
    'Requirements Listed',
    'Guide should list requirements, prerequisites, tools, level, gear, or other needed context.',
    'metadata'
  ),
  (
    'guide_status_clear',
    'Status Clear',
    'Guide should clearly indicate whether it is draft, ready, published, archived, current, or outdated.',
    'metadata'
  )
on conflict (name) do update
set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  updated_at = now();

-- ============================================================================
-- CONNECT QUESTLINE TO FORGE RULES
-- ============================================================================

insert into public.network_forge_rules (
  network_id,
  forge_rule_id,
  enabled,
  required,
  display_order
)
select
  n.id,
  fr.id,
  true,
  case fr.name
    when 'game_name_present' then true
    when 'descriptive_title' then true
    when 'has_summary' then true
    when 'patch_version' then false
    when 'has_sections' then true
    when 'spoiler_tagging' then false
    when 'difficulty_rating' then false
    when 'requirements_listed' then false
    when 'guide_status_clear' then true
    else false
  end as required,
  case fr.name
    when 'game_name_present' then 1
    when 'descriptive_title' then 2
    when 'has_summary' then 3
    when 'patch_version' then 4
    when 'has_sections' then 5
    when 'spoiler_tagging' then 6
    when 'difficulty_rating' then 7
    when 'requirements_listed' then 8
    when 'guide_status_clear' then 9
    else 99
  end as display_order
from public.networks n
cross join public.forge_rules fr
where n.slug = 'questline'
on conflict (network_id, forge_rule_id) do update
set
  enabled = excluded.enabled,
  required = excluded.required,
  display_order = excluded.display_order,
  updated_at = now();

-- ============================================================================
-- OPTIONAL TEST GUIDE
-- ============================================================================
-- This section is intentionally commented out.
-- Uncomment only if you want one starter draft guide in Supabase immediately.

/*
insert into public.guides (
  collection_id,
  title,
  slug,
  summary,
  type,
  difficulty,
  version,
  author_id,
  status,
  verification_status
)
select
  c.id,
  'Best Fire Warden Beginner Build',
  'best-fire-warden-beginner-build',
  'Learn the fundamentals of playing Fire Warden in Emberfall, including starter ability priorities, gear direction, and beginner-friendly rotation tips.',
  'build',
  'beginner',
  'Patch 4.2',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'draft',
  'unverified'
from public.collections c
join public.hubs h on h.id = c.hub_id
where h.slug = 'emberfall'
  and c.slug = 'character-builds'
on conflict (collection_id, slug) do nothing;

insert into public.guide_steps (
  guide_id,
  title,
  body,
  kind,
  order_index
)
select
  g.id,
  'Overview',
  'This build focuses on safe early progression, simple ability timing, and a forgiving setup for new Fire Warden players.',
  'intro',
  1
from public.guides g
where g.slug = 'best-fire-warden-beginner-build'
on conflict (guide_id, order_index) do nothing;

insert into public.guide_steps (
  guide_id,
  title,
  body,
  kind,
  order_index
)
select
  g.id,
  'Core Rotation',
  'Open with Flame Strike, maintain Blaze Armor during pressure windows, and use Inferno when enemies are grouped or boss adds appear.',
  'section',
  2
from public.guides g
where g.slug = 'best-fire-warden-beginner-build'
on conflict (guide_id, order_index) do nothing;
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these manually after seed if needed.
--
-- select count(*) as profiles_count from public.profiles;
-- select count(*) as networks_count from public.networks;
-- select count(*) as hubs_count from public.hubs;
-- select count(*) as collections_count from public.collections;
-- select count(*) as forge_rules_count from public.forge_rules;
-- select count(*) as network_forge_rules_count from public.network_forge_rules;