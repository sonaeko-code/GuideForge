/**
 * Guide Mapper
 *
 * Converts between GeneratedGuide (from AI) and Guide (persistent model).
 * Handles all field mapping, defaults, and validation.
 *
 * Key transformations:
 * - GeneratedGuide.sections → Guide.steps (with order index)
 * - GeneratedAuthor → GuideAuthor (adds id)
 * - Ensures all required Guide fields are present
 * - Preserves generated content through the mapping
 */

import { makeTempId } from "./utils"
import type { GeneratedGuide, GeneratedGuideSection } from "./generation-schemas"
import type { Guide, GuideAuthor, GuideStep } from "./types"

/**
 * Convert a GeneratedGuide to a Guide with all required fields.
 * This is called when sending a generated guide to the editor.
 *
 * @param generated - The GeneratedGuide from the AI generator
 * @param context - Context info (networkId, hubId, collectionId)
 * @returns Guide - The fully mapped Guide object ready for persistence
 */
export function generatedGuideToGuide(
  generated: GeneratedGuide,
  context: {
    networkId: string
    hubId: string
    collectionId: string
  }
): Guide {
  const now = new Date().toISOString()
  const guideId = `guide_${makeTempId()}`

  console.log("[v0] Mapping GeneratedGuide to Guide")
  console.log("[v0] Generated title:", generated.title)
  console.log("[v0] Generated sections count:", generated.sections?.length || 0)
  console.log("[v0] Generated summary:", generated.summary)
  console.log("[v0] Generated difficulty:", generated.difficulty)
  console.log("[v0] Generated requirements:", generated.requirements)
  console.log("[v0] Context:", context)

  // Map author
  const author: GuideAuthor = {
    id: `author_${makeTempId()}`,
    displayName: generated.author?.displayName || "AI Generated",
    handle: generated.author?.handle || "ai.generated",
    avatarUrl: undefined,
  }

  // Map reviewer if present
  const reviewer = generated.reviewer
    ? {
        id: `reviewer_${makeTempId()}`,
        displayName: generated.reviewer.displayName,
        handle: generated.reviewer.handle,
        avatarUrl: undefined,
      }
    : undefined

  // Map sections to steps with proper ordering
  const steps: GuideStep[] = (generated.sections || []).map(
    (section: GeneratedGuideSection, index: number) => ({
      id: `step_${makeTempId()}`,
      guideId: guideId,
      order: index,
      kind: section.kind,
      title: section.title,
      body: section.body,
      isSpoiler: section.isSpoiler || false,
      callout: section.callout,
    })
  )

  console.log("[v0] Mapped steps:", steps.map((s) => ({ order: s.order, title: s.title })))

  const guide: Guide = {
    id: guideId,
    collectionId: context.collectionId,
    hubId: context.hubId,
    networkId: context.networkId,
    // Core guide data from generated
    slug: generated.slug || generateSlug(generated.title),
    title: generated.title || "Untitled Guide",
    summary: generated.summary || "No summary provided",
    type: generated.type,
    difficulty: generated.difficulty,
    status: "draft",
    verification: "unverified",
    // Optional fields
    requirements: generated.requirements || [],
    warnings: generated.warnings || [],
    version: generated.version,
    estimatedMinutes: generated.estimatedMinutes,
    // Steps (converted from sections)
    steps: steps,
    // Authors
    author: author,
    reviewer: reviewer,
    // Timestamps
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
    // Forge rules (empty at creation)
    forgeRulesCheckResult: undefined,
    forgeRulesCheckTimestamp: undefined,
  }

  console.log("[v0] Mapped Guide object:", {
    id: guide.id,
    title: guide.title,
    summary: guide.summary,
    stepsCount: guide.steps.length,
    requirements: guide.requirements,
    status: guide.status,
  })

  return guide
}

/**
 * Generate a URL-safe slug from a title.
 */
function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "guide"
  )
}
