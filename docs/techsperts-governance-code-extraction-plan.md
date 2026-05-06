# Techsperts Governance Code Extraction Plan

## Purpose

This document is the code-level blueprint for reusing Techsperts governance patterns in GuideForge **without blindly copying repair-specific assumptions**. 

Techsperts solves solution verification, approval workflows, and role-based voting for repair-focused content. GuideForge needs guide review, collaborative verification, and network-owned governance—different domains, but **identical verification mechanics**.

This plan:
- Identifies 15+ code units (functions, patterns, triggers) that are directly reusable
- Maps 9 Techsperts concepts to GuideForge terminology
- Specifies what must be adapted (role registry, authority model)
- Specifies what must NOT be copied (repair categories, technician escalation)
- Proposes GuideForge governance tables without implementation
- Recommends a phased approach to avoid RLS lockouts and data migration issues

---

## What Is Safe to Reuse Directly

These patterns have no domain-specific assumptions and can be adapted with simple renames:

### Vote Aggregation & Weighting
- **Pattern:** Techsperts `after_vote_recompute()` trigger sums approval/rejection weights, applies thresholds, calls backend publish logic
- **Reuse:** YES - The weighted vote aggregation is pure math (sum approve_weight, sum reject_weight, compare thresholds)
- **GuideForge application:** `after_guide_review_vote_recompute()` sums guide review votes same way

### Unique Vote Per Guide/User
- **Pattern:** Techsperts `solution_verification_votes` has UNIQUE(solution_id, voter_id) - only one vote per user per solution
- **Reuse:** YES - This prevents ballot stuffing and enforces one-person-one-vote
- **GuideForge application:** `guide_review_votes` same constraint: UNIQUE(guide_id, voter_id)

### Role Weight Derived on Backend
- **Pattern:** Techsperts `before_insert_solution_vote()` reads voter's role from `profiles.role`, looks up `role_registry.base_weight`, enforces can_vote_council
- **Reuse:** YES - Never trust vote weight from frontend
- **GuideForge application:** `before_insert_guide_review_vote()` reads voter role from `network_members.role`, looks up `network_role_definitions.review_weight`

### After-Vote Recompute Trigger
- **Pattern:** Techsperts trigger `AFTER INSERT/UPDATE on solution_verification_votes` calls `recompute_solution_verification(solution_id)`
- **Reuse:** YES - Same trigger pattern: vote created → recompute status → check thresholds → if passed, call publish function
- **GuideForge application:** `AFTER INSERT/UPDATE on guide_review_votes` triggers `recompute_guide_verification(guide_id)`

### Detail RPC Shape (Guide + Votes + Summary)
- **Pattern:** Techsperts `admin_solution_detail()` returns:
  ```
  solution { id, title, overview, steps, status, verification, created_by, ... }
  votes [ { voter_id, voter_role, vote, weight, notes } ]
  votes_summary { approve_weight, reject_weight, requires_founder, can_publish, reason }
  ```
- **Reuse:** YES - The data shape is generic review metadata
- **GuideForge application:** `guide_review_detail()` returns same shape with guide/vote fields renamed

### Dashboard RPC Returning Review Buckets
- **Pattern:** Techsperts `admin_solution_verification_dashboard_v2()` returns separate result sets:
  - `pending_roots` - solutions awaiting first vote
  - `approved_roots` - published solutions
  - `drafts` - draft revisions in progress
  - `discarded` - discarded revisions
- **Reuse:** YES - The bucketing pattern isolates different workflow states
- **GuideForge application:** `network_guide_review_dashboard()` returns same buckets: `pending_review`, `published`, `draft_revisions`, `discarded`

### Publish Guard Pattern
- **Pattern:** Techsperts `guard_solution_publish()` BEFORE INSERT/UPDATE trigger blocks direct publish unless council bypass is active
- **Reuse:** YES - The pattern prevents accidental direct publishes
- **GuideForge application:** `guard_guide_publish()` same pattern: block direct publish unless owner bypasses review

### Revision Lineage Pattern
- **Pattern:** Techsperts solutions table tracks `revision_of`, `is_revision`, `lineage_root` to support immutable versions and draft revisions
- **Reuse:** YES - The pattern is generic: new revision points to previous version, can be rolled back
- **GuideForge application:** `guides` table can reuse same lineage fields

### Audit Table Pattern
- **Pattern:** Techsperts `solution_publish_audit` logs every publish action: actor, method, reason, timestamp
- **Reuse:** YES - Audit trails are domain-agnostic
- **GuideForge application:** `guide_publish_audit` same schema, tracks who published what guide when

---

## What Must Be Adapted/Renamed

| Techsperts Entity | GuideForge Entity | Why Different |
|---|---|---|
| `solutions` table | `guides` table | Different domain (repairs → guides) |
| `solution_verification_votes` | `guide_review_votes` | Different domain (verification → review) |
| `solution_status` enum | `guide_status` enum | GuideForge may already use draft/ready/published |
| `verification_vote` enum | `guide_review_vote` enum | approve/reject/abstain/needs_clarification |
| `verification_status` enum | `guide_verification_status` enum | unverified/verified/forge_verified |
| `role_registry` table | `network_role_definitions` table | Each network defines its own roles, not global |
| `profiles.role` column | `network_members.role` column | Role is scoped to network, not user |
| `admin_solution_detail` RPC | `guide_review_detail` RPC | Admin context → network owner/admin context |
| `admin_solution_verification_dashboard_v2` | `network_guide_review_dashboard` | Admin dashboard → network dashboard |
| `bootstrap_solution_votes` function | `cast_guide_review_vote` or similar | Techsperts function name too specific to voting semantics |
| `recompute_solution_verification` | `recompute_guide_verification` | Same pattern, different domain |
| `approve_solution_v2` | `approve_guide_v2` | Same pattern, different domain |
| `guard_solution_publish` | `guard_guide_publish` | Same pattern, different domain |

---

## GuideForge-Specific Authority Model

**Critical difference from Techsperts:**

Techsperts uses **global roles** (`founder`, `admin`, `supervisor`, etc.) with fixed permissions. These are baked into the `profiles.role` column and RLS policies.

GuideForge must use **network-scoped roles** because:
1. A user can be an owner of Network A and a contributor to Network B
2. Each network should be able to define custom role names (e.g., "Guildmaster" vs "Owner")
3. The same user has different vote weights in different networks

### GuideForge Authority Model:

```
User (global Supabase auth)
  ↓
  ├─ Network A
  │   ├─ Member role: "Owner" (weight 10, can publish)
  │   ├─ Member role: "Admin" (weight 5, can publish)
  │   ├─ Member role: "Reviewer" (weight 3, cannot publish)
  │   ├─ Member role: "Contributor" (weight 1, cannot vote)
  │   └─ Member role: "Member" (weight 0, read-only)
  │
  └─ Network B
      ├─ Member role: "Guildmaster" (weight 10, can publish)
      ├─ Member role: "Lorekeeper" (weight 5, can publish)
      └─ Member role: "Guidewright" (weight 1, cannot vote)
```

**Backend must derive:**
- `voter_role` from `network_members.role` where `network_id = guide.network_id`
- `weight` from `network_role_definitions.review_weight` where `role_name = voter_role`
- `can_publish` from `network_role_definitions.can_publish_override` or threshold check

**Frontend must NOT:**
- Accept vote weight from request body
- Accept role from request body
- Trust user-provided authority

---

## Proposed GuideForge Tables (No Implementation Yet)

### `network_role_definitions`
Purpose: Define what each role means within a network
```
id uuid primary key
network_id uuid references networks(id) on delete cascade
role_name text (e.g., "Owner", "Reviewer", "Contributor")
display_name text (e.g., "Guildmaster") - for UI theming
review_weight smallint (e.g., 10, 5, 1, 0)
can_submit_guides boolean
can_vote_on_reviews boolean
can_manage_members boolean
can_publish_override boolean
is_active boolean default true
created_at timestamp
updated_at timestamp

UNIQUE(network_id, role_name)
```

### `network_members`
Purpose: Map users to networks and their roles
```
id uuid primary key
network_id uuid references networks(id) on delete cascade
user_id uuid references auth.users(id) on delete cascade
role text references network_role_definitions(role_name)
joined_at timestamp
updated_at timestamp

UNIQUE(network_id, user_id)
```

### `guide_review_votes`
Purpose: Track votes on guides (parallel to Techsperts solution_verification_votes)
```
id uuid primary key
created_at timestamp
guide_id uuid references guides(id) on delete cascade
voter_id uuid references auth.users(id)
voter_network_id uuid (denormalized for convenience, validates voter is in this network)
voter_role text (derived from network_members, stored for audit trail)
vote text enum (approve, request_changes, abstain, needs_clarification)
weight smallint (derived from network_role_definitions, stored for audit)
notes text (reviewer comments)

UNIQUE(guide_id, voter_id)
CHECK vote IN ('approve', 'request_changes', 'abstain', 'needs_clarification')
```

### `guide_publish_audit`
Purpose: Audit trail of all guide publish actions
```
id uuid primary key
published_guide_id uuid references guides(id)
actor_id uuid references auth.users(id)
method text (e.g., "owner_override", "threshold_approved", "consensus")
reason text (optional explanation)
created_at timestamp
```

### `guide_revision_audit` (if needed later)
Purpose: Track guide revisions (if using Techsperts lineage pattern)
```
id uuid primary key
guide_id uuid references guides(id) on delete cascade
revision_of_guide_id uuid references guides(id) on delete set null
was_revision boolean
lineage_root_id uuid
created_at timestamp
```

---

## Recommended GuideForge Enum Mapping

### Guide Status Enum
```
Techsperts           GuideForge           Meaning
─────────────────────────────────────────────────────────
draft                draft                Not yet submitted for review
pending_review       ready_for_review     Waiting for reviewer votes
active               published            Approved and live
deprecated           archived             Old version, hidden but kept
discarded            discarded            Rejected or explicitly removed
```

**Note:** GuideForge guides may already track `draft` and `published` in app state. Verify existing status handling in `/builder/network/[id]/dashboard/page.tsx` before finalizing enum.

### Verification Status Enum
```
Techsperts           GuideForge
─────────────────────────────────────
unverified           unverified
verified             verified
(none)               forge_verified       (optional badge tier)
```

### Review Vote Enum
```
Techsperts           GuideForge           Meaning
──────────────────────────────────────────────────────
approve              approve              Reviewer approves this guide
reject               request_changes      Reviewer requests changes (softer than reject)
(none)               abstain              Reviewer opts out of this vote
(none)               needs_clarification  Reviewer needs more info before voting
```

---

## Trigger/Function Adaptation Plan

### Techsperts Functions → GuideForge Equivalents

| Techsperts Function | Classification | GuideForge Equivalent | Notes |
|---|---|---|---|
| `role_verification_weight(r text)` | Direct pattern | `network_role_review_weight(network_id, role_name)` | Look up review_weight from network_role_definitions |
| `before_insert_solution_vote()` | Direct pattern | `before_insert_guide_review_vote()` | Derive role/weight from network_members, check can_vote_on_reviews |
| `after_vote_recompute()` | Direct pattern | `after_guide_review_vote_recompute()` | Call recompute_guide_verification() on guide |
| `bootstrap_solution_votes()` | Adapt with rename | `cast_guide_review_vote()` or `bootstrap_guide_review_votes()` | Same upsert pattern, trust backend-derived weight |
| `recompute_solution_verification()` | Adapt with rename | `recompute_guide_verification()` | Sum approve/request_changes weights, apply thresholds, call approve_guide_v2() if passed |
| `approve_solution_v2()` | Adapt with rename | `approve_guide_v2()` | Publish normal guides or delegate to revision handling |
| `approve_solution_revision()` | Pattern only | `approve_guide_revision()` (if using lineage) | Publish draft revision, archive previous active version |
| `guard_solution_publish()` | Direct pattern | `guard_guide_publish()` | BEFORE INSERT/UPDATE trigger, block direct publish unless owner override |
| `admin_solution_detail()` | Adapt with rename | `guide_review_detail()` | Return guide + votes + votes_summary, network scoped |
| `admin_solution_verification_dashboard_v2()` | Adapt with rename | `network_guide_review_dashboard()` | Return pending_review, published, draft_revisions, discarded buckets |
| `admin_solution_submissions_queue()` | Pattern only | `network_guide_submissions_queue()` | Return draft guides ready for review in this network |
| `get_my_solution_detail()` | Pattern only | `my_guide_detail()` or `contributor_guide_detail()` | Return only guides user created or can edit |
| `admin_discard_solution_revisions()` | Pattern only | `discard_guide_revisions()` (if using lineage) | Mark revisions as discarded |
| `admin_restore_solution_revisions()` | Pattern only | `restore_guide_revisions()` (if using lineage) | Restore discarded revisions |

### Techsperts Triggers → GuideForge Equivalents

| Techsperts Trigger | On Table | Classification | GuideForge Equivalent |
|---|---|---|---|
| `before_insert_solution_vote()` | solution_verification_votes | Direct pattern | `before_insert_guide_review_vote()` |
| `after_vote_recompute()` | solution_verification_votes | Direct pattern | `after_guide_review_vote_recompute()` |
| `guard_solution_publish()` | solutions | Direct pattern | `guard_guide_publish()` |
| `set_lineage_root_on_insert()` | solutions | Pattern only | `set_guide_lineage_root_on_insert()` if implementing revision tracking |
| `set_updated_at()` | solutions | Direct pattern | Already exists in guides table (updated_at field) |
| `prevent_role_change()` | profiles | Do not reuse | GuideForge network_members should allow role changes (members can be promoted) |

---

## Frontend Reuse Plan

Techsperts verification UI can be adapted for GuideForge guide review.

### Page Mapping

| Techsperts Page | GuideForge Page | Reusable Elements |
|---|---|---|
| `AdminSolutionVerificationPage` | `NetworkGuideReviewPage` | Dashboard with tabs, vote modals, status display |
| `AdminSolutionStepEditorPage` | Guide editor | Step editing, revision safety checks |

### UI Component Adaptation

**Techsperts Verification Queue:**
- Tabs: Submissions, Queue (pending), Approved, Drafts (revisions), Discarded
- Card per guide: title, author, submission date, vote count, status badge
- Vote modal: dropdown for approve/reject/abstain, text notes, submit button
- Admin detail: guide content, review votes table, votes summary

**GuideForge Review Queue (Adapted):**
- Tabs: `Submitted Guides`, `Ready for Review`, `Published`, `Draft Revisions`, `Discarded`
- Card per guide: title, author, submission date, vote count, ownership badge
- Review modal: dropdown for approve/request_changes/abstain/needs_clarification, text notes, submit button
- Reviewer detail: guide content, review votes table, review summary with thresholds
- (Optional) Approval detail: approval method (threshold/consensus/override), approved by, approved at

### What NOT to Copy from Frontend
- Techsperts calls `bootstrap_solution_votes()` with hardcoded roles - GuideForge backend must derive all roles
- Techsperts assumes only `founder` or `admin` can bypass - GuideForge allows network owner to bypass
- Techsperts wording: "Only the original solution creator or admin can publish" - GuideForge: "Owner can publish, or reviewer consensus required"

---

## What Must NOT Be Copied

**Domain-specific to Techsperts repairs, harmful if copied to GuideForge:**

1. ❌ **Repair categories** (electrical, plumbing, hvac) - GuideForge has different domain taxonomies
2. ❌ **problem_definitions table dependency** - Guides don't map to problems
3. ❌ **Technician/support job roles** - GuideForge doesn't track job assignments
4. ❌ **Support escalation flow** - No on-site repair concept in GuideForge
5. ❌ **Global founder bypass wording** - GuideForge: "Owner can bypass review if needed" (not founder-specific)
6. ❌ **RLS policies as-is** - Must be rewritten for network-scoped roles and guide ownership
7. ❌ **Profile role assumptions** - GuideForge: role is per-network, not per-user
8. ❌ **Any code assuming `role = 'admin' AND id = founder_id`** - GuideForge uses network membership
9. ❌ **Any code that publishes directly from frontend** - All publishing happens backend-only
10. ❌ **Old SQL files from before Techsperts migration** - Use only live backend catalog

---

## Safe Implementation Order

Phase-by-phase approach to minimize risk and avoid RLS lockouts:

### Phase 1: Extraction Plan (CURRENT)
- Document reusable patterns ✓
- Identify renaming (DONE)
- List risks and mitigations (IN PROGRESS)
- **No code written yet**
- **No schema deployed yet**

### Phase 2: GuideForge Governance Schema Draft (NEXT)
- Design `network_role_definitions` table
- Design `network_members` table
- Design `guide_review_votes` table
- **No RLS policies**
- **No auto-publish triggers**
- **Tables created but empty**

### Phase 3: Seed Tables with Data (AFTER PHASE 2)
- Seed default roles for each network (Owner, Admin, Reviewer, Contributor, Member)
- Add network creator as Owner
- Add existing contributors as Members (if known)
- **No enforcement yet, just data**

### Phase 4: Add Review Vote Infrastructure (AFTER PHASE 3)
- Create `guide_review_votes` table
- Create `recompute_guide_verification()` RPC
- Create `before_insert_guide_review_vote()` trigger
- **No UI yet, backend-only**
- **Votes can be cast but don't affect guide status**

### Phase 5: Add Non-Enforcing Review UI (AFTER PHASE 4)
- Build `/builder/network/[id]/reviews` page
- Display submitted guides, show existing votes
- Allow vote submission (votes recorded but don't block publishing)
- **Purely informational**
- **Can still publish without voting**

### Phase 6: Add Review Status and Aggregation (AFTER PHASE 5)
- Calculate approval/rejection weight from votes
- Add vote summary to guide detail: "2 approve, 1 request_changes"
- **Still non-enforcing, publisher decides**

### Phase 7: Add Visual Badges and Status Labels (AFTER PHASE 6)
- Badge: "Reviewed by 3" or "Needs Review"
- Status indicator: pending/approved/rejected
- **UI-only, no logic change**

### Phase 8: Add Publish Guard (AFTER PHASE 7)
- Implement `guard_guide_publish()` trigger
- Block direct publish unless owner override or threshold met
- **First enforcement point, but owner can bypass**

### Phase 9: Add RLS and Full Enforcement (AFTER PHASE 8, OPTIONAL)
- Define RLS policies scoped to network
- Only owners can manage roles
- Only reviewers can vote
- **Full enforcement mode**
- **Last step after everything tested**

---

## First Implementation Recommendation

After this extraction plan is approved, the recommended **next** task is:

**Create GuideForge Governance Schema (No RLS, No Enforcement)**

Includes:
- `network_role_definitions` table with default roles
- `network_members` table mapping users to networks and roles
- `guide_review_votes` table for storing votes
- `guide_publish_audit` table for audit trail
- No RLS policies
- No triggers yet
- No auto-publish logic

This schema provides the foundation for phases 3-5 (data, voting, UI) without blocking anything.

**Success criteria:**
- Tables created in development
- Default roles seeded
- No guide publishing changed
- All existing guides remain accessible
- `/builder/networks` still loads all networks
- No 401 errors, no permission denied

### Phase 1 Status

**Phase 1 schema deployed.** 

SQL migration created at `docs/sql/guideforge_governance_schema_phase_1.sql` and manually deployed to Supabase:
- ✓ 4 foundation tables created (network_role_definitions, network_members, guide_review_votes, guide_publish_audit)
- ✓ Default roles seeded for each network (owner, admin, reviewer, contributor, member, viewer)
- ✓ Owner memberships backfilled from `networks.owner_user_id`
- ✓ No RLS, no triggers, no enforcement
- ✓ Tables live in Supabase with data

---

### Phase 2 Status

**Phase 2 read-only visibility implemented.**

Governance visibility added to Network Settings page:
- ✓ Data helpers created: getRoleDefinitionsForNetwork, getNetworkMembersForNetwork, getCurrentUserNetworkMembership
- ✓ NetworkGovernancePanel component displays (175 lines):
  - Current user role (with signed-out state)
  - Role definitions with permissions matrix
  - Network members list with user IDs
  - Empty state handling
- ✓ Panel appears on `/builder/network/[id]/settings` between form and structure manager
- ✓ No RLS, no route protection, no editing, no voting, no enforcement
- ✓ All existing settings save functionality unchanged

---

## Risk Notes

Risks when adapting Techsperts governance to GuideForge:

### 1. RLS Lockout Risk
**Risk:** If RLS policies are too restrictive, owners will be locked out of their own networks.
**Mitigation:** Never deploy RLS without testing in development first. Phase RLS deployment after non-enforcing UI works.

### 2. Status Enum Name Collision
**Risk:** GuideForge may already use `draft` and `published` statuses in app state. Adding `pending_review` might conflict.
**Mitigation:** Audit current guide status handling in dashboard before finalizing enum. May need intermediate state like `ready_for_review`.

### 3. Global Role vs Network Role Confusion
**Risk:** Developers might copy Techsperts code assuming `profiles.role` exists, but GuideForge uses `network_members.role`.
**Mitigation:** Use different table/column names (`network_role_definitions`, `network_members`) to avoid copy-paste mistakes.

### 4. Frontend-Supplied Vote Weight Trust
**Risk:** Frontend might submit `weight` in vote request, backend fails to override with true weight from role_registry.
**Mitigation:** Explicitly document that `before_insert_guide_review_vote()` trigger **overwrites** all frontend-supplied role/weight. Never trust frontend.

### 5. Direct Publish Loopholes
**Risk:** Some code path publishes guides directly (e.g., old API, admin override) without going through `guard_guide_publish()`.
**Mitigation:** Audit all guide publish code paths. Ensure all paths call the same guard function.

### 6. Old/Null Owner Networks
**Risk:** Networks created before Phase 2 have `owner_user_id = NULL`. Review voting should handle null owners gracefully.
**Mitigation:** When voting UI launches, display "No owner assigned" and allow voting anyway. Owner assignment is separate from voting.

### 7. Guide Statuses Might Already Exist
**Risk:** Guides table might have existing `status` column with different enum values.
**Mitigation:** Don't create new `guide_status` enum. Map to existing statuses or coordinate rename.

### 8. V0 Over-Refactor Risk
**Risk:** Implementing full governance system might create dead code or unused tables.
**Mitigation:** Follow phased approach. Stop after each phase, test, get feedback before continuing.

### 9. Vote Weight Threshold Confusion
**Risk:** Techsperts thresholds (require founder + approve_weight >= 5) might not translate to GuideForge (threshold varies by network).
**Mitigation:** Make thresholds configurable per network or derive from network settings.

### 10. Revision Lineage Overhead
**Risk:** Implementing solution revision lineage in guides might be unnecessary complexity.
**Mitigation:** Defer `guide_revision_audit` table. Start with simple voting on guides. Add lineage only if needed.

### 11. Trigger Maintenance Burden
**Risk:** Complex SQL triggers are hard to debug and modify.
**Mitigation:** Write tests for each trigger. Document what each trigger does. Keep trigger logic simple.

### 12. Frontend Vote Modal UX
**Risk:** Copy Techsperts vote modal without adapting for "request_changes" vs "reject" distinction.
**Mitigation:** Design GuideForge modal with 4 clear options: Approve / Request Changes / Abstain / Needs Clarification.

### 13. Audit Trail Retention
**Risk:** Audit table grows unbounded over time.
**Mitigation:** Define retention policy upfront (keep for 1 year, archive older). Document in schema comments.

### 14. Voter Role Denormalization
**Risk:** Storing `voter_role` in `guide_review_votes` means old votes show incorrect role if role changes later.
**Mitigation:** Accept this as correct behavior—vote represents what the role was **at vote time**. Document this design choice.

### 15. Network Role Naming Conflicts
**Risk:** Two networks use different names for same role (e.g., "Owner" vs "Guildmaster"), causing UI confusion.
**Mitigation:** Allow networks to theme role names, but require a `canonical_role` field for backend logic (all map to owner/admin/reviewer/contributor/member).

---

## Safe Implementation Checklist

Before implementing Techsperts patterns in GuideForge, verify:

- [ ] No existing code publishes guides with vote requirements (would conflict with new voting system)
- [ ] Current guide `status` enum is understood and documented
- [ ] Network ownership (`owner_user_id`) is tested and working
- [ ] No hardcoded role assumptions in existing code (e.g., only "admin" can edit)
- [ ] All guide APIs return guides with `ownerUserId` field properly populated
- [ ] Dashboard loads guides without filtering by role (still non-blocking)
- [ ] No existing `network_members` or `guide_review_votes` tables
- [ ] No RLS policies on `guides` table yet
- [ ] Audit plan for migrating guides if adding statuses

---

## Acceptance Criteria

This extraction plan achieves the following:

- [x] Document identifies 15+ reusable Techsperts code units
- [x] Document identifies 9+ required renames for GuideForge terminology
- [x] Document specifies what NOT to copy (repair-specific domain logic)
- [x] Document proposes 5 new tables with purpose and rough schema
- [x] Document recommends phased implementation (9 phases from planning to RLS)
- [x] Document lists 15 specific risks with mitigations
- [x] Document recommends first implementation step (governance schema)
- [x] No runtime code changed
- [x] No schema modified
- [x] No RLS deployed
- [x] No guide persistence affected
- [x] No dashboard loading affected

---

## Summary

Techsperts governance system is **highly reusable** for GuideForge guide reviews. The core patterns—weighted voting, vote aggregation, publish guards, audit trails—are domain-agnostic. The key adaptation is moving from global roles (`founder`, `admin`) to network-scoped roles (`Owner`, `Admin`, `Reviewer`), and carefully excluding repair-specific logic (categories, escalation, job assignments).

Recomended next step: **Create GuideForge governance schema** with `network_role_definitions`, `network_members`, `guide_review_votes`, and `guide_publish_audit` tables (no RLS, no enforcement yet).
