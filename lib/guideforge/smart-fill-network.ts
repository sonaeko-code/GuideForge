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

  // Always override theme from type when we have confident type detection
  // The type map is more reliable than loose keyword matching on theme
  const typeToThemeMap: Record<NetworkType, ThemeDirection> = {
    gaming: "ember",
    repair: "industrial",
    sop: "industrial",
    creator: "parchment",
    training: "parchment",
    community: "copper",
  }
  if (typeScore >= 1) {
    theme = typeToThemeMap[type]
  }

  // ============ Name Extraction ============
  // Try to produce a short, real network title from the idea rather than
  // returning the raw sentence. Strategy:
  // 1. Strip leading filler phrases ("Build a", "Create a", "I want to build", etc.)
  // 2. Extract a specific topic/game/product name if detectable
  // 3. Append a type-appropriate suffix to make it feel branded

  const fillerPrefixes = [
    /^build\s+(a\s+)?/i,
    /^create\s+(a\s+)?/i,
    /^make\s+(a\s+)?/i,
    /^i\s+want\s+to\s+(build|create|make)\s+(a\s+)?/i,
    /^set\s+up\s+(a\s+)?/i,
    /^start\s+(a\s+)?/i,
    /^launch\s+(a\s+)?/i,
  ]

  let stripped = roughIdea.trim()
  for (const re of fillerPrefixes) {
    stripped = stripped.replace(re, "")
  }

  // Try to find a quoted or capitalized proper noun (game name, product, etc.)
  const quotedMatch = roughIdea.match(/["']([^"']+)["']/)
  const properNounMatch = stripped.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/)

  // Type-aware suffix and fallback name templates
  const typeSuffix: Record<NetworkType, string> = {
    gaming: "Guides",
    repair: "Repair Hub",
    sop: "Runbook",
    creator: "Guide Hub",
    training: "Learning Network",
    community: "Knowledge Base",
  }

  const typeDefaultNames: Record<NetworkType, string> = {
    gaming: "Game Guide Network",
    repair: "Repair & Maintenance Hub",
    sop: "Process & Procedures Portal",
    creator: "My Guide Hub",
    training: "Training Library",
    community: "Community Knowledge Base",
  }

  let name: string

  if (quotedMatch) {
    // Use quoted text as the core name
    name = `${quotedMatch[1]} ${typeSuffix[type]}`
  } else if (properNounMatch && properNounMatch[1].length > 2) {
    // Use detected proper noun
    name = `${properNounMatch[1]} ${typeSuffix[type]}`
  } else {
    // Fall back to a cleaned-up, concise version: take first meaningful noun phrase
    // Remove type-describing words and pick up to 3 specific words
    const stopWords = new Set([
      "gaming", "guide", "network", "hub", "platform", "site", "wiki",
      "a", "an", "the", "for", "with", "and", "or", "to", "in", "on",
      "guides", "knowledge", "base", "community", "repair", "training",
    ])
    const candidateWords = stripped
      .split(/\s+/)
      .filter((w) => !stopWords.has(w.toLowerCase()) && w.length > 2)
      .slice(0, 3)

    if (candidateWords.length >= 1) {
      // Capitalize first letters
      const core = candidateWords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
      name = `${core} ${typeSuffix[type]}`
    } else {
      name = typeDefaultNames[type]
    }
  }

  // Trim to a reasonable length
  if (name.length > 50) {
    name = name.substring(0, 47).trim() + "..."
  }

  // Description is the full idea, trimmed
  const description = roughIdea
    .replace(/\n+/g, " ")
    .trim()
    .substring(0, 300)

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
 * Generate suggested hubs based on network type and idea.
 * Prefers explicit topics mentioned in the rough idea over generic defaults.
 */
function generateHubSuggestions(type: NetworkType, idea: string, words: string[]): string[] {
  // Map of keyword → hub display name. More complete than before.
  const keywordToHub: Record<string, string> = {
    // Gaming / RPG
    "survival": "Survival Mechanics",
    "crafting": "Crafting & Materials",
    "pvp": "PvP & Combat",
    "build": "Builds & Loadouts",
    "builds": "Builds & Loadouts",
    "boss": "Boss Guides",
    "bosses": "Boss Guides",
    "patch": "Patch Notes",
    "beginner": "Beginner Guides",
    "progression": "Progression Guides",
    "economy": "Economy & Trading",
    "farming": "Farming & Resources",
    "multiplayer": "Multiplayer & Co-op",
    "lore": "Lore & World Building",
    "quest": "Quests & Missions",
    "strategy": "Strategy & Tactics",
    "strategies": "Strategy & Tactics",
    "community": "Community Highlights",
    "tier": "Tier Lists",
    "map": "Maps & Locations",
    // Repair / Technical
    "diagnostic": "Diagnostics & Testing",
    "safety": "Safety Procedures",
    "tools": "Tools & Equipment",
    "troubleshoot": "Troubleshooting",
    "maintenance": "Preventive Maintenance",
    "installation": "Installation Guides",
    // Training / SOP
    "onboarding": "Onboarding",
    "compliance": "Compliance & Policies",
    "workflow": "Workflows & Processes",
    "assessment": "Assessments & Quizzes",
    "curriculum": "Core Curriculum",
    "advanced": "Advanced Topics",
    // General
    "news": "News & Updates",
    "faq": "FAQ",
    "reference": "Reference",
    "getting started": "Getting Started",
    "resource": "Resources",
    "resources": "Resources",
    "settings": "Configuration & Settings",
    "performance": "Performance & Optimization",
    "security": "Security",
  }

  // Pull hubs detected directly from the idea
  const detected: string[] = []
  const seen = new Set<string>()
  for (const [keyword, hubName] of Object.entries(keywordToHub)) {
    if (idea.includes(keyword) && !seen.has(hubName)) {
      detected.push(hubName)
      seen.add(hubName)
    }
  }

  // Fallback defaults per type if we didn't detect enough
  const defaults: Record<NetworkType, string[]> = {
    gaming: ["Beginner Guides", "Builds & Loadouts", "Boss Guides", "Patch Notes", "Community Highlights"],
    repair: ["Diagnostics & Testing", "Safety Procedures", "Tools & Equipment", "Troubleshooting", "Preventive Maintenance"],
    sop: ["Getting Started", "Core Procedures", "Advanced Topics", "Compliance & Policies", "Team Resources"],
    creator: ["Fundamentals", "Intermediate", "Advanced Topics", "Resources", "FAQ"],
    training: ["Onboarding", "Core Curriculum", "Advanced Topics", "Resources", "Assessments & Quizzes"],
    community: ["Getting Started", "Best Practices", "Community Highlights", "Resources", "Troubleshooting"],
  }

  // Merge: detected first, then fill from defaults to reach 5
  const merged: string[] = [...detected]
  for (const d of defaults[type] || []) {
    if (!seen.has(d) && merged.length < 5) {
      merged.push(d)
    }
  }

  return merged.slice(0, 5)
}
