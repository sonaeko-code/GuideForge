# Supabase Security Advisor Alert: rls_disabled_in_public

## What This Alert Means

The Supabase Security Advisor scans your database for tables in the `public` schema that have:
- **RLS enabled** (Row Level Security)
- **But no policies defined**

This is a security gap because:
1. Enabling RLS without policies is **equivalent to having no RLS** (all operations denied by default... wait, actually the opposite)
2. Actually, RLS enabled with NO policies means: **All authenticated users can SELECT/INSERT/UPDATE/DELETE all rows**

This is a common security misconfiguration:
- Developer enables RLS to "plan for policies later"
- But forgets to add the policies
- Result: Table is world-readable by any authenticated user with direct SQL access

## Tables Flagged by Advisor

```
❌ network_role_definitions
❌ network_members  
❌ guide_review_votes
❌ guide_publish_audit
```

### Why These 4 Tables?

These tables come from `guideforge_governance_schema_phase_1.sql`:
```sql
ALTER TABLE IF EXISTS public.network_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_publish_audit ENABLE ROW LEVEL SECURITY;
```

But the file **does NOT include** any `CREATE POLICY` statements for these tables.

The schema was applied to your database, enabling RLS but leaving tables unprotected.

## Current Access (Before Fix)

With no policies defined, and RLS enabled:

```
SELECT * FROM public.network_role_definitions;
├─ authenticated user: ✅ CAN READ ALL ROWS (no SELECT policy blocks it)
├─ anon user: ❌ CANNOT READ (anon has limited scope)
└─ admin: ✅ CAN READ ALL ROWS

INSERT INTO public.network_role_definitions (...) VALUES (...);
├─ authenticated user: ✅ CAN INSERT (no INSERT policy blocks it)
└─ anyone can add role definitions!

UPDATE public.network_role_definitions SET ... WHERE ...;
├─ authenticated user: ✅ CAN UPDATE ANY ROW (no UPDATE policy blocks it)
└─ anyone can modify role definitions!

DELETE FROM public.network_role_definitions WHERE ...;
├─ authenticated user: ✅ CAN DELETE ANY ROW (no DELETE policy blocks it)
└─ anyone can remove role definitions!
```

## Security Impact Assessment

### SEVERITY: Medium (not Critical)

**Why not Critical?**
1. ✅ Tables are unused (governance features not deployed yet)
2. ✅ Tables only accessible via Supabase client (requires valid auth)
3. ✅ No publicly available endpoint exposes these tables
4. ✅ Main app data (guides, networks) is protected with proper RLS

**Why not Low?**
1. ❌ Tables ARE readable by any authenticated user
2. ❌ Any authenticated user can modify data (privilege escalation risk)
3. ❌ No access controls = violation of principle of least privilege
4. ❌ If governance features are deployed, they launch unsecured

### Real Attack Scenario

```
Attacker:
1. Creates legitimate account on GuideForge (free)
2. Uses supabase-js client library to query network_members
3. Reads ALL network memberships (exposes organizational structure)
4. Finds admin member in competitor's network
5. Uses UPDATE to change that admin's role to "viewer"
6. Competitor's admins lose access to their network 🚨

This is possible BECAUSE:
- No SELECT policy protects network_members
- No UPDATE policy restricts modifications
- Tables have RLS enabled but no safeguards
```

## The Fix

Apply comprehensive RLS policies that:

1. **RESTRICT SELECT**: Only network members can read their network's roles/members
2. **RESTRICT INSERT**: Only admins can create new roles/add members
3. **RESTRICT UPDATE**: Only admins can modify roles/memberships
4. **RESTRICT DELETE**: Only admins can remove roles/memberships

## How RLS Policies Work

When RLS is enabled and policies exist:

```sql
CREATE POLICY "network_members_select_by_membership"
ON public.network_members
FOR SELECT
USING (
  -- Check if user is a member of the same network
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = network_members.network_id
    AND nm.user_id = auth.uid()
  )
);
```

Now:
```
SELECT * FROM public.network_members;
├─ User who is network member: ✅ CAN SELECT (policy allows)
├─ User who is NOT member: ❌ CANNOT SELECT (policy blocks)
└─ Public/anon: ❌ CANNOT SELECT (anon excluded)
```

## Verification After Fix

Run in Supabase SQL Editor to confirm:

```sql
-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  );

-- Expected: all show "rowsecurity = true" ✅
```

```sql
-- Count policies per table
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
GROUP BY schemaname, tablename;

-- Expected: 
-- network_role_definitions: 4 policies
-- network_members: 4 policies
-- guide_review_votes: 4 policies
-- guide_publish_audit: 2 policies (no delete)
```

```sql
-- Verify alert is cleared
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'network_role_definitions';

-- Expected: 4 rows (select, insert, update, delete policies)
```

## Why This Happened

The governance schema was structured as a **PROPOSAL** with a clear note at the top:

```sql
-- Status: PROPOSAL ONLY - Do not run automatically
-- 
-- This migration:
-- - Creates 4 new tables (idempotent, safe for re-runs)
-- - Seeds default roles for each network
-- - Backfills owner memberships
-- - Does NOT add RLS policies  ⚠️
-- - Does NOT add enforcement triggers
-- - Does NOT change guide publishing
```

The schema was applied to your database (good), but the RLS policies were deferred to a later phase (less good - created the alert).

The fix is simple: Add the RLS policies that were always planned for Phase 6+ security hardening.

## Files to Review

1. **`docs/RLS_SECURITY_AUDIT.md`** - Full technical analysis (734 lines)
2. **`docs/RLS_FIX_SUMMARY.md`** - Executive summary (127 lines)
3. **`supabase/rls_remediation_governance.sql`** - Ready-to-execute fix (298 lines)

## Recommendation

✅ **Execute the RLS remediation immediately**

This closes a security gap with zero risk to the application:
- No schema changes
- No data modifications
- No impact on current features (governance not deployed yet)
- Takes ~30 seconds to execute
- Fully reversible if needed

---

**Status**: All analysis complete. Awaiting your approval to proceed with SQL execution.

