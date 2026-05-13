-- GuideForge Phase 1: Missing Mutation Policies
--
-- Purpose: Add INSERT/UPDATE/DELETE policies to tables that currently have
-- only SELECT policies. These allow authenticated users to create/edit content.
--
-- Status: OPTIONAL - Can be applied after governance policies
-- Why optional: Phase 1 intentionally avoided direct client writes via Vercel/v0
-- 
-- These policies become important when:
-- 1. Building server-side route handlers that accept client requests
-- 2. Migrating from session-storage to Supabase persistence
-- 3. Enabling distributed editing (multiple editors on same network)
--
-- NOTE: This file is provided for reference. Do not execute yet.
-- We recommend starting with governance table RLS first, then evaluating
-- whether direct client writes are needed for your use case.
--
-- ============================================================================

-- ============================================================================
-- NETWORKS: Mutations for network creators/owners
-- ============================================================================

-- Network creators can insert new networks
-- Constraint: owner_id must match current user (no privilege escalation)
CREATE POLICY "networks_insert_by_creator"
ON public.networks
FOR INSERT
WITH CHECK (
  -- User must be creating a network they own
  owner_id = auth.uid()
);

-- Network owners can update their networks
-- Constraint: Can only modify own networks
CREATE POLICY "networks_update_by_owner"
ON public.networks
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Network owners can delete their networks (cascades to hubs/collections/guides)
-- Constraint: Can only delete own networks
CREATE POLICY "networks_delete_by_owner"
ON public.networks
FOR DELETE
USING (owner_id = auth.uid());

-- ============================================================================
-- HUBS: Mutations for network owners/admins
-- ============================================================================

-- Network owners/admins can create hubs in their network
CREATE POLICY "hubs_insert_by_network_admin"
ON public.hubs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = hubs.network_id
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

-- Network owners/admins can update hubs in their network
CREATE POLICY "hubs_update_by_network_admin"
ON public.hubs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = hubs.network_id
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

-- Network owners/admins can delete hubs in their network
CREATE POLICY "hubs_delete_by_network_admin"
ON public.hubs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = hubs.network_id
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

-- ============================================================================
-- COLLECTIONS: Mutations for network owners/admins
-- ============================================================================

-- Network owners/admins can create collections in their hubs
CREATE POLICY "collections_insert_by_network_admin"
ON public.collections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    WHERE h.id = collections.hub_id
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

-- Network owners/admins can update collections
CREATE POLICY "collections_update_by_network_admin"
ON public.collections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    WHERE h.id = collections.hub_id
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

-- Network owners/admins can delete collections
CREATE POLICY "collections_delete_by_network_admin"
ON public.collections
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    WHERE h.id = collections.hub_id
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

-- ============================================================================
-- GUIDES: Mutations for contributors/reviewers
-- ============================================================================

-- Contributors can create new guides (draft status)
-- Constraint: author_id must be current user
CREATE POLICY "guides_insert_by_contributor"
ON public.guides
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    JOIN public.collections c ON c.hub_id = h.id
    WHERE c.id = guides.collection_id
    AND (
      EXISTS (
        SELECT 1 FROM public.network_members nm
        WHERE nm.network_id = n.id
        AND nm.user_id = auth.uid()
        AND nm.canonical_role IN ('owner', 'admin', 'contributor', 'reviewer')
      )
      OR n.owner_id = auth.uid()
    )
  )
);

-- Authors can update their own draft guides
-- Admins can update any guide
CREATE POLICY "guides_update_by_author_or_admin"
ON public.guides
FOR UPDATE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    WHERE h.id = (
      SELECT hub_id FROM public.collections WHERE id = guides.collection_id
    )
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

-- Authors can delete their own draft guides; admins can delete any guide
CREATE POLICY "guides_delete_by_author_or_admin"
ON public.guides
FOR DELETE
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.hubs h
    JOIN public.networks n ON n.id = h.network_id
    WHERE h.id = (
      SELECT hub_id FROM public.collections WHERE id = guides.collection_id
    )
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
-- GUIDE_STEPS: Mutations for guide authors/admins
-- ============================================================================

-- Guide authors can add/edit/delete steps in their guides
-- Admins can edit any guide's steps
CREATE POLICY "guide_steps_insert_by_author_or_admin"
ON public.guide_steps
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.guides g
    WHERE g.id = guide_steps.guide_id
    AND (
      g.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.hubs h
        JOIN public.networks n ON n.id = h.network_id
        WHERE h.id = (
          SELECT hub_id FROM public.collections WHERE id = g.collection_id
        )
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
    )
  )
);

CREATE POLICY "guide_steps_update_by_author_or_admin"
ON public.guide_steps
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.guides g
    WHERE g.id = guide_steps.guide_id
    AND (
      g.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.hubs h
        JOIN public.networks n ON n.id = h.network_id
        WHERE h.id = (
          SELECT hub_id FROM public.collections WHERE id = g.collection_id
        )
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
    )
  )
);

CREATE POLICY "guide_steps_delete_by_author_or_admin"
ON public.guide_steps
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.guides g
    WHERE g.id = guide_steps.guide_id
    AND (
      g.author_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.hubs h
        JOIN public.networks n ON n.id = h.network_id
        WHERE h.id = (
          SELECT hub_id FROM public.collections WHERE id = g.collection_id
        )
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
    )
  )
);

-- ============================================================================
-- NETWORK_FORGE_RULES: Admin-only mutations
-- ============================================================================

-- Network owners/admins can configure forge rules for their network
CREATE POLICY "network_forge_rules_insert_by_network_admin"
ON public.network_forge_rules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = network_forge_rules.network_id
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

CREATE POLICY "network_forge_rules_update_by_network_admin"
ON public.network_forge_rules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = network_forge_rules.network_id
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

CREATE POLICY "network_forge_rules_delete_by_network_admin"
ON public.network_forge_rules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.networks n
    WHERE n.id = network_forge_rules.network_id
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

-- ============================================================================
-- NOTE ON FORGE_RULES, CHECK_RUNS, CHECK_RESULTS, GENERATION_EVENTS
--
-- These tables are system-managed and should NOT have direct client writes:
-- 
-- - forge_rules: System lookup table. Read-only for clients.
--   Writes via backend admin panel only.
--
-- - forge_rule_check_runs & forge_rule_check_results: Generated by backend
--   during guide validation. No client writes. System-only.
--
-- - generation_events: Logged by backend during AI generation.
--   No client writes. System-only.
--
-- DO NOT create INSERT/UPDATE/DELETE policies for these tables.
-- They should have only SELECT policies, which are already in place.
-- If backend needs to write, use service_role client (not session user).
-- ============================================================================

