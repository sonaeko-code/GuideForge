-- GuideForge RLS Security Remediation SQL
-- 
-- Purpose: Fix Supabase Security Advisor alert "rls_disabled_in_public"
-- Status: READY FOR REVIEW - Do not execute until approved
-- 
-- This script:
-- 1. Enables RLS on 4 governance tables that currently have no policies
-- 2. Adds comprehensive SELECT/INSERT/UPDATE/DELETE policies
-- 3. Does NOT modify existing table structures
-- 4. Does NOT weaken any existing security
-- 5. Is fully reversible (all policies can be dropped if needed)
--
-- Execution time: ~30 seconds
-- Rollback: DROP POLICY statements for each policy below
--
-- ============================================================================
-- PHASE A: ENABLE RLS ON GOVERNANCE TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.network_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_publish_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE B: network_role_definitions POLICIES
--
-- Role definitions are admin-only. Only owners/admins of a network
-- should be able to manage what roles exist in their network.
-- ============================================================================

-- SELECT: Only network owners/admins can read role definitions
CREATE POLICY "network_role_definitions_select_by_membership"
ON public.network_role_definitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_role_definitions.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- INSERT: Only network owners/admins can create new role definitions
CREATE POLICY "network_role_definitions_insert_admin_only"
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
        AND nm.canonical_role = 'admin'
      )
    )
  )
);

-- UPDATE: Only network owners/admins can modify role definitions
CREATE POLICY "network_role_definitions_update_admin_only"
ON public.network_role_definitions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_role_definitions.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- DELETE: Only network owners/admins can remove role definitions
CREATE POLICY "network_role_definitions_delete_admin_only"
ON public.network_role_definitions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_role_definitions.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PHASE C: network_members POLICIES
--
-- Network membership is sensitive. Members of a network should be visible
-- only to other members. Only admins can modify memberships.
-- ============================================================================

-- SELECT: Network members can see other members in the same network
CREATE POLICY "network_members_select_by_membership"
ON public.network_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_members.network_id
    AND nm.user_id = auth.uid()
  )
);

-- INSERT: Only network owners/admins can add new members
CREATE POLICY "network_members_insert_admin_only"
ON public.network_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_members.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- UPDATE: Only network owners/admins can change member roles
CREATE POLICY "network_members_update_admin_only"
ON public.network_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_members.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- DELETE: Only network owners/admins can remove members
CREATE POLICY "network_members_delete_admin_only"
ON public.network_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_members.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);

-- ============================================================================
-- PHASE D: guide_review_votes POLICIES
--
-- Review votes are internal governance. Reviewers+ can vote and see votes.
-- Voters can always see their own votes. Public cannot see votes.
-- ============================================================================

-- SELECT: Reviewers+ in the guide's network can see all votes; voters see own votes
CREATE POLICY "guide_review_votes_select_reviewers_only"
ON public.guide_review_votes
FOR SELECT
USING (
  voter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
);

-- INSERT: Only reviewers+ can vote
CREATE POLICY "guide_review_votes_insert_reviewers_only"
ON public.guide_review_votes
FOR INSERT
WITH CHECK (
  guide_review_votes.voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
);

-- UPDATE: Only the voter can update their own vote
CREATE POLICY "guide_review_votes_update_own_only"
ON public.guide_review_votes
FOR UPDATE
USING (voter_id = auth.uid())
WITH CHECK (voter_id = auth.uid());

-- DELETE: Voters can delete own votes; admins can delete any vote
CREATE POLICY "guide_review_votes_delete_own_or_admin"
ON public.guide_review_votes
FOR DELETE
USING (
  voter_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin')
    )
  )
);

-- ============================================================================
-- PHASE E: guide_publish_audit POLICIES
--
-- Publish audit trails are internal governance. Only reviewers+ can see.
-- Writes should happen via backend functions only, but we restrict INSERT.
-- ============================================================================

-- SELECT: Only reviewers+ can see publish audit history
CREATE POLICY "guide_publish_audit_select_reviewers_only"
ON public.guide_publish_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_publish_audit.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
);

-- INSERT: Only admins can insert audit records (should be backend-only)
CREATE POLICY "guide_publish_audit_insert_admin_only"
ON public.guide_publish_audit
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_publish_audit.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin')
    )
  )
);

-- NOTE: guide_publish_audit is immutable - no UPDATE or DELETE policies
-- This ensures audit trail cannot be tampered with

-- ============================================================================
-- VERIFICATION QUERIES (run after execution)
-- ============================================================================
--
-- Check that RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN (
--   'network_role_definitions', 'network_members', 
--   'guide_review_votes', 'guide_publish_audit'
-- );
--
-- Count policies on each table:
-- SELECT schemaname, tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN (
--   'network_role_definitions', 'network_members',
--   'guide_review_votes', 'guide_publish_audit'
-- )
-- GROUP BY schemaname, tablename
-- ORDER BY tablename;
--
-- Expected output: 4 policies for each table
--   network_role_definitions: 4 (select, insert, update, delete)
--   network_members: 4 (select, insert, update, delete)
--   guide_review_votes: 4 (select, insert, update, delete)
--   guide_publish_audit: 2 (select, insert) [no delete/update]

