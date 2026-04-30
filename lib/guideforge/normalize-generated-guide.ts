import type { GeneratedGuide } from "./generation-schemas"
import type { Guide, GuideStep } from "./types"

/**
 * Normalize a GeneratedGuide into a proper Guide object.
 * Handles shape differences and fills in required fields with defaults.
 * 
 * GeneratedGuide has:
 *   - sections: GeneratedGuideSection[]
 * 
 * Guide needs:
 *   - steps: GuideStep[] (with id, guideId, order, etc.)
 *   - id, collectionId, hubId, networkId
 *   - status, verification
 *   - author (with id field)
 */
export function normalizeGeneratedGuide(
  generated: any,
  guideId: string
): Guide {
  // Safely extract sections or steps from generated guide
  const sections = generated.sections || generated.steps || []

  // Convert sections to steps
  const steps: GuideStep[] = sections.map((section: any, index: number) => ({
    id: section.id || `step_${index}`,
    guideId,
    order: index,
    kind: section.kind || "custom",
    title: section.title || "Untitled Section",
    body: section.body || "",
    isSpoiler: section.isSpoiler || false,
    callout: section.callout,
  }))

  // Safely extract author
  const author = generated.author || {}

  return {
    id: guideId,
    collectionId: generated.collectionId || generated.targetCollectionId || "mock-collection",
    hubId: generated.hubId || generated.targetHubId || "mock-hub",
    networkId: generated.networkId || generated.targetNetworkId || "network_questline",

    slug: generated.slug || `guide-${guideId}`,
    title: generated.title || "Untitled Guide",
    summary: generated.summary || "",

    type: generated.type || "character-build",
    difficulty: generated.difficulty || "intermediate",
    status: "draft",
    verification: "unverified",

    requirements: generated.requirements || [],
    warnings: generated.warnings || [],

    version: generated.version,
    estimatedMinutes: generated.estimatedMinutes,

    steps: steps.length > 0 ? steps : createDefaultSteps(guideId),

    author: {
      id: `author_${guideId}`,
      displayName: author.displayName || "AI Generated",
      handle: author.handle || "ai.generated",
      avatarUrl: author.avatarUrl,
    },
    reviewer: generated.reviewer
      ? {
          id: `reviewer_${guideId}`,
          displayName: generated.reviewer.displayName || "",
          handle: generated.reviewer.handle || "",
          avatarUrl: generated.reviewer.avatarUrl,
        }
      : undefined,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Create default empty steps if the generated guide has no sections.
 * Prevents crashes when steps array is empty.
 */
function createDefaultSteps(guideId: string): GuideStep[] {
  return [
    {
      id: "step_0",
      guideId,
      order: 0,
      kind: "overview",
      title: "Overview",
      body: "This section is empty. Click to add content.",
      isSpoiler: false,
    },
  ]
}
