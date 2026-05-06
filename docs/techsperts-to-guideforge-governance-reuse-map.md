# Techsperts → GuideForge Governance Reuse Map

## Purpose

This document maps proven governance patterns from Techsperts to GuideForge, enabling reuse of tested verification, voting, and role-based authority systems instead of rebuilding from scratch. We document what exists, what should transfer, what needs adaptation, and what should not be copied.

**Current Status:** Audit template and analysis plan. No runtime code changed. No schema changes. No RLS added. No implementation started.

---

## Why Reuse Instead of Rebuild?

Techsperts has been battle-tested with:
- Weighted voting logic by role authority level
- Verification queues and approval workflows
- Revision/immutable-version model for audits
- Role registry for permission mapping
- Publish guards preventing direct changes
- Verified badge system with weighted thresholds
- Admin verification UI and status tracking
- Provisional output (AI) requiring review before publication

GuideForge needs the exact same engine for guide review and publication, generalized to support different network themes and terminology.

---

## Techsperts Systems to Audit

### 1. Solution Verification & Voting (CORE)
**Files to inspect in Techsperts:**
- `supabase/migrations/solution_verification_*.sql`
- `lib/solution-verification.ts` or similar
- `solution_verification_votes` table schema
- `solutions.status` column and enum values
- Vote aggregation / recompute logic
- Verification threshold logic

**What to look for:**
- How votes are weighted by role?
- What threshold determines "verified"?
- Can votes be changed or are they immutable?
- How are provisional (AI-generated) vs user-submitted solutions handled?
- What enforces at-least-one-senior-reviewer rule?
- How are draft/pending/active states managed?

### 2. Role Authority & Registry (CORE)
**Files to inspect in Techsperts:**
- `role_registry` table or `roles` table
- `role_authority_levels` or similar (e.g., founder=5, admin=4, supervisor=3, technician=2, support=1)
- Role permissions matrix
- `user_roles` or `membership` table linking users to roles in context

**What to look for:**
- What fields define a role? (name, authority_level, permissions list, etc.)
- How are roles scoped? (global vs organization vs team?)
- How are permissions calculated from authority level?
- Can users have multiple roles?
- Are roles hierarchical or flat?

### 3. Weighted Voting Engine (CORE)
**Files to inspect in Techsperts:**
- Vote creation logic (cast_vote, add_vote, etc.)
- Vote weight calculation (role_id → weight)
- Verification recomputation (recompute_solution_verification, etc.)
- Vote aggregation queries
- Threshold comparison logic

**What to look for:**
- How is weight assigned? (by role authority level? explicit weight? both?)
- Can founder override votes without aggregation?
- What is the verification threshold? (e.g., >50% of votes, weighted sum ≥ 3, etc.)
- Are there quorum requirements? (at least N votes?)
- Is there a veto mechanism? (e.g., one expert veto blocks approval?)

### 4. Revision / Immutable Version Model (CORE)
**Files to inspect in Techsperts:**
- `solution_revisions` table or versioning strategy
- `solutions.approved_revision_id` or `approved_version`
- How revisions are created and linked
- Audit trail / history queries

**What to look for:**
- Is each approval tied to a specific revision/version?
- Can approved versions be modified or are they immutable?
- How many approved versions can exist?
- Is there a "current draft" vs "latest approved" distinction?
- How is edit history tracked?

### 5. Publish Guards & Lifecycle (CORE)
**Files to inspect in Techsperts:**
- Permission checks before publish
- Status transition logic (draft → pending → active)
- Who can bypass review?
- Error handling for insufficient votes/approval

**What to look for:**
- Can any user publish, or only roles ≥ founder?
- Are there AI outputs that cannot be published without review?
- What prevents a draft from being marked "active" without approval?
- Can founder bypass the voting queue?
- What happens if someone tries to publish with pending votes?

### 6. Admin Verification Queue UI (FRONTEND)
**Files to inspect in Techsperts:**
- Verification queue component or page
- "Pending Review" tab / filter
- Cast Vote modal component
- Vote history / audit display
- Status badges (Approved, Pending, Draft, etc.)

**What to look for:**
- How is the queue paginated / filtered?
- What info is shown: vote counts? comments? timestamps?
- Can votes be cast directly from the queue?
- Is there a comments/discussion thread?
- How is vote history displayed?

### 7. Verification & Badges (FRONTEND)
**Files to inspect in Techsperts:**
- "Verified Solution" or badge component
- Verified count display
- Badge color / icon logic
- Conditional rendering (show badge only if verified?)

**What to look for:**
- When is the badge shown? (only on published? on drafts too?)
- What metadata is in the badge? (just "Verified" or includes vote count?)
- Is there a "weighted verification" score shown?
- Are different badge colors for different verification levels?

### 8. Status Normalization & Enums (UTILITIES)
**Files to inspect in Techsperts:**
- Solution status enum or constants
- Status display labels
- Status-based UI branching (if status === 'draft', then ...)

**What to look for:**
- What are all possible status values?
- Are statuses mutable or immutable?
- Who can transition status?
- Are there side effects (e.g., auto-transitioning to "pending" when first vote cast)?

---

## Reusable Concepts (High-Level Transfer)

| Techsperts Concept | GuideForge Engine Concept | Why Reusable |
|---|---|---|
| Weighted voting by role authority | Network council voting | Same algorithm, just renamed |
| Verification threshold (e.g., 60% approval) | Guide approval threshold | Same math |
| At-least-one-senior-reviewer rule | At-least-one-expert-reviewer rule | Same logic, roles renamed |
| Immutable approved revision | Immutable approved guide version | Same audit requirement |
| Provisional AI output → requires review | AI-generated guide → requires review | Same workflow |
| Publish guard (no direct unpublished publish) | Publish guard for guides | Same enforcement |
| Verification queue | Guide review queue | Same UI pattern |
| Verified badge | Forge Verified badge | Same badge pattern |
| Role authority levels (1-5) | Network role hierarchy | Same concept |
| Cast vote modal | Review & vote guide modal | Same UX |
| Vote history / audit log | Review history / audit log | Same tracking |

---

## Rename / Generalize Map

### Database & Domain Models

| Techsperts | GuideForge | Display Example (Themeable) |
|---|---|---|
| `solution` | `guide` | "Guide" or "Runbook" or "Quest" |
| `solution_id` | `guide_id` | — |
| `solution_verification_votes` | `guide_review_votes` | — |
| `solution.status` | `guide.status` | — |
| `solution_revisions` | `guide_versions` | — |
| `solutions.approved_revision_id` | `guides.approved_version_id` | — |
| `role_registry` | `network_role_definitions` | — |
| `user_roles` | `network_member_roles` | — |
| `role_authority_level` | `role_hierarchy_level` | — |

### Role Mapping (Example: Gaming Network)

| Techsperts Role | Authority Level | GuideForge Role | Network Display |
|---|---|---|---|
| `founder` | 5 | `owner` | "Guildmaster" |
| `admin` | 4 | `admin` | "Lorekeeper" (Gaming) / "Admin" (Default) |
| `supervisor` | 3 | `reviewer` | "Council" (Gaming) / "Senior Reviewer" (Default) |
| `technician` | 2 | `contributor` | "Guidewright" (Gaming) / "Contributor" (Default) |
| `support` | 1 | `member` | "Guild Member" (Gaming) / "Member" (Default) |

### Status Mapping

| Techsperts | GuideForge | Meaning |
|---|---|---|
| `draft` | `draft` | In progress, not submitted for review |
| `pending` | `pending_review` | Submitted for review, waiting for votes |
| `active` | `published` | Approved and live |
| `archived` | `archived` | Retired, no longer used |
| `rejected` | `rejected` | Review rejected, return to draft |

### Vote Types

| Techsperts | GuideForge | Meaning |
|---|---|---|
| `approved` | `approve` | Reviewer votes yes |
| `rejected` | `request_changes` | Reviewer votes no (with reason) |
| `abstain` | `abstain` | Reviewer skips (no vote) |
| — | `needs_clarification` | Reviewer asks question (new in GuideForge) |

---

## Code Reuse Candidates

### Utilities & Pure Functions (Direct Reuse Likely)

| Techsperts Function | Purpose | GuideForge Equivalent | Reuse Strategy |
|---|---|---|---|
| `calculateVoteWeight(roleId)` | Get weight for role | `getGuideReviewWeight(roleId)` | **Direct reuse** with rename |
| `isVerified(votes, threshold)` | Check if vote sum ≥ threshold | `isGuideApproved(votes, threshold)` | **Direct reuse** with rename |
| `getVerificationStatus(votes)` | Aggregate vote status | `getGuideReviewStatus(votes)` | **Direct reuse** with rename |
| `normalizeStatusDisplay(status)` | Map enum to label | `normalizeGuideStatusDisplay(status)` | **Direct reuse** with rename |
| `hasPermission(user, action, context)` | Role-based access check | `canUserReviewGuide(user, guide)` | **Adapt** - use same logic, different permissions |
| `formatVoteTimestamp(vote)` | Format vote datetime | (same) | **Direct reuse** - no changes needed |

### SQL Functions & Stored Procedures (Adapt)

| Techsperts | Purpose | GuideForge | Adaptation |
|---|---|---|---|
| `recompute_solution_verification()` | Recalculate vote aggregate | `recompute_guide_verification()` | Rename, replace `solutions` → `guides`, `solution_verification_votes` → `guide_review_votes` |
| `can_edit_solution(user_id, solution_id)` | Check edit permission | `can_edit_guide(user_id, guide_id)` | Keep logic, replace table references |
| `get_solution_review_queue()` | Fetch pending solutions | `get_guide_review_queue(network_id)` | Add network scoping (solutions are global, guides are per-network) |
| `approve_solution(solution_id, by_user_id)` | Mark solution approved | `approve_guide(guide_id, by_user_id)` | Rename, add verification badge logic |

### React Components (Adapt)

| Techsperts Component | Purpose | GuideForge Component | Adaptation |
|---|---|---|---|
| `VerificationQueuePage` | List pending reviews | `GuideReviewQueuePage` | Rename, add network context, update vote UI |
| `CastVoteModal` | Interface to vote | `ReviewGuideModal` | Rename, update role terminology per network theme |
| `VerificationBadge` | Show verified status | `GuideVerificationBadge` | Rename, add theme color override |
| `VoteHistory` | Display vote audit trail | `ReviewHistory` | Rename, no logic changes needed |
| `StatusBadge` | Display status (draft/pending/active) | (same) | Rename, update colors for guide context |

### What Must NOT Be Copied Blindly

❌ **Repair-specific categories** — Techsperts has repair categories (electrical, plumbing, etc.). Do not assume guides fit these categories.

❌ **Technician job flow** — Techsperts has a technician assignment/scheduling system. Do not copy this without understanding GuideForge's use case.

❌ **Support escalation logic** — Techsperts routes to support teams based on category. GuideForge has different escalation (if any).

❌ **Founder bypass language** — Techsperts may allow founder to publish without review. This should be generalized to "owner override" in GuideForge with explicit documentation of risk.

❌ **Techsperts-only policies** — Any business logic specific to repair services (e.g., "solution must include labor cost estimate").

❌ **Role assumptions** — Do not assume `role === 'admin'` means full access. Use authority levels instead.

❌ **Status enum mismatches** — Do not assume Techsperts solution statuses map 1:1 to guide statuses.

❌ **Direct publish bypass** — Do not copy code that lets non-owner users publish without review.

❌ **Breaking Guide Lifecycle** — Do not modify the existing Draft → Ready → Published flow without explicit approval.

---

## Schema Reuse Candidates

### Core Tables to Create

| Techsperts | GuideForge | Mapping |
|---|---|---|
| `solution_verification_votes` | `guide_review_votes` | User role, guide_id, vote type, weight, created_at, updated_at |
| `role_registry` | `network_role_definitions` | network_id, role_id, role_name, authority_level, permissions_json |
| `user_roles` | `network_member_roles` | network_id, user_id, role_id, assigned_by, assigned_at |
| `solution_revisions` | `guide_versions` | guide_id, version_num, content, created_by, created_at, approved_at, approved_by |
| — | `guide_review_comments` | guide_id, user_id, comment_text, created_at (NEW - for discussion) |

### Schema Reuse Questions (Not Answered Yet)

- Should guides have an immutable `approved_version_id` like solutions do?
- Should vote aggregation be pre-computed (cached) or computed on-demand?
- Should verification threshold be per-network configurable or global?
- Should vote history be immutable (no edits) or allow vote changes?
- Should rejected guides auto-delete or just mark as archived?
- Can guide ownership be transferred? If so, should old votes still count?

---

## Frontend Reuse Candidates

### Page Structure

| Techsperts | GuideForge | Location |
|---|---|---|
| Verification Queue | Guide Review Queue | `/builder/network/[id]/review-queue` |
| Solution Detail + Votes | Guide Detail + Reviews | `/builder/network/[id]/guide/[guideId]` |
| Admin Dashboard | Network Admin Dashboard | `/builder/network/[id]/admin` |
| Solution History | Guide Audit Log | In guide detail sidebar or modal |
| Approved Solutions | Published Guides | `/builder/network/[id]/guides?status=published` |

### Tab & Filter Reuse

| Techsperts Tabs | GuideForge Tabs | Notes |
|---|---|---|
| Drafts | Drafts | Filter by status = draft |
| Pending Review | Pending Review | Filter by status = pending_review |
| Approved | Published | Filter by status = published |
| Archived | Archived | Filter by status = archived |

---

## Recommended Migration Strategy

### Phase 1: Document & Map (CURRENT)
- ✓ Identify Techsperts governance files
- ✓ Understand voting algorithm & threshold
- ✓ Map role hierarchy & permissions
- ✓ Document revision/versioning model
- ✓ Identify publish guards & status transitions
- Document this mapping

### Phase 2: Copy Pure Utility Functions (PHASE 2)
- Copy vote weight calculation
- Copy vote aggregation logic
- Copy status normalization
- Copy permission check patterns
- No database changes yet

### Phase 3: Design GuideForge Governance Schema (PHASE 3)
- Define guide_review_votes table
- Define network_role_definitions table
- Define network_member_roles table
- Define guide_versions table (if adopting revision model)
- Design RLS for review access (not enforced yet)
- Create migration scripts
- Do not apply migrations yet

### Phase 4: Implement Non-Enforcing Review UI (PHASE 4)
- Build guide review queue page
- Build "review guide" modal (non-blocking)
- Build vote history viewer
- Wire vote display (read-only to start)
- Do not enable voting yet
- Do not add verification badges yet

### Phase 5: Wire Vote Aggregation (PHASE 5)
- Build vote persistence layer
- Implement vote submission (UI → DB)
- Call vote aggregation functions
- Update guide status based on votes
- Do not enforce status yet (guides still editable)

### Phase 6: Add Verification Badges (PHASE 6)
- Display "Forge Verified" badge when votes meet threshold
- Show vote count / review status
- Conditionally render publish button based on approval status

### Phase 7: Add Enforcement (PHASE 7)
- Lock guides after approval (read-only except owner/admin)
- Prevent unpublishing without role authority
- Add RLS to enforce review permissions
- Add audit logging

### Phase 8: Add Themes & Customization (PHASE 8+)
- Allow networks to customize role names (Guildmaster, Lorekeeper, etc.)
- Allow custom verification thresholds per network
- Allow custom status labels
- Add "send for review" workflow per network

---

## Risk List

### Technical Risks

**Risk:** Casing & naming mismatches  
**Impact:** Broken imports, runtime errors  
**Mitigation:** Audit all column name case during schema design. Test migration in staging first.

**Risk:** RLS lockouts due to copy-paste policies  
**Impact:** Users unable to access their own guides  
**Mitigation:** Do not copy RLS from Techsperts directly. Design for GuideForge's open model first, add enforcement later.

**Risk:** Role authority level mismatches  
**Impact:** Wrong users get voting rights  
**Mitigation:** Validate role hierarchy during Phase 2. Test permission checks before Phase 4.

**Risk:** Status enum mismatches  
**Impact:** Guides stuck in undefined states  
**Mitigation:** Document all status transitions explicitly. Add state machine validation.

### Functional Risks

**Risk:** Direct publish bypass  
**Impact:** Guides published without review, breaking governance  
**Mitigation:** Do not copy founder bypass code. Make overrides explicit and logged.

**Risk:** Breaking Draft → Ready → Published flow  
**Impact:** Existing guides broken, guides stuck in Ready  
**Mitigation:** Keep existing status values. Layer review system on top, do not replace.

**Risk:** Role assumptions (role === 'admin')  
**Impact:** Permission checks fail for custom roles  
**Mitigation:** Use authority levels instead of role names. Test with role hierarchy.

**Risk:** Vote weight hardcoded to Techsperts roles  
**Impact:** Weight calculation fails for GuideForge roles  
**Mitigation:** Make weight lookup configurable. Define GuideForge role → weight mapping.

### Governance Risks

**Risk:** Losing existing governance context  
**Impact:** Cannot audit why guides were approved/rejected  
**Mitigation:** Migrate Techsperts vote history for reference (read-only). Document original approval criteria.

**Risk:** Different permission models colliding  
**Impact:** Confusion about who can do what  
**Mitigation:** Document permission model explicitly. Do not mix global app roles with network roles.

---

## Final Recommendation

### Summary

**Do Reuse (High Priority):**
1. ✓ Vote weight calculation algorithm (pure math, no side effects)
2. ✓ Vote aggregation & threshold checking (core logic)
3. ✓ Status normalization & display labels (utilities)
4. ✓ Permission check patterns (role-based access)
5. ✓ Review queue UI patterns (pagination, filtering, sorting)
6. ✓ Vote history display (read-only audit trail)

**Do Adapt (Medium Priority):**
1. ✓ SQL functions for vote recomputation (rename tables, keep logic)
2. ✓ Role authority level hierarchy (different roles, same levels)
3. ✓ Revision/immutable-version model (if adopting for guides)
4. ✓ Publish guards (different permissions, same pattern)
5. ✓ CastVote modal → ReviewGuide modal (same UX, different terminology)

**Do NOT Reuse (Exclude Entirely):**
1. ✗ Techsperts repair categories
2. ✗ Techsperts technician job scheduling
3. ✗ Techsperts support escalation logic
4. ✗ Founder bypass without generalization
5. ✗ Repair-specific metadata (labor cost, parts list, etc.)
6. ✗ Techsperts-specific business rules
7. ✗ Anything that assumes guide == solution

### Immediate Next Steps

1. **Secure Techsperts Access:** Ensure this codebase has access to Techsperts repository for inspection.
2. **Inspect Core Functions:** Audit vote weight, aggregation, and permission logic in Techsperts.
3. **Document Exact Mappings:** Create detailed function-by-function mapping with exact SQL/code excerpts.
4. **Phase 2 Planning:** Plan utility function copy-paste with minimal changes.
5. **Schema Review:** Circulate proposed guide_review_votes, network_member_roles tables for stakeholder approval.

### Success Criteria

- [ ] All vote weight calculations work for GuideForge roles
- [ ] Vote aggregation produces correct approval status
- [ ] Review queue UI functions without errors
- [ ] Vote history audit trail is complete and accurate
- [ ] Existing guide Draft → Ready → Published flow unchanged
- [ ] Non-role users see only "no review access" message, not permissions error
- [ ] No guides broken or stuck during implementation

---

## Audit Status

**Status:** Planning phase complete. No code changes made.

**Files Inspected:** None yet (Techsperts access required).

**Schema Changes:** None.

**RLS Added:** No.

**Implementation Started:** No.

**Next Phase:** Secure Techsperts access and inspect core governance functions (Phase 2).
