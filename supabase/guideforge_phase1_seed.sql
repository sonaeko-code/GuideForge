-- GuideForge Phase 1 Seed Data
-- Starter data for development and manual testing
-- This assumes one seeded dev profile owns the test network

-- ============================================================================
-- SEED PROFILES
-- ============================================================================

-- Dev Profile: Represents a test user
-- UUID chosen for consistency: 550e8400-e29b-41d4-a716-446655440000
-- (Does not require real Supabase Auth user - for Phase 1 testing only)
INSERT INTO public.profiles (id, display_name, handle, bio, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Dev Guide Author',
  'dev_author',
  'Development test profile for GuideForge Phase 1',
  'user'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED NETWORKS
-- ============================================================================

-- QuestLine Network: Main gaming-focused network
INSERT INTO public.networks (name, slug, description, owner_id, type, is_public)
VALUES (
  'QuestLine',
  'questline',
  'Community-driven gaming guides and strategies',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'gaming',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED HUBS
-- ============================================================================

-- Get the QuestLine network ID for foreign key references
-- (In actual seeding, would use the UUID directly)

-- Emberfall Hub: Character builds and strategies
INSERT INTO public.hubs (network_id, name, slug, description, icon_emoji)
SELECT 
  id, 'Emberfall', 'emberfall', 
  'Fire Warden strategies, builds, and boss guides', '🔥'
FROM public.networks
WHERE slug = 'questline'
ON CONFLICT (network_id, slug) DO NOTHING;

-- StarFall Outriders Hub (optional future expansion)
INSERT INTO public.hubs (network_id, name, slug, description, icon_emoji)
SELECT
  id, 'StarFall Outriders', 'starfall-outriders',
  'Sci-fi strategies and loadout guides', '⭐'
FROM public.networks
WHERE slug = 'questline'
ON CONFLICT (network_id, slug) DO NOTHING;

-- ============================================================================
-- SEED COLLECTIONS
-- ============================================================================

-- Character Builds Collection under Emberfall
INSERT INTO public.collections (hub_id, name, slug, description)
SELECT
  id, 'Character Builds', 'character-builds',
  'Optimized builds for different playstyles'
FROM public.hubs
WHERE slug = 'emberfall'
ON CONFLICT (hub_id, slug) DO NOTHING;

-- Boss Strategies Collection under Emberfall
INSERT INTO public.collections (hub_id, name, slug, description)
SELECT
  id, 'Boss Strategies', 'boss-strategies',
  'Step-by-step boss encounter guides'
FROM public.hubs
WHERE slug = 'emberfall'
ON CONFLICT (hub_id, slug) DO NOTHING;

-- ============================================================================
-- SEED FORGE RULES
-- ============================================================================

-- Global Forge Rules: Quality standards for all networks
INSERT INTO public.forge_rules (name, label, description, category)
VALUES
  ('game_name_present', 'Game Name Present', 'Guide must be associated with a specific game or hub', 'metadata'),
  ('descriptive_title', 'Descriptive Title', 'Title must be at least 8 characters and not generic', 'content'),
  ('has_summary', 'Has Summary', 'Summary must be at least 40 characters describing guide scope', 'content'),
  ('patch_version', 'Patch/Version', 'Guide must specify patch or version it applies to', 'metadata'),
  ('has_sections', 'Has Sections', 'Guide must have at least one detailed section', 'content'),
  ('spoiler_tagging', 'Spoiler Tagging', 'Major plot points should be marked as spoilers', 'formatting'),
  ('difficulty_rating', 'Difficulty Rating', 'Guide should specify difficulty level', 'metadata'),
  ('requirements_listed', 'Requirements Listed', 'Prerequisites or level requirements should be noted', 'metadata'),
  ('guide_status_clear', 'Status Clear', 'Guide should indicate if it\'s current, outdated, or WIP', 'metadata')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED NETWORK FORGE RULES
-- ============================================================================

-- QuestLine uses all Forge Rules, with specific requirements
INSERT INTO public.network_forge_rules (network_id, forge_rule_id, enabled, required, display_order)
SELECT
  n.id, fr.id, true, 
  CASE fr.name
    WHEN 'game_name_present' THEN true
    WHEN 'descriptive_title' THEN true
    WHEN 'has_summary' THEN true
    WHEN 'patch_version' THEN false
    WHEN 'has_sections' THEN true
    WHEN 'spoiler_tagging' THEN false
    WHEN 'difficulty_rating' THEN false
    WHEN 'requirements_listed' THEN false
    WHEN 'guide_status_clear' THEN false
    ELSE false
  END as required,
  ROW_NUMBER() OVER (ORDER BY fr.name)::integer
FROM public.networks n
CROSS JOIN public.forge_rules fr
WHERE n.slug = 'questline'
ON CONFLICT (network_id, forge_rule_id) DO NOTHING;

-- ============================================================================
-- OPTIONAL: SEED STARTER GUIDES (commented out by default)
-- ============================================================================

-- Uncomment these to seed example draft guides for testing

/*
-- Example Draft Guide: Fire Warden Beginner Build
INSERT INTO public.guides (collection_id, title, slug, summary, type, difficulty, version, author_id, status, verification_status)
SELECT
  c.id, 
  'Fire Warden Beginner Build',
  'fire-warden-beginner-build',
  'Learn the fundamentals of playing Fire Warden in Emberfall. This guide covers basic ability rotations, stat priorities, and early-game gear recommendations for new players.',
  'build',
  'beginner',
  'Patch 4.2',
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'draft',
  'unverified'
FROM public.collections c
WHERE c.slug = 'character-builds'
LIMIT 1;

-- Example Draft Guide Steps
INSERT INTO public.guide_steps (guide_id, title, body, kind, order_index)
SELECT
  g.id,
  'Core Abilities',
  'Fire Warden has three core abilities: Flame Strike (primary), Inferno (AoE), and Blaze Armor (defensive). Start with Flame Strike to learn positioning and timing.',
  'section',
  1
FROM public.guides g
WHERE g.slug = 'fire-warden-beginner-build'
LIMIT 1;

INSERT INTO public.guide_steps (guide_id, title, body, kind, order_index)
SELECT
  g.id,
  'Stat Priority',
  'Stack Intelligence for spell damage, then Vitality for survivability. Intelligence cap is 250 at level 20.',
  'section',
  2
FROM public.guides g
WHERE g.slug = 'fire-warden-beginner-build'
LIMIT 1;
*/

-- ============================================================================
-- VERIFICATION STEPS
-- ============================================================================

-- Verify tables are populated
-- SELECT COUNT(*) as profiles_count FROM public.profiles;
-- SELECT COUNT(*) as networks_count FROM public.networks;
-- SELECT COUNT(*) as forge_rules_count FROM public.forge_rules;
-- SELECT COUNT(*) as network_forge_rules_count FROM public.network_forge_rules;
