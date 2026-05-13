# RLS Policies Reference Guide

## Overview

This document serves as a quick reference for all RLS policies being added to fix the Supabase Security Advisor alert.

## Policy Naming Convention

All policies follow this naming pattern:
```
{table}_{operation}_{restriction}

where:
- {table} = table name (network_role_definitions, network_members, etc.)
- {operation} = SELECT, INSERT, UPDATE, DELETE
- {restriction} = by_membership, admin_only, own_only, reviewers_only, etc.
```

Example: `network_role_definitions_select_by_membership`

## Policies by Table

### 1. network_role_definitions (4 policies)

**Table Purpose**: Define roles and permissions within a network (owner, admin, reviewer, contributor, member, viewer)

**Access Pattern**: Admin-only

| Policy | Operation | Who Can? | Condition |
|--------|-----------|----------|-----------|
| `select_by_membership` | SELECT | Network admin+ | `network_members.canonical_role IN ('owner', 'admin')` |
| `insert_admin_only` | INSERT | Network admin+ | Must be owner OR member with role='admin' |
| `update_admin_only` | UPDATE | Network admin+ | Must be owner OR member with role='admin' |
| `delete_admin_only` | DELETE | Network admin+ | Must be owner OR member with role='admin' |

**Use Case**: Only network admins should define/modify roles in their network

---

### 2. network_members (4 policies)

**Table Purpose**: Map users to networks with their assigned roles (one row per user per network)

**Access Pattern**: Member roster visible to members; modifications by admins only

| Policy | Operation | Who Can? | Condition |
|--------|-----------|----------|-----------|
| `select_by_membership` | SELECT | Network members | User must be member of same network |
| `insert_admin_only` | INSERT | Network admin+ | Must be owner OR member with role='admin' |
| `update_admin_only` | UPDATE | Network admin+ | Must be owner OR member with role='admin' |
| `delete_admin_only` | DELETE | Network admin+ | Must be owner OR member with role='admin' |

**Use Case**: 
- Transparency: Members can see who else is in their network
- Control: Only admins add/remove members or change roles
- Privacy: Members can't see rosters of networks they're not in

---

### 3. guide_review_votes (4 policies)

**Table Purpose**: Store weighted votes on guide reviews (approve, request_changes, abstain, needs_clarification)

**Access Pattern**: Internal governance - reviewers+ read; voters own-only write

| Policy | Operation | Who Can? | Condition |
|--------|-----------|----------|-----------|
| `select_reviewers_only` | SELECT | Voters + Network reviewers+ | `voter_id = auth.uid()` OR reviewer+ in guide's network |
| `insert_reviewers_only` | INSERT | Network reviewers+ | `voter_id = auth.uid()` AND must have reviewer+ role in network |
| `update_own_only` | UPDATE | Voters only | Can only update own vote: `voter_id = auth.uid()` |
| `delete_own_or_admin` | DELETE | Voters or admins | Can delete own vote OR admin of guide's network |

**Use Case**:
- Only qualified reviewers can vote
- Votes are kept private (not visible to all members)
- Voters can change/retract their votes
- Admins can audit/remove inappropriate votes

---

### 4. guide_publish_audit (2 policies)

**Table Purpose**: Immutable audit trail of when guides were published and by whom (method: owner_override, threshold_approved, etc.)

**Access Pattern**: Read-only; admin-only writes (typically via backend)

| Policy | Operation | Who Can? | Condition |
|--------|-----------|----------|-----------|
| `select_reviewers_only` | SELECT | Network reviewers+ | Must have reviewer+ role in guide's network |
| `insert_admin_only` | INSERT | Network admin+ | Must be owner OR member with role='admin' |
| **(NO DELETE/UPDATE)** | N/A | Nobody | Audit trail is immutable |

**Use Case**:
- Keep governance decisions private (reviewers only)
- Maintain immutable audit trail for compliance
- Prevent tampering with publish history
- Backend writes via service_role client only

---

## Policy Template Reference

### Template 1: Admin-Only Modification

Used when: Only network owners/admins should modify something

```sql
CREATE POLICY "table_operation_admin_only"
ON public.table_name
FOR INSERT/UPDATE/DELETE
[USING (...)]
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = table_name.network_id
    AND nm.user_id = auth.uid()
    AND nm.canonical_role IN ('owner', 'admin')
  )
);
```

Tables using this: All 4 governance tables (for INSERT/UPDATE/DELETE)

---

### Template 2: Member Roster Access

Used when: Members of a group should see other members, but outsiders shouldn't

```sql
CREATE POLICY "table_select_by_membership"
ON public.table_name
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.network_members nm
    WHERE nm.network_id = table_name.network_id
    AND nm.user_id = auth.uid()
  )
);
```

Tables using this: `network_members` (for SELECT)

---

### Template 3: Reviewer-Only Access

Used when: Only qualified reviewers/admins should access internal governance data

```sql
CREATE POLICY "table_select_reviewers_only"
ON public.table_name
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = table_name.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
);
```

Tables using this: `guide_review_votes`, `guide_publish_audit` (for SELECT)

---

### Template 4: Voter Own-Only

Used when: Users should only be able to modify their own data

```sql
CREATE POLICY "table_update_own_only"
ON public.table_name
FOR UPDATE
USING (voter_id = auth.uid())
WITH CHECK (voter_id = auth.uid());
```

Tables using this: `guide_review_votes` (for UPDATE)

---

## Policy Interaction Example

### Scenario: Alice voting on Guide X in Network A

1. **Check if Alice can vote** (INSERT policy):
   ```
   - Is Alice a member of Network A? ✅
   - Does Alice have reviewer+ role? ✅
   - Can proceed
   ```

2. **Alice inserts vote**:
   ```sql
   INSERT INTO guide_review_votes 
     (guide_id, voter_id, vote, weight)
   VALUES (guide_x_id, alice_id, 'approve', 3);
   ```

3. **Bob (contributor, not reviewer) tries to see votes**:
   ```sql
   SELECT * FROM guide_review_votes WHERE guide_id = guide_x_id;
   ```
   - Does Bob have reviewer+ role in Network A? ❌
   - Is Bob the voter (alice_id)? ❌
   - SELECT policy blocks: 0 rows returned ✅

4. **Carol (admin in Network A) sees all votes**:
   ```sql
   SELECT * FROM guide_review_votes WHERE guide_id = guide_x_id;
   ```
   - Does Carol have reviewer+ role in Network A? ✅
   - Policy allows: Returns all votes (Alice's vote visible) ✅

5. **Alice updates her vote**:
   ```sql
   UPDATE guide_review_votes 
   SET vote = 'request_changes'
   WHERE guide_id = guide_x_id AND voter_id = alice_id;
   ```
   - Is alice_id = auth.uid()? ✅
   - UPDATE policy allows: Update succeeds ✅

6. **Bob tries to update Alice's vote**:
   ```sql
   UPDATE guide_review_votes 
   SET vote = 'approve'
   WHERE guide_id = guide_x_id AND voter_id = alice_id;
   ```
   - Is alice_id = bob_id? ❌
   - UPDATE policy blocks: 0 rows affected ✅

---

## Security Guarantees

### What These Policies Guarantee

✅ Network members can see other members (transparency)
✅ Only admins can add/remove members (control)
✅ Only admins can define roles (control)
✅ Only qualified reviewers can vote (quality)
✅ Votes are private (governance privacy)
✅ Audit trail is immutable (compliance)
✅ No privilege escalation (least privilege)
✅ No cross-network data leakage (isolation)

### What These Policies DO NOT Guarantee

❌ That governance features are built (yet)
❌ That backend services work correctly (separate concern)
❌ That users won't shoot themselves in the foot (requires education)
❌ That API rate limits prevent abuse (separate concern)

---

## Testing Policy Behavior

### Test 1: Can user A see network B's members?

```sql
-- As User A, who is NOT in Network B
SELECT count(*) FROM public.network_members 
WHERE network_id = network_b_id;

-- Expected: 0 rows (policy blocks)
```

### Test 2: Can user C add themselves to network D?

```sql
-- As User C
INSERT INTO public.network_members 
  (network_id, user_id, canonical_role)
VALUES (network_d_id, user_c_id, 'owner');

-- Expected: Permission denied (policy requires admin role)
```

### Test 3: Can reviewer see vote they didn't cast?

```sql
-- As User E (reviewer in network with guide F)
SELECT * FROM public.guide_review_votes 
WHERE guide_id = guide_f_id 
  AND voter_id != user_e_id;

-- Expected: Rows returned (policy allows reviewer access)
```

### Test 4: Can non-reviewer see any votes?

```sql
-- As User G (contributor in network with guide H)
SELECT * FROM public.guide_review_votes 
WHERE guide_id = guide_h_id;

-- Expected: 0 rows (policy blocks non-reviewer access)
```

---

## Migration Path

| Phase | Action | Status |
|-------|--------|--------|
| **Phase 0** | Governance schema created (tables exist, no policies) | ✅ Done |
| **Phase 1** | Apply these RLS policies | 🔲 Pending approval |
| **Phase 2** | Build governance UI (network roles, voting) | 🔲 Planned |
| **Phase 3** | Enable server routes for membership management | 🔲 Planned |
| **Phase 4** | Deploy publish voting feature | 🔲 Planned |
| **Phase 5** | Monitor and refine policies based on usage | 🔲 Future |

---

## Support & Questions

For questions about:
- **Why a specific policy exists**: See `/docs/RLS_SECURITY_AUDIT.md` (detailed analysis)
- **How to execute**: See `/docs/RLS_EXECUTION_CHECKLIST.md` (step-by-step)
- **What the alert means**: See `/docs/SUPABASE_ADVISOR_ALERT_EXPLAINED.md` (context)
- **SQL to run**: See `/supabase/rls_remediation_governance.sql` (executable SQL)

