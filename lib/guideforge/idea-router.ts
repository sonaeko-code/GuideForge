/**
 * GuideForge Idea Router
 *
 * Analyzes a rough user idea and recommends the best creation path:
 * - Build a full network (with hubs/collections/guides)
 * - Create a single guide (one-off tutorial/reference)
 * - Create a checklist (one-time or repeatable task list)
 *
 * Uses local heuristics to detect intent from keywords and structure.
 */

import type { ThemeDirection } from "./types"

export type RecommendedPath = "network" | "single_guide" | "checklist"
export type Confidence = "low" | "medium" | "high"

export interface IdeaRouterResult {
  recommendedPath: RecommendedPath
  confidence: Confidence
  detectedIntent: string
  recommendedNetworkTypeId?: string
  suggestedThemeId?: ThemeDirection
  suggestedTitle?: string
  reasoning: string[]
  routeOptions: RouteOption[]
}

export interface RouteOption {
  path: RecommendedPath
  label: string
  description: string
}

// Keyword-based detection rules
const CHECKLIST_KEYWORDS = [
  "checklist",
  "tasks",
  "routine",
  "daily",
  "weekly",
  "todo",
  "medicine",
  "medication",
  "tracking",
  "habit",
  "streak",
  "repeat",
  "repeatable",
  "recurring",
]

const NETWORK_KEYWORDS = [
  "organize",
  "system",
  "library",
  "hub",
  "guide network",
  "guide hub",
  "knowledge base",
  "knowledge system",
  "playbook",
  "runbook",
  "portal",
  "platform",
  "guide ecosystem",
  "comprehensive",
  "structured",
]

const GUIDE_KEYWORDS = [
  "tutorial",
  "how to",
  "how-to",
  "step-by-step",
  "walkthrough",
  "walkthrough",
  "instructions",
  "single guide",
  "one-off",
  "standalone",
  "reference",
  "quick guide",
  "guide for",
  "create a guide",
  "create a tutorial",
  "make a tutorial",
  "publishing",
  "uploading",
  "create a",
  "make a",
  "teach",
  "explain",
]

const GAMING_KEYWORDS = [
  "game",
  "gaming",
  "rpg",
  "mmo",
  "raid",
  "build",
  "build guide",
  "boss",
  "patch",
  "survival",
  "quest",
]

const HOME_KEYWORDS = [
  "home",
  "house",
  "family",
  "household",
  "maintenance",
  "seasonal",
  "emergency",
  "parent",
  "kids",
  "routine",
  "hvac",
  "plumbing",
  "appliance",
]

const BUSINESS_KEYWORDS = [
  "business",
  "team",
  "process",
  "workflow",
  "sop",
  "procedure",
  "standard operating",
  "operations",
  "company",
  "organization",
  "training",
  "onboarding",
]

const WELLNESS_KEYWORDS = [
  "wellness",
  "health",
  "fitness",
  "nutrition",
  "mental",
  "wellness program",
  "routine",
  "coaching",
  "protocol",
]

const CREATOR_KEYWORDS = [
  "creator",
  "youtube",
  "twitch",
  "streaming",
  "content",
  "podcast",
  "publish",
  "publishing",
  "write",
  "create",
  "produce",
  "upload",
  "uploading",
  "video",
  "channel",
]

/**
 * Main idea router function with improved routing priority.
 *
 * Priority rules:
 * 1. NETWORK: Multi-domain systems, broad organization intent, or household/family signals
 * 2. CHECKLIST: Single bounded task/routine, no system signals
 * 3. SINGLE_GUIDE: Instructional intent with one-topic scope
 */
export function routeIdea(roughIdea: string): IdeaRouterResult {
  const idea = roughIdea.trim()
  if (!idea) {
    return {
      recommendedPath: "network",
      confidence: "low",
      detectedIntent: "Unclear intent",
      reasoning: ["No idea provided. Defaulting to network creation."],
      routeOptions: [
        {
          path: "network",
          label: "Build a network",
          description: "Full guide network with hubs and collections",
        },
        {
          path: "single_guide",
          label: "Create a guide",
          description: "Single how-to guide or tutorial",
        },
        {
          path: "checklist",
          label: "Create a checklist",
          description: "Task or routine checklist",
        },
      ],
    }
  }

  const lowerIdea = idea.toLowerCase()
  const checklistScore = countKeywords(idea, CHECKLIST_KEYWORDS)
  const networkScore = countKeywords(idea, NETWORK_KEYWORDS)
  const guideScore = countKeywords(idea, GUIDE_KEYWORDS)
  const homeScore = countKeywords(idea, HOME_KEYWORDS)
  const businessScore = countKeywords(idea, BUSINESS_KEYWORDS)

  // Detect multi-domain signals: multiple categories, items, or topics separated by commas/conjunctions
  const hasMultipleCategories =
    /(?:,|and|also|include|plus|with|plus|together)/.test(lowerIdea) &&
    idea.split(/[,.]/).length >= 2
  const hasSystemKeywords =
    /\b(system|organize|library|hub|knowledge|network|portal|playbook|runbook|structure|framework)\b/i.test(
      lowerIdea
    )
  const hasBroadScope = idea.length > 150

  // RULE 1: Multi-domain household/family systems → NETWORK
  if (
    (homeScore >= 2 || businessScore >= 2) &&
    (hasMultipleCategories || hasSystemKeywords || hasBroadScope)
  ) {
    const typeId = detectNetworkType(idea)
    return {
      recommendedPath: "network",
      confidence: "high",
      detectedIntent: "Multi-domain household or organizational system",
      recommendedNetworkTypeId: typeId,
      suggestedThemeId: suggestTheme(typeId),
      reasoning: [
        "Detected multiple related domains and system-building intent.",
        "This is best served as a comprehensive network with organized hubs.",
      ],
      routeOptions: [
        {
          path: "network",
          label: typeId
            ? `Build a ${typeId.replace(/_/g, " ")} network`
            : "Build a Network",
          description:
            typeId &&
            typeId !== "general"
              ? `Create a ${typeId.replace(/_/g, " ")} with hubs and guides`
              : "Full guide ecosystem",
        },
        {
          path: "checklist",
          label: "Create a Checklist Instead",
          description: "Focus on one repeatable task or routine",
        },
        {
          path: "single_guide",
          label: "Create a Single Guide Instead",
          description: "Standalone tutorial for one topic",
        },
      ],
    }
  }

  // RULE 2: High checklist score + low system signals + bounded scope → CHECKLIST
  // BUT only if no strong multi-domain or system signals
  if (
    checklistScore >= 2 &&
    checklistScore > networkScore &&
    checklistScore >= guideScore &&
    !hasSystemKeywords &&
    idea.length < 300
  ) {
    return {
      recommendedPath: "checklist",
      confidence: checklistScore >= 3 ? "high" : "medium",
      detectedIntent: "Repeatable or one-time task checklist",
      reasoning: [
        `Found ${checklistScore} checklist-related keywords.`,
        "Single focused task workflow detected.",
      ],
      routeOptions: [
        {
          path: "checklist",
          label: "Create a Checklist",
          description: "One-time or repeatable task list",
        },
        {
          path: "network",
          label: "Build a Network Instead",
          description: "Full guide ecosystem with hubs and collections",
        },
        {
          path: "single_guide",
          label: "Create a Single Guide Instead",
          description: "Standalone tutorial",
        },
      ],
    }
  }

  // RULE 3: High guide score + instructional intent + short scope → SINGLE_GUIDE
  // Guide keywords should beat Network for tutorial/instructional prompts
  // UNLESS the prompt clearly asks for a system/network
  if (
    guideScore >= 2 &&
    guideScore > checklistScore &&
    !hasSystemKeywords &&
    idea.length < 300
  ) {
    // If guide score is significantly higher than network score, it's a guide
    // Or if guide keywords appear with tutorial/create signals and no system signals
    const isStrongGuide =
      guideScore > networkScore ||
      (/\b(tutorial|how to|walkthrough|create a guide|publishing|uploading)\b/i.test(lowerIdea) &&
        !hasMultipleCategories)
    
    if (isStrongGuide) {
      return {
        recommendedPath: "single_guide",
        confidence: guideScore >= 3 ? "high" : "medium",
        detectedIntent: "Single how-to guide or tutorial",
        reasoning: [
          "Detected instructional intent with focused scope.",
          "No system-building signals detected."
        ],
        routeOptions: [
          {
            path: "single_guide",
            label: "Create a Guide",
            description: "Single tutorial or how-to",
          },
          {
            path: "network",
            label: "Build a Network Instead",
            description: "Full guide ecosystem with hubs and collections",
          },
          {
            path: "checklist",
            label: "Create a Checklist Instead",
            description: "Task list or routine",
          },
        ],
      }
    }
  }

  // RULE 4: Default → NETWORK (most flexible and powerful)
  const typeId = detectNetworkType(idea)
  const confidence = networkScore >= 2 ? "high" : "medium"
  const reason =
    hasMultipleCategories || hasBroadScope
      ? "Multiple related topics or broad scope detected—network provides best structure."
      : hasSystemKeywords
        ? "System-building intent detected."
        : "Longer scope or structured organization intent detected."

  return {
    recommendedPath: "network",
    confidence,
    detectedIntent: "Comprehensive guide network or system",
    recommendedNetworkTypeId: typeId,
    suggestedThemeId: suggestTheme(typeId),
    reasoning: [reason],
    routeOptions: [
      {
        path: "network" as const,
        label: typeId
          ? `Build a ${typeId.replace(/_/g, " ")} network`
          : "Build a Network",
        description:
          typeId && typeId !== "general"
            ? `Create a ${typeId.replace(/_/g, " ")} with hubs and guides`
            : "Full guide ecosystem",
      },
      {
        path: "checklist" as const,
        label: "Create a Checklist Instead",
        description: "Task list or routine",
      },
      {
        path: "single_guide" as const,
        label: "Create a Single Guide Instead",
        description: "Standalone tutorial",
      },
    ].slice(0, 3),
  }
}

/**
 * Detect the likely network type from keywords.
 */
function detectNetworkType(idea: string): string | undefined {
  const scores: Record<string, number> = {
    gaming: countKeywords(idea, GAMING_KEYWORDS),
    home_systems: countKeywords(idea, HOME_KEYWORDS),
    small_business: countKeywords(idea, BUSINESS_KEYWORDS),
    wellness_training: countKeywords(idea, WELLNESS_KEYWORDS),
    creator_workflow: countKeywords(idea, CREATOR_KEYWORDS),
  }

  const highest = Math.max(...Object.values(scores))
  if (highest === 0) return undefined

  return Object.entries(scores).find(([, score]) => score === highest)?.[0]
}

/**
 * Count how many keywords from a list appear in the text (case-insensitive).
 */
function countKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase()
  return keywords.reduce((count, kw) => {
    const wordBoundaryRegex = new RegExp(`\\b${kw}\\b`, "gi")
    const matches = lowerText.match(wordBoundaryRegex)
    return count + (matches ? matches.length : 0)
  }, 0)
}

/**
 * Suggest a theme based on detected type and tone.
 */
function suggestTheme(typeId?: string): ThemeDirection | undefined {
  const themeMap: Record<string, ThemeDirection> = {
    gaming: "ember",
    home_systems: "parchment",
    tech_repair: "industrial",
    small_business: "neutral",
    wellness_training: "soft",
    creator_workflow: "arcane",
    personal_knowledge: "copper",
  }
  return typeId ? themeMap[typeId] : undefined
}
