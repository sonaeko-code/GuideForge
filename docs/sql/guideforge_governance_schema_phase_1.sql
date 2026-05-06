-- GuideForge Governance Schema Phase 1
-- Purpose: Foundation tables for network-scoped roles and guide review voting
-- Status: PROPOSAL ONLY - Do not run automatically
-- 
-- This migration:
-- - Creates 4 new tables (idempotent, safe for re-runs)
-- - Seeds default roles for each network
-- - Backfills owner memberships
-- - Does NOT add RLS policies
-- - Does NOT add enforcement triggers
-- - Does NOT change guide publishing
-- 
-- Tables: network_role_definitions, network_members, guide_review_votes, guide_publish_audit

-- ============================================================================
-- TABLE 1: network_role_definitions
-- 
-- Purpose: Define roles and their permissions within a network
-- 
-- Example roles:
--   - owner: full permissions, can publish, can override votes
--   - admin: can vote, can manage members, can publish
--   - reviewer: can vote on guides, can submit guides
--   - contributor: can submit guides, cannot vote
--   - member: read-only access
--   - viewer: public viewer (future use)
--
-- Canonical roles are system roles (owner, admin, reviewer, etc.)
-- Display names can be customized per network (e.g., "Guildmaster" instead of "Owner")
-- ============================================================================

CREATE TABLE IF NOT EXISTS network_role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to network
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- System role name (normalized, lowercase)
  -- Always one of: owner, admin, reviewer, contributor, member, viewer
  canonical_role text NOT NULL,
  
  -- Human-readable display name for UI
  -- Can be customized per network (e.g., "Guildmaster" for gaming network)
  display_name text NOT NULL,
  
  -- Weight for voting on guide reviews
  -- Used to calculate approve/reject weight sums
  -- Examples: owner=10, admin=5, reviewer=3, contributor=1, member=0
  review_weight integer NOT NULL DEFAULT 0,
  
  -- Permission: can create new guides in this network
  can_submit_guides boolean NOT NULL DEFAULT false,
  
  -- Permission: can vote on guide reviews
  can_vote_on_reviews boolean NOT NULL DEFAULT false,
  
  -- Permission: can manage network members (invite, remove, change roles)
  can_manage_members boolean NOT NULL DEFAULT false,
  
  -- Permission: can bypass review process and publish directly
  -- Used for owner override when consensus is needed quickly
  can_publish_override boolean NOT NULL DEFAULT false,
  
  -- Soft delete flag
  is_active boolean NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(network_id, canonical_role),
  
  -- Ensure canonical_role is valid
  CHECK (canonical_role IN ('owner', 'admin', 'reviewer', 'contributor', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_network_role_definitions_network_id 
  ON network_role_definitions(network_id);

COMMENT ON TABLE network_role_definitions IS 'Per-network role definitions with permissions and voting weights.';
COMMENT ON COLUMN network_role_definitions.canonical_role IS 'System role: owner, admin, reviewer, contributor, member, or viewer.';
COMMENT ON COLUMN network_role_definitions.display_name IS 'UI name, can be customized per network (e.g., Guildmaster).';
COMMENT ON COLUMN network_role_definitions.review_weight IS 'Vote weight in guide reviews. Higher weight = more influence on publish threshold.';

-- ============================================================================
-- TABLE 2: network_members
--
-- Purpose: Map users to networks and their assigned roles
--
-- One row per (network, user) pair.
-- A user can have different roles in different networks.
-- Example: Alice = owner in Network A, contributor in Network B.
-- ============================================================================

CREATE TABLE IF NOT EXISTS network_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to network
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- Foreign key to Supabase auth.users
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- The user's role in this network (references network_role_definitions.canonical_role)
  canonical_role text NOT NULL,
  
  -- Optional: can be different from auth user's display_name
  -- For example, user display_name is "Alice", but in this network they're called "Guildmaster"
  display_name text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(network_id, user_id),
  
  -- Role must exist in network_role_definitions for this network
  FOREIGN KEY (network_id, canonical_role) 
    REFERENCES network_role_definitions(network_id, canonical_role) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_network_members_network_id 
  ON network_members(network_id);
CREATE INDEX IF NOT EXISTS idx_network_members_user_id 
  ON network_members(user_id);
CREATE INDEX IF NOT EXISTS idx_network_members_network_user 
  ON network_members(network_id, user_id);

COMMENT ON TABLE network_members IS 'Users assigned to networks with per-network roles. One row per (network, user) pair.';
COMMENT ON COLUMN network_members.canonical_role IS 'User role in this network. References network_role_definitions(canonical_role).';
COMMENT ON COLUMN network_members.display_name IS 'Optional role display name for this user in this network context.';

-- ============================================================================
-- TABLE 3: guide_review_votes
--
-- Purpose: Store weighted votes on guide reviews
--
-- One row per (guide, voter) pair. User can vote once per guide.
-- Vote is stored with both human context (voter_role) and weight for audit trail.
-- Weight is backend-derived from role, never trusted from frontend.
-- ============================================================================

CREATE TABLE IF NOT EXISTS guide_review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to guide
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  
  -- Foreign key to network (denormalized for convenience)
  network_id uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- Foreign key to Supabase auth.users (the reviewer)
  voter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reviewer's role at time of vote (for audit trail)
  -- Stored to preserve history if role changes later
  voter_role text NOT NULL,
  
  -- Vote type: approve, request_changes, abstain, or needs_clarification
  vote text NOT NULL,
  
  -- Vote weight (derived from voter_role at vote time)
  -- Backend-only, never accepts from frontend
  -- Stored for audit trail so weight history is preserved
  weight integer NOT NULL DEFAULT 0,
  
  -- Optional reviewer notes/justification
  notes text,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(guide_id, voter_id),
  CHECK (vote IN ('approve', 'request_changes', 'abstain', 'needs_clarification'))
);

CREATE INDEX IF NOT EXISTS idx_guide_review_votes_guide_id 
  ON guide_review_votes(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_review_votes_voter_id 
  ON guide_review_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_guide_review_votes_network_id 
  ON guide_review_votes(network_id);
CREATE INDEX IF NOT EXISTS idx_guide_review_votes_created_at 
  ON guide_review_votes(created_at DESC);

COMMENT ON TABLE guide_review_votes IS 'Weighted guide review votes. One row per (guide, voter) pair. Weight is backend-derived.';
COMMENT ON COLUMN guide_review_votes.vote IS 'Vote type: approve, request_changes, abstain, or needs_clarification.';
COMMENT ON COLUMN guide_review_votes.weight IS 'Vote weight derived from voter_role. Backend-only, never from frontend.';
COMMENT ON COLUMN guide_review_votes.voter_role IS 'Role at vote time, for audit trail. Preserved if role changes later.';

-- ============================================================================
-- TABLE 4: guide_publish_audit
--
-- Purpose: Audit trail for guide publish actions
--
-- Records each time a guide is published, with context:
-- - who published it
-- - method (owner_override, threshold_approved, manual)
-- - optional reason
--
-- Used for compliance and debugging.
-- ============================================================================

CREATE TABLE IF NOT EXISTS guide_publish_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to guide (the published guide)
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  
  -- Foreign key to actor (the user who published)
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Foreign key to network (denormalized for convenience)
  network_id uuid REFERENCES networks(id) ON DELETE SET NULL,
  
  -- Publish method/reason
  -- Examples: owner_override, threshold_approved, manual_admin_action, auto_migration
  method text NOT NULL,
  
  -- Optional explanation/context
  reason text,
  
  -- Timestamp (immutable)
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (method IN ('owner_override', 'threshold_approved', 'manual_admin_action', 'auto_migration', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_guide_publish_audit_guide_id 
  ON guide_publish_audit(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_publish_audit_actor_id 
  ON guide_publish_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_guide_publish_audit_network_id 
  ON guide_publish_audit(network_id);
CREATE INDEX IF NOT EXISTS idx_guide_publish_audit_created_at 
  ON guide_publish_audit(created_at DESC);

COMMENT ON TABLE guide_publish_audit IS 'Immutable audit trail of guide publish actions. For compliance and debugging.';
COMMENT ON COLUMN guide_publish_audit.method IS 'How guide was published: owner_override, threshold_approved, etc.';

-- ============================================================================
-- SEED DATA: Default Role Definitions
--
-- For each existing network, insert a standard set of roles.
-- Uses ON CONFLICT DO NOTHING to be idempotent.
-- 
-- Role hierarchy:
-- - owner (level 5): full permissions, can override
-- - admin (level 4): can vote, manage members, publish
-- - reviewer (level 3): can vote, submit guides
-- - contributor (level 2): can submit guides, cannot vote
-- - member (level 1): read-only
-- - viewer (level 0): public viewer (future)
-- ============================================================================

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'owner',
  'Owner',
  10,
  true,
  true,
  true,
  true,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'admin',
  'Admin',
  5,
  true,
  true,
  true,
  false,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'reviewer',
  'Reviewer',
  3,
  true,
  true,
  false,
  false,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'contributor',
  'Contributor',
  1,
  true,
  false,
  false,
  false,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'member',
  'Member',
  0,
  false,
  false,
  false,
  false,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

INSERT INTO network_role_definitions (
  network_id,
  canonical_role,
  display_name,
  review_weight,
  can_submit_guides,
  can_vote_on_reviews,
  can_manage_members,
  can_publish_override,
  is_active
)
SELECT 
  id,
  'viewer',
  'Viewer',
  0,
  false,
  false,
  false,
  false,
  true
FROM networks
ON CONFLICT (network_id, canonical_role) DO NOTHING;

-- ============================================================================
-- BACKFILL: Owner Membership
--
-- For networks where owner_user_id is not null (i.e., user created the network),
-- insert a network_members row to record the owner relationship.
--
-- Uses ON CONFLICT DO NOTHING to be idempotent.
-- If owner already exists in network_members, this is a no-op.
-- ============================================================================

INSERT INTO network_members (
  network_id,
  user_id,
  canonical_role,
  display_name,
  created_at
)
SELECT 
  n.id,
  n.owner_user_id,
  'owner',
  'Owner',
  n.created_at
FROM networks n
WHERE n.owner_user_id IS NOT NULL
ON CONFLICT (network_id, user_id) DO NOTHING;

-- ============================================================================
-- FINAL STATUS
--
-- If this script runs without errors:
-- - network_role_definitions table created with default roles seeded
-- - network_members table created with owners backfilled
-- - guide_review_votes table created (ready for voting UI)
-- - guide_publish_audit table created (ready for publish tracking)
--
-- Nothing else changed:
-- - No RLS policies added (Phase 6+)
-- - No triggers added (Phase 8+)
-- - No guide publishing changed
-- - Existing guides/hubs/collections unaffected
-- - Dashboard continues loading normally
-- - Builder remains non-blocking
--
-- Next steps (manual):
-- 1. Run this migration in your Supabase database
-- 2. Verify tables created: select count(*) from network_role_definitions;
-- 3. Verify owner backfill: select count(*) from network_members;
-- 4. Then proceed to Phase 2 (create voting UI)
-- ============================================================================
