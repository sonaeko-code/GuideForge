-- GuideForge Phase 1 Schema
-- MVP focus: Draft persistence for authenticated users
-- Does NOT replace public QuestLine guides yet (Phase 2)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles: Minimal user data, aligned with Supabase auth.users
-- Created first to be referenced by other tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  handle TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Networks: Top-level namespace (e.g., QuestLine, future Techsperts)
CREATE TABLE IF NOT EXISTS public.networks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'gaming' CHECK (type IN ('gaming', 'repair', 'sop', 'training', 'community')),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Hubs: Collections within a network (e.g., Emberfall, StarFall Outriders)
CREATE TABLE IF NOT EXISTS public.hubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(network_id, slug)
);

-- Collections: Categories within a hub (e.g., Character Builds, Boss Strategies)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hub_id UUID NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(hub_id, slug)
);

-- Guides: The main content entity (drafts, published, archived)
-- NOTE: latest_check_run_id FK added later after forge_rule_check_runs table exists
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  type TEXT NOT NULL DEFAULT 'guide' CHECK (type IN ('guide', 'build', 'strategy', 'quest', 'custom')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  version TEXT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'archived')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'rules_passed', 'reviewed', 'forge_verified', 'forged')),
  latest_check_run_id UUID, -- FK added as constraint after table creation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(collection_id, slug)
);

-- Guide Steps: Individual sections/steps within a guide
CREATE TABLE IF NOT EXISTS public.guide_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'section' CHECK (kind IN ('intro', 'section', 'tip', 'warning', 'summary')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(guide_id, order_index)
);

-- ============================================================================
-- FORGE RULES SYSTEM
-- ============================================================================

-- Forge Rules: Global quality standards (name, description, category)
CREATE TABLE IF NOT EXISTS public.forge_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('content', 'metadata', 'formatting', 'verification')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Network Forge Rules: Per-network configuration (which rules apply, are required, order)
CREATE TABLE IF NOT EXISTS public.network_forge_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  network_id UUID NOT NULL REFERENCES public.networks(id) ON DELETE CASCADE,
  forge_rule_id UUID NOT NULL REFERENCES public.forge_rules(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(network_id, forge_rule_id)
);

-- Forge Rule Check Runs: Track validation sessions with content hash for staleness
CREATE TABLE IF NOT EXISTS public.forge_rule_check_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  content_hash TEXT, -- Hash of title+summary+version+steps for staleness detection
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Forge Rule Check Results: Individual rule results per check run
CREATE TABLE IF NOT EXISTS public.forge_rule_check_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_run_id UUID NOT NULL REFERENCES public.forge_rule_check_runs(id) ON DELETE CASCADE,
  forge_rule_id UUID NOT NULL REFERENCES public.forge_rules(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(check_run_id, forge_rule_id)
);

-- Generation Events: Track AI-generated guide events (optional, low-risk)
CREATE TABLE IF NOT EXISTS public.generation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- ADD DEFERRED FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add FK for latest_check_run_id now that forge_rule_check_runs exists
ALTER TABLE public.guides
ADD CONSTRAINT fk_guides_latest_check_run_id 
FOREIGN KEY (latest_check_run_id) REFERENCES public.forge_rule_check_runs(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_profiles_handle ON public.profiles(handle);
CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE INDEX idx_networks_owner_id ON public.networks(owner_id);
CREATE INDEX idx_networks_slug ON public.networks(slug);

CREATE INDEX idx_hubs_network_id ON public.hubs(network_id);
CREATE INDEX idx_hubs_slug ON public.hubs(slug);

CREATE INDEX idx_collections_hub_id ON public.collections(hub_id);
CREATE INDEX idx_collections_slug ON public.collections(slug);

CREATE INDEX idx_guides_collection_id ON public.guides(collection_id);
CREATE INDEX idx_guides_author_id ON public.guides(author_id);
CREATE INDEX idx_guides_status ON public.guides(status);
CREATE INDEX idx_guides_verification_status ON public.guides(verification_status);
CREATE INDEX idx_guides_latest_check_run_id ON public.guides(latest_check_run_id);

CREATE INDEX idx_guide_steps_guide_id ON public.guide_steps(guide_id);
CREATE INDEX idx_guide_steps_order ON public.guide_steps(guide_id, order_index);

CREATE INDEX idx_network_forge_rules_network_id ON public.network_forge_rules(network_id);
CREATE INDEX idx_network_forge_rules_forge_rule_id ON public.network_forge_rules(forge_rule_id);

CREATE INDEX idx_forge_rule_check_runs_guide_id ON public.forge_rule_check_runs(guide_id);
CREATE INDEX idx_forge_rule_check_runs_checked_at ON public.forge_rule_check_runs(checked_at);

CREATE INDEX idx_forge_rule_check_results_check_run_id ON public.forge_rule_check_results(check_run_id);

CREATE INDEX idx_generation_events_guide_id ON public.generation_events(guide_id);
CREATE INDEX idx_generation_events_status ON public.generation_events(status);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_networks_updated_at BEFORE UPDATE ON public.networks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hubs_updated_at BEFORE UPDATE ON public.hubs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON public.guides
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guide_steps_updated_at BEFORE UPDATE ON public.guide_steps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forge_rules_updated_at BEFORE UPDATE ON public.forge_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_forge_rules_updated_at BEFORE UPDATE ON public.network_forge_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_forge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_rule_check_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_rule_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view all, edit own
CREATE POLICY "Profiles are viewable by all" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Networks: Public networks viewable by all, private only by owner/admin
CREATE POLICY "Public networks viewable by all" ON public.networks
FOR SELECT USING (is_public = true OR owner_id = auth.uid());

CREATE POLICY "Users can create networks" ON public.networks
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Network owners can update" ON public.networks
FOR UPDATE USING (owner_id = auth.uid());

-- Hubs: Inherit visibility from parent network
CREATE POLICY "Hubs viewable by all (via network visibility)" ON public.hubs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.networks WHERE id = hub_id AND (is_public OR owner_id = auth.uid()))
);

-- Collections, Guides, Guide Steps: Inherit visibility from hub
CREATE POLICY "Collections viewable by all (via network visibility)" ON public.collections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.hubs h 
    JOIN public.networks n ON h.network_id = n.id 
    WHERE h.id = collection_id AND (n.is_public OR n.owner_id = auth.uid())
  )
);

CREATE POLICY "Guides viewable by all if published, drafts only by author" ON public.guides
FOR SELECT USING (
  status = 'published' OR author_id = auth.uid()
);

CREATE POLICY "Authors can update own drafts" ON public.guides
FOR UPDATE USING (author_id = auth.uid() AND status = 'draft');

CREATE POLICY "Guide steps visible with parent guide" ON public.guide_steps
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.guides 
    WHERE id = guide_id AND (status = 'published' OR author_id = auth.uid())
  )
);

-- Forge Rules: Viewable by all
CREATE POLICY "Forge rules viewable by all" ON public.forge_rules
FOR SELECT USING (true);

-- Network Forge Rules: Viewable by all, edited by network owner only
CREATE POLICY "Network forge rules viewable by all" ON public.network_forge_rules
FOR SELECT USING (true);

CREATE POLICY "Network owners can manage forge rules" ON public.network_forge_rules
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.networks WHERE id = network_id AND owner_id = auth.uid())
);

-- Check Runs & Results: Authors can view own, admins can view all
CREATE POLICY "Users can view own check runs" ON public.forge_rule_check_runs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.guides WHERE id = guide_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Users can view own check results" ON public.forge_rule_check_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.forge_rule_check_runs fcr
    JOIN public.guides g ON fcr.guide_id = g.id
    WHERE fcr.id = check_run_id AND g.author_id = auth.uid()
  )
);

-- Generation Events: Authors can view own
CREATE POLICY "Users can view own generation events" ON public.generation_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.guides WHERE id = guide_id AND author_id = auth.uid()
  )
);
