# GuideForge Role, Reputation & Authority Architecture

## 1. Purpose

This document defines the governance model for GuideForge, including:
- Platform-wide authority (site-level roles and permissions)
- Network-specific authority (per-network roles and permissions)
- Reputation systems (site-wide and network-scoped)
- Community promotion workflow
- Published guide protection and revision strategy

The architecture is designed to support multi-network deployments where users have different roles and permissions in different networks, while maintaining clear separation between platform-level and network-level authority.

---

## 2. Platform-Wide Authority

Platform-wide authority represents trust and permissions across all of GuideForge.

### Platform-Wide Roles (Proposed Future)

These roles are not yet implemented but are reserved for future phases:

- **founder** - Original creator of GuideForge. Highest platform authority. Can manage other admins, override policies, audit networks, manage platform settings.
- **platform_admin** - Platform administrator. Can manage networks, audit content, moderate disputes, manage platform policies.
- **platform_moderator** - Content moderator. Can review flagged guides, issue content warnings, manage community standards enforcement.
- **user** - Regular user. Can create networks, participate in networks by role, view public content.

### Current Implementation Status

- Currently, GuideForge MVP does not distinguish platform roles.
- Network ownership is determined by `networks.owner_user_id` at network creation time.
- Future phases will add platform-level role checks for cross-network admin functions.
- **Note:** Do not assume site-wide roles now. Use network-specific authority for all current decisions.

---

## 3. Network-Specific Authority

Network-specific authority represents trust and permissions within a single network.

### Canonical Network Roles

The following canonical roles are stable, system-managed role identifiers:

1. **owner**
   - Full permissions in the network
   - One per network (identified by `networks.owner_user_id`)
   - Cannot be transferred (network creation is permanent)
   - Can manage members, roles, hubs, collections, guides
   - Can vote on reviews (weight=10 by default)
   - Can publish guides directly (publish_override=true)
   - Can manage network settings and policies

2. **admin**
   - High-level management permissions
   - Appointed by owner
   - Can manage members and roles
   - Can vote on reviews (weight=5 by default)
   - Can publish guides directly (publish_override=true by default)
   - Can create hubs and collections
   - Cannot delete network or remove owner

3. **reviewer**
   - Trusted for review and voting
   - Can submit guides
   - Can vote on reviews (weight=3 by default)
   - Cannot auto-publish (requires owner/admin approval unless reviewers collectively reach threshold)
   - Cannot manage members or roles
   - Can upload images, videos, and media to guides they own or review

4. **contributor**
   - Can submit guides for review
   - Cannot vote on reviews (weight=0)
   - Can upload media to own drafts
   - Lower trust tier but trusted enough to contribute
   - Gains reputation through quality guides
   - Can be promoted to reviewer through community vote

5. **member**
   - Can read and participate in network activities
   - Can create comments or participate in future community features
   - Cannot submit guides or vote (permission flags=false/0)
   - Entry-level role for network participation
   - Can be promoted to contributor if nominated and approved

6. **viewer**
   - Public, read-only access (reserved for future use)
   - Can view guides and participate in read-only activities
   - No account required for public networks
   - Not yet implemented

### Display Role Names (Customizable)

Each network can customize how roles are displayed to users via `network_role_definitions.display_name`:

Example 1 (Gaming Network):
```
canonical_role → display_name
owner → Guildmaster
admin → Officer
reviewer → Trusted Scholar
contributor → Scholar
member → Adventurer
viewer → Wanderer
```

Example 2 (Repair Network):
```
canonical_role → display_name
owner → Lead Maintainer
admin → Senior Technician
reviewer → Certified Technician
contributor → Technician
member → Apprentice
viewer → Public
```

The system uses canonical roles internally for all permission checks. Display names are UI-only customization.

---

## 4. Canonical Roles vs Display Role Names

### Rule: Use Canonical Role Internally

All permission checks and role-based logic MUST use the `canonical_role`:

✅ Correct:
```typescript
const authority = await getCurrentUserNetworkAuthority(networkId)
if (authority.canonicalRole === 'owner' || authority.canonicalRole === 'admin') {
  // Allow publish
}
```

❌ Incorrect:
```typescript
if (member.displayName === 'Guildmaster') {
  // Don't do this - displayName is customizable and not reliable
}
```

### Migration: Rename Display Names Without Code Changes

Networks can rename roles in the UI without any code changes:

1. Update `network_role_definitions.display_name` in database
2. UI automatically shows new names
3. All role logic continues working (based on canonical_role)

Example:
```sql
UPDATE network_role_definitions
SET display_name = 'Lead Guide Author'
WHERE network_id = 'gaming-network-1' 
  AND canonical_role = 'reviewer';
```

---

## 5. Permission Flags

Permission flags define what actions a role can perform. These are stored in `network_role_definitions` as boolean columns or configured per role.

### Currently Implemented Flags

- **can_submit_guides** - Can create new draft guides
- **can_vote_on_reviews** - Can vote approve/request_changes on pending review guides
- **can_publish_override** - Can bypass review and publish directly to published status
- **can_manage_members** - Can invite/remove/modify members in network

### Reserved for Future Implementation

- **can_manage_roles** - Can modify role definitions and permissions
- **can_create_hubs** - Can create new hubs in network
- **can_create_collections** - Can create new collections in hubs
- **can_create_guides** - Alternate to can_submit_guides; check both
- **can_create_revisions** - Can create revision drafts for published guides
- **can_edit_own_drafts** - Can edit guides they own in draft status
- **can_edit_published_directly** - Can edit published guides directly (emergency override)
- **can_upload_images** - Can embed/upload images in guides
- **can_upload_videos** - Can embed/upload videos in guides
- **can_add_links** - Can add external links in guides
- **can_feature_guides** - Can mark guides as featured/highlighted
- **can_moderate_comments** - Can moderate guide comments (future)
- **can_flag_content** - Can flag guides for moderation (future)
- **can_organize_guides** - Can reorganize guides between collections (future)

### Role Permission Matrix (Current)

| Role | can_submit | can_vote | can_publish | can_manage |
|------|------------|----------|-------------|-----------|
| owner | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ |
| reviewer | ✓ | ✓ | ✗ | ✗ |
| contributor | ✓ | ✗ | ✗ | ✗ |
| member | ✗ | ✗ | ✗ | ✗ |
| viewer | ✗ | ✗ | ✗ | ✗ |

### Role Permission Matrix (With review_weight)

| Role | weight | threshold impact |
|------|--------|------------------|
| owner | 10 | Full veto/approval |
| admin | 5 | Strong influence |
| reviewer | 3 | Standard vote |
| contributor | 0 | No voting power |
| member | 0 | No voting power |
| viewer | 0 | No voting power |

---

## 6. Reputation Model

### Site-Wide Reputation (Future)

Site-wide reputation is a cross-network metric representing a user's overall contribution quality and trustworthiness across GuideForge.

**Gains:**
- Guide publication (drafted, reviewed, published)
- Positive votes/reactions on own guides
- High verification_status on published guides
- Longevity in GuideForge (account age)
- Community endorsements

**Does NOT automatically grant:**
- Network-level permissions
- Voting rights in any specific network
- Publishing authority
- Member management rights

**Use cases:**
- Discovery ranking (high-reputation guides featured)
- Credibility badges on user profiles
- Nomination bonus (higher rep = easier to nominate)
- Cross-network visibility
- Access to premium features (future)

---

### Network-Specific Reputation (Future)

Network-specific reputation is trust within a single network.

**Gains (Per Network):**
- Guides submitted and accepted in that network
- Positive community feedback on guides
- Helpful votes on reviews
- Moderation contributions (flagging spam, etc.)
- Longevity in network
- Successful revisions approved

**Matters for:**
- Eligibility for role promotion within that network
- Quality scoring in network guide discovery
- Community voting on guide reviews
- Nomination for leadership roles

**Does NOT automatically grant:**
- Higher permissions without explicit vote/promotion
- Publishing rights (still requires review approval)
- Override authority

---

### Reputation Should Not Auto-Grant Dangerous Powers

**Anti-patterns to avoid:**
- High reputation automatically grants publish_override
- Reputation accumulation auto-promotes roles
- Site-wide reputation overrides network governance
- Hidden reputation calculations determining visibility

**Better approach:**
- Use reputation for discovery ranking (transparency)
- Use reputation as nomination bonus
- Make community/owner promotion explicit and auditable
- Let networks define their own reputation thresholds

---

## 7. Community Promotion Model

This model allows members to grow into higher-trust roles through contribution and community approval.

### Promotion Workflow (Proposed for Phase 10+)

```
Initial State:
User joins network → member role

Growth Path 1 (Contributor Track):
member 
  → (owner/admin approves)
  → contributor role
  → (submits quality guides, gains reputation)
  → (nominated for reviewer role)
  → (owner/admin + existing reviewers vote)
  → (≥70% approval) → reviewer role

Growth Path 2 (Trusted Member Track):
member 
  → (active participation, high reputation)
  → (nominated for contributor role)
  → (owner/admin approves) → contributor role
  → [continues to reviewer if qualified]

Growth Path 3 (Direct Admin Promotion):
member 
  → (owner/admin directly appoints)
  → contributor or reviewer
  → [higher roles require owner approval]
```

### Nomination & Promotion Logic (Future)

**Who can nominate?**
- Owner always
- Admins for contributor/reviewer
- Existing reviewers for contributor

**Who votes on promotion?**
- Owner vote = 100% weight (veto or confirm)
- Admin votes = 10x reviewer weight
- Reviewer votes = 1x each

**Promotion approval threshold:**
- Contributor: Owner approves OR 70% of admins
- Reviewer: Owner approves OR 70% of (admins + existing reviewers)
- Admin: Owner only
- Owner: Never (first owner at network creation)

**Demotion:**
- Owner can demote anyone
- Admins can demote contributors
- Reviewers cannot demote

---

## 8. Published Guide Protection

Published guides are stable, citable versions intended to be referenced externally.

### Current Behavior (Phase 9C - Implemented)

- Published guides are read-only in the editor
- All input fields are disabled
- Autosave is skipped for published guides
- Vote totals shown (read-only)
- "Create Revision — Soon" button is placeholder (non-functional)

### Phase 10A Implementation Status

**Phase 10A has implemented the first step of the revision workflow:**
- ✅ Published guides have a "Create Revision" button (no longer "Soon")
- ✅ Button creates a new draft copy with `revision_of` pointing to the original
- ✅ New draft has status='draft' and revision_number auto-incremented
- ✅ Steps are copied from the published guide to the new draft
- ✅ User is routed to the new draft for editing
- ✅ Original published guide remains protected and unchanged
- ❌ Revision approval/publishing (Phase 10B+)
- ❌ Revision history/comparison (Phase 10B+)
- ❌ Obsolescence marking (Phase 10B+)

The revision system is now partially functional. Users can create editable drafts from published guides, but approval and publishing workflows are still being developed.

### Why Published Guides Are Protected

1. **Stability** - External links/citations to published guides should not change
2. **Audit trail** - Changes should be tracked through revisions, not invisible edits
3. **Review integrity** - Published means "this version was approved"
4. **Community trust** - Users can rely on published guide content being stable

### Direct Edit Override (Emergency, Future)

In emergency scenarios (malware, copyright, legal issues), owner/platform_admin can:
- Edit published guide directly (requires audit log)
- Bypass revision workflow
- Create incident record

This should be rare and auditable. Not intended for routine updates.

---

## 9. Future Revision Workflow

This section describes the intended workflow for updating published guides through revisions.

### What is a Revision?

A revision is a new draft copy of a published guide that goes through review before replacing the published version.

### Revision Workflow (Phase 10+, Not Yet Implemented)

```
Published Guide (v1, status=published)
         ↓
  User clicks "Create Revision"
         ↓
  New Draft created (status=draft, revision_of=original_guide_id)
         ↓
  User edits revision draft
         ↓
  User submits revision for review (status=ready)
         ↓
  Reviewers vote on revision
         ↓
  If approved:
    Update timestamp: published_at (now)
    Set: supersedes_id = original_guide_id
    Set: status = published
    Increment: revision_number
    Keep original guide for history
         ↓
  Published Guide (v2, latest)
  Old guide preserved with supersedes_id link
```

### Revision Table Structure (Proposed, Future)

The `guides` table would be extended with:
```typescript
revision_of?: string          // ID of guide this revises (null if not a revision)
revision_number: number        // 1 = first published, 2 = first revision, etc.
supersedes_id?: string         // Which version this replaced (if published)
original_published_at: string  // Timestamp of first publication
published_at?: string          // Latest publication timestamp
```

### Revision History

- All guide versions are retained in database
- Published guides chain through `supersedes_id` links
- Users can view "Published on [date]" + "Updated through revision on [date]"
- Full revision history available (not deleted)

---

## 10. What NOT to Build Yet

This section clarifies which features are intentionally deferred.

### Do NOT implement (reserved for future phases):

- ❌ Platform-wide roles (founder, platform_admin)
- ❌ Reputation scores/calculations
- ❌ Automatic role promotion based on reputation
- ❌ Nomination system UI
- ❌ Community voting on promotions
- ❌ Full revision system
- ❌ Revision comparison UI
- ❌ Revision history viewer
- ❌ Emergency edit override
- ❌ Comments/community features
- ❌ Moderation tools
- ❌ RLS policies for permissions enforcement
- ❌ Permission audit logging
- ❌ Network policy customization UI

### Currently Implemented (Phases 8-9):

- ✅ Network roles (owner, admin, reviewer, contributor, member)
- ✅ Network members table
- ✅ Role definitions with permissions
- ✅ Draft → Ready → Published workflow
- ✅ Review voting with weights
- ✅ Publish eligibility calculation
- ✅ Manual publish button
- ✅ Published guide protection
- ✅ Owner fallback in authority check

---

## 11. Implementation Notes for Future Phases

### Phase 10: Revision System

**Goals:**
- Implement revision creation UI
- Implement revision submission for review
- Implement revision approval workflow
- Display revision history

**Schema changes needed:**
- Add `revision_of`, `revision_number`, `supersedes_id` to `guides`
- Potentially add revision comment/audit table

**RLS policies needed:**
- Can create revision: `can_create_revisions` permission + own draft or admin
- Can edit revision draft: own the revision
- Can publish revision: vote approval met + network rule enforced

### Phase 11: Promotion System

**Goals:**
- Implement nomination workflow
- Implement promotion voting
- Implement role change application

**Schema changes needed:**
- Add `nominations` table
- Add `promotion_votes` table
- Add reputation_score to `network_members`

**RLS policies needed:**
- Can nominate: reviewer+ or owner
- Can vote on promotion: admin+ or specified voters
- Can see promotions: relevant users

### Phase 12: Platform Roles & Moderation

**Goals:**
- Add platform role support
- Implement moderation tools
- Add content flagging

**Schema changes needed:**
- Add `platform_role` to `profiles`
- Add `moderation_flags` table
- Add `moderation_actions` table

### Key Architectural Decisions

1. **Always use canonical_role for logic** - Display names change, canonical roles don't
2. **Network authority > Platform authority** - Network admins override platform in their network
3. **Reputation informs, doesn't mandate** - High reputation helps nominations but doesn't auto-promote
4. **Published = stable** - Revisions are the way to update, not direct edits
5. **Owner is permanent** - Network ownership is determined at creation
6. **Audit everything** - All role/permission changes should be logged

---

## Appendix A: Current Permission Implementation

### `getCurrentUserNetworkAuthority(networkId)`

This function returns the current user's network authority as:

```typescript
{
  isSignedIn: boolean
  userId: string
  membership: NetworkMember | null
  roleDefinition: NetworkRoleDefinition | null
  canonicalRole: string | null
  roleDisplayName: string | null
  canManageNetwork: boolean
  canManageMembers: boolean
  canSubmitGuides: boolean
  canVoteOnReviews: boolean
  canPublishOverride: boolean
}
```

**Implementation includes:**
- Owner fallback: Checks `networks.owner_user_id` if user not in network_members
- Role definition lookup: Joins network_members with network_role_definitions
- Permission flags from role definition

**Used in:**
- Guide submission (`can_submit_guides`)
- Review voting (`can_vote_on_reviews`)
- Guide publishing (`can_publish_override`)
- Member management (`can_manage_members`)

### Guide Status Lifecycle

```
draft
  ↓ (owner/admin/reviewer submits)
ready (pending review, voting enabled)
  ↓ (owner/admin clicks publish after approval)
published (locked, read-only)

Future states (Phase 10+):
published
  ↓ (owner/reviewer creates revision)
draft (revision)
  ↓ (revision goes through review)
ready (revision)
  ↓ (revision approved)
published (supersedes previous version)
```

---

## Appendix B: Canonical Role Recommendations

### Default Permissions by Role

These are suggested defaults for new networks. Networks can customize via role definitions.

| Role | can_submit | can_vote | can_publish | weight |
|------|------------|----------|-------------|--------|
| owner | true | true | true | 10 |
| admin | true | true | true | 5 |
| reviewer | true | true | false | 3 |
| contributor | true | false | false | 0 |
| member | false | false | false | 0 |
| viewer | false | false | false | 0 |

### Publish Eligibility (Current)

- Requires `approveWeight >= 10` and `requestChangesWeight === 0`
- Adjusted per network if review thresholds ever become configurable
- Never auto-publishes (always manual button click)

---

## Document Status

- **Created:** Phase 9D
- **Status:** Architecture Lock-In (Ready for Phase 10 implementation)
- **Last Updated:** 2026-05-06
- **No Schema Changes In This Phase:** ✓ Confirmed
- **No RLS Policies In This Phase:** ✓ Confirmed
- **No Code Implementation Required:** ✓ Confirmed (documentation only)

---

## Related Documents

- `docs/sql/guideforge_governance_schema_phase_1.sql` - Database schema for roles/members
- `lib/guideforge/types.ts` - TypeScript definitions for roles/permissions
- `lib/guideforge/supabase-networks.ts` - Authority checking implementation
- `docs/guideforge-role-reputation-authority.md` - This file
