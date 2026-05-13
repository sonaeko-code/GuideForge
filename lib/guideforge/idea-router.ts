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
  "step-by-step",
  "walkthrough",
  "instructions",
  "single guide",
  "one-off",
  "standalone",
  "reference",
  "quick guide",
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
  "write",
  "create",
  "produce",
]

/**
 * Count keyword matches in idea text, case-insensitive.
 */
function countKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.filter((kw) => lower.includes(kw)).length
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

/**
 * Main idea router function with improved routing priority.
 *
 * Priority rules:
 * 1. NETWORK: Multi-domain systems, household/family management, or broad organization needs
 * 2. CHECKLIST: Single, bounded task/routine/workflow
 * 3. SINGLE_GUIDE: Instructional/tutorial for one topic
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

  const checklistScore = countKeywords(idea, CHECKLIST_KEYWORDS)
  const networkScore = countKeywords(idea, NETWORK_KEYWORDS)
  const guideScore = countKeywords(idea, GUIDE_KEYWORDS)
  
  // Check for multi-domain/system signals that force NETWORK
  const hasMultipleDomains = /(\+|and|,|\s(plus|also)\s)/.test(idea) && idea.length > 100
  const hasSystemKeywords = /\b(system|network|hub|organize|family|household|emergency|maintenance)\b/i.test(idea)
  const hasMultipleChecklists = /\b(checklists?|lists?|routines?)\b/i.test(idea) && checklistScore < 3

  // Rule: Multi-domain systems always route to NETWORK
  if (hasMultipleDomains && hasSystemKeywords) {
    return {
      recommendedPath: "network",
      confidence: "high",
      detectedIntent: "Multi-domain household or organizational system",
      recommendedNetworkTypeId: detectNetworkType(idea),
      suggestedThemeId: suggestTheme(detectNetworkType(idea)),
      reasoning: [
        "Detected multiple interrelated domains and system-building intent.",
        "This is best served as a comprehensive network with organized hubs.",
      ],
      routeOptions: [
        {
          path: "network",
          label: `Build a ${detectNetworkType(idea)?.replace(/_/g, " ") || "multi-domain"} network`,
          description: "Organize all related guides and resources together",
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

  // Rule: High checklist score + low network score + short/bounded scope = CHECKLIST
  // But NOT if it mentions multiple items/categories
  if (
    checklistScore >= 2 &&
    checklistScore > networkScore &&
    checklistScore >= guideScore &&
    !hasMultipleDomains &&
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

  // Rule: Guide keywords + short scope + instructional tone = SINGLE_GUIDE
  if (
    guideScore >= 2 &&
    guideScore > networkScore &&
    guideScore > checklistScore &&
    idea.length < 200
  ) {
    return {
      recommendedPath: "single_guide",
      confidence: "medium",
      detectedIntent: "Single how-to guide or tutorial",
      reasoning: ["Detected instructional intent with focused scope."],
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

  // Default: NETWORK (most powerful and flexible)
  const typeId = detectNetworkType(idea)
  const confidence =
    networkScore >= 2 ? "high" : hasMultipleDomains ? "high" : "medium"

  return {
    recommendedPath: "network",
    confidence,
    detectedIntent: "Comprehensive guide network or system",
    recommendedNetworkTypeId: typeId,
    suggestedThemeId: suggestTheme(typeId),
    reasoning: [
      hasMultipleDomains
        ? "Multiple related domains detected—network provides best structure."
        : hasSystemKeywords
          ? "System-building intent detected."
          : "Longer scope or structured organization intent detected.",
    ],
    routeOptions: [
      {
        path: "network",
        label: typeId
          ? `Build a ${typeId.replace(/_/g, " ")} Network`
          : "Build a Network",
        description: typeId ? `Create a ${typeId.replace(/_/g, " ")} with hubs and guides` : "Full guide network",
      },
      {
        path: "checklist",
        label: "Create a Checklist Instead",
        description: "Task list or routine",
      },
      {
        path: "single_guide",
        label: "Create a Single Guide Instead",
        description: "Standalone tutorial",
      },
    ].slice(0, 3),
  }
}
