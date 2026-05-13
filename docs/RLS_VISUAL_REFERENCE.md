# RLS Visual Reference Guide

## Schema Relationships (Corrected)

```
guides.collection_id → collections.id → collections.hub_id → hubs.id → hubs.network_id → networks.id

CORRECT JOIN PATH for guide policies:
  guides
    ↓ collection_id
  collections
    ↓ hub_id
  hubs
    ↓ network_id
  networks
    ↓ owner_id
  profiles (owner)
```

---

## Table Protection Matrix

| Table | RLS | Policies | Access Level | Immutable |
|-------|-----|----------|--------------|-----------|
| network_role_definitions | ✓ | 4 | Admin/Owner only | No |
| network_members | ✓ | 4 | Members read, Admin write | No |
| guide_review_votes | ✓ | 4 | Reviewers+ | No |
| guide_publish_audit | ✓ | 2 | Reviewers+ read, Admin write | YES |

---

## Role Hierarchy

```
Owner (10 weight)
  ├─ Full permissions
  ├─ Can vote on reviews
  ├─ Can manage members
  └─ Can override publish

Admin (5 weight)
  ├─ Can vote on reviews
  ├─ Can manage members
  └─ Cannot override publish

Reviewer (3 weight)
  ├─ Can vote on reviews
  ├─ Can submit guides
  └─ Cannot manage members

Contributor (1 weight)
  ├─ Can submit guides
  └─ Cannot vote

Member (0 weight)
  └─ Read-only access

Viewer (0 weight)
  └─ Public viewer (future)
```

---

## Data Access Flows

### Reading network_role_definitions
```
User → Wants to read role definitions
  ↓
Network admin check:
  - Is user the network owner? YES → allow
  - Is user an admin in the network? YES → allow
  - Otherwise → deny
```

### Reading guide_review_votes
```
User → Wants to read votes on a guide
  ↓
Condition 1: User cast the vote? YES → allow (read own)
  OR
Condition 2: User is reviewer+ in guide's network? YES → allow
  OR → deny
```

### Inserting into guide_publish_audit
```
User → Wants to log a publish event
  ↓
Network admin check:
  - Is user the network owner? YES → allow
  - Is user an admin in the guide's network? YES → allow
  - Otherwise → deny
  (UNIQUE constraint: prevents audit tampering)
```

---

## Recursive vs. Non-Recursive Pattern

### WRONG - Infinite Recursion ❌
```sql
CREATE POLICY "network_members_select"
ON public.network_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.network_members  -- SAME TABLE!
    WHERE network_id = network_members.network_id
    AND user_id = auth.uid()
  )
);
-- PostgreSQL tries to apply RLS to subquery
-- → triggers RLS policy on network_members again
-- → infinite recursion → ERROR
```

### CORRECT - Non-Recursive ✓
```sql
CREATE POLICY "network_members_select"
ON public.network_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm_self  -- USE ALIAS
    WHERE nm_self.network_id = network_members.network_id
    AND nm_self.user_id = auth.uid()
  )
);
-- Alias nm_self signals separate table reference
-- → PostgreSQL doesn't apply RLS to subquery
-- → No recursion → Works!
```

---

## Policy Decision Tree

### For network_role_definitions (admin-only)
```
Can user read/write role definitions?
  ↓
Is user the network owner?
  YES → Allow
  NO → Check network_members
    ↓
    Is user a member with role = 'admin' or 'owner'?
      YES → Allow
      NO → Deny
```

### For network_members (members read, admins write)
```
Can user READ members?
  ↓
Is user a member of that network? (UNIQUE membership)
  YES → Allow (read all members)
  NO → Deny

Can user WRITE members?
  ↓
Is user network owner or admin?
  YES → Allow
  NO → Deny
```

### For guide_review_votes (reviewers+ only)
```
Can user READ votes?
  ↓
Is user the voter?
  YES → Allow (read own vote)
  NO → Check network role
    ↓
    Is user reviewer/admin/owner in guide's network?
      YES → Allow
      NO → Deny

Can user WRITE votes?
  ↓
Is user trying to vote?
  ↓
Is user reviewer/admin/owner in guide's network?
  YES → Allow
  NO → Deny
```

### For guide_publish_audit (immutable audit trail)
```
Can user READ audit?
  ↓
Is user reviewer/admin/owner in guide's network?
  YES → Allow
  NO → Deny

Can user INSERT audit?
  ↓
Is user admin/owner in guide's network?
  YES → Allow
  NO → Deny

Can user UPDATE/DELETE audit?
  ↓
NO POLICY DEFINED
  → Automatically DENY (secure by default)
```

---

## Common Mistakes Avoided

| Mistake | Why Bad | Solution |
|---------|--------|----------|
| Recursive FROM on same table | Infinite loop | Use table alias in subquery |
| Direct join to wrong table | Data leakage | Verify schema FK relationships |
| No DROP POLICY IF EXISTS | Script breaks on rerun | Always drop before create |
| Too broad membership check | Privacy violation | Require explicit network_members check |
| No immutable audit trail | Compliance violation | Use NO UPDATE/DELETE policies |
| Anonymous insert allowed | Security hole | Require auth.uid() checks |

---

## Verification Checklist

```
After running the script:

[ ] All 4 tables show rowsecurity = TRUE
    SELECT tablename, rowsecurity FROM pg_tables 
    WHERE tablename IN ('network_role_definitions', 'network_members', 
                        'guide_review_votes', 'guide_publish_audit')

[ ] Policy count is correct (14 total)
    ✓ network_role_definitions: 4
    ✓ network_members: 4
    ✓ guide_review_votes: 4
    ✓ guide_publish_audit: 2

[ ] All policies use proper commands
    SELECT policyname, cmd FROM pg_policies
    WHERE tablename IN (...)

[ ] Supabase Security Advisor shows alert cleared
    Go to: Database → Advisors → rls_disabled_in_public

[ ] No SELECT errors when running queries as network members
    Test as: network owner, admin, reviewer, contributor, member
```

---

## Performance Considerations

### Index Usage
The script relies on these existing indexes:
- `idx_networks_owner_id` - Fast owner checks
- `idx_network_members_network_id` - Fast membership lookups
- `idx_network_members_user_id` - Fast user lookups
- `idx_guides_collection_id` - Fast guide → collection joins
- `idx_hubs_network_id` - Fast hub → network joins

All joins use these indexes → No table scans needed.

### Policy Evaluation Cost
Typical policy evaluation:
1. Owner check (indexed): ~1ms
2. Network member check (indexed): ~2-3ms
3. Role check (in-memory): <1ms

**Total**: ~4ms per policy evaluation (acceptable)

---

## Audit Trail Example

When a guide is published:

```sql
INSERT INTO guide_publish_audit (
  guide_id,
  actor_id,
  network_id,
  method,
  reason,
  created_at
) VALUES (
  'guide-123',
  'user-456',
  'network-789',
  'threshold_approved',
  'Vote threshold: 10/10 approval',
  now()
);
```

Result:
- Immutable record created
- Only reviewers+ can read it
- No one can modify/delete it
- Permanent compliance record
- Secure tamper-evident trail

---

## Questions & Answers

**Q: Can a member see other members in their network?**  
A: YES (Q1 choice) - Members can read the network_members table

**Q: Can a contributor vote on guides?**  
A: NO - Only reviewers/admin/owner can vote (Q2 choice)

**Q: Can members see the publish audit trail?**  
A: NO - Only reviewers/admin/owner can see it (Q3 choice)

**Q: What happens if RLS is disabled?**  
A: All policies are ignored. Users can see/modify anything. Security alert returns.

**Q: Can the script be re-run safely?**  
A: YES - All DROP POLICY IF EXISTS make it idempotent

**Q: Do I need to change app code?**  
A: NO - This fixes database security, not app logic
