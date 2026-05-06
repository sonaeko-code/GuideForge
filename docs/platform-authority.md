# Platform Authority — Roles System

GuideForge has two distinct role systems that operate at different scopes: **Platform-level roles** apply across the entire GuideForge platform, while **Network-level roles** apply only within individual networks.

## Platform-Level Roles

Platform roles determine a user's authority across GuideForge. These are system-wide and independent of any specific network.

### Platform Role Types

- **founder**: The person who created/owns GuideForge. Super-admin with all capabilities. (Usually one person or organization.)
- **platform_admin**: Full platform authority. Can moderate, oversee networks, manage platform policies.
- **platform_moderator** (or supervisor): Platform-level authority for moderation and enforcement of platform policies.
- **support**: Can assist users across the platform. May have read-only access to networks for troubleshooting.
- **user**: Standard GuideForge user. No platform authority.

### Platform Role Scope

- Applied across the entire GuideForge instance
- Control platform-wide features, policies, moderation
- Should NOT automatically give network-level authority
- Should NOT automatically enable network content editing
- Separate from network-level roles

## Network-Level Roles

Network roles determine a user's authority within a specific network. Users can have different roles in different networks.

### Network Role Types

- **owner**: Created the network or was designated as owner. Can manage all network settings including members, roles, and permissions.
- **admin**: Designated by the owner. Full authority within the network to manage members and content.
- **reviewer**: Can review submitted guides and approve/reject them. May vote on reviews.
- **contributor**: Can submit guides for review.
- **member**: Has access to the network but limited permissions (view-only unless role grants more).
- **viewer**: Read-only access to network content.

### Network Role Scope

- Applied only within one specific network
- User can have different roles in different networks
- Network-level authority is independent of platform-level authority
- Network owners are NOT automatically platform admins
- Network authority is governed by the network's own policies and RLS

## Relationship Between Platform and Network Roles

### Key Principles

1. **Orthogonal Systems**: Platform roles and network roles are separate. They do NOT combine or stack.
   - A platform_admin without a network role has NO authority in that network.
   - A network owner without platform authority is NOT a platform admin.

2. **No Automatic Elevation**: Roles do NOT automatically escalate or grant additional authority.
   - Network ownership does NOT make someone a platform admin.
   - Platform admin authority does NOT automatically make someone a network owner.
   - Support staff do NOT automatically get network access.

3. **Single Platform Role, Multiple Network Roles**: Users can have exactly one platform role, but can have many network roles (one per network).
   - Example: Alice is a `user` (platform) and `owner` in Network A, `admin` in Network B, `contributor` in Network C.

4. **Moderation vs. Ownership**: Platform moderation (if needed) is separate from network ownership.
   - A platform_moderator can enforce platform policies but should NOT rewrite network content without explicit emergency/escalation rules (to be defined later).
   - Network owners manage their own networks' policies independently.

## Future RLS Implementation

When Row-Level Security (RLS) policies are implemented, they must account for both layers:

```sql
-- Example: Allow user to see network members
-- RLS must check:
-- 1. Is the user the network owner? (network-level check)
-- 2. OR is the user a platform_admin? (platform-level check with restrictions)
-- 3. Are they a member with canViewMembers permission? (network-level check)

-- Checks should NOT automatically elevate platform admins into networks
-- Checks should NOT assume network owners have platform authority
```

## Anti-Regression Rules

To prevent confusion and security issues, maintain these rules:

1. **Do not collapse platform roles and network roles into one system.**
   - Keep them orthogonal. If merging seems necessary, that's a sign the design needs re-evaluation.

2. **Do not expose full user UUIDs to normal users by default.**
   - Display user names (profiles.display_name) or handles (profiles.handle) as primary.
   - UUIDs can be shown in development/admin tools or via title attributes for accessibility/copying.
   - This prevents information leakage and improves UX.

3. **Do not give platform users automatic network ownership.**
   - Platform authority should NOT grant network-level access or ownership.
   - If a platform feature needs network access, explicitly request it or require consent.

4. **Do not let network owners become platform admins automatically.**
   - Network ownership is network-local authority only.
   - Platform admin must be explicitly assigned by a platform founder/admin.
   - Network authority does NOT scale to platform level.

## Future Features: Site-Wide Search

Site-wide search should eventually search across GuideForge:

- **Networks**: Search by name, description, tags
- **Hubs**: Search by name and content (future feature)
- **Collections**: Search by name and organization (future feature)
- **Guides**: Search by title, content, tags
- **Public Profiles**: Search by display_name or handle (NOT email for privacy)

Site-wide search implementation should respect:
- RLS policies for network visibility
- User privacy (no email exposure)
- Performance considerations for large instances

This feature is deferred until the platform architecture is more mature. When implemented, search should integrate cleanly with both platform and network authority checks.

## Summary

- **Platform roles**: Founder, admin, moderator, support, user. Scope: entire platform.
- **Network roles**: Owner, admin, reviewer, contributor, member, viewer. Scope: one network.
- **Independent**: Do not automatically escalate or combine.
- **Privacy**: Use display_name/handle as primary identifiers, not UUIDs.
- **Future**: Search, moderation rules, and emergency escalation procedures to be defined.
