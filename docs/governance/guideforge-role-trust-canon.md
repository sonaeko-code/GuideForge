# GuideForge Role and Trust Model — Canonical Definition

**Version:** 1.0  
**Status:** Governance Documentation (Phase 0 — No Code Implementation Yet)  
**Last Updated:** 2026-05-11  
**Owner:** GuideForge Product Team

---

## Purpose

This document defines the canonical role model and trust hierarchy for GuideForge. It establishes the semantic meaning of roles, their scope (global vs. network-scoped), and their relationship to one another.

This is a foundational policy document. Implementation follows in separate phases (Phase 1–7).

---

## Core Philosophy

GuideForge operates on a **dual-scoped authority model**:

1. **Global Scope** — Platform-level roles that operate across all networks
2. **Network Scope** — Per-network roles that are scoped to individual networks

**Key Principle:** Founder is the root authority that operates globally and can exercise any capability across any scope. Network roles are independently meaningful but never override Founder authority.

---

## Global Roles (Platform-Wide)

### founder

**Definition:** The permanent root authority of the GuideForge platform.

**Authority Level:** Absolute (all-access)

**Capabilities:**
- Access to **all global roles** and **all network roles** across **all networks**
- Access to all admin/dev/debug surfaces
- Access to all governance recovery and override paths
- Can view, edit, create, review, and publish any guide/checklist in any network
- Can manage platform roles and network role assignments
- Can perform founder overrides on publish decisions
- Can trigger audit logs and recovery workflows
- Can access full diagnostic and telemetry data
- Can modify governance rules (in future phases)

**Distinctness:** Founder is **explicitly not an admin**. It is a **distinct root role**. Do not merge or collapse founder into the admin role.

**Single Instance:** Only one active founder account per platform instance.

**Scope:** Global (not network-scoped)

---

### platform_admin

**Definition:** High platform authority; manages governance, moderation, and platform health (but not root authority).

**Authority Level:** High (most privileges except override/recovery)

**Capabilities:**
- Manage platform roles (assign/revoke `platform_admin`, `platform_moderator`, `user`)
- Manage network creation and deletion
- Manage network role assignments across networks
- Moderate content and users (warn, suspend, enforce ToS)
- View platform-wide analytics and audit logs
- Perform certain governance actions (e.g., unlock guides, reset voting on disputed publishes)
- Cannot unilaterally override founder decisions
- Cannot perform founder-only recovery actions

**Scope:** Global (not network-scoped)

---

### platform_moderator

**Definition:** Platform-level moderation and policy enforcement (lower authority than admin).

**Authority Level:** Medium (limited to moderation)

**Capabilities:**
- Report/flag inappropriate content or user behavior
- Submit moderation requests (staff review required)
- View ToS policies and community guidelines
- Cannot directly suspend or moderate users
- Cannot manage roles
- Cannot override governance decisions

**Scope:** Global (not network-scoped)

---

### user

**Definition:** Standard platform user (default role for authenticated users).

**Authority Level:** User-level (no platform-wide privileges)

**Capabilities:**
- Create and manage own networks
- Participate in networks where invited
- Exercise network-scoped roles (owner, admin, reviewer, etc.)
- Cannot manage other users' platform roles
- Cannot access platform-wide admin or debug surfaces

**Scope:** User-level (gains network-scoped privileges through network role assignment)

---

## Network-Scoped Roles

Each network maintains an independent role structure. A user can hold different roles in different networks (e.g., `owner` in Network A, `reviewer` in Network B, `member` in Network C).

### Network Roles (High to Low Authority)

#### owner

**Definition:** Network owner; full control over a single network.

**Network Authority:** Highest (within network)

**Capabilities (within their network):**
- Create, edit, archive guides and checklists
- Invite and remove members
- Assign and revoke network roles
- Configure network settings and visibility
- Approve/reject guide publishes
- Override within-network votes (up to weighted threshold)
- Audit network activity and member actions
- Delete/recover network data (with audit trail)
- Cannot override Founder authority

**Scope:** Single network (not cross-network)

---

#### admin

**Definition:** Network administrator; high authority within a network (but not owner).

**Network Authority:** High

**Capabilities (within their network):**
- Create, edit, archive guides and checklists
- Invite members
- Assign and revoke network roles (except owner)
- Configure most network settings
- Approve/reject guide publishes
- Vote on reviews with high weight (vote weight = 3)
- Cannot assign owner role
- Cannot unilaterally override owner decisions
- Cannot delete network data

**Scope:** Single network

---

#### reviewer

**Definition:** Peer reviewer; provides quality feedback and weighted vote on guide publishes.

**Network Authority:** Medium

**Capabilities (within their network):**
- View all guides and drafts
- Create and edit own guides/checklists
- Vote on reviews (vote weight = 2)
- Submit guides for review
- Comment and provide feedback
- Cannot approve publishes unilaterally
- Cannot manage members or roles
- Cannot archive other members' guides

**Scope:** Single network

---

#### editor

**Definition:** Content contributor with elevated privileges; can edit own and others' guides.

**Network Authority:** Medium-Low

**Capabilities (within their network):**
- Create and edit guides and checklists (own or on behalf of network)
- View all guides and drafts
- Vote on reviews (vote weight = 1)
- Submit guides for review
- Cannot approve publishes
- Cannot manage members
- Cannot archive guides unilaterally

**Scope:** Single network

---

#### contributor

**Definition:** Content contributor; can create and submit guides for review.

**Network Authority:** Low

**Capabilities (within their network):**
- Create own guides and checklists
- Edit own guides
- Submit own guides for review
- View published guides
- Cannot vote on reviews (vote weight = 0)
- Cannot edit others' guides
- Cannot view drafts not their own
- Cannot archive guides

**Scope:** Single network

---

#### member/viewer

**Definition:** Standard network member with read-only access (or limited participation).

**Network Authority:** Minimal

**Capabilities (within their network):**
- View published guides and checklists
- Comment and ask questions
- Submit guides for review (if contributor role added later)
- Cannot vote
- Cannot edit guides
- Cannot manage members

**Scope:** Single network

---

## Capability Model

The capability model defines granular permissions independent of roles. Each role grants a set of capabilities, and capabilities can be composable.

**Proposed Capabilities:**

| Capability | Description |
|---|---|
| `can_view_network` | View network and its published guides |
| `can_view_drafts` | View draft guides in network |
| `can_edit_network_settings` | Configure network properties (name, description, visibility) |
| `can_create_guides` | Create new guides in network |
| `can_edit_guides` | Edit guides (own or others' depending on role) |
| `can_submit_for_review` | Submit guides for peer review/voting |
| `can_review_guides` | View and comment on guides under review |
| `can_vote_review` | Vote on guide publishes (weight varies by role) |
| `can_publish_guides` | Approve/publish guides to network |
| `can_archive_guides` | Archive/soft-delete guides |
| `can_invite_members` | Invite users to network |
| `can_manage_members` | Remove members or adjust membership |
| `can_manage_network_roles` | Assign/revoke network roles |
| `can_use_debug_tools` | Access debug surfaces and diagnostics |
| `can_publish_override` | Override voting/approval (owner/founder only) |
| `can_recover_network` | Recover deleted guides or network state |

---

## Vote Weight Model (Weighted Review)

When a guide is submitted for review, network members vote on whether it should be published. Each vote carries a weight based on the voter's network role.

**Proposed Vote Weights (per role, per network):**

| Role | Vote Weight | Can Vote |
|---|---|---|
| founder (global) | Override (all-access, explicit audit) | Yes — override |
| network owner | 5 | Yes |
| platform_admin | 5 (where applicable) | Yes |
| network admin | 3 | Yes |
| reviewer | 2 | Yes |
| editor | 1 | Yes |
| contributor | 0 | No (but can submit) |
| member/viewer | 0 | No |

---

## Constraints and Invariants

1. **Founder is singular and permanent.**
   - There is only one founder per platform instance.
   - Founder role cannot be transferred or revoked.

2. **Network roles do not override global authority.**
   - Even a network owner cannot override founder decisions.
   - Founder can exercise any network role's capabilities within any network.

3. **One vote per user per guide.**
   - A user can vote only once on whether a specific guide should be published.
   - Voting is tracked to prevent double-voting.

4. **Weighted voting is backend-derived.**
   - Vote weight is computed on the backend based on the user's current role at the time of voting.
   - Frontend cannot override or manipulate vote weight.

5. **AI-generated guides are draft-only until reviewed.**
   - Guides generated by AI remain in draft state until submitted for review and approved.
   - Direct frontend publishing bypasses governance; this is not permitted.

6. **Founder override is explicit and audited.**
   - Any founder override must be logged to the audit trail.
   - Founder override is a distinct action from normal voting.

7. **Roles are immutable within a voting session.**
   - If a user's role changes during an active vote, the vote weight is recomputed after the change.
   - Past votes are not retroactively adjusted.

---

## Role Assignment Rules

### Assigning Global Roles

- **founder:** Cannot be assigned; established at platform creation
- **platform_admin:** Assigned by founder only
- **platform_moderator:** Assigned by platform_admin or founder
- **user:** Default role; all authenticated users receive this role

### Assigning Network Roles

- **owner:** Assigned by founder or existing owner (only once per network)
- **admin:** Assigned by owner or admin
- **reviewer:** Assigned by owner or admin
- **editor:** Assigned by owner or admin
- **contributor:** Assigned by owner or admin
- **member/viewer:** Default when joining a public network; can be assigned by owner

---

## Terminology and Definitions

| Term | Definition |
|---|---|
| **Guide** | A published or draft document/workflow for a topic (e.g., "How to Debug a Server") |
| **Checklist** | A task-oriented list (e.g., "Pre-launch Checklist"), a specific type of guide |
| **Network** | A group of users and their shared guides/checklists with independent role assignments |
| **Publishing** | Transitioning a guide from draft/under-review to published (visible to network/public) |
| **Review** | The process of peer voting on whether a draft guide should be published |
| **Override** | A founder-only action to publish or archive a guide without weighted voting |
| **Audit Trail** | A log of all role changes, publishes, overrides, and governance actions |

---

## Future Extensions (Not Included in Phase 0)

1. **Voting threshold policies** — Define minimum vote weight needed for a guide to publish
2. **Role expiration** — Automatically revoke roles after a set time if not renewed
3. **Capability grants** — Allow custom capability sets per role in future phases
4. **Cross-network roles** — E.g., "trusted reviewer across all networks" (future scoping discussion)
5. **Delegation** — Allow an admin to temporarily delegate owner authority (with audit)

---

## References and Related Docs

- `docs/governance/guideforge-founder-authority.md` — Detailed founder override behavior
- `docs/governance/guideforge-governance-implementation-plan.md` — Phased rollout strategy
- `docs/ai-reference/techsperts-ai-pattern.md` — Techsperts trust engine (reference)
- `docs/ai-reference/guideforge-cross-repo-context.md` — Network and guide definition

---

## Status and Next Steps

**Current Phase:** 0 (Documentation Only)  
**Code Impact:** None — this is governance definition only  
**Schema Impact:** None — no database changes yet  

**Next Phase (Phase 1):** Read-only role and capability helpers (no enforcement)

