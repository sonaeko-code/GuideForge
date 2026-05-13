# RLS Security Fix - Execution Checklist

## Pre-Execution Review

- [ ] Read `/docs/RLS_SECURITY_AUDIT.md` - Understand what each table stores
- [ ] Read `/docs/RLS_FIX_SUMMARY.md` - Understand the fix strategy
- [ ] Read `/docs/SUPABASE_ADVISOR_ALERT_EXPLAINED.md` - Understand why this matters
- [ ] Confirm understanding of governance table purposes:
  - [ ] `network_role_definitions` - Role definitions per network
  - [ ] `network_members` - Users assigned to networks with roles
  - [ ] `guide_review_votes` - Weighted votes on guide reviews
  - [ ] `guide_publish_audit` - Publish action audit trail

## Questions to Answer Before Execution

**Question 1: Network Member Visibility**
```
Should members of a network be visible to OTHER members?

✅ RECOMMENDED: Yes
   - Members can see roster of who's in their network
   - But NOT members from networks they're not in
   
❌ More Restrictive: No
   - Only admins can see member list
   - Even members can't see each other
```
**Your choice**: _______________

**Question 2: Review Vote Visibility**
```
Who should be able to see guide review votes?

✅ RECOMMENDED: Reviewers+ only (owner, admin, reviewer roles)
   - Keeps internal moderation private
   - Contributors can see their own votes
   
❌ More Open: All network members
   - Transparency in voting
   - But exposes decision-making process
```
**Your choice**: _______________

**Question 3: Publish Audit Visibility**
```
Who should see publish audit trail?

✅ RECOMMENDED: Reviewers+ only (owner, admin, reviewer)
   - Keeps governance/decisions internal
   - Maintains process privacy
   
❌ More Open: All network members
   - Complete transparency
   - But exposes override decisions
```
**Your choice**: _______________

## Current Implementation

The recommended policies are already defined in `/supabase/rls_remediation_governance.sql`:

```
✅ network_role_definitions: Admin-only read/write
✅ network_members: Member roster visible to members; admin-only writes
✅ guide_review_votes: Reviewer+ read; voter own-only write
✅ guide_publish_audit: Reviewer+ read-only; admin insert only
```

If your answers above match the recommendations, proceed to execution.

If you want different visibility rules, let me know and I'll adjust the policies.

## Execution Steps

### Step 1: Backup (Optional but Recommended)

Go to Supabase Dashboard → Backups → Create Backup
- This creates a snapshot in case rollback is needed
- Optional since we're only adding policies (no data changes)

### Step 2: Execute the SQL

In Supabase SQL Editor:

```
1. Copy the entire content of:
   /supabase/rls_remediation_governance.sql

2. Paste into Supabase SQL Editor

3. Click "Run"

4. Should complete in ~10 seconds

5. Watch for any errors (should be none)
```

Expected output:
```
✅ Query executed successfully
(No rows returned)
```

### Step 3: Verification Queries

Run these queries to confirm policies were created:

```sql
-- Query 1: Verify RLS is enabled on all 4 tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
ORDER BY tablename;
```

Expected result:
```
tablename                      | rowsecurity
-----------------------------  | -----------
guide_publish_audit            | true
guide_review_votes             | true
network_members                | true
network_role_definitions       | true
```

```sql
-- Query 2: Count policies per table
SELECT tablename, COUNT(*) as policy_count
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
```

Expected result:
```
tablename                      | policy_count
-----------------------------  | -----------
guide_publish_audit            | 2
guide_review_votes             | 4
network_members                | 4
network_role_definitions       | 4
```

```sql
-- Query 3: List all new policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'network_role_definitions',
    'network_members',
    'guide_review_votes',
    'guide_publish_audit'
  )
ORDER BY tablename, policyname;
```

Expected result:
```
14 rows (4 tables × average 3-4 policies each)

Including:
- network_role_definitions_delete_admin_only
- network_role_definitions_insert_admin_only
- network_role_definitions_select_by_membership
- network_role_definitions_update_admin_only
- network_members_delete_admin_only
- network_members_insert_admin_only
- network_members_select_by_membership
- network_members_update_admin_only
- guide_review_votes_delete_own_or_admin
- guide_review_votes_insert_reviewers_only
- guide_review_votes_select_reviewers_only
- guide_review_votes_update_own_only
- guide_publish_audit_insert_admin_only
- guide_publish_audit_select_reviewers_only
```

### Step 4: Check Supabase Security Advisor

1. Go to Supabase Dashboard → Security
2. Look for "rls_disabled_in_public" alert
3. Should now be ✅ RESOLVED

If still present:
- Wait 5-10 minutes for cache to refresh
- Refresh dashboard
- If still there, run verification queries again

## Post-Execution: App Testing

- [ ] Open app and verify it still loads
- [ ] Navigate to dashboard - should work
- [ ] Create a network - should work  
- [ ] View networks - should work
- [ ] No console errors about permission denied
- [ ] No 401/403 responses from Supabase

## Rollback (If Needed)

If something breaks, you can rollback all policies:

```sql
DROP POLICY IF EXISTS "network_role_definitions_select_by_membership" ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_insert_admin_only" ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_update_admin_only" ON public.network_role_definitions;
DROP POLICY IF EXISTS "network_role_definitions_delete_admin_only" ON public.network_role_definitions;

DROP POLICY IF EXISTS "network_members_select_by_membership" ON public.network_members;
DROP POLICY IF EXISTS "network_members_insert_admin_only" ON public.network_members;
DROP POLICY IF EXISTS "network_members_update_admin_only" ON public.network_members;
DROP POLICY IF EXISTS "network_members_delete_admin_only" ON public.network_members;

DROP POLICY IF EXISTS "guide_review_votes_select_reviewers_only" ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_insert_reviewers_only" ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_update_own_only" ON public.guide_review_votes;
DROP POLICY IF EXISTS "guide_review_votes_delete_own_or_admin" ON public.guide_review_votes;

DROP POLICY IF EXISTS "guide_publish_audit_select_reviewers_only" ON public.guide_publish_audit;
DROP POLICY IF EXISTS "guide_publish_audit_insert_admin_only" ON public.guide_publish_audit;

-- RLS will still be enabled but with no policies (back to original state)
```

Then restore from backup if needed.

## Future Work

After this fix is applied:

1. **Phase 2 (Governance Deployment)**: 
   - Test network membership workflows with new policies
   - Verify voting UI works correctly
   - Ensure only reviewers see votes

2. **Phase 3 (Direct Client Writes)**:
   - Review `/supabase/rls_optional_mutations_phase1.sql`
   - Add INSERT/UPDATE/DELETE policies for network/hub/guide creation
   - Or use server routes with service_role client

3. **Phase 4 (Ongoing)**:
   - Monitor Security Advisor for new alerts
   - Review RLS policies quarterly
   - Keep documentation in sync with schema changes

## Sign-Off Checklist

Before executing, confirm:

- [ ] I have reviewed the audit document
- [ ] I understand what each table stores
- [ ] I understand the security risk
- [ ] I understand the fix
- [ ] I have answered all 3 visibility questions above
- [ ] I understand that this has ZERO risk to app functionality
- [ ] I understand that I can rollback if needed
- [ ] I am ready to execute the SQL

**Date Approved**: _______________
**Executed By**: _______________
**Execution Date**: _______________
**Verification Passed**: Yes / No
**Alert Cleared**: Yes / No

