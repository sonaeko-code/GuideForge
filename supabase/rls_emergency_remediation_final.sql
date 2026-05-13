-- ============================================================================
-- CORRECTED EMERGENCY RLS REMEDIATION with SECURITY DEFINER Functions
-- ============================================================================
-- 
-- RECURSION FIX EXPLANATION:
-- 
-- Problem: Policies ON public.network_members that directly query 
-- public.network_members in their USING/WITH CHECK clauses will trigger 
-- infinite recursion, because evaluating the policy itself causes 
-- another policy evaluation.
--
-- Solution: Create SECURITY DEFINER helper functions that can query 
-- public.network_members without triggering RLS policies. When a policy 
-- calls a SECURITY DEFINER function, the function executes with the 
-- function owner's privileges and bypasses RLS entirely. This allows 
-- safe membership checks.
--
-- Why SECURITY DEFINER is safe here:
-- - Functions are created BY and owned by the schema owner (postgres/superuser)
-- - Policies call these functions (they don't directly query network_members)
-- - The functions execute with owner privileges, bypassing RLS recursion
-- - Functions return boolean or uuid[] only (no data leakage)
-- - search_path is set to 'public' explicitly for safety
--
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Function: Check if user is a member of a network
-- Returns true if user exists in network_members with any role for given network
CREATE OR REPLACE FUNCTION public.is_network_member(p_network_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM network_members
    WHERE network_id = p_network_id
    AND user_id = auth.uid()
  )
$$;

-- Function: Check if user has any of the specified roles in a network
-- Returns true if user's canonical_role is in the provided roles array
CREATE OR REPLACE FUNCTION public.has_network_role(p_network_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM network_members
    WHERE network_id = p_network_id
    AND user_id = auth.uid()
    AND canonical_role = ANY(p_roles)
  )
$$;

-- ============================================================================
-- ENABLE RLS on all 4 governance tables
-- ============================================================================

ALTER TABLE IF EXISTS public.network_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_publish_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- network_role_definitions: Admin-only access (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "network_role_definitions_select_by_admin" ON public.network_role_definitions;
CREATE POLICY "network_role_definitions_select_by_admin"
ON public.network_role_definitions
FOR SELECT
USING (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "network_role_definitions_insert_admin_only" ON public.network_role_definitions;
CREATE POLICY "network_role_definitions_insert_admin_only"
ON public.network_role_definitions
FOR INSERT
WITH CHECK (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "network_role_definitions_update_admin_only" ON public.network_role_definitions;
CREATE POLICY "network_role_definitions_update_admin_only"
ON public.network_role_definitions
FOR UPDATE
USING (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
)
WITH CHECK (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "network_role_definitions_delete_admin_only" ON public.network_role_definitions;
CREATE POLICY "network_role_definitions_delete_admin_only"
ON public.network_role_definitions
FOR DELETE
USING (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

-- ============================================================================
-- network_members: Member-visible (via helper), admin-manageable (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "network_members_select_by_membership" ON public.network_members;
CREATE POLICY "network_members_select_by_membership"
ON public.network_members
FOR SELECT
USING (
  public.is_network_member(network_id)
);

DROP POLICY IF EXISTS "network_members_insert_admin_only" ON public.network_members;
CREATE POLICY "network_members_insert_admin_only"
ON public.network_members
FOR INSERT
WITH CHECK (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "network_members_update_admin_only" ON public.network_members;
CREATE POLICY "network_members_update_admin_only"
ON public.network_members
FOR UPDATE
USING (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
)
WITH CHECK (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

DROP POLICY IF EXISTS "network_members_delete_admin_only" ON public.network_members;
CREATE POLICY "network_members_delete_admin_only"
ON public.network_members
FOR DELETE
USING (
  public.has_network_role(network_id, ARRAY['owner', 'admin'])
);

-- ============================================================================
-- guide_review_votes: Reviewers+ only (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "guide_review_votes_select_reviewers_only" ON public.guide_review_votes;
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
    AND public.has_network_role(n.id, ARRAY['owner', 'admin', 'reviewer'])
  )
);

DROP POLICY IF EXISTS "guide_review_votes_insert_reviewers_only" ON public.guide_review_votes;
CREATE POLICY "guide_review_votes_insert_reviewers_only"
ON public.guide_review_votes
FOR INSERT
WITH CHECK (
  guide_review_votes.voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.collections c ON c.id = g.collection_id
    JOIN public.hubs h ON h.id = c.hub_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND public.has_network_role(n.id, ARRAY['owner', 'admin', 'reviewer'])
  )
);

DROP POLICY IF EXISTS "guide_review_votes_update_own_only" ON public.guide_review_votes;
CREATE POLICY "guide_review_votes_update_own_only"
ON public.guide_review_votes
FOR UPDATE
USING (voter_id = auth.uid())
WITH CHECK (voter_id = auth.uid());

DROP POLICY IF EXISTS "guide_review_votes_delete_own_or_admin" ON public.guide_review_votes;
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
    AND public.has_network_role(n.id, ARRAY['owner', 'admin'])
  )
);

-- ============================================================================
-- guide_publish_audit: Reviewers+ read-only, immutable (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "guide_publish_audit_select_reviewers_only" ON public.guide_publish_audit;
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
    AND public.has_network_role(n.id, ARRAY['owner', 'admin', 'reviewer'])
  )
);

DROP POLICY IF EXISTS "guide_publish_audit_insert_admin_only" ON public.guide_publish_audit;
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
    AND public.has_network_role(n.id, ARRAY['owner', 'admin'])
  )
);

-- NOTE: guide_publish_audit is immutable - no UPDATE/DELETE policies allowed
-- This ensures audit trail integrity

-- ============================================================================
-- VERIFICATION QUERIES - Run these AFTER executing all SQL above
-- ============================================================================

-- Query 1: Verify RLS is enabled on all 4 tables
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
ORDER BY tablename;

-- Expected output: All 4 tables should have rowsecurity = true

-- Query 2: Count policies on each table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected output:
-- network_role_definitions    | 4
-- network_members             | 4
-- guide_review_votes          | 4
-- guide_publish_audit         | 2

-- Query 3: List all policies with names
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
ORDER BY tablename, cmd, policyname;

-- Query 4: Verify helper functions exist and are SECURITY DEFINER
SELECT 
  proname,
  prosecdef,
  pg_get_functiondef(oid)
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('is_network_member', 'has_network_role')
ORDER BY proname;

-- Expected: Both functions should exist with prosecdef = true

-- Query 5: Verify search_path is set correctly on helper functions
SELECT 
  proname,
  proconfig
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('is_network_member', 'has_network_role')
ORDER BY proname;

-- Expected: Both should have search_path set to 'public'

-- ============================================================================
-- DEPLOYMENT CHECKLIST
-- ============================================================================
-- 
-- After running all SQL above:
--
-- 1. Run Verification Query 1 - Check RLS enabled on all 4 tables
-- 2. Run Verification Query 2 - Check policy counts are correct
-- 3. Run Verification Query 3 - Check all policy names exist
-- 4. Run Verification Query 4 - Check helper functions exist
-- 5. Run Verification Query 5 - Check search_path configuration
-- 6. Go to Supabase Dashboard → Database → Advisors
-- 7. Check "rls_disabled_in_public" alert - should be RESOLVED
--
-- If any verification fails:
-- - Contact support with the query output
-- - Do NOT attempt to modify queries manually
-- - The script can be safely rerun (all DDL is idempotent)
--
-- ============================================================================
