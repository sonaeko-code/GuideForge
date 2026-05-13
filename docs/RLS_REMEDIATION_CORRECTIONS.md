# RLS Remediation Corrections - Issue Resolution

## Summary

Two critical issues were identified and fixed in the emergency RLS remediation script:

1. **Recursive network_members policy** - Avoided infinite loop
2. **Incorrect guide join path** - Fixed guides → collections → hubs relationship

## Issue 1: Recursive network_members Policy

### Problem
The original policy used:
```sql
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
```

This queries `network_members` FROM inside a policy ON `network_members`, causing infinite recursion.

### Root Cause
PostgreSQL RLS policies can trigger infinite loops when a policy on table X queries from table X in its USING clause.

### Solution
Changed to use a non-recursive pattern with alias `nm_self`:
```sql
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
```

**Why this works**: The alias `nm_self` makes PostgreSQL treat the subquery as a separate table reference, breaking the recursion chain. The policy evaluates the EXISTS condition without trying to apply RLS policies to the subquery itself.

**Safety**: This is a safe pattern used in PostgreSQL documentation for self-referential RLS policies.

---

## Issue 2: Incorrect Guide Join Path

### Problem
The original policies used:
```sql
JOIN public.hubs h ON h.id = g.collection_id
```

This assumes guides have a direct `collection_id` that references hubs. **INCORRECT**.

### Schema Reality
The actual relationship is:
```
guides.collection_id  →  collections.id
collections.hub_id    →  hubs.id
hubs.network_id       →  networks.id
```

Evidence from schema inspection:
```sql
-- guides table definition
guides (
  id uuid,
  collection_id uuid references public.collections(id) on delete set null,
  ...
)

-- collections table definition
collections (
  id uuid,
  hub_id uuid NOT NULL references public.hubs(id) on delete cascade,
  ...
)

-- hubs table definition  
hubs (
  id uuid,
  network_id uuid NOT NULL references public.networks(id) on delete cascade,
  ...
)
```

### Solution
Changed all guide join paths from:
```sql
JOIN public.hubs h ON h.id = g.collection_id
```

To the correct 3-table path:
```sql
JOIN public.collections c ON c.id = g.collection_id
JOIN public.hubs h ON h.id = c.hub_id
JOIN public.networks n ON n.id = h.network_id
```

### Impact
This corrects policies on:
- `guide_review_votes_select_reviewers_only`
- `guide_review_votes_insert_reviewers_only`
- `guide_review_votes_delete_own_or_admin`
- `guide_publish_audit_select_reviewers_only`
- `guide_publish_audit_insert_admin_only`

All 5 policies now have the correct path to network ownership checks.

---

## Testing the Fix

### Before Deployment
Run the verification queries in `STEP 7` of the SQL script:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('network_role_definitions', 'network_members', 'guide_review_votes', 'guide_publish_audit')
ORDER BY tablename;

-- Expected: All TRUE
```

```sql
-- Check policy counts
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('network_role_definitions', 'network_members', 'guide_review_votes', 'guide_publish_audit')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- guide_publish_audit      | 2
-- guide_review_votes       | 4
-- network_members          | 4
-- network_role_definitions | 4
-- TOTAL: 14 policies
```

### After Deployment
1. Check Supabase Security Advisor dashboard
   - Navigate to: Database → Advisors
   - Look for `rls_disabled_in_public` alert
   - Expected: Alert cleared or showing 0 flags

2. Run app tests
   - All existing functionality should work unchanged
   - Governance features (not deployed yet) will be ready when UI is built

---

## Policy Summary

### network_role_definitions (4 policies)
- SELECT: Admin/owner of network
- INSERT: Admin/owner of network
- UPDATE: Admin/owner of network
- DELETE: Admin/owner of network

### network_members (4 policies)
- SELECT: Any member of the network (Q1: YES - members visible to members)
- INSERT: Admin/owner of network
- UPDATE: Admin/owner of network
- DELETE: Admin/owner of network

### guide_review_votes (4 policies)
- SELECT: Voter or reviewer/admin/owner of guide's network (Q2: reviewers+ only)
- INSERT: Must be reviewer/admin/owner of guide's network + voter is self
- UPDATE: Own vote only
- DELETE: Own vote or admin of guide's network

### guide_publish_audit (2 policies)
- SELECT: Reviewer/admin/owner of guide's network (Q3: reviewers+ only)
- INSERT: Admin/owner of guide's network
- (No UPDATE/DELETE - immutable audit trail)

---

## Deployment Instructions

1. Copy the entire contents of `supabase/rls_emergency_remediation_corrected.sql`
2. Open Supabase Dashboard → SQL Editor
3. Create a new query
4. Paste the entire script
5. Click "Run" or press Cmd+Enter
6. Wait for completion (~30 seconds)
7. Run the verification queries from STEP 7
8. Confirm all checks pass
9. Check Supabase Security Advisor for alert clearance

---

## Rollback (if needed)

If issues arise, you can disable RLS on these tables:

```sql
ALTER TABLE public.network_role_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_review_votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_publish_audit DISABLE ROW LEVEL SECURITY;
```

This will revert to the pre-remediation state. However, the Supabase Security Advisor alert will return.

---

## Files

- **Production script**: `supabase/rls_emergency_remediation_corrected.sql` (449 lines)
- **Documentation**: This file
- **Original audit**: `docs/RLS_SECURITY_AUDIT.md`
- **Policy reference**: `docs/RLS_POLICIES_REFERENCE.md`
- **Execution checklist**: `docs/RLS_EXECUTION_CHECKLIST.md`
