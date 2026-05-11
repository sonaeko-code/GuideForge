# GuideForge Founder Authority — Explicit Powers and Constraints

**Version:** 1.0  
**Status:** Governance Documentation (Phase 0 — No Code Implementation Yet)  
**Last Updated:** 2026-05-11  
**Owner:** GuideForge Product Team

---

## Overview

This document specifies the explicit powers of the `founder` role, the circumstances under which those powers are exercised, how founder actions are audited, and the constraints that prevent founder authority from being used carelessly.

---

## Founder as Root Authority

The `founder` is the singular root authority of the GuideForge platform. Founder authority is **not a super-admin role**; it is a distinct capability tier above all other roles.

### Key Principle: Explicitness and Audit

**All founder actions must be:**
1. **Explicit** — A conscious choice, not a side effect or default behavior
2. **Audited** — Logged with timestamp, reason, and affected resource
3. **Distinct from normal flows** — A dedicated UI/API path, not hidden in regular publishing
4. **Reversible** — Can be undone (with audit trail) in case of error

---

## Founder Global Powers

### 1. Universal Network Access

**Power:** Founder can access any network, view any guide, and exercise any network role's capabilities.

**Behavior:**
- Founder appears with elevated permissions in any network
- Founder's actions within a network are logged as founder-level overrides
- Founder can view all drafts, reviews, and voting status in any network
- Founder does not need to be invited to networks; access is implicit

**Audit Trail:**
```
{
  actor: "founder",
  action: "accessed_network",
  network_id: "net_123",
  timestamp: "2026-05-11T14:30:00Z",
  reason: "debug / moderation / recovery" (must specify)
}
```

---

### 2. Unilateral Guide Publish Override

**Power:** Founder can publish any guide regardless of voting status or review feedback.

**Behavior:**
- Founder can publish a draft guide directly without triggering the review workflow
- Founder can publish a guide that failed review voting
- Founder can bypass weighted voting thresholds
- Founder's override is logged separately from normal publishes

**Constraints:**
- Founder override must include a reason (stored in audit log)
- Override must be explicit (button click, not automatic)
- Override does not retroactively change the vote results (votes remain visible)
- Network members are notified that a founder override occurred

**Audit Trail:**
```
{
  actor: "founder",
  action: "publish_override",
  guide_id: "guide_456",
  network_id: "net_123",
  reason: "content recovery / quality gate failure / dispute resolution",
  timestamp: "2026-05-11T14:35:00Z",
  vote_status_before: { votes: [...], threshold: 10, total: 8 }
}
```

---

### 3. Unilateral Guide Archive/Recovery

**Power:** Founder can archive any guide or recover any archived guide.

**Behavior:**
- Founder can soft-delete (archive) any guide in any network
- Founder can restore (unarchive) any previously archived guide
- Archive/recovery is reversible and audited
- Network members are notified of founder-initiated archival

**Constraints:**
- Archival must include a reason
- Archival is logged immediately
- Archived guides remain in the database (soft-delete only; no permanent destruction)
- Recovery is available at any time

**Audit Trail:**
```
{
  actor: "founder",
  action: "archive_guide",
  guide_id: "guide_456",
  network_id: "net_123",
  reason: "spam / policy violation / incorrect content",
  timestamp: "2026-05-11T14:40:00Z",
  guide_snapshot: { title: "...", content: "...", author: "..." }
}
```

---

### 4. Network Role Emergency Assignment

**Power:** Founder can assign or revoke any network role in any network.

**Behavior:**
- Founder can promote a member to network owner (unusual, but possible for recovery)
- Founder can revoke an admin's role if they are inactive or compromised
- Founder can assign roles without owner consent
- Founder assignment bypasses normal workflows

**Constraints:**
- Each role assignment must include a reason
- Founder cannot mass-assign roles (one-by-one assignments only)
- Prior role is preserved in audit log (can be reverted manually)
- Network owner is notified of founder role changes in their network

**Audit Trail:**
```
{
  actor: "founder",
  action: "assign_network_role",
  user_id: "user_789",
  network_id: "net_123",
  role_old: "contributor",
  role_new: "admin",
  reason: "emergency moderation / active owner incapacitated",
  timestamp: "2026-05-11T14:45:00Z"
}
```

---

### 5. Platform Role Management

**Power:** Founder can assign/revoke global platform roles (platform_admin, platform_moderator).

**Behavior:**
- Founder is the only authority that can promote a user to `platform_admin`
- Founder can revoke any platform role
- Founder role itself cannot be revoked (immutable)

**Constraints:**
- Each role change must be explicit and reasoned
- Revocation is audited with retention of prior state
- Founder cannot create duplicate founder accounts

**Audit Trail:**
```
{
  actor: "founder",
  action: "assign_platform_role",
  user_id: "user_999",
  role_old: "user",
  role_new: "platform_admin",
  reason: "onboarding trusted admin",
  timestamp: "2026-05-11T14:50:00Z"
}
```

---

### 6. Audit Log Access and Export

**Power:** Founder has unrestricted read access to all audit logs.

**Behavior:**
- Founder can view the complete audit trail for any guide, network, user, or action
- Founder can export audit logs for compliance or forensic analysis
- Founder can view deleted/archived data from the audit trail
- Founder access to logs is itself logged (meta-audit)

**Constraints:**
- Founder cannot modify or delete audit logs (immutable once written)
- Log exports are timestamped and include export requester/timestamp

**Audit Trail:**
```
{
  actor: "founder",
  action: "export_audit_log",
  query: { network_id: "net_123", start_date: "2026-01-01" },
  result_count: 4523,
  timestamp: "2026-05-11T14:55:00Z"
}
```

---

### 7. Debug Tool and Diagnostic Surface Access

**Power:** Founder has unrestricted access to all debug and diagnostic surfaces.

**Behavior:**
- Founder can access the Debug Full Generation tool for any checklist/guide
- Founder can view system health, performance metrics, and error logs
- Founder can trigger diagnostic scans or data consistency checks
- Founder can access backend telemetry

**Constraints:**
- Debug actions are logged (especially if they trigger repairs or resets)
- Founder cannot modify production data through debug tools (read-only by default)
- If modification is needed, it must go through a separate override path (item #2, #3)

---

### 8. Governance Rule Modification (Future)

**Power:** In future phases, founder may be able to modify governance rules (voting thresholds, role definitions, etc.).

**Behavior:**
- Founder can change vote weight mappings
- Founder can modify review thresholds
- Founder can introduce new roles or retire old ones
- Changes affect future guides only (past votes are not retroactively changed)

**Constraints:**
- Rule changes are proposed and logged (not immediate)
- Changes require explicit confirmation
- Prior rules are preserved in audit trail (can be rolled back)

---

## What Founder Cannot Do

Explicitly, founder **cannot and should not:**

1. **Bypass audit logging.** All founder actions must be logged.
2. **Permanently delete guides or network data.** Archival is soft-delete; recovery is available.
3. **Permanently alter audit logs.** Logs are immutable once written.
4. **Create duplicate founder accounts.** There is only one founder per platform.
5. **Delegate founder authority.** Founder role cannot be transferred; only specific actions can be delegated to admins.
6. **Retroactively change voting on past publishes.** Published guides cannot be unpublished by vote manipulation.
7. **Modify user passwords or force account takeovers.** Founder authority over roles ≠ authority over user accounts.
8. **Silently override network decisions.** All overrides are logged and transparent to network members.

---

## Founder Override UI/UX Requirements

### When Displaying Founder Overrides

1. **Override Confirmation Dialog**
   - Clearly explain the action being overridden
   - Require explicit reason input (not optional)
   - Display any vote/review state before override
   - Require double-confirmation for sensitive actions (archive, publish over failed review)

2. **Notification to Network Members**
   - After a founder override, send a notification to the network owner/admins
   - Include the reason and timestamp
   - Provide a link to view the audit trail entry

3. **Audit Trail Transparency**
   - Founder overrides are marked as "founder_override" in the audit log
   - Display them visually differently in the guide history/revision lineage
   - Include full context (vote results, review feedback, reason)

### Example Flow for Publish Override

```
User clicks "Debug Full Generation" or "Override Publish":
  ↓
"Founder Override Confirmation" dialog opens:
  - Title: "Override Guide Publication"
  - Message: "This guide failed peer review (votes: 2/5). Are you sure?"
  - Reason input: [text field, required]
  - Radio buttons: [Conflict Resolution] [Recovery] [Testing] [Other]
  - Buttons: [Cancel] [Override] (Override is red/warning color)
  ↓
User enters reason and clicks Override:
  ↓
Backend logs audit entry and publishes guide:
  ↓
Network owner notified: "Founder published 'XYZ' (was in review)"
  ↓
Guide is published; audit log entry visible to founder and audit viewers
```

---

## Relationship: Founder vs. Network Owner vs. Admin

| Action | Founder | Network Owner | Network Admin |
|---|---|---|---|
| Publish without vote | Yes (override) | No (must vote) | No |
| Archive any guide | Yes | Only own network | Only own network |
| Assign network roles | Yes (any network) | Yes (own network) | Limited (no owner role) |
| Modify vote weights | Yes (global policy) | No | No |
| Export audit logs | All logs | Only own network | Only own network (if granted) |
| View all networks | Yes | Only own | Only own |
| Unilateral veto on publish | Yes (founder override) | No (advisory vote weight of 5) | No (advisory vote weight of 3) |

---

## Scenarios and Founder Responses

### Scenario 1: Controversial Guide Stuck in Review

**Problem:** A guide is under review; voting is close (4/5 for publish, 4 votes against). Review is stalled for days.

**Founder Options:**
- A. Wait for another vote to break the tie (normal flow)
- B. Vote with their own weight as a platform_admin (normal flow, but may bias results)
- C. Use override to publish with reason "breaking tie / consensus unachievable"
  - Recommended: Option C (explicit override is clearer than founder voting normally)

**Audit Log Entry:**
```
action: "publish_override"
reason: "stalled review / tie-breaking"
vote_status: { for: 4, against: 4, weight_for: 8, weight_against: 7 }
```

---

### Scenario 2: Spam or Compromised Guide

**Problem:** A guide contains malicious content or spam. Network owner is unresponsive.

**Founder Response:**
1. Archive the guide with reason: "spam / malicious content"
2. Notify network owner
3. Log the action; guide remains recoverable

**Audit Log Entry:**
```
action: "archive_guide"
reason: "spam / malicious content"
guide_id: "guide_compromised"
guide_snapshot: { title: "...", author: "...", content_preview: "..." }
```

---

### Scenario 3: Network Owner Incapacitated

**Problem:** The network owner has been inactive for 6 months; no one else can make publishing decisions.

**Founder Response:**
1. Assign a trusted contributor to `admin` role (or promote to owner if necessary)
2. Log the action with reason: "emergency continuity / owner inactive"
3. Notify remaining team members
4. Network can resume publishing workflow with new admin

---

### Scenario 4: Testing Debug Feature

**Problem:** Founder wants to test a new debug feature or governance workflow.

**Founder Response:**
1. Use Debug Full Generation in AI Generate mode
2. Optionally publish a test guide with override reason: "testing / debug"
3. Archive the test guide afterward
4. All actions are logged; no permanent impact

---

## Implementation Safeguards (Phase 1+)

When code is implemented:

1. **Backend Enforcement**
   - Only the `founder` user ID can trigger override actions
   - Override actions are marked in the database distinct from normal actions
   - Override actions cannot be triggered via API without reason payload

2. **Frontend Gating**
   - Override UI is only visible to founder
   - Override buttons are color-coded (red/warning)
   - Confirmation dialogs are mandatory, not skippable

3. **Audit Immutability**
   - Audit logs are append-only (no updates or deletes)
   - Audit logs include hash/signature (tamper detection)
   - Audit exports include verification metadata

4. **Role Cache Invalidation**
   - When founder assigns a role, the cache is invalidated immediately
   - User sees new permissions on next action/page reload

---

## Status and Next Steps

**Current Phase:** 0 (Documentation Only)  
**Code Impact:** None  
**Schema Impact:** None  

**Next Phase (Phase 1):** Read-only role/capability helpers will begin to check and respect founder authority (but not enforce it in code yet)

---

## References

- `docs/governance/guideforge-role-trust-canon.md` — Full role definitions and vote weights
- `docs/governance/guideforge-governance-implementation-plan.md` — Implementation phases and timelines

