/**
 * GuideForge utilities
 */

import type { Guide } from "./types"

/**
 * Normalizes a guide's display status for consistent UI representation.
 * Handles edge cases where status might be in-review, pending, or other transient states.
 * 
 * @param guide - The guide to normalize
 * @returns A normalized status string: "draft" | "ready" | "published"
 */
export function getGuideDisplayStatus(guide: Guide | Partial<Guide>): "draft" | "ready" | "published" {
  const status = guide.status as string

  // Explicit mappings for known statuses
  if (status === "draft") return "draft"
  if (status === "ready") return "ready"
  if (status === "published") return "published"

  // Fallback for in-review, pending, or other transient states → treat as draft
  if (status === "in-review" || status === "pending" || !status) {
    console.warn("[v0] getGuideDisplayStatus: Unknown status mapped to draft", { status, guideId: guide.id })
    return "draft"
  }

  // Defensive: unknown status defaults to draft
  console.warn("[v0] getGuideDisplayStatus: Unmapped status defaulting to draft", { status, guideId: guide.id })
  return "draft"
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
 * Filters guides by their display status.
 * 
 * @param guides - Array of guides to filter
 * @param targetStatus - The status to filter by
 * @returns Filtered guides matching the target status
 */
export function filterGuidesByStatus(
  guides: Guide[],
  targetStatus: "draft" | "ready" | "published"
): Guide[] {
  return guides.filter((g) => getGuideDisplayStatus(g) === targetStatus)
}
