# Network Ownership & Authority Contract

> **Phase 2 Status:** Schema migration prepared and ready for manual deployment. See [Phase 2 SQL Migration](#phase-2-sql-migration) below.

## Purpose

This document defines who can own, edit, publish, and manage GuideForge networks before enforcement is added. It establishes the social contract and technical model for network access control, outlining the planned phases for transitioning from the current open builder model to a role-based ownership system.

---

## Core Roles

### Anonymous Visitor
- Not authenticated with Supabase Auth
- Can view public guide content (when public visibility is implemented)
- Cannot create networks or guides
- Cannot access builder interface

### Authenticated User
- Signed in with email/password via Supabase Auth
- Can create networks
- Can view all networks and guides (until visibility is enforced)
- Can edit any network/hub/collection/guide (currently non-blocking)
- Will become "Network Owner" when they create a network (Phase 3+)

### Network Owner
- Created the network OR explicitly assigned as owner
- Full permissions on the network and all contained hubs/collections/guides
- Can invite members and assign roles
- Can delete the network
- Can transfer ownership
- Is the authoritative user for the network

### Network Admin
- Explicitly assigned to a network by the owner
- Can manage network settings, hubs, collections, members
- Cannot delete the network or transfer ownership
- Can remove other admins (pending design)

### Network Editor
- Explicitly assigned to a network by the owner or admin
- Can create and edit guides, hubs, collections
- Cannot modify network settings or invite members
- Cannot delete guides or network content (destructive actions only by higher roles)

### Network Viewer
- Explicitly assigned to a network by the owner or admin
- Can view and comment on guides (when collaboration is implemented)
- Cannot edit or create guides
- Read-only access

---

## Current State

### What Exists Now
- **Auth Phase 2:** Supabase Auth is fully integrated. Users can sign up, sign in, and log out.
- **Account Phase 1:** Users can view their profile with display name and email.
- **Account Phase 3:** Profile bootstrap on sign-in with automatic profile creation for all authenticated users.
- **Account Phase 3B:** Signup display name synced from auth metadata into profiles table. Member-since date displayed on account page showing account creation month/year.
- **Account Phase 3C:** Signup form now stores display_name in auth metadata with aliases (display_name, name, full_name for compatibility). Auth callback route handles email confirmation. Profile bootstrap uses auth metadata priority: display_name > name > full_name > email-prefix fallback. Immediate profile creation after signup if session available, otherwise after email confirmation.
- **Governance Phase 7:** Member lookup by public profile display name and handle. Users can search for members by display name or handle instead of pasting UUID. UUID fallback available in Advanced section for development.
- **Builder is Non-Blocking:** All `/builder` routes load successfully even when logged out. No 401 errors or redirects.
- **Networks are Not Owned:** Networks are created without an owner_user_id field. Any authenticated user can create and edit any network.
- **RLS is Not Active:** No Row-Level Security policies are enforced. All networks and guides are visible to all users and modifiable by any user (via API calls).
- **This is Intentional:** The open builder model allows rapid prototyping and verification of the data spine without access control overhead. Enforcement will be added in phases after the ownership model is confirmed.

### Why This Design
- **Verification First:** The guide creation, lifecycle, and persistence workflow is proven and stable before adding access layers.
- **Non-Breaking Changes:** When ownership is added, existing networks will have `owner_user_id = null` until backfilled or explicitly assigned. Existing routes and dashboards will continue to work.
- **Auth Proven:** Supabase Auth is working correctly. Account management is ready for phase 2 (profile editing).
- **Next Steps:** Once this foundation is solid, Phase 2 begins adding owner fields and preparing enforcement.

---

## Phase 2 SQL Migration

**Status:** Prepared and ready for manual deployment to Supabase.

This migration adds ownership support without breaking existing networks.

```sql
-- Ownership Phase 2: Add owner_user_id to networks table
-- This migration is NON-BREAKING and NULLABLE
-- All existing networks continue working with owner_user_id = NULL

ALTER TABLE networks
ADD COLUMN owner_user_id uuid NULL
REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for efficient ownership queries (Phase 3+)
CREATE INDEX idx_networks_owner_user_id ON networks(owner_user_id);

-- Add a comment explaining the column purpose
COMMENT ON COLUMN networks.owner_user_id IS 'FK to auth.users(id) - the user who created/owns this network. Nullable to support legacy networks and signed-out creation.';
```

**What This Does:**
- ✓ Adds `owner_user_id` column to networks table (nullable, UUID type)
- ✓ References `auth.users(id)` with `ON DELETE SET NULL` (orphaned networks when user deleted)
- ✓ Creates index for efficient future lookups
- ✓ Non-breaking: all existing networks have `owner_user_id = NULL`
- ✓ No RLS added (Phase 6+)
- ✓ No auto-backfill (Phase 3+ handles new networks only)

**No Code Changes Yet:**
TypeScript types and `createNetwork()` helper are ready to be updated after schema is confirmed and deployed.

---

## Future Ownership Model

### Database Schema (Phase 2+)

**networks table changes:**
```sql
ALTER TABLE networks ADD COLUMN owner_user_id UUID REFERENCES auth.users(id) NULL;
ALTER TABLE networks ADD COLUMN created_by_user_id UUID REFERENCES auth.users(id) NULL;
-- These are initially nullable to avoid breaking existing networks
```

**New network_members table (Phase 5+):**
```sql
CREATE TABLE network_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  invited_at TIMESTAMP DEFAULT now(),
  joined_at TIMESTAMP,
  UNIQUE(network_id, user_id)
);
```

### Roles Definition

| Role | Level | Description |
|------|-------|-------------|
| **Owner** | 5 | Created the network or explicitly assigned. Full control. Can delete and transfer. |
| **Admin** | 4 | Assigned by owner. Can manage settings, members, content. Cannot delete network. |
| **Editor** | 3 | Assigned by owner/admin. Can create and edit guides, hubs, collections. Cannot modify settings. |
| **Viewer** | 2 | Assigned by owner/admin. Read-only access. Can view and comment (when collaboration added). |
| **Public** | 1 | Unauthenticated. Can view public content (when visibility controls added). |

---

## Permissions Matrix

| Action | Anonymous | Viewer | Editor | Admin | Owner | Notes |
|--------|-----------|--------|--------|-------|-------|-------|
| **View public network** | ✓ | ✓ | ✓ | ✓ | ✓ | Future: visibility toggles (Phase 4) |
| **View private network** | ✗ | ✓ | ✓ | ✓ | ✓ | Members only (Phase 5) |
| **Create network** | ✗ | ✗ | ✗ | ✗ | ✓ | Authenticated users only (Phase 3) |
| **Edit network settings** | ✗ | ✗ | ✗ | ✓ | ✓ | Name, slug, description |
| **Add/edit hubs** | ✗ | ✗ | ✓ | ✓ | ✓ | Structure controls (Phase 1 done) |
| **Add/edit collections** | ✗ | ✗ | ✓ | ✓ | ✓ | Structure controls (Phase 1 done) |
| **Create guides** | ✗ | ✗ | ✓ | ✓ | ✓ | New guide creation |
| **Edit guides** | ✗ | ✗ | ✓ | ✓ | ✓ | Modify title, content, metadata |
| **Mark Ready** | ✗ | ✗ | ✓ | ✓ | ✓ | Guide workflow (Phase done) |
| **Publish** | ✗ | ✗ | ✗ | ✓ | ✓ | Higher authority required (Phase 3+) |
| **Invite members** | ✗ | ✗ | ✗ | ✓ | ✓ | Assign roles (Phase 5) |
| **Remove members** | ✗ | ✗ | ✗ | ✓ | ✓ | (Phase 5) |
| **Delete guides** | ✗ | ✗ | ✗ | ✓ | ✓ | Destructive action (Phase 3+) |
| **Delete network** | ✗ | ✗ | ✗ | ✗ | ✓ | Owner only |
| **Transfer ownership** | ✗ | ✗ | ✗ | ✗ | ✓ | Reassign owner role |

---

## Enforcement Phases

### Phase 1: Documentation Only (Current)
- ✓ This document exists
- ✓ Roles are defined
- ✓ Permissions matrix is established
- ✓ Future phases are planned
- **Action:** Share with stakeholders for feedback and confirmation

### Phase 2: Add Owner Fields (Non-Breaking)
- Add `owner_user_id` (nullable) to networks table
- Do NOT enable RLS
- Do NOT modify guide persistence or dashboard loading
- Create migration script to backfill or leave nulls (decided later)
- Existing networks continue to work
- **Goal:** Prepare schema for enforcement without breaking anything

### Phase 3: Auto-Assign Owner on Create
- When authenticated user creates network: set `owner_user_id = current_user_id`
- Check user_id is not null before create (API level)
- New networks have an owner
- Old networks still have null owner_user_id
- **Goal:** New networks are immediately owned; old networks unaffected

### Phase 4: Display "Owned by You"
- Account page shows list of networks created by user (query where owner_user_id = current_user_id)
- Network cards in builder show owner info
- Dashboard shows ownership status
- No enforcement yet (all routes still non-blocking)
- **Goal:** User awareness of ownership; verify ownership tracking works

### Phase 5: Add Member Roles (Invite System)
- Create network_members table
- Implement invite flow (email invitations, links, etc.)
- Assign roles: owner, admin, editor, viewer
- Member list UI in network settings
- Permission checks in UI (hide edit buttons for viewers, etc.)
- Still no RLS (permission checks are advisory)
- **Goal:** Test role system in controlled UI before enforcement

### Phase 6: Add RLS Carefully (Phased Rollout)
- Enable RLS on networks table: SELECT/UPDATE/DELETE policies
- Initially allow-all to verify no regression
- Then add owner/member checks gradually
- Monitor for API errors and failed requests
- Have rollback plan ready
- **Goal:** Move permission enforcement to database layer

### Phase 7: Protect Destructive Actions (Final Phase)
- Enforce ownership for delete operations
- Require admin role for network settings changes
- Require editor+ role for guide creation
- API returns 403 Forbidden for unauthorized actions
- Builder routes may redirect to login if needed
- **Goal:** Complete access control enforcement

---

## Anti-Regression Rules

**Do NOT violate these guarantees:**

1. **Do Not Add RLS Without Migration Plan**
   - RLS changes can break existing queries silently
   - Always have a rollback strategy
   - Test in staging with real guide dashboards before production
   - Do not add RLS that would fail existing guide-loading queries

2. **Do Not Block Existing Builder Routes Suddenly**
   - `/builder/networks`, `/builder/network/:id/dashboard`, etc. must keep working
   - No surprise 401 or 403 errors
   - If access control is added, phases 6-7 must be planned carefully
   - Provide migration period for users

3. **Do Not Rewrite Guide Persistence**
   - The verified data spine (guide creation, lifecycle, publishing) must stay stable
   - Do not change how guides are fetched, saved, or marked ready
   - Do not modify the dashboard loading queries
   - Only add owner tracking alongside existing persistence

4. **Do Not Break the Verified Data Spine**
   - Network creation works
   - Hub/collection structure works
   - Guide creation/editing/deletion works
   - Mark Ready workflow works
   - Dashboard loads all guides correctly
   - These must remain unbroken forever

5. **Do Not Assume All Networks Have Owners**
   - Until backfill is done, `owner_user_id` may be null
   - Queries must handle null owners gracefully
   - Do not write `WHERE owner_user_id = user_id` without also checking created_by or allowing nulls
   - Backfill strategy must be decided before RLS is added

6. **Do Not Make Anonymous Access Fail Before Visibility is Implemented**
   - No 401 errors on public content without warning
   - Implement public/private visibility toggles first (Phase 4)
   - Then gates based on visibility (Phase 6)
   - Do not block anonymous users until they have a way to see public networks

---

## Manual Verification Checklist

Before advancing to each phase, verify:

### Every Phase: Core Systems Still Work

- [ ] **1. Existing networks still load**
  - Test: Navigate to `/builder/networks` while logged in
  - Check: All networks appear in the list
  - Expected: No API errors, all networks visible

- [ ] **2. Existing guide dashboards still load**
  - Test: Click into a network → Dashboard tab
  - Check: Guides tab shows all guides
  - Expected: Correct guide counts, no missing guides, all statuses shown

- [ ] **3. Existing network settings still save**
  - Test: Open network settings → change name → save
  - Check: Success message, name persists on reload
  - Expected: Settings form works, Supabase updates confirmed

- [ ] **4. Existing guide lifecycle still works**
  - Test: Create a new guide → edit → mark ready → publish
  - Check: Each step completes, status changes visually
  - Expected: No errors, guide shows final status correctly

- [ ] **5. Auth login/logout still works**
  - Test: Sign out → sign in with credentials → verify logged in
  - Check: Header shows user email/name, can access builder
  - Expected: Auth flows complete, session persists

- [ ] **6. Signed-out builder access remains unchanged**
  - Test: Log out, navigate to `/builder/networks`
  - Check: Page loads without redirect or 401
  - Expected: Builder routes remain non-blocking until enforcement phase

### Phase 2 Additional Checks

- [ ] **7. Schema migration succeeds**
  - Check: `ALTER TABLE networks ADD COLUMN owner_user_id...` runs
  - Check: New column is nullable and doesn't break existing queries
  - Expected: No data loss, existing networks have null owner_user_id

### Phase 3 Additional Checks

- [ ] **8. New networks are auto-assigned owner**
  - Test: Create new network while logged in
  - Check: `SELECT owner_user_id FROM networks WHERE id = ?`
  - Expected: owner_user_id = current_user_id

- [ ] **9. Existing networks have null owner (or backfilled)**
  - Test: Query old network created in Phase 1
  - Check: owner_user_id is null or has correct backfilled value
  - Expected: No sudden ownership changes

### Phase 4 Additional Checks

- [ ] **10. Account page shows owned networks**
  - Test: Account page → view networks owned by me
  - Check: Only networks with matching owner_user_id shown
  - Expected: Correct count, no unowned networks shown

### Phase 5 Additional Checks

- [ ] **11. Member invites work**
  - Test: Invite another user to network → they accept/join
  - Check: network_members table has entry with correct role
  - Expected: Member appears in network member list

### Phase 6 Additional Checks

- [ ] **12. RLS policies don't break guides dashboard**
  - Test: Enable RLS, load guides dashboard
  - Check: All guides still load, no permission errors
  - Expected: Dashboard works with RLS enabled

- [ ] **13. RLS policies don't break network settings**
  - Test: Enable RLS, open network settings, save a change
  - Check: Update completes, no permission denied
  - Expected: Settings still work with RLS

### Phase 7 Additional Checks

- [ ] **14. Unauthorized users get 403 forbidden**
  - Test: Logged in as User A, try to delete network owned by User B
  - Check: Request returns 403 Forbidden
  - Expected: Ownership is enforced

- [ ] **15. Viewers cannot create guides**
  - Test: Add user as Viewer to network, try to create guide
  - Check: Request rejected or button disabled
  - Expected: Viewer role is enforced

---

## Summary

This contract establishes that GuideForge will transition from the current open-access builder model to a role-based ownership and access control system. The transition will happen in seven phases over multiple releases, with each phase verified for non-regression before proceeding. The current state (Phase 1) is intentional and stable: auth works, the data spine is verified, and enforcement will come later after stakeholder confirmation of the ownership model.

The core guarantee is that existing networks, guides, and dashboards will continue to function throughout all phases. Ownership fields and RLS will be added carefully with rollback plans. Destructive actions will be enforced last, allowing users time to adapt. All changes will be non-breaking until a clear migration path is communicated.
