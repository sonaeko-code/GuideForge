/**
 * GuideForge utilities
 * 
 * GuideForge Data Spine Contract:
 * - Status normalization centralizes all guide status values to three canonical buckets: draft | ready | published
 * - Mapping: draft→draft, ready/ready_to_publish→ready, published/active→published
 * - All guide filtering (dashboard tabs) must use normalizeGuideStatus for consistent bucketing
 * - Do not change status mappings or bypass normalization
 */

import type { Guide } from "./types"

/**
 * Generate a temporary or permanent ID for guides, steps, and other entities.
 * Uses crypto.randomUUID() if available (modern browsers/Node), falls back to Date + Math.random()
 */
export function makeTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random string
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Normalizes a guide's status to one of three canonical values: draft | ready | published
 * Handles edge cases where status might be ready_to_publish, active, or other variants.
 * 
 * Mapping:
 * - "draft" → "draft"
 * - "ready", "ready_to_publish" → "ready"
 * - "published", "active" → "published"
 * - unknown values → "draft"
 * 
 * @param status - The raw status value
 * @returns Normalized status: "draft" | "ready" | "published"
 */
export function normalizeGuideStatus(status: string | undefined | null): "draft" | "ready" | "published" | "archived" {
  if (!status) return "draft"
  
  const normalized = status.toLowerCase().trim()
  
  if (normalized === "draft") return "draft"
  if (normalized === "ready" || normalized === "ready_to_publish") return "ready"
  if (normalized === "published" || normalized === "active") return "published"
  if (normalized === "archived") return "archived"
  
  // Defensive: unknown status defaults to draft
  console.warn("[v0] normalizeGuideStatus: Unknown status value", { status, defaulted: "draft" })
  return "draft"
}

/**
 * Normalizes a guide's display status for consistent UI representation.
 * Handles edge cases where status might be in-review, pending, or other transient states.
 * 
 * @param guide - The guide to normalize
 * @returns A normalized status string: "draft" | "ready" | "published" | "archived"
 */
export function getGuideDisplayStatus(guide: Guide | Partial<Guide>): "draft" | "ready" | "published" | "archived" {
  const status = guide.status as string
  return normalizeGuideStatus(status)
}

/**
 * Checks if a guide is in a mutable state (can be edited).
 * Only published guides are effectively immutable in the UI.
 * 
 * @param guide - The guide to check
 * @returns true if the guide can be edited, false if published
 */
export function isGuideMutable(guide: Guide | Partial<Guide>): boolean {
  const status = getGuideDisplayStatus(guide)
  return status !== "published"
}

/**
 * Filters guides by their normalized status.
 * 
 * @param guides - Array of guides to filter
 * @param targetStatus - The status to filter by (uses normalized values)
 * @returns Filtered guides matching the target status
 */
export function filterGuidesByStatus(
  guides: Guide[],
  targetStatus: "draft" | "ready" | "published" | "archived"
): Guide[] {
  return guides.filter((g) => normalizeGuideStatus(g.status) === targetStatus)
}

/**
 * Filters out archived guides.
 * Used to exclude archived guides from active dashboard tabs.
 * 
 * @param guides - Array of guides to filter
 * @returns Guides excluding archived status
 */
export function filterOutArchived(guides: Guide[]): Guide[] {
  return guides.filter((g) => normalizeGuideStatus(g.status) !== "archived")
}

/**
 * Converts a string to a URL-safe slug.
 * Converts to lowercase, removes special characters, replaces spaces with hyphens.
 * 
 * @param str - The string to slugify
 * @returns URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

/**
 * Ownership Phase 2: Determine owner status of a network
 * Returns a label based on relationship between network owner and current user
 * 
 * @param ownerUserId - The network's owner user ID (from database)
 * @param currentUserId - The current logged-in user's ID
 * @returns Status label: "Owned by you" | "No owner assigned" | "Owned by another user"
 */
export function getNetworkOwnershipStatus(
  ownerUserId: string | null | undefined,
  currentUserId: string | null | undefined
): "owned-by-you" | "no-owner" | "owned-by-other" {
  if (!ownerUserId) {
    return "no-owner"
  }
  if (currentUserId && ownerUserId === currentUserId) {
    return "owned-by-you"
  }
  return "owned-by-other"
}

/**
 * Get human-readable label for ownership status
 */
export function getOwnershipLabel(status: "owned-by-you" | "no-owner" | "owned-by-other"): string {
  switch (status) {
    case "owned-by-you":
      return "Owned by you"
    case "no-owner":
      return "No owner assigned"
    case "owned-by-other":
      return "Owned by another user"
  }
}


