/**
 * GuideForge utilities
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
export function normalizeGuideStatus(status: string | undefined | null): "draft" | "ready" | "published" {
  if (!status) return "draft"
  
  const normalized = status.toLowerCase().trim()
  
  if (normalized === "draft") return "draft"
  if (normalized === "ready" || normalized === "ready_to_publish") return "ready"
  if (normalized === "published" || normalized === "active") return "published"
  
  // Defensive: unknown status defaults to draft
  console.warn("[v0] normalizeGuideStatus: Unknown status value", { status, defaulted: "draft" })
  return "draft"
}

/**
 * Normalizes a guide's display status for consistent UI representation.
 * Handles edge cases where status might be in-review, pending, or other transient states.
 * 
 * @param guide - The guide to normalize
 * @returns A normalized status string: "draft" | "ready" | "published"
 */
export function getGuideDisplayStatus(guide: Guide | Partial<Guide>): "draft" | "ready" | "published" {
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
  targetStatus: "draft" | "ready" | "published"
): Guide[] {
  return guides.filter((g) => normalizeGuideStatus(g.status) === targetStatus)
}
