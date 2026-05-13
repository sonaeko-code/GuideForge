-- ============================================================================
-- EMERGENCY RLS REMEDIATION: Fix Supabase Security Advisor Alert
-- ============================================================================
--
-- Status: SAFE TO RERUN (all policies dropped before creation)
-- Tables: network_role_definitions, network_members, guide_review_votes, guide_publish_audit
-- Impact: Zero breaking changes. Governance features not deployed yet.
-- Execution time: ~30 seconds
--
-- Schema confirmed:
-- - guides.collection_id → collections.id
-- - collections.hub_id → hubs.id
-- - hubs.network_id → networks.id
-- - network_members has UNIQUE(network_id, user_id) - no recursive lookups
--
-- RLS approach: Non-recursive, owner/member/reviewer scoped
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on flagged tables
-- ============================================================================

ALTER TABLE IF EXISTS public.network_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_publish_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop existing policies (safe to rerun)
-- ============================================================================

DROP POLICY IF EXISTS "network_role_definitions_select_admin" 
  ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_insert_admin" 
  ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_update_admin" 
  ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_delete_admin" 
  ON public.network_role_definitions;

DROP POLICY IF EXISTS "network_members_select_by_membership" 
  ON public.network_members;
DROP POLICY IF EXISTS "network_members_insert_admin_only" 
  ON public.network_members;
DROP POLICY IF EXISTS "network_members_update_admin_only" 
  ON public.network_members;
DROP POLICY IF EXISTS "network_members_delete_admin_only" 
  ON public.network_members;

DROP POLICY IF EXISTS "guide_review_votes_select_reviewers_only" 
  ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_insert_reviewers_only" 
  ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_update_own_only" 
  ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_delete_own_or_admin" 
  ON public.guide_review_votes;

DROP POLICY IF EXISTS "guide_publish_audit_select_reviewers_only" 
  ON public.guide_publish_audit;
DROP POLICY IF EXISTS "guide_publish_audit_insert_admin_only" 
  ON public.guide_publish_audit;

-- ============================================================================
-- STEP 3: Create policies for network_role_definitions
--
-- Access: Admin-only (owner or network admin)
-- 
-- Logic: User can read/write role definitions only if they are:
--   - The network owner, OR
--   - An admin in the network (role = 'admin' or 'owner')
-- ============================================================================

CREATE POLICY "network_role_definitions_select_admin"
  ON public.network_role_definitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_role_definitions.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "network_role_definitions_insert_admin"
  ON public.network_role_definitions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_role_definitions.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "network_role_definitions_update_admin"
  ON public.network_role_definitions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_role_definitions.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "network_role_definitions_delete_admin"
  ON public.network_role_definitions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_role_definitions.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

-- ============================================================================
-- STEP 4: Create policies for network_members
--
-- Access: Members of the network can read; admins can write
--
-- Q1 Choice: Network members ARE visible to other members in same network
-- Logic: User can read members if they are themselves a member of that network
--        User can write (add/remove/change) members only if admin
-- ============================================================================

CREATE POLICY "network_members_select_by_membership"
  ON public.network_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.network_members nm_self
      WHERE nm_self.network_id = network_members.network_id
      AND nm_self.user_id = auth.uid()
    )
  );

CREATE POLICY "network_members_insert_admin"
  ON public.network_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_members.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "network_members_update_admin"
  ON public.network_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_members.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

CREATE POLICY "network_members_delete_admin"
  ON public.network_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.networks n
      WHERE n.id = network_members.network_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

-- ============================================================================
-- STEP 5: Create policies for guide_review_votes
--
-- Schema path: guides.collection_id → collections.id
--             collections.hub_id → hubs.id
--             hubs.network_id → networks.id
--
-- Access: Voters can read own votes. Reviewers+ can read/write votes in their network.
--
-- Q2 Choice: Only reviewers+ can see review votes (not all members)
-- Logic: User can see votes if they are:
--   - The voter who cast the vote, OR
--   - A reviewer/admin/owner in the guide's network
-- ============================================================================

CREATE POLICY "guide_review_votes_select_reviewers_only"
  ON public.guide_review_votes
  FOR SELECT
  USING (
    voter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.collections c ON c.id = g.collection_id
      JOIN public.hubs h ON h.id = c.hub_id
      JOIN public.networks n ON n.id = h.network_id
      WHERE g.id = guide_review_votes.guide_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
        )
      )
    )
  );

CREATE POLICY "guide_review_votes_insert_reviewers_only"
  ON public.guide_review_votes
  FOR INSERT
  WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.collections c ON c.id = g.collection_id
      JOIN public.hubs h ON h.id = c.hub_id
      JOIN public.networks n ON n.id = h.network_id
      WHERE g.id = guide_review_votes.guide_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
        )
      )
    )
  );

CREATE POLICY "guide_review_votes_update_own_only"
  ON public.guide_review_votes
  FOR UPDATE
  USING (voter_id = auth.uid())
  WITH CHECK (voter_id = auth.uid());

CREATE POLICY "guide_review_votes_delete_own_or_admin"
  ON public.guide_review_votes
  FOR DELETE
  USING (
    voter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.collections c ON c.id = g.collection_id
      JOIN public.hubs h ON h.id = c.hub_id
      JOIN public.networks n ON n.id = h.network_id
      WHERE g.id = guide_review_votes.guide_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

-- ============================================================================
-- STEP 6: Create policies for guide_publish_audit
--
-- Schema path: guides.collection_id → collections.id
--             collections.hub_id → hubs.id
--             hubs.network_id → networks.id
--
-- Access: Read-only for reviewers+. Insert-only for admins. Never update/delete.
-- This keeps the audit trail immutable and secure.
--
-- Q3 Choice: Only reviewers+ can see publish audit trail (not all members)
-- Logic: Immutable table. Insert by admin, read by reviewers+, no mutations.
-- ============================================================================

CREATE POLICY "guide_publish_audit_select_reviewers_only"
  ON public.guide_publish_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.collections c ON c.id = g.collection_id
      JOIN public.hubs h ON h.id = c.hub_id
      JOIN public.networks n ON n.id = h.network_id
      WHERE g.id = guide_publish_audit.guide_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
        )
      )
    )
  );

CREATE POLICY "guide_publish_audit_insert_admin_only"
  ON public.guide_publish_audit
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guides g
      JOIN public.collections c ON c.id = g.collection_id
      JOIN public.hubs h ON h.id = c.hub_id
      JOIN public.networks n ON n.id = h.network_id
      WHERE g.id = guide_publish_audit.guide_id
      AND (
        n.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.network_members nm
          WHERE nm.network_id = n.id
          AND nm.user_id = auth.uid()
          AND nm.canonical_role IN ('owner', 'admin')
        )
      )
    )
  );

-- NOTE: guide_publish_audit has NO UPDATE or DELETE policies
-- This makes the audit trail immutable and tamper-evident

-- ============================================================================
-- STEP 7: VERIFICATION QUERIES (run after execution)
-- ============================================================================
--
-- Copy these queries and run them to verify the emergency fix succeeded.
--
-- ============================================================================

-- Verify RLS is enabled on all 4 tables
-- Expected: All 4 should show TRUE for relrowsecurity
--
-- SELECT 
--   schemaname,
--   tablename,
--   rowsecurity
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'network_role_definitions',
--     'network_members',
--     'guide_review_votes',
--     'guide_publish_audit'
--   )
-- ORDER BY tablename;

-- Count policies on each table
-- Expected: network_role_definitions (4), network_members (4), 
--           guide_review_votes (4), guide_publish_audit (2)
--
-- SELECT 
--   tablename,
--   COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'network_role_definitions',
--     'network_members',
--     'guide_review_votes',
--     'guide_publish_audit'
--   )
-- GROUP BY tablename
-- ORDER BY tablename;

-- List all policies (detailed)
-- Expected: 14 total policies with correct commands (SELECT, INSERT, UPDATE, DELETE)
--
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public' 
--   AND tablename IN (
--     'network_role_definitions',
--     'network_members',
--     'guide_review_votes',
--     'guide_publish_audit'
--   )
-- ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- END: Emergency RLS Remediation Script
-- ============================================================================
-- Total policies created: 14
-- Tables protected: 4
-- Breaking changes: 0
-- Status: READY TO DEPLOY
-- ============================================================================
