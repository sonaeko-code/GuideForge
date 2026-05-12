/**
 * Smart Fill Network - Heuristic Parser
 *
 * Parses user's rough idea about a network and fills in intelligent defaults.
 * Uses heuristic pattern matching to detect network type, theme, and suggested content.
 *
 * Future: Replace with OpenAI API call for more sophisticated parsing.
 */

import { slugify } from "./utils"
import type { NetworkType, ThemeDirection, NetworkDraft } from "./types"

interface SmartFillResult {
  name: string
  description: string
  type: NetworkType
  theme: ThemeDirection
  slug: string
  suggestedHubs?: string[]
  visibility: "public" | "private"
  success: boolean
  detectedKeywords?: string[]
  confidence?: number
}

/**
 * Parse a rough idea and fill network fields intelligently
 */
export function smartFillNetwork(roughIdea: string): SmartFillResult {
  if (!roughIdea || roughIdea.trim().length === 0) {
    return {
      name: "",
      description: "",
      type: "creator",
      theme: "parchment",
      slug: "",
      visibility: "private",
      success: false,
    }
  }

  const idea = roughIdea.toLowerCase()
  const words = idea.split(/\s+/)
  const detectedKeywords: string[] = []

  // ============ Type Detection ============
  let type: NetworkType = "creator"
  let typeScore = 0

  const typePatterns: Record<NetworkType, string[]> = {
    gaming: ["game", "gaming", "quest", "boss", "build", "rpg", "survival", "mmorpg", "steam", "dota", "wow", "raid", "dungeon", "esports"],
    repair: ["repair", "fix", "maintenance", "maintenance", "procedure", "step-by-step", "how-to fix", "troubleshoot", "broken", "broken", "diagnostic"],
    sop: ["process", "sop", "workflow", "business", "team", "procedure", "operational", "runbook", "standard", "protocol"],
    training: ["course", "training", "learn", "curriculum", "lesson", "educational", "school", "onboarding", "instructor"],
    creator: ["guide", "tutorial", "knowledge", "reference", "documentation", "personal", "portfolio"],
    community: ["community", "wiki", "crowdsourced", "collaborative", "shared", "forum", "discussion"],
  }

  for (const [networkType, patterns] of Object.entries(typePatterns)) {
    const matches = patterns.filter((p) => idea.includes(p)).length
    if (matches > typeScore) {
      typeScore = matches
      type = networkType as NetworkType
    }
    if (matches > 0) {
      detectedKeywords.push(...patterns.filter((p) => idea.includes(p)))
    }
  }

  // ============ Theme Detection ============
  let theme: ThemeDirection = "parchment"
  const themePatterns: Record<ThemeDirection, string[]> = {
    ember: ["gaming", "game", "quest", "fire", "warm", "energy", "fast-paced"],
    arcane: ["dark", "mystery", "complex", "fantasy", "advanced", "sophisticated", "arcane"],
    industrial: ["repair", "mechanical", "technical", "industrial", "engineering", "manufacturing"],
    neutral: ["professional", "business", "corporate", "neutral", "formal"],
    soft: ["wellness", "health", "personal", "gentle", "creative", "soft", "approachable"],
    copper: ["crafted", "vintage", "warm", "copper", "refined", "elegant"],
    parchment: ["knowledge", "educational", "learning", "teaching", "guide", "documentation"],
  }

  for (const [themeOption, patterns] of Object.entries(themePatterns)) {
    if (patterns.some((p) => idea.includes(p))) {
      theme = themeOption as ThemeDirection
      break
    }
  }

  // Match theme to network type if no specific theme match
  const typeToThemeMap: Record<NetworkType, ThemeDirection> = {
    gaming: "ember",
    repair: "industrial",
    sop: "industrial",
    creator: "parchment",
    training: "parchment",
    community: "copper",
  }
  if (typeScore >= 2) {
    theme = typeToThemeMap[type]
  }

  // ============ Name and Description Extraction ============
  // Try to extract a meaningful name from the idea
  let name = roughIdea.trim()

  // Limit name to first ~10 words
  const nameParts = name.split(/[.!?]/)
  if (nameParts.length > 0) {
    name = nameParts[0]
      .split(/\s+/)
      .slice(0, 10)
      .join(" ")
      .trim()
  }

  // If name is too short, augment it
  if (name.length < 5) {
    const typeNames: Record<NetworkType, string> = {
      gaming: "Gaming Guide Network",
      repair: "Repair & Maintenance Hub",
      sop: "Process & Procedures Hub",
      creator: "Knowledge Base",
      training: "Learning Network",
      community: "Community Knowledge Base",
    }
    name = typeNames[type]
  }

  // Description is the full idea, trimmed
  const description = roughIdea
    .replace(/\n+/g, " ")
    .trim()
    .substring(0, 300) // Limit to 300 chars

  // ============ Slug Generation ============
  const slug = slugify(name)

  // ============ Hub Suggestions ============
  const suggestedHubs = generateHubSuggestions(type, idea, words)

  const confidence = Math.min(100, (typeScore * 20 + (detectedKeywords.length > 0 ? 40 : 0)))

  return {
    name,
    description,
    type,
    theme,
    slug,
    suggestedHubs,
    visibility: "private",
    success: true,
    detectedKeywords: Array.from(new Set(detectedKeywords)).slice(0, 5),
    confidence,
  }
}

/**
 * Generate suggested hubs based on network type and idea
 */
function generateHubSuggestions(type: NetworkType, idea: string, words: string[]): string[] {
  const suggestions: Record<NetworkType, string[]> = {
    gaming: ["Beginner Guides", "Builds & Loadouts", "Boss Guides", "Patch Notes", "Community Highlights"],
    repair: ["Diagnostics", "Safety Procedures", "Model-Specific", "Tools & Equipment", "Troubleshooting"],
    sop: ["Getting Started", "Core Procedures", "Advanced Topics", "Compliance", "Team Resources"],
    creator: ["Fundamentals", "Intermediate", "Advanced", "Resources", "FAQ"],
    training: ["Onboarding", "Core Curriculum", "Advanced Topics", "Resources", "Assessment"],
    community: ["Getting Started", "Best Practices", "Community Highlights", "Resources", "Troubleshooting"],
  }

  const baseHubs = suggestions[type] || []

  // Try to detect custom hubs from the idea
  const customHubKeywords: Record<string, string> = {
    "survival": "Survival Mechanics",
    "crafting": "Crafting & Materials",
    "pvp": "PvP & Combat",
    "progression": "Progression Guide",
    "economy": "Economy & Trading",
    "farming": "Farming & Resources",
    "social": "Social & Multiplayer",
    "settings": "Configuration & Settings",
    "security": "Security & Auth",
    "performance": "Performance & Optimization",
  }

  for (const [keyword, hubName] of Object.entries(customHubKeywords)) {
    if (idea.includes(keyword)) {
      baseHubs.push(hubName)
    }
  }

  return baseHubs.slice(0, 5)
}
