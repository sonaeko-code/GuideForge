## GuideForge RLS Security Audit & Remediation Plan

**Status**: AUDIT PHASE (No SQL executed yet)
**Issue**: Supabase Security Advisor reports `rls_disabled_in_public`

---

## AUDIT FINDINGS

### Tables with RLS ENABLED ✅

The following tables already have RLS enabled with policies in place:

1. **profiles** - RLS enabled ✅
   - Policy: `profiles_select_all` - SELECT with `true` (public read)
   - Status: Safe for public read. No INSERT/UPDATE/DELETE policies (good, prevents abuse)

2. **networks** - RLS enabled ✅
   - Policy: `networks_select_public_or_owner` - Owner can see private networks; all can see public
   - Status: Correct visibility control. Needs INSERT/UPDATE/DELETE policies for network creators

3. **hubs** - RLS enabled ✅
   - Policy: `hubs_select_by_network_visibility` - Inherit parent network visibility
   - Status: Correct. Needs INSERT/UPDATE/DELETE policies for network owners/admins

4. **collections** - RLS enabled ✅
   - Policy: `collections_select_by_network_visibility` - Inherit parent visibility
   - Status: Correct. Needs INSERT/UPDATE/DELETE policies

5. **guides** - RLS enabled ✅
   - Policy: `guides_select_published_or_author` - Published guides public; drafts to author
   - Status: Correct. Needs INSERT/UPDATE/DELETE policies for authors/editors

6. **guide_steps** - RLS enabled ✅
   - Policy: `guide_steps_select_by_guide_visibility` - Inherit parent guide visibility
   - Status: Correct. Needs INSERT/UPDATE/DELETE policies

7. **forge_rules** - RLS enabled ✅
   - Policy: `forge_rules_select_all` - SELECT with `true` (public read)
   - Status: ⚠️ CONCERN: Forge rules are read-only system data. Public read is fine for lookup tables. Needs INSERT/UPDATE/DELETE restrictions.

8. **network_forge_rules** - RLS enabled ✅
   - Policy: `network_forge_rules_select_by_network_visibility` - Inherit network visibility
   - Status: Correct. Needs INSERT/UPDATE/DELETE policies for admins

9. **forge_rule_check_runs** - RLS enabled ✅
   - Policy: `forge_rule_check_runs_select_by_guide_visibility` - Inherit guide visibility
   - Status: Correct. Read-only (system-generated).

10. **forge_rule_check_results** - RLS enabled ✅
    - Policy: `forge_rule_check_results_select_by_guide_visibility` - Inherit visibility
    - Status: Correct. Read-only (system-generated).

11. **generation_events** - RLS enabled ✅
    - Policy: `generation_events_select_by_guide_visibility` - Inherit guide visibility
    - Status: Correct. Read-only (system-generated).

---

### NEW TABLES WITHOUT RLS (Governance Schema - Not Yet Applied)

These are from the governance schema (proposal, NOT YET APPLIED):

1. **network_role_definitions** - RLS NOT ENABLED ⚠️
   - Purpose: Define roles and permissions per network
   - Should be: Owner/admin read+write only
   - Current access: No RLS policies = public access to all data

2. **network_members** - RLS NOT ENABLED ⚠️
   - Purpose: Map users to networks with roles
   - Should be: Owner/admin read+write, members read
   - Current access: No RLS policies = public access to all data

3. **guide_review_votes** - RLS NOT ENABLED ⚠️
   - Purpose: Store weighted votes on guides
   - Should be: Voters can read/write own votes; admins read all
   - Current access: No RLS policies = public access to all data

4. **guide_publish_audit** - RLS NOT ENABLED ⚠️
   - Purpose: Immutable audit trail of publish actions
   - Should be: Read-only for admins; published guides visible to all
   - Current access: No RLS policies = public access to all data

---

### Table in asset_drafts Schema

1. **asset_drafts** - RLS ENABLED ✅
   - Policies: Owner-only SELECT/INSERT/UPDATE/DELETE using `auth.uid()` = `owner_id`
   - Status: Perfect. Private workspace data properly protected.

---

## ROOT CAUSE: Why "rls_disabled_in_public" Alerts

The Supabase Security Advisor is detecting these 4 tables:
- `network_role_definitions`
- `network_members`
- `guide_review_votes`
- `guide_publish_audit`

These tables are in `public` schema but have **NO RLS POLICIES** defined because the governance schema is a **PROPOSAL** (not yet applied to your database).

---

## TABLE-BY-TABLE ANALYSIS & RECOMMENDATIONS

### 1. network_role_definitions

**What it stores**: Per-network role definitions (owner, admin, reviewer, contributor, member, viewer) with permissions and vote weights.

**Should be**: 
- Owner/Admin read+write (manage roles in their network)
- Members of network can read
- Public cannot access

**Current risk**: Public can currently see all role definitions if table exists.

**Minimum safe RLS policies needed**:

```sql
-- Allow network owners/admins to manage role definitions
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

-- Only owners/admins can insert new role definitions
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

-- Only owners/admins can update role definitions
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

-- Only owners/admins can delete role definitions
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
```

**Will this break app flows?** 
- No, if role management is admin-only (expected)
- Yes, if you have public role lookups (unlikely - roles are network-internal)

---

### 2. network_members

**What it stores**: User membership in networks with assigned roles.

**Should be**:
- Network owner/admin can read all members
- Members can read other members in same network
- Public cannot access
- Only owner/admin can modify memberships

**Current risk**: Public can currently view all network memberships if table exists.

**Minimum safe RLS policies needed**:

```sql
-- Network members can read their network's membership list
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

-- Only network owners/admins can insert new members
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

-- Only network owners/admins can update member roles
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

-- Only network owners/admins can remove members
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
```

**Will this break app flows?**
- No, if member management UI requires admin role
- Yes, if you have public member lists (likely breaks - members should not be public by default)

---

### 3. guide_review_votes

**What it stores**: Weighted votes on guide reviews (approve, request_changes, abstain, needs_clarification).

**Should be**:
- Voters can read their own votes
- Network admin/reviewers can read all votes for guides in their network
- Published guides: reviewers in network can see votes
- Draft guides: author + reviewers only
- Only voters can create/update their own votes

**Current risk**: Public can currently view all review votes (exposes internal review process).

**Minimum safe RLS policies needed**:

```sql
-- Only network members of reviewer+ role can read votes for guides in their network
CREATE POLICY "guide_review_votes_select_reviewers_only"
ON public.guide_review_votes
FOR SELECT
USING (
  -- Check if guide is in a network where user is admin/reviewer/owner
  EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id  -- guides.collection_id -> hubs -> networks
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
  OR voter_id = auth.uid()  -- Voters can always read their own votes
);

-- Only reviewers in the network can vote
CREATE POLICY "guide_review_votes_insert_reviewers_only"
ON public.guide_review_votes
FOR INSERT
WITH CHECK (
  -- User must be reviewer+ in the guide's network
  EXISTS (
    SELECT 1 FROM public.guides g
    JOIN public.hubs h ON h.id = g.collection_id
    JOIN public.networks n ON n.id = h.network_id
    WHERE g.id = guide_review_votes.guide_id
    AND guide_review_votes.voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.network_members nm
      WHERE nm.network_id = n.id
      AND nm.user_id = auth.uid()
      AND nm.canonical_role IN ('owner', 'admin', 'reviewer')
    )
  )
);

-- Only voters can update their own votes
CREATE POLICY "guide_review_votes_update_own_only"
ON public.guide_review_votes
FOR UPDATE
USING (voter_id = auth.uid())
WITH CHECK (voter_id = auth.uid());

-- Only voters or admins can delete votes
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
```

**Will this break app flows?**
- No, if review UI only shows votes to reviewers
- Yes, if you display votes publicly (exposes internal moderation)

---

### 4. guide_publish_audit

**What it stores**: Immutable audit trail of when guides were published and by whom.

**Should be**:
- Read-only (no INSERT/UPDATE/DELETE by clients - system-only)
- Network admins can read audit trail for their network
- Published guides: audit visible to reviewers only
- Draft guides: audit visible to author + admins only

**Current risk**: Public can currently view all publish audit history (exposes decision-making process).

**Minimum safe RLS policies needed**:

```sql
-- Only network members (reviewers+) can read publish audit for guides in their network
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

-- No INSERT/UPDATE/DELETE - this is system-only, write via function/trigger
-- If needed, restrict INSERT to admins only:
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
```

**Will this break app flows?**
- No, if audit trail is admin-only
- Yes, if you display audit publicly (likely breaks - this is internal governance data)

---

## COMPLETE SQL REMEDIATION PLAN

### Phase A: Enable RLS on governance tables (4 tables)

```sql
-- Enable RLS
ALTER TABLE IF EXISTS public.network_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guide_publish_audit ENABLE ROW LEVEL SECURITY;
```

### Phase B: Add SELECT policies (read access control)

```sql
-- network_role_definitions: owners/admins only
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

-- network_members: network members can read their network's roster
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

-- guide_review_votes: reviewers+ only, voters see own votes
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

-- guide_publish_audit: reviewers+ only
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
```

### Phase C: Add INSERT/UPDATE/DELETE policies (write access control)

```sql
-- network_role_definitions: admin-only mutations
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

-- network_members: admin-only mutations
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

-- guide_review_votes: reviewer-only mutations
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

CREATE POLICY "guide_review_votes_update_own_only"
ON public.guide_review_votes
FOR UPDATE
USING (voter_id = auth.uid())
WITH CHECK (voter_id = auth.uid());

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

-- guide_publish_audit: admin-only mutations (system-only writes)
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
```

---

## EXISTING POLICIES: ADDITIONAL MUTATIONS NEEDED

The main phase 1 tables (networks, hubs, collections, guides, etc.) already have SELECT policies but LACK INSERT/UPDATE/DELETE policies. We should also add:

### networks table: Missing INSERT/UPDATE/DELETE

```sql
-- Network creators can insert new networks
CREATE POLICY "networks_insert_authenticated"
ON public.networks
FOR INSERT
WITH CHECK (auth.uid()::text = owner_id::text OR owner_id IS NULL);

-- Network owners can update their networks
CREATE POLICY "networks_update_owner_only"
ON public.networks
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Network owners can delete their networks
CREATE POLICY "networks_delete_owner_only"
ON public.networks
FOR DELETE
USING (owner_id = auth.uid());
```

---

## SUMMARY TABLE

| Table | RLS Enabled? | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy | Risk Level |
|-------|---|---|---|---|---|---|
| profiles | ✅ | ✅ public read | ❌ | ❌ | ❌ | 🟢 Low |
| networks | ✅ | ✅ owner/public | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| hubs | ✅ | ✅ by network | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| collections | ✅ | ✅ by network | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| guides | ✅ | ✅ published/author | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| guide_steps | ✅ | ✅ by guide | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| forge_rules | ✅ | ✅ public read | ❌ | ❌ | ❌ | 🟢 Low |
| network_forge_rules | ✅ | ✅ by network | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🟡 Medium |
| forge_rule_check_runs | ✅ | ✅ by guide | System-only | System-only | System-only | 🟢 Low |
| forge_rule_check_results | ✅ | ✅ by guide | System-only | System-only | System-only | 🟢 Low |
| generation_events | ✅ | ✅ by guide | System-only | System-only | System-only | 🟢 Low |
| asset_drafts | ✅ | ✅ owner-only | ✅ owner-only | ✅ owner-only | ✅ owner-only | 🟢 Low |
| **network_role_definitions** | ❌ | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🔴 **HIGH** |
| **network_members** | ❌ | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🔴 **HIGH** |
| **guide_review_votes** | ❌ | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🔴 **HIGH** |
| **guide_publish_audit** | ❌ | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | ❌ NEEDS | 🔴 **HIGH** |

---

## NEXT STEPS (AWAITING YOUR APPROVAL)

1. ✅ Review this audit document
2. ✅ Confirm table purposes and visibility rules
3. ✅ Approve the SQL remediation plan
4. 🔲 Execute Phase A (Enable RLS)
5. 🔲 Execute Phase B (SELECT policies)
6. 🔲 Execute Phase C (INSERT/UPDATE/DELETE policies)
7. 🔲 Execute Phase D (Existing table mutations)
8. 🔲 Test that app still works with new policies
9. 🔲 Verify Supabase Security Advisor clears the alert

---

## RISKS & MITIGATIONS

### Risk: Breaking existing app flows

**Mitigation**: The policies are written to match existing app behavior (only owners/admins edit networks, only authors edit guides, etc.). If the app currently prevents non-owners from editing, these policies should be invisible.

### Risk: Draft networks/guides become invisible

**Mitigation**: Policies check `owner_id = auth.uid()` for draft content. Only affects if app is trying to list other users' drafts (which it shouldn't).

### Risk: Review/vote system breaks

**Mitigation**: Policies ensure only network members (reviewers+) can vote and see votes. This is required for governance feature.

---

## QUESTIONS TO CONFIRM BEFORE EXECUTION

1. Should public networks show their members/roles in the UI? (Currently no public member list)
2. Should review votes be visible to all network members or only reviewers+? (Currently not implemented)
3. Should publish audit be visible to all members or only admins? (Currently not implemented)
4. Are there any backend services or webhooks that need elevated permissions? (If yes, we may need service-role policies)

