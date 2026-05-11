# GuideForge Governance Implementation Plan — Phased Rollout

**Version:** 1.0  
**Status:** Governance Documentation (Phase 0 — No Code Implementation Yet)  
**Last Updated:** 2026-05-11  
**Owner:** GuideForge Product Team

---

## Executive Summary

This document outlines the phased, risk-managed rollout of GuideForge's governance system (roles, review, voting, publishing, and audit). The plan is designed to allow manual testing, gradual enforcement, and rollback at any phase if issues arise.

**Key Philosophy:** Governance is built incrementally, with each phase adding enforcement only after the prior phase is manually verified. Code changes are minimal until Phase 5; enforcement comes last (Phase 6–7).

---

## Phase Overview

| Phase | Focus | Duration (Estimate) | Code Changes | Enforcement |
|---|---|---|---|---|
| **Phase 0** | Documentation | 0 weeks | 0 | None (this document) |
| **Phase 1** | Role & capability helpers | 1–2 weeks | Minimal (read-only) | None |
| **Phase 2** | Network schema draft | 1–2 weeks | Schema in dev | None (manual testing) |
| **Phase 3** | Review & vote tables | 1–2 weeks | Schema in dev | None (manual testing) |
| **Phase 4** | Review UI (non-enforcing) | 2–3 weeks | UI components | Display only |
| **Phase 5** | Vote aggregation backend | 2–3 weeks | API endpoints | Vote logic (no publish guard) |
| **Phase 6** | Publish guard & audit trail | 1–2 weeks | Route middleware | Governance enforcement |
| **Phase 7** | RLS & hard enforcement | 1–2 weeks | Supabase RLS policies | Database-level enforcement |

---

## Phase 0: Documentation (Current)

**Goal:** Establish canonical governance rules before any code is written.

**Deliverables:**
- `docs/governance/guideforge-role-trust-canon.md` ✓
- `docs/governance/guideforge-founder-authority.md` ✓
- `docs/governance/guideforge-governance-implementation-plan.md` ✓

**Activities:**
- No code changes
- No schema changes
- No CLI/build commands

**Exit Criteria:**
- Governance rules are documented and agreed upon
- Role/capability model is canonical
- Team understands founder authority constraints

**Next Phase Trigger:** Governance rules are approved and frozen

---

## Phase 1: Role & Capability Helpers (Non-Enforcing)

**Goal:** Add read-only helpers to check user roles and capabilities. These are used for display/UI logic only; no enforcement yet.

**Deliverables:**

1. **`lib/guideforge/roles.ts`** — Role and capability definitions
   ```typescript
   export const ROLES = {
     founder: { display: "Founder", tier: 100 },
     platform_admin: { display: "Platform Admin", tier: 10 },
     platform_moderator: { display: "Moderator", tier: 5 },
     user: { display: "User", tier: 1 }
   }

   export const NETWORK_ROLES = {
     owner: { display: "Owner", tier: 5 },
     admin: { display: "Admin", tier: 4 },
     // ...
   }

   export const CAPABILITIES = {
     can_view_network: "Can view network and guides",
     can_edit_network_settings: "Can configure network",
     // ...
   }
   ```

2. **`lib/guideforge/role-helpers.ts`** — Helper functions
   ```typescript
   export function getGlobalRole(user: User): GlobalRole | null { }
   export function getNetworkRole(user: User, networkId: string): NetworkRole | null { }
   export function hasCapability(user: User, networkId: string | null, capability: string): boolean { }
   export function getVoteWeight(user: User, networkId: string): number { }
   export function isFounder(user: User): boolean { }
   export function canSeeDe bugTools(user: User): boolean { } // Already implemented in Phase 0
   ```

3. **`lib/guideforge/vote-weights.ts`** — Vote weight lookups
   ```typescript
   export const VOTE_WEIGHTS = {
     founder: 'override', // special value
     network_owner: 5,
     platform_admin: 5,
     network_admin: 3,
     reviewer: 2,
     editor: 1,
     contributor: 0,
     member: 0
   }

   export function getVoteWeight(role: NetworkRole): number { }
   ```

**Activities:**
- Create new helper files in `lib/guideforge/`
- Add role/capability type definitions (TypeScript)
- Export helpers for use in UI and API routes (as needed)
- No database queries (hardcoded until Phase 2)
- Helpers should be pure functions (no side effects)

**Code Changes:**
- New files only; no modifications to existing routes or components
- Import these helpers into existing code only for **display** (not logic enforcement)
- Example: Debug Tools gate (Phase 0) now uses `canSeeDebugTools(user)` helper

**Testing:**
- Unit tests for role/capability helpers
- Manual verification that `canSeeDebugTools()` still works correctly

**Exit Criteria:**
- All helpers compile and pass unit tests
- No new runtime errors in existing code
- `canSeeDebugTools(user)` correctly identifies dev/admin/founder users

**Next Phase Trigger:** Helpers are tested and ready; schema design is finalized

---

## Phase 2: Network Schema Draft (No RLS)

**Goal:** Add tables for networks, network memberships, and role assignments. No enforcement (no RLS) yet; all data manipulation is manual/admin-only via direct DB queries or specialized endpoints.

**Deliverables:**

1. **Schema Migration** — Create tables:
   ```sql
   CREATE TABLE networks (
     id UUID PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     owner_user_id UUID NOT NULL REFERENCES auth.users,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE network_memberships (
     id UUID PRIMARY KEY,
     network_id UUID NOT NULL REFERENCES networks,
     user_id UUID NOT NULL REFERENCES auth.users,
     role TEXT NOT NULL, -- 'owner', 'admin', 'reviewer', 'editor', 'contributor', 'member'
     joined_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(network_id, user_id)
   );

   CREATE TABLE global_roles (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL UNIQUE REFERENCES auth.users,
     role TEXT NOT NULL, -- 'founder', 'platform_admin', 'platform_moderator', 'user'
     assigned_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Helper Updates** — Modify Phase 1 helpers to query these tables:
   ```typescript
   export async function getNetworkRole(user: User, networkId: string): Promise<NetworkRole | null> {
     // Query network_memberships table
   }

   export async function getGlobalRole(user: User): Promise<GlobalRole | null> {
     // Query global_roles table
   }
   ```

3. **Seed Data**
   - Founder account is inserted into `global_roles` with role='founder'
   - Current admin users are migrated to `global_roles` with role='platform_admin'

**Activities:**
- Create migration scripts (Supabase)
- No RLS policies yet (all read/write is open to authenticated users for now)
- Manual testing: Verify data can be inserted/queried directly
- Create admin CLI or spreadsheet for manual role assignment (for now)

**Testing:**
- Verify migration runs without errors
- Manually insert test roles and query them
- Verify helpers still work and now query the database

**Constraints:**
- No enforcement; any authenticated user can still perform any action
- RLS will be added in Phase 7 (not yet)
- Role assignments are manual (no UI for assignment yet)

**Exit Criteria:**
- Schema is created and tested in dev environment
- Seed data is populated
- Phase 1 helpers now query the database correctly
- No schema errors or constraint violations

**Next Phase Trigger:** Schema is stable and tested in dev

---

## Phase 3: Review & Vote Tables (No Auto-Publish)

**Goal:** Add tables for guide reviews, voting, and publish history. These tables are read/write, but voting does not yet trigger automatic publishing.

**Deliverables:**

1. **Schema Migration** — Create tables:
   ```sql
   CREATE TABLE guide_reviews (
     id UUID PRIMARY KEY,
     guide_id UUID NOT NULL REFERENCES guides,
     network_id UUID NOT NULL REFERENCES networks,
     submitted_by UUID NOT NULL REFERENCES auth.users,
     submitted_at TIMESTAMP DEFAULT NOW(),
     status TEXT DEFAULT 'open', -- 'open', 'published', 'archived'
     UNIQUE(guide_id, network_id) -- Only one review per guide per network
   );

   CREATE TABLE guide_votes (
     id UUID PRIMARY KEY,
     review_id UUID NOT NULL REFERENCES guide_reviews,
     voter_user_id UUID NOT NULL REFERENCES auth.users,
     vote_for_publish BOOLEAN NOT NULL, -- true = publish, false = do not publish
     vote_weight INT NOT NULL, -- 0, 1, 2, 3, 5, or 'override'
     reason TEXT,
     voted_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(review_id, voter_user_id) -- One vote per user per review
   );

   CREATE TABLE guide_publish_history (
     id UUID PRIMARY KEY,
     guide_id UUID NOT NULL REFERENCES guides,
     network_id UUID NOT NULL REFERENCES networks,
     published_by UUID NOT NULL REFERENCES auth.users,
     published_at TIMESTAMP DEFAULT NOW(),
     publish_type TEXT NOT NULL, -- 'normal', 'founder_override'
     vote_summary TEXT, -- JSON: { for: X, against: Y, threshold: Z }
     reason TEXT
   );
   ```

2. **Backend Endpoints** — Read-only and manual vote endpoints:
   - `GET /api/guideforge/reviews/:guideId` — View review status
   - `GET /api/guideforge/votes/:reviewId` — View votes (non-binding; for display)
   - `POST /api/guideforge/votes` — Cast a vote (creates entry in guide_votes, but does NOT publish)
   - `GET /api/guideforge/publish-history/:guideId` — View publish history

3. **Vote Aggregation Logic** — Helper to compute vote totals:
   ```typescript
   export async function aggregateVotes(reviewId: string): Promise<{
     for_votes: number,
     against_votes: number,
     total_weight_for: number,
     total_weight_against: number,
     threshold: number,
     passes: boolean
   }> {
     // Sum votes by weight; return totals
   }
   ```

**Activities:**
- Create migration scripts
- Implement endpoints (read/write data, but no publish logic)
- No RLS policies (all read/write is open)
- Manual testing: Cast votes and verify they are recorded
- Voting does NOT trigger publishing (manual step for now)

**Testing:**
- Verify tables are created
- Manually cast votes and verify they are recorded
- Verify vote aggregation logic computes totals correctly

**Constraints:**
- Votes are recorded but do NOT automatically publish guides
- No UI yet; voting is via API endpoints only (postman, manual requests)
- No publish guard; guides can still be published directly

**Exit Criteria:**
- Schema is created and tested
- Vote endpoints work and record votes
- Vote aggregation logic is correct
- No automatic publishing occurs

**Next Phase Trigger:** Voting infrastructure is stable

---

## Phase 4: Review UI (Non-Enforcing Display)

**Goal:** Build frontend UI components for reviewing guides, voting, and viewing vote status. UI shows voting status but does not prevent publication (enforcement comes later).

**Deliverables:**

1. **Components:**
   - `components/guideforge/guide-review-panel.tsx` — Display review status and vote summary
   - `components/guideforge/guide-vote-form.tsx` — Allow user to cast vote
   - `components/guideforge/vote-summary.tsx` — Display vote tally (for/against, weights)
   - `components/guideforge/publish-confirmation-review.tsx` — Show votes before publishing (advisory)

2. **Pages:**
   - `/builder/generate-asset/[assetId]/review` — Review page for a guide under review
   - `/networks/[networkId]/guides` — Network guide list with review status badges

3. **Features:**
   - Display vote summary (e.g., "4 for (weight 8), 2 against (weight 3)")
   - Show vote history (who voted, when, which way)
   - Cast vote form with reason input
   - Color-coded badges (open review, passed, failed, etc.)

**Activities:**
- Design UI flows (based on governance rules)
- Implement React components
- Connect to Phase 3 API endpoints
- Add vote casting flow (optional: reason, required: direction)
- Display warnings if guide is under review (advisory)

**Testing:**
- Manual testing: Cast votes and see them reflected in UI
- Visual testing: Verify UI is clear and intuitive
- No functional enforcement (publishing still works regardless of votes)

**Constraints:**
- UI is **advisory only** — it displays vote status but does not block actions
- Publishing is still allowed even if votes haven't passed
- No RLS or backend enforcement yet

**Exit Criteria:**
- UI components render without errors
- Voting flow works end-to-end
- Vote status is displayed accurately
- No blocking of actions (advisory only)

**Next Phase Trigger:** UI is tested and ready

---

## Phase 5: Vote Aggregation Backend (No Publish Guard)

**Goal:** Implement backend logic to aggregate votes and compute publish eligibility. Voting now triggers automatic recomputation, but publishing is still not blocked.

**Deliverables:**

1. **Backend Vote Aggregation Service:**
   ```typescript
   export async function computePublishEligibility(guideId: string, networkId: string): Promise<{
     eligible: boolean,
     votes_for: number,
     votes_against: number,
     weight_for: number,
     weight_against: number,
     threshold: number,
     reason: string
   }>
   ```

2. **Vote Trigger Logic:**
   - When a vote is cast, call `computePublishEligibility`
   - Update review status (e.g., `status: 'passed'` if threshold is met)
   - Log vote result in audit table

3. **Automatic Vote Recomputation:**
   - If a user's role changes, recalculate all active votes by that user
   - Example: If a reviewer is promoted to admin, their vote weight changes from 2 to 3

4. **API Endpoint:**
   - `POST /api/guideforge/publish/check-eligibility` — Compute eligibility without publishing

**Activities:**
- Implement vote aggregation logic
- Add vote recomputation on role change
- Create eligibility check endpoint
- Log results to audit table (for Phase 6)
- Manual testing: Verify eligibility is computed correctly

**Testing:**
- Test various vote scenarios (unanimous, split, etc.)
- Test vote recomputation when role changes
- Verify audit logs are created

**Constraints:**
- Publishing is still allowed regardless of eligibility
- No backend enforcement (yet)
- No UI blocking (advisory only)

**Exit Criteria:**
- Vote aggregation is correct
- Eligibility is computed accurately
- Audit logs are created

**Next Phase Trigger:** Vote logic is correct and tested

---

## Phase 6: Publish Guard & Audit Trail (Enforcement)

**Goal:** Implement the publish guard on the backend. API now checks governance rules before allowing publication. Audit trail is immutable and logs all governance actions.

**Deliverables:**

1. **Publish Guard Middleware:**
   ```typescript
   export async function checkPublishEligibility(user: User, guideId: string, networkId: string): Promise<{
     allowed: boolean,
     reason: string
   }> {
     // Compute eligibility
     // Check if user is founder (override allowed)
     // Check if user has publish capability in network
     // If not eligible and not founder, block with reason
   }
   ```

2. **Updated Publish Endpoint:**
   - `POST /api/guideforge/guides/:guideId/publish`
   - Calls `checkPublishEligibility` before publishing
   - If blocked and not founder, returns 403 with reason
   - If founder override is requested, logs it as override

3. **Immutable Audit Table:**
   ```sql
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY,
     actor_user_id UUID NOT NULL,
     action TEXT NOT NULL,
     resource_type TEXT NOT NULL, -- 'guide', 'review', 'vote', 'role'
     resource_id UUID,
     details JSONB,
     timestamp TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Audit Logging for Key Actions:**
   - `publish_guide` — Normal publish
   - `publish_override` — Founder override
   - `archive_guide` — Archive
   - `vote_cast` — Vote recorded
   - `role_assign` — Role changed
   - `review_submit` — Guide submitted for review

**Activities:**
- Implement publish guard
- Add audit logging to all governance actions
- Update API routes to enforce publish guard
- Create founder override flow
- Manual testing: Verify publishing is blocked/allowed correctly
- Audit logs are created and immutable

**Testing:**
- Test publishing allowed when eligible
- Test publishing blocked when not eligible
- Test founder override allowed
- Test audit logs are created for all actions
- Test audit logs cannot be modified

**Constraints:**
- RLS is not yet active (database is still open)
- Frontend UI should now respect the publish guard

**Exit Criteria:**
- Publish guard works correctly
- Founder override flow works
- Audit logs are created and immutable
- No unexpected blocking/allowing

**Next Phase Trigger:** Publish guard is tested and stable

---

## Phase 7: RLS & Hard Enforcement (Database-Level)

**Goal:** Implement Row-Level Security (RLS) policies in Supabase. Governance is now enforced at the database level; no bypass is possible.

**Deliverables:**

1. **RLS Policies:**
   - Read policy: Users can view guides in networks they are members of
   - Write policy: Users can edit guides only if they have `can_edit_guides` capability
   - Publish policy: Only users with founder role or `can_publish_guides` can modify `published` status
   - Vote policy: Only users with `can_vote_review` can insert into `guide_votes`

2. **Schema Adjustments:**
   - Add `network_id` foreign key to guides (for network scoping)
   - Add `published_by` to guide_publish_history
   - Add `override` boolean to guide_publish_history

3. **RLS Policies (Examples):**
   ```sql
   -- Users can view guides in networks they are members of
   CREATE POLICY guide_read_policy ON guides
     USING (network_id IN (
       SELECT network_id FROM network_memberships
       WHERE user_id = auth.uid()
     ));

   -- Users can publish guides if they have founder role or can_publish_guides
   CREATE POLICY guide_publish_policy ON guide_publish_history
     WITH CHECK (
       published_by = auth.uid() AND (
         EXISTS(SELECT 1 FROM global_roles WHERE user_id = auth.uid() AND role = 'founder')
         OR
         EXISTS(SELECT 1 FROM network_memberships 
           WHERE user_id = auth.uid() 
           AND network_id = NEW.network_id
           AND role IN ('owner', 'admin'))
       )
     );
   ```

**Activities:**
- Design RLS policies for all tables
- Implement RLS in Supabase
- Test policies against various user roles
- Verify backend routes still work with RLS
- Remove any test/debug endpoints that bypass RLS

**Testing:**
- Functional testing: Verify RLS blocks unauthorized access
- Regression testing: Verify authorized access still works
- Role testing: Test each role against all read/write operations
- Edge cases: Test when role changes mid-action

**Constraints:**
- RLS is active; all database access is now governed
- Backend routes cannot bypass RLS

**Exit Criteria:**
- RLS policies are correct and complete
- All functional tests pass
- No unauthorized access is possible
- Authorized access works correctly

**Exit Criteria (End of Phase 7):** Governance system is fully implemented and enforced

---

## Rollback and Recovery Strategy

If issues are discovered:

1. **Phase Rollback:**
   - Phases 1–4: Simply disable UI/features; no schema changes required
   - Phase 5+: Schema changes can be rolled back via migration reversal (if planned)

2. **Data Integrity:**
   - Audit logs are preserved throughout; no data loss
   - If publishing is blocked incorrectly, founder can use override + audit

3. **Incidents:**
   - If RLS policy is overly restrictive, founder can temporarily disable RLS in Supabase console
   - Manual fixes can be applied while policy is debugged

---

## Manual Testing Checklist (Per Phase)

### Phase 1 Testing
- [ ] Role helpers return correct values
- [ ] Capability helpers return correct values
- [ ] `canSeeDebugTools()` correctly identifies eligible users

### Phase 2 Testing
- [ ] Network tables exist and have correct schema
- [ ] Global role table is populated with founder
- [ ] Helpers query database correctly
- [ ] Manual role assignment works

### Phase 3 Testing
- [ ] Review and vote tables exist
- [ ] Votes can be cast and recorded
- [ ] Vote aggregation is accurate
- [ ] Voting does NOT publish guides

### Phase 4 Testing
- [ ] UI components render without errors
- [ ] Voting form works end-to-end
- [ ] Vote summary displays correctly
- [ ] UI is advisory (publishing still works)

### Phase 5 Testing
- [ ] Vote aggregation is accurate
- [ ] Eligibility is computed correctly
- [ ] Role changes trigger vote recomputation
- [ ] Audit logs are created

### Phase 6 Testing
- [ ] Eligible guides can be published
- [ ] Ineligible guides are blocked
- [ ] Founder override works
- [ ] Audit logs are immutable

### Phase 7 Testing
- [ ] RLS policies block unauthorized access
- [ ] RLS policies allow authorized access
- [ ] Founder can bypass RLS (via override)
- [ ] Role-based access is correct

---

## Success Criteria

Governance system is successful when:

1. ✅ Founder authority is explicit and auditable
2. ✅ Network roles are independent per-network
3. ✅ Weighted voting is enforced
4. ✅ AI-generated guides remain draft until reviewed
5. ✅ Publishing requires appropriate capability or founder override
6. ✅ All governance actions are logged immutably
7. ✅ RLS prevents unauthorized database access
8. ✅ No code bypass exists (all governance is enforced)

---

## Timeline Estimate

| Phase | Duration | Start | End |
|---|---|---|---|
| Phase 0 | 1 week | Week 1 | Week 1 |
| Phase 1 | 1–2 weeks | Week 2 | Week 3 |
| Phase 2 | 1–2 weeks | Week 4 | Week 5 |
| Phase 3 | 1–2 weeks | Week 6 | Week 7 |
| Phase 4 | 2–3 weeks | Week 8 | Week 10 |
| Phase 5 | 2–3 weeks | Week 11 | Week 13 |
| Phase 6 | 1–2 weeks | Week 14 | Week 15 |
| Phase 7 | 1–2 weeks | Week 16 | Week 17 |
| **Total** | **~17 weeks** | | |

---

## References

- `docs/governance/guideforge-role-trust-canon.md` — Role definitions
- `docs/governance/guideforge-founder-authority.md` — Founder override behavior
- `docs/ai-reference/techsperts-ai-pattern.md` — Reference implementation

---

## Status and Next Steps

**Current Phase:** 0 (Documentation Complete)  
**Code Impact:** None (documentation only)  
**Schema Impact:** None (no changes yet)  

**Next Step:** Review and approve governance rules. When approved, proceed to Phase 1 (role/capability helpers).

