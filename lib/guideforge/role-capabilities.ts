/**
 * GuideForge Role & Capability Helpers
 *
 * Phase 1: Read-only role/capability model
 * Provides centralized type definitions and helper functions for role checking.
 * Components should use these helpers instead of hardcoding role logic.
 *
 * This module is read-only and non-enforcing in Phase 1.
 * Database enforcement (RLS) comes in Phase 7.
 * Voting logic comes in Phase 3+.
 */

// =========================================================================
// Type Definitions
// =========================================================================

/**
 * Global roles that apply across the entire GuideForge platform
 */
export type GuideForgeGlobalRole =
  | "founder"
  | "platform_admin"
  | "platform_moderator"
  | "user"

/**
 * Network-scoped roles that apply within a single network
 */
export type GuideForgeNetworkRole =
  | "owner"
  | "admin"
  | "reviewer"
  | "editor"
  | "contributor"
  | "member"
  | "viewer"

/**
 * Union of all possible roles (global + network)
 * Also allows unknown string roles for extensibility
 */
export type GuideForgeRole =
  | GuideForgeGlobalRole
  | GuideForgeNetworkRole
  | string

/**
 * Fine-grained capability that can be assigned to roles
 * Used for capability-based access control
 */
export type GuideForgeCapability =
  | "can_view_network"
  | "can_edit_network"
  | "can_create_guides"
  | "can_edit_guides"
  | "can_submit_for_review"
  | "can_review_guides"
  | "can_vote_review"
  | "can_publish_guides"
  | "can_archive_guides"
  | "can_manage_members"
  | "can_manage_network_roles"
  | "can_use_debug_tools"
  | "can_publish_override"
  | "can_recover_network"

// =========================================================================
// Constants
// =========================================================================

export const FOUNDER_ROLE = "founder"

/**
 * All valid global role values
 */
export const GLOBAL_ROLES: GuideForgeGlobalRole[] = [
  "founder",
  "platform_admin",
  "platform_moderator",
  "user",
]

/**
 * All valid network role values
 */
export const NETWORK_ROLES: GuideForgeNetworkRole[] = [
  "owner",
  "admin",
  "reviewer",
  "editor",
  "contributor",
  "member",
  "viewer",
]

/**
 * Roles that are allowed to use debug tools (see Debug Full Generation)
 *
 * TODO: Remove "developer" and "dev" once real platform role assignment exists.
 * These are temporary for current dev workflow until platform_admin is properly assigned.
 */
export const DEBUG_TOOL_ROLES = [
  "founder",
  "platform_admin",
  "admin",
  "developer",
  "dev",
]

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Normalize a role string to a known value
 * Returns the role if recognized, otherwise returns the input as-is
 * Returns empty string if input is null/undefined
 */
export function normalizeRole(role?: string | null): string {
  if (!role) return ""
  return role.toLowerCase().trim()
}

/**
 * Check if the role is the founder role
 * Founder has all capabilities and cannot be overridden
 */
export function isFounderRole(role?: string | null): boolean {
  const normalized = normalizeRole(role)
  return normalized === FOUNDER_ROLE
}

/**
 * Check if the role is a platform admin role
 * Platform admins have high platform-level capabilities
 * Platform admin is NOT the same as founder
 */
export function isPlatformAdminRole(role?: string | null): boolean {
  const normalized = normalizeRole(role)
  return normalized === "platform_admin"
}

/**
 * Check if the role is allowed to use debug tools
 * This is a convenience check for the Debug Full Generation feature
 *
 * Returns true for: founder, platform_admin, network admin, developer, dev
 * Returns false for all other roles
 */
export function canUseDebugTools(role?: string | null): boolean {
  const normalized = normalizeRole(role)
  return DEBUG_TOOL_ROLES.includes(normalized)
}

/**
 * Get the review vote weight for a role
 *
 * Vote weights:
 * - founder: 999 (special handling required; see note below)
 * - platform_admin: 10
 * - owner: 5
 * - admin: 3
 * - reviewer: 2
 * - editor: 1
 * - contributor/member/viewer: 0
 * - unknown roles: 0
 *
 * IMPORTANT: Founder vote weight should NOT be treated as a normal numeric vote.
 * Founder override must be handled separately and audited in Phase 6+.
 * Voting threshold logic (Phase 5+) must check for founder override separately.
 */
export function getReviewVoteWeight(role?: string | null): number {
  const normalized = normalizeRole(role)

  if (normalized === FOUNDER_ROLE) {
    // 999 indicates founder; voting logic must handle specially and audit
    return 999
  }

  switch (normalized) {
    case "platform_admin":
      return 10
    case "owner":
      return 5
    case "admin":
      return 3
    case "reviewer":
      return 2
    case "editor":
      return 1
    default:
      return 0
  }
}

/**
 * Check if a role has a specific capability
 *
 * Founder has ALL capabilities.
 * Platform admin has high platform capabilities.
 * Network roles have capabilities based on their level.
 *
 * In Phase 1, this is read-only and non-enforcing.
 * Enforcement comes in Phase 6+ (backend) and Phase 7 (RLS).
 */
export function hasGuideForgeCapability(
  role: string | null | undefined,
  capability: GuideForgeCapability
): boolean {
  const normalized = normalizeRole(role)

  // Founder has all capabilities
  if (normalized === FOUNDER_ROLE) {
    return true
  }

  // Platform admin has high-level capabilities
  if (normalized === "platform_admin") {
    switch (capability) {
      case "can_use_debug_tools":
      case "can_manage_members":
      case "can_manage_network_roles":
      case "can_publish_override":
      case "can_recover_network":
        return true
      default:
        return true // platform_admin can do everything except these require founder in some contexts
    }
  }

  // Network owner has full network capabilities
  if (normalized === "owner") {
    switch (capability) {
      case "can_view_network":
      case "can_edit_network":
      case "can_create_guides":
      case "can_edit_guides":
      case "can_submit_for_review":
      case "can_review_guides":
      case "can_vote_review":
      case "can_publish_guides":
      case "can_archive_guides":
      case "can_manage_members":
      case "can_manage_network_roles":
        return true
      case "can_use_debug_tools":
      case "can_publish_override":
      case "can_recover_network":
        return false // debug/override require higher privilege
      default:
        return false
    }
  }

  // Network admin has most capabilities except member management
  if (normalized === "admin") {
    switch (capability) {
      case "can_view_network":
      case "can_edit_network":
      case "can_create_guides":
      case "can_edit_guides":
      case "can_submit_for_review":
      case "can_review_guides":
      case "can_vote_review":
      case "can_publish_guides":
      case "can_archive_guides":
        return true
      case "can_manage_members":
      case "can_manage_network_roles":
      case "can_use_debug_tools":
      case "can_publish_override":
      case "can_recover_network":
        return false
      default:
        return false
    }
  }

  // Reviewer can view, review, and vote but not publish or manage
  if (normalized === "reviewer") {
    switch (capability) {
      case "can_view_network":
      case "can_review_guides":
      case "can_vote_review":
        return true
      default:
        return false
    }
  }

  // Editor can create and edit guides in their domain
  if (normalized === "editor") {
    switch (capability) {
      case "can_view_network":
      case "can_create_guides":
      case "can_edit_guides":
      case "can_submit_for_review":
        return true
      default:
        return false
    }
  }

  // Contributor can create and submit guides but not edit all
  if (normalized === "contributor") {
    switch (capability) {
      case "can_view_network":
      case "can_create_guides":
      case "can_submit_for_review":
        return true
      default:
        return false
    }
  }

  // Member/viewer can only view
  if (normalized === "member" || normalized === "viewer") {
    switch (capability) {
      case "can_view_network":
        return true
      default:
        return false
    }
  }

  // Unknown or user role
  if (normalized === "user" || normalized === "") {
    switch (capability) {
      case "can_view_network": // Can view public networks
        return true
      default:
        return false
    }
  }

  // Unknown role defaults to no capabilities
  return false
}
