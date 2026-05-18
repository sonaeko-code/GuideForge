/**
 * Mock Network Skeleton Generator
 *
 * Generates realistic network skeleton proposals for UI testing and MVP demonstration.
 * Uses the AI Network Generation Blueprint to create structured proposals.
 *
 * Future: Replace with real OpenAI/Claude API calls.
 */

import type {
  NetworkSkeletonGenerationRequest,
  NetworkSkeletonGenerationResponse,
  GeneratedNetworkSkeleton,
  GeneratedHubWithCollections,
  GeneratedCollectionWithGuides,
  GeneratedGuideIdea,
  ForgeRulesSuggestions,
  GuideDNASuggestions,
} from "./generation-schemas"
import { slugify } from "./utils"
import type { GuideType } from "./types"

/**
 * Generate a network skeleton proposal based on user input.
 * This is a mock implementation that returns realistic but deterministic data.
 */
export async function generateNetworkSkeletonMock(
  request: NetworkSkeletonGenerationRequest
): Promise<NetworkSkeletonGenerationResponse> {
  // Simulate network request latency
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    // Generate network
    const network = generateNetworkProposal(request)

    // Generate hubs with collections and guide ideas
    const hubs = Array.from({ length: request.numberOfHubs }).map((_, hubIdx) =>
      generateHubProposal(request, hubIdx)
    )

    // Generate Forge Rules suggestions
    const forgeRules = generateForgeRulesSuggestions(request)

    // Generate Guide DNA suggestions
    const guideDNA = generateGuideDNASuggestions(request)

    // Generate assumptions and missing info
    const assumptions = [
      "Users have basic familiarity with the topic",
      `Target audience: ${request.intendedAudience}`,
      `Tone: ${request.tone}`,
    ]

    const missingInfo = []
    if (!request.optionalNotes.trim()) {
      missingInfo.push("No specific context provided. Consider adding domain-specific terminology or edge cases.")
    }

    return {
      network,
      hubs,
      forgeRulesSuggestions: forgeRules,
      guideDNASuggestions: guideDNA,
      assumptions,
      missingInfo,
      success: true,
    }
  } catch (err) {
    console.error("[v0] Mock generator error:", err)
    return {
      network: {} as any,
      hubs: [],
      forgeRulesSuggestions: { global: [], networkSpecific: [] },
      guideDNASuggestions: {} as any,
      assumptions: [],
      missingInfo: [],
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}

/**
 * Generate a network proposal.
 */
function generateNetworkProposal(request: NetworkSkeletonGenerationRequest): GeneratedNetworkSkeleton {
  const networkSlug = slugify(request.networkTopic)

  return {
    name: request.networkTopic,
    slug: networkSlug,
    description: request.networkPurpose,
    audience: request.intendedAudience,
    tone: request.tone,
    type: "community",
    theme: "neutral",
    visibility: "private",
    domain: undefined,
    suggestedHubs: [],
    generatedAt: new Date().toISOString(),
    generatedBy: "mock",
  }
}

/**
 * Generate a hub proposal with collections and guide ideas.
 */
function generateHubProposal(request: NetworkSkeletonGenerationRequest, hubIdx: number): GeneratedHubWithCollections {
  const hubCategories = ["Fundamentals", "Intermediate", "Advanced", "Deep Dives", "Tools & Setup"]
  const hubName = hubCategories[hubIdx] || `Hub ${hubIdx + 1}`
  const hubSlug = slugify(hubName)

  // Generate collections for this hub
  const collections = Array.from({ length: request.collectionsPerHub }).map((_, collIdx) =>
    generateCollectionProposal(request, collIdx)
  )

  return {
    name: hubName,
    slug: hubSlug,
    description: `Collection of ${request.guideIdeasPerCollection * request.collectionsPerHub} guides covering ${hubName.toLowerCase()} aspects of ${request.networkTopic}`,
    tagline: `Master ${hubName.toLowerCase()}`,
    hubKind: "topic",
    collections,
    suggestedCollections: [],
    generatedAt: new Date().toISOString(),
    generatedBy: "mock",
  }
}

/**
 * Generate a collection proposal with guide ideas.
 */
function generateCollectionProposal(
  request: NetworkSkeletonGenerationRequest,
  collIdx: number
): GeneratedCollectionWithGuides {
  const collectionNames = ["Essentials", "Common Patterns", "Best Practices", "Advanced Techniques", "Troubleshooting"]
  const collectionName = collectionNames[collIdx] || `Collection ${collIdx + 1}`
  const collectionSlug = slugify(collectionName)

  // Generate guide ideas for this collection
  const guideIdeas = Array.from({ length: request.guideIdeasPerCollection }).map((_, guideIdx) =>
    generateGuideIdea(request, collIdx, guideIdx)
  )

  return {
    name: collectionName,
    slug: collectionSlug,
    description: `${collectionName} for ${request.networkTopic}`,
    defaultGuideType: "tutorial",
    guideIdeas,
    generatedAt: new Date().toISOString(),
    generatedBy: "mock",
  }
}

/**
 * Generate a single guide idea.
 */
function generateGuideIdea(
  request: NetworkSkeletonGenerationRequest,
  collIdx: number,
  guideIdx: number
): GeneratedGuideIdea {
  const guideTitles = [
    "Getting Started",
    "Best Practices",
    "Common Mistakes",
    "Advanced Patterns",
    "Troubleshooting Guide",
    "Case Study",
    "Quick Reference",
    "Deep Dive",
    "Pro Tips",
    "FAQ",
  ]

  const title = `${guideTitles[(collIdx * 5 + guideIdx) % guideTitles.length]}: ${request.networkTopic}`
  const slug = slugify(title.substring(0, 50))

  const difficulties = ["beginner", "intermediate", "advanced"]
  const difficulty = difficulties[guideIdx % difficulties.length] as "beginner" | "intermediate" | "advanced" | "expert"

  return {
    title,
    slug,
    summary: `Learn about ${request.networkTopic.toLowerCase()} - part ${guideIdx + 1}`,
    audience: request.intendedAudience,
    difficulty,
    guideType: (request.guideTypeEmphasis[0] as GuideType) || "tutorial",
    tags: [request.networkTopic.split(" ")[0].toLowerCase(), "guide"],
  }
}

/**
 * Generate Forge Rules suggestions.
 */
function generateForgeRulesSuggestions(request: NetworkSkeletonGenerationRequest): ForgeRulesSuggestions {
  return {
    global: [
      "All guides must include a clear learning objective",
      "Include at least one example or case study",
      "Assume beginner-level foundational knowledge",
      "Use consistent terminology throughout",
    ],
    networkSpecific: [
      `Guides should be written in a ${request.tone} tone`,
      `Target audience: ${request.intendedAudience}`,
      `Focus on ${request.guideTypeEmphasis.join(", ")} guide types`,
      "Include estimated reading time",
      "Provide actionable takeaways at the end of each guide",
    ],
  }
}

/**
 * Generate Guide DNA suggestions.
 */
function generateGuideDNASuggestions(request: NetworkSkeletonGenerationRequest): GuideDNASuggestions {
  const layoutStyles: Record<string, string> = {
    questline: "narrative with step-by-step progression",
    comprehensive: "structured with detailed sections and cross-references",
    minimal: "concise bullet points and quick reference format",
  }

  return {
    tone: request.tone,
    layoutStyle: layoutStyles[request.referenceStyle] || "structured and clear",
    contentPriorities: [
      "Practical application over theory",
      "Real examples over abstract concepts",
      "User outcomes over feature enumeration",
    ],
    badgeLanguage: "Guides are verified when they meet all Forge Rules and have been reviewed by network moderators",
  }
}
