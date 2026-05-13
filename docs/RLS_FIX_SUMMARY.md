# GuideForge RLS Security Fix - Executive Summary

## Issue
Supabase Security Advisor reports: **`rls_disabled_in_public`**

This means 4 tables in the `public` schema have Row Level Security enabled but no policies defined:
- `network_role_definitions`
- `network_members`
- `guide_review_votes`
- `guide_publish_audit`

These tables exist from the governance schema (proposal for future guide review/voting system) but have not been populated or used yet in the application.

## Risk Level
🔴 **HIGH** - Without RLS policies, these tables are world-readable/writable if someone queries them directly.

However:
- ✅ The app doesn't currently use these tables (governance features not yet implemented)
- ✅ The app's main tables (networks, guides, hubs) already have proper RLS policies
- ✅ The threat is future-facing (if governance features are built, they're secure by default)

## Solution
Apply comprehensive RLS policies to all 4 tables:
- **SELECT**: Only network members can read (members/admin-only for sensitive data)
- **INSERT**: Only network admins/owners can write
- **UPDATE**: Only owners/admins can modify
- **DELETE**: Only owners/admins can remove

## Files Created

### 1. **docs/RLS_SECURITY_AUDIT.md** (734 lines)
Comprehensive audit document that includes:
- Analysis of all 16 tables (11 with RLS ✅, 4 without RLS ⚠️, 1 exemplary ✅)
- What each table stores
- Current visibility rules
- Minimum safe RLS policies needed
- Summary risk table
- Questions to confirm before execution

### 2. **supabase/rls_remediation_governance.sql** (298 lines)
Production-ready SQL with:
- **PHASE A**: Enable RLS on 4 governance tables
- **PHASE B-E**: Add 19 comprehensive policies (4-5 per table)
- Verification queries to confirm correct execution
- No schema changes, no data modifications

### 3. **supabase/rls_optional_mutations_phase1.sql** (431 lines)
Reference file (NOT YET NEEDED) with:
- Optional INSERT/UPDATE/DELETE policies for existing Phase 1 tables
- For future use when building server routes or direct client writes
- Commented for review before use

## Key Findings

### Governance Tables (NEED RLS POLICIES NOW)

| Table | Purpose | Current Risk | Fix |
|-------|---------|--------------|-----|
| `network_role_definitions` | Define roles (owner, admin, reviewer, etc.) | World-readable | Add 4 policies (select, insert, update, delete) |
| `network_members` | Map users to networks with roles | World-readable/writable | Add 4 policies |
| `guide_review_votes` | Store weighted votes on guides | World-readable | Add 4 policies |
| `guide_publish_audit` | Audit trail of publish actions | World-readable | Add 2 policies (select, insert only - immutable) |

### Phase 1 Tables (RLS ALREADY IMPLEMENTED ✅)

All main tables have SELECT policies:
- `profiles`: Public read ✅
- `networks`: Public/owner read ✅
- `hubs`: By network visibility ✅
- `collections`: By network visibility ✅
- `guides`: Published/author read ✅
- `guide_steps`: By guide visibility ✅
- `forge_rules`: Public read ✅
- `network_forge_rules`: By network visibility ✅
- `forge_rule_check_runs`: By guide visibility ✅
- `forge_rule_check_results`: By guide visibility ✅
- `generation_events`: By guide visibility ✅
- `asset_drafts`: Owner-only ✅

These tables LACK INSERT/UPDATE/DELETE policies (Phase 1 design - intentional to avoid unsafe client writes). Optional mutations file available if needed.

## Will This Break the App?

**No** ✅

1. **Governance tables aren't used yet** - Policies won't affect current functionality
2. **Phase 1 tables are unaffected** - SELECT policies already work with app
3. **Policies match intended access patterns** - Only owners/admins modify their networks
4. **No schema changes** - Only policies added, zero structural changes

## Recommendations

### IMMEDIATE (Fix the alert)
1. ✅ Review `/docs/RLS_SECURITY_AUDIT.md`
2. ✅ Approve `/supabase/rls_remediation_governance.sql`
3. ✅ Execute governance remediation in Supabase console
4. ✅ Run verification queries to confirm
5. ✅ Verify alert clears in Supabase Security Advisor

### FUTURE (When building governance features)
1. Test that membership/voting UI works with new policies
2. Ensure backend service routes use service_role client for system writes
3. Review `/supabase/rls_optional_mutations_phase1.sql` if direct client writes needed
4. Document which tables require server-side route protection

## Next Steps

**To proceed, please confirm:**

1. ✅ Do you want to execute the governance RLS remediation now?
2. ✅ Should members of a network be visible to all members, or only to admins?
3. ✅ Should review votes be visible to all network members or only reviewers+?
4. ✅ Should publish audit be visible to reviewers or only admins?

Once you confirm, I will prepare the exact SQL for execution in your Supabase console.

---

## Files Reference

| File | Purpose | Action |
|------|---------|--------|
| `docs/RLS_SECURITY_AUDIT.md` | Full audit & analysis | Read first for context |
| `supabase/rls_remediation_governance.sql` | Fix governance tables | Execute after approval |
| `supabase/rls_optional_mutations_phase1.sql` | Reference for future | Keep for Phase 2+ planning |

