# SECURITY DEFINER RLS Fix - Technical Explanation

## Problem: RLS Recursion

When a policy ON table X directly queries table X in its USING/WITH CHECK clause, PostgreSQL must evaluate the policy for that query. But evaluating the policy itself triggers another policy check, which triggers another policy check, and so on—infinite recursion.

```sql
-- UNSAFE - CAUSES RECURSION:
CREATE POLICY "network_members_select" ON network_members
FOR SELECT
USING (
  EXISTS(
    SELECT 1 FROM network_members  -- <-- This query also has policies!
    WHERE network_id = ...
    AND user_id = auth.uid()
  )
);
-- When evaluating the EXISTS subquery, PostgreSQL applies the policy again
-- → Infinite recursion
```

## Solution: SECURITY DEFINER Functions

A SECURITY DEFINER function executes with the privileges of its owner (superuser/schema owner), NOT the calling user. This means the function can query protected tables **without triggering RLS policies**.

```sql
-- SAFE - NO RECURSION:
CREATE FUNCTION is_network_member(p_network_id uuid)
RETURNS boolean
SECURITY DEFINER  -- <-- Function executes as superuser
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM network_members  -- <-- Direct query, no policies applied
    WHERE network_id = p_network_id
    AND user_id = auth.uid()
  )
$$ LANGUAGE sql;

-- Policy calls the function (no direct recursion):
CREATE POLICY "network_members_select" ON network_members
FOR SELECT
USING (is_network_member(network_id));  -- <-- Safe: function bypasses RLS
```

## Why This Is Safe

1. **No data leakage**: Functions return only boolean or arrays of UUIDs, never raw user data
2. **Limited scope**: Functions are specifically designed for the two core checks needed:
   - `is_network_member(uuid)` - Is user in this network?
   - `has_network_role(uuid, text[])` - Does user have these roles?
3. **Controlled privileges**: Only the schema owner (Supabase) can modify these functions
4. **Search path isolation**: Functions explicitly set `SET search_path = 'public'` to prevent injection attacks
5. **No circular dependencies**: Functions exist in the outer scope; policies call them (not the reverse)

## Policy Architecture

### Before (Unsafe)
```
Policy evaluates → Queries network_members directly → Policy evaluates again → ∞
```

### After (Safe)
```
Policy evaluates → Calls is_network_member() → Function queries network_members → Returns boolean → Policy continues
                      (SECURITY DEFINER, bypasses RLS)
```

## Implementation Details

### Helper Function 1: `is_network_member(p_network_id uuid)`
```sql
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
```

**Used by**:
- `network_members_select_by_membership` - Let members see each other
- `guide_review_votes_select` - Base check for reviewer access
- `guide_review_votes_insert` - Base check for voter eligibility

### Helper Function 2: `has_network_role(p_network_id uuid, p_roles text[])`
```sql
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
```

**Used by**:
- All `network_role_definitions` policies (owner/admin only)
- All `network_members` admin mutation policies
- All `guide_review_votes` reviewer checks
- All `guide_publish_audit` reviewer/admin checks

## Correct Guide Join Path

All guide-related policies use:
```
guides.collection_id 
  → collections.id 
  → collections.hub_id 
  → hubs.id 
  → hubs.network_id 
  → networks.id
```

This ensures policies correctly traverse from guides to the network they belong to, then apply role checks via helper functions.

## RLS Policy Summary

| Table | Policies | Logic |
|-------|----------|-------|
| network_role_definitions | 4 | Admin/owner only (SELECT, INSERT, UPDATE, DELETE) |
| network_members | 4 | Members read (via function), admin write (INSERT, UPDATE, DELETE) |
| guide_review_votes | 4 | Reviewers+ read/write (SELECT, INSERT), voter updates/deletes own (UPDATE, DELETE) |
| guide_publish_audit | 2 | Reviewers+ read (SELECT), admin insert (INSERT), immutable |

## Verification

Run all 5 verification queries at the end of the script:
1. Check RLS enabled on all 4 tables
2. Count policies (should be 14 total)
3. List all policies with their commands
4. Verify helper functions exist and are SECURITY DEFINER
5. Verify search_path is set correctly

## Deployment

1. Copy `rls_emergency_remediation_final.sql`
2. Open Supabase → SQL Editor → New Query
3. Paste entire script
4. Click Execute (takes ~30 seconds)
5. Run all 5 verification queries
6. Check Supabase Advisors → "rls_disabled_in_public" should be resolved

## Rollback (if needed)

The script is idempotent and safe to rerun. If something goes wrong:
1. Rerun the script (all DROP POLICY IF EXISTS makes it safe)
2. Or contact Supabase support with the verification query output

All original data remains untouched. Only policies and helper functions are modified.
