/**
 * Smart Fill Network - Heuristic Parser
 *
 * Parses user's rough idea about a network and fills in intelligent defaults.
 * Uses heuristic pattern matching to detect network type, theme, and suggested content.
 *
 * Future: Replace with OpenAI API call for more sophisticated parsing.
 */

import { slugify } from "./utils"
import type { ThemeDirection, NetworkDraft } from "./types"
import { NETWORK_TYPE_REGISTRY, getDefaultRegistryId } from "./network-types"

/**
 * A starter guide idea inferred from the hub/collection name.
 * Proposal-only: these are not saved to Supabase in the scaffold creation flow
 * unless explicitly passed to save-network-skeleton.ts's guideIdeas array.
 * Use them to give the user a sense of what guides to create first.
 */
export interface StarterGuideIdea {
  title: string
  summary: string
  guideType: string
  difficulty: string
}

export interface SmartFillCollectionSuggestion {
  name: string
  slug: string
  description: string
  /** Starter guide ideas for this collection. Proposal-only — not persisted in this bundle. */
  starterGuideIdeas?: StarterGuideIdea[]
}

export interface SmartFillHubSuggestion {
  name: string
  slug: string
  description: string
  collections: SmartFillCollectionSuggestion[]
}

export interface SmartFillScaffoldSuggestion {
  hubs: SmartFillHubSuggestion[]
}

export interface SmartFillResult {
  name: string
  description: string
  /** Registry UI id (e.g. "gaming", "personal_knowledge"). Validated against VALID_REGISTRY_IDS. */
  type: string
  theme: ThemeDirection
  slug: string
  /** Flat hub-name list (legacy callers). */
  suggestedHubs?: string[]
  /** Hierarchical hubs+collections suggestion for the Step 2 preview / Step 3 editor. */
  suggestedScaffold?: SmartFillScaffoldSuggestion
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
      type: getDefaultRegistryId(),
      theme: "parchment",
      slug: "",
      visibility: "private",
      success: false,
    }
  }

  const idea = roughIdea.toLowerCase()
  const words = idea.split(/\s+/)
  const detectedKeywords: string[] = []

  // ============ Type Detection — driven by the registry ============
  // Build a keyword→registryId map from all enabled entries.
  let typeId: string = getDefaultRegistryId()
  let typeScore = 0

  for (const entry of NETWORK_TYPE_REGISTRY) {
    if (!entry.enabled) continue
    const matches = entry.keywords.filter((p) => idea.includes(p))
    if (matches.length > typeScore) {
      typeScore = matches.length
      typeId = entry.id
    }
    detectedKeywords.push(...matches)
  }

  // Resolved theme from the winning registry entry
  const resolvedEntry = NETWORK_TYPE_REGISTRY.find((e) => e.id === typeId)

  // ============ Theme Detection ============
  let theme: ThemeDirection = resolvedEntry?.defaultTheme ?? "parchment"

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

  // Registry entry theme always wins when type was confidently detected
  if (typeScore >= 1 && resolvedEntry) {
    theme = resolvedEntry.defaultTheme
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

  // Type-aware suffix and fallback name templates (keyed by registry id)
  const typeSuffix: Record<string, string> = {
    gaming: "Guides",
    tech_repair: "Repair Hub",
    home_systems: "Home Guide",
    small_business: "Runbook",
    restaurant_training: "Operations Hub",
    wellness_training: "Wellness Guide",
    creator_workflow: "Workflow Hub",
    personal_knowledge: "Notebook",
    general: "Knowledge Base",
  }

  const typeDefaultNames: Record<string, string> = {
    gaming: "Game Guide Network",
    tech_repair: "Repair Guides Hub",
    home_systems: "Home Systems Library",
    small_business: "Business Launch Hub",
    restaurant_training: "Team Onboarding System",
    wellness_training: "Wellness Program Library",
    creator_workflow: "Creator Toolkit Hub",
    personal_knowledge: "Personal Knowledge Hub",
    general: "Knowledge Hub",
  }

  // Domain-anchor keywords: short, brandable nouns we'll bias toward when crafting a title.
  // These describe the "thing" the network is about (a genre, a product family, etc.).
  const DOMAIN_ANCHORS: Record<string, string> = {
    // Gaming anchors
    "survival": "Survival",
    "rpg": "RPG",
    "mmorpg": "MMORPG",
    "mmo": "MMO",
    "fps": "FPS",
    "moba": "MOBA",
    "roguelike": "Roguelike",
    "fantasy": "Fantasy",
    "sci-fi": "Sci-Fi",
    "shooter": "Shooter",
    "strategy": "Strategy",
    "esports": "Esports",
    "speedrun": "Speedrun",
    "crafting": "Crafting",
    "racing": "Racing",
    "sandbox": "Sandbox",
    "fighting": "Fighting",
    "platformer": "Platformer",
    "deckbuilder": "Deckbuilder",
    "soulslike": "Soulslike",
    // Home/maintenance anchors
    "hvac": "HVAC",
    "plumbing": "Plumbing",
    "electrical": "Electrical",
    "appliance": "Appliance",
    "automotive": "Automotive",
    "lawn": "Lawn",
    "garden": "Garden",
    "seasonal": "Seasonal",
    // Repair/device anchors
    "laptop": "Laptop",
    "printer": "Printer",
    "mobile": "Mobile Device",
    "phone": "Phone",
    "device": "Device",
    // Team/business anchors
    "onboarding": "Onboarding",
    "compliance": "Compliance",
    "safety": "Safety",
    "sop": "SOP",
    "restaurant": "Restaurant",
    "kitchen": "Kitchen",
    "food": "Food Service",
    // Wellness anchors
    "fitness": "Fitness",
    "wellness": "Wellness",
    "nutrition": "Nutrition",
    "mental": "Mental Health",
    "coaching": "Coaching",
    // Creator anchors
    "youtube": "YouTube",
    "streaming": "Streaming",
    "podcast": "Podcast",
    "tiktok": "TikTok",
    "twitch": "Twitch",
    "content": "Content",
    // Knowledge anchors
    "photography": "Photography",
    "music": "Music",
    "design": "Design",
    "marketing": "Marketing",
    "parenting": "Parenting",
    "family": "Family",
    "home": "Home",
  }

  // Find up to 2 domain anchors mentioned in the idea, preserving first-seen order.
  const detectedAnchors: string[] = []
  const seenAnchors = new Set<string>()
  for (const word of words) {
    const cleaned = word.replace(/[^a-z-]/g, "")
    const anchor = DOMAIN_ANCHORS[cleaned]
    if (anchor && !seenAnchors.has(anchor)) {
      detectedAnchors.push(anchor)
      seenAnchors.add(anchor)
      if (detectedAnchors.length === 2) break
    }
  }

  // Type-aware descriptor word that goes between the anchor and the suffix,
  // e.g. "Survival RPG Strategy Guides" or "Laptop Repair Hub".
  const typeDescriptor: Record<string, string> = {
    gaming: "Strategy Guides",
    tech_repair: "Repair Guides",
    home_systems: "Maintenance Guides",
    small_business: "Business Playbook",
    restaurant_training: "Team Runbook",
    wellness_training: "Wellness Program",
    creator_workflow: "Creator Toolkit",
    personal_knowledge: "Knowledge Base",
    general: "Community Hub",
  }

  // Detect a known game/product title and content categories from the idea
  const knownTitle = extractKnownTitle(idea)
  const contentCategories = detectContentCategories(idea)

  let name: string

  const sfx = typeSuffix[typeId] ?? "Guide Hub"
  const defaultName = typeDefaultNames[typeId] ?? "Knowledge Network"
  const descriptor = typeDescriptor[typeId] ?? "Guide"

  if (quotedMatch) {
    // Quoted text is always highest priority
    name = `${quotedMatch[1]} ${sfx}`
  } else {
    // Try intent-aware name first (uses knownTitle + categories + type)
    const intentName = buildNetworkName(knownTitle, typeId, contentCategories, idea)
    if (intentName) {
      name = intentName
    } else if (detectedAnchors.length > 0) {
      // Combine detected domain anchors with type descriptor + suffix
      const anchorPhrase = detectedAnchors.join(" ")
      name = `${anchorPhrase} ${descriptor}`
    } else if (properNounMatch && properNounMatch[1].length > 2) {
      // Use detected proper noun
      name = `${properNounMatch[1]} ${sfx}`
    } else {
      const stopWords = new Set([
        "gaming", "guide", "network", "hub", "platform", "site", "wiki",
        "a", "an", "the", "for", "with", "and", "or", "to", "in", "on",
        "guides", "knowledge", "base", "community", "repair", "training",
        "build", "system", "organize", "create", "library", "app",
      ])
      const candidateWords = stripped
        .split(/\s+/)
        .filter((w) => !stopWords.has(w.toLowerCase()) && w.length > 2)
        .slice(0, 2)

      if (candidateWords.length >= 1) {
        const core = candidateWords
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
        name = `${core} ${sfx}`
      } else {
        name = defaultName
      }
    }
  }

  // Collapse repeated whitespace and trim
  name = name.replace(/\s+/g, " ").trim()

  // Trim to a reasonable length
  if (name.length > 60) {
    name = name.substring(0, 57).trim() + "..."
  }

  // Description is the full idea, trimmed
  const description = roughIdea
    .replace(/\n+/g, " ")
    .trim()
    .substring(0, 300)

  // ============ Slug Generation ============
  const slug = slugify(name)

  // ============ Hub Suggestions ============
  const suggestedHubs = generateHubSuggestions(typeId, idea, words)

  // ============ Scaffold Suggestion (hubs + collections) ============
  const suggestedScaffold = generateScaffoldSuggestion(typeId, suggestedHubs, knownTitle ?? undefined)

  const confidence = Math.min(100, (typeScore * 20 + (detectedKeywords.length > 0 ? 40 : 0)))

  return {
    name,
    description,
    type: typeId,
    theme,
    slug,
    suggestedHubs,
    suggestedScaffold,
    visibility: "private",
    success: true,
    detectedKeywords: Array.from(new Set(detectedKeywords)).slice(0, 5),
    confidence,
  }
}

// ============ Content-intent detection ============

/**
 * Detect lightweight content categories from the lowercased idea.
 * Used by buildNetworkName to pick a stronger, more specific name.
 */
function detectContentCategories(lowerIdea: string): string[] {
  const cats: string[] = []
  if (/\b(build|builds|loadout|loadouts)\b/.test(lowerIdea)) cats.push("builds")
  if (/\b(raid|raids|raiding)\b/.test(lowerIdea)) cats.push("raids")
  if (/\bpvp\b/.test(lowerIdea)) cats.push("pvp")
  if (/\b(boss|bosses)\b/.test(lowerIdea)) cats.push("bosses")
  if (/\bsurvival\b/.test(lowerIdea)) cats.push("survival")
  if (/\b(crafting|redstone|farm|farms)\b/.test(lowerIdea)) cats.push("crafting")
  if (/\bredstone\b/.test(lowerIdea)) cats.push("redstone")
  if (/\bbeginner\b/.test(lowerIdea)) cats.push("beginner")
  if (/\b(patch|patches)\b/.test(lowerIdea)) cats.push("patch")
  if (/\b(lore|story)\b/.test(lowerIdea)) cats.push("lore")
  if (/\beconomy\b/.test(lowerIdea)) cats.push("economy")
  // Creator
  if (/\b(thumbnail|thumbnails)\b/.test(lowerIdea)) cats.push("thumbnails")
  if (/\b(upload|uploads)\b/.test(lowerIdea)) cats.push("upload")
  if (/\bdiscord\b/.test(lowerIdea)) cats.push("discord")
  if (/\banalytics\b/.test(lowerIdea)) cats.push("analytics")
  if (/\b(gameplay|gaming creator)\b/.test(lowerIdea)) cats.push("gaming-creator")
  if (/\bsolo\b/.test(lowerIdea)) cats.push("solo")
  // Business / service type
  if (/\blaunch\b/.test(lowerIdea)) cats.push("launch")
  if (/\bpricing\b/.test(lowerIdea)) cats.push("pricing")
  if (/\bwebsite\b/.test(lowerIdea)) cats.push("website")
  if (/\bfollow.?up\b/.test(lowerIdea)) cats.push("followup")
  if (/\blawn\b/.test(lowerIdea)) cats.push("service:lawn")
  if (/\bcleaning\b/.test(lowerIdea)) cats.push("service:cleaning")
  if (/\bpainting\b/.test(lowerIdea)) cats.push("service:painting")
  if (/\bplumbing\b/.test(lowerIdea)) cats.push("service:plumbing")
  // Home/family
  if (/\b(chore|chores)\b/.test(lowerIdea)) cats.push("chores")
  if (/\b(medication|allerg)\b/.test(lowerIdea)) cats.push("medication")
  if (/\b(childcare|child care)\b/.test(lowerIdea)) cats.push("childcare")
  if (/\b(maintenance|seasonal)\b/.test(lowerIdea)) cats.push("maintenance")
  return cats
}

/**
 * Compose a stronger, intent-aware network name.
 * Returns "" to signal the caller should fall through to the existing generic path.
 */
function buildNetworkName(
  knownTitle: string | null,
  typeId: string,
  cats: string[],
  lowerIdea: string,
): string {
  const has = (c: string) => cats.includes(c)

  if (typeId === "gaming") {
    if (!knownTitle) return ""
    if (has("builds") && has("raids")) return `${knownTitle} Builds & Raids`
    if (has("pvp") && has("raids")) return `${knownTitle} PvP & Raiding Hub`
    if (has("pvp") && has("bosses")) return `${knownTitle} PvP & Boss Guides`
    if (has("pvp")) return `${knownTitle} PvP Guide Network`
    if (has("raids") || has("bosses")) return `${knownTitle} Raid & Boss Guides`
    if (has("survival") && has("redstone")) return `${knownTitle} Survival & Redstone Hub`
    if (has("survival") && has("crafting")) return `${knownTitle} Survival & Crafting Hub`
    if (has("survival")) return `${knownTitle} Survival Guide Network`
    if (has("crafting") || has("redstone")) return `${knownTitle} Crafting Guide Network`
    if (has("builds")) return `${knownTitle} Builds & Strategy Hub`
    if (has("lore")) return `${knownTitle} Lore & Guide Network`
    if (has("beginner")) return `${knownTitle} Beginner Guide Network`
    return `${knownTitle} Guide Network`
  }

  if (typeId === "creator_workflow") {
    const platform = knownTitle  // YouTube, TikTok, Twitch — detected via KNOWN_TITLES
    const isGaming = has("gaming-creator") || lowerIdea.includes("gameplay") || lowerIdea.includes("gaming")
    const isSolo = has("solo")
    if (platform && isGaming && isSolo) return `${platform} Gaming Creator Playbook`
    if (platform && isGaming) return `${platform} Gaming Creator Hub`
    if (platform && isSolo) return `${platform} Creator Playbook`
    if (platform) return `${platform} Creator Hub`
    if (isGaming && isSolo) return "Solo Gaming Creator Playbook"
    if (isGaming) return "Gaming Creator Hub"
    return "Creator Workflow Playbook"
  }

  if (typeId === "small_business") {
    const serviceType = cats.find((c) => c.startsWith("service:"))?.replace("service:", "")
    const capitalized = serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1) : null
    if (capitalized && has("launch")) return `${capitalized} Care Launch Network`
    if (capitalized) return `${capitalized} Care Service Playbook`
    if (has("launch") && has("pricing")) return "Service Business Launch Network"
    if (has("launch")) return "Business Launch Playbook"
    return "Business Operations Playbook"
  }

  if (typeId === "home_systems") {
    const hasMaint = has("maintenance") || lowerIdea.includes("hvac") || lowerIdea.includes("seasonal")
    const hasRoutines = has("chores") || lowerIdea.includes("routine")
    const hasFamily = lowerIdea.includes("family") || has("childcare")
    if (hasMaint && hasRoutines) return "Home Maintenance & Family Routines"
    if (hasMaint && hasFamily) return "Household Systems Guide Network"
    if (hasMaint) return "Home Maintenance Guide Network"
    if (hasFamily && has("medication")) return "Family Health & Routines Network"
    if (hasFamily) return "Family Operations Playbook"
    return "Home Systems Guide Network"
  }

  if (typeId === "restaurant_training") return "Restaurant Operations Hub"
  if (typeId === "wellness_training") {
    if (lowerIdea.includes("fitness")) return "Fitness & Wellness Program Network"
    if (lowerIdea.includes("nutrition")) return "Nutrition & Wellness Guide Network"
    return "Wellness Program Network"
  }

  return ""
}

// ============ Known title detection ============

/**
 * Maps lowercase search strings to their proper-cased game/product name.
 * Multi-word phrases are listed first so greedy matching finds them before single-word aliases.
 */
const KNOWN_TITLES: Array<{ search: string; title: string }> = [
  // Multi-word phrases (checked before single-word aliases)
  { search: "world of warcraft", title: "World of Warcraft" },
  { search: "league of legends", title: "League of Legends" },
  { search: "path of exile", title: "Path of Exile" },
  { search: "baldur's gate 3", title: "Baldur's Gate 3" },
  { search: "baldurs gate 3", title: "Baldur's Gate 3" },
  { search: "baldur's gate", title: "Baldur's Gate" },
  { search: "baldurs gate", title: "Baldur's Gate" },
  { search: "final fantasy xiv", title: "Final Fantasy XIV" },
  { search: "final fantasy xi", title: "Final Fantasy XI" },
  { search: "final fantasy", title: "Final Fantasy" },
  { search: "the elder scrolls", title: "The Elder Scrolls" },
  { search: "elder scrolls", title: "The Elder Scrolls" },
  { search: "apex legends", title: "Apex Legends" },
  { search: "animal crossing", title: "Animal Crossing" },
  { search: "monster hunter", title: "Monster Hunter" },
  { search: "genshin impact", title: "Genshin Impact" },
  { search: "stardew valley", title: "Stardew Valley" },
  { search: "hollow knight", title: "Hollow Knight" },
  { search: "dead cells", title: "Dead Cells" },
  { search: "mario kart", title: "Mario Kart" },
  { search: "super smash", title: "Super Smash Bros" },
  { search: "smash bros", title: "Super Smash Bros" },
  { search: "dark souls", title: "Dark Souls" },
  { search: "elden ring", title: "Elden Ring" },
  { search: "new world", title: "New World" },
  { search: "lost ark", title: "Lost Ark" },
  { search: "destiny 2", title: "Destiny 2" },
  { search: "diablo iv", title: "Diablo IV" },
  { search: "diablo 4", title: "Diablo IV" },
  { search: "wow classic", title: "WoW Classic" },
  { search: "cyberpunk 2077", title: "Cyberpunk 2077" },
  { search: "overwatch 2", title: "Overwatch 2" },
  { search: "honkai star rail", title: "Honkai: Star Rail" },
  { search: "risk of rain", title: "Risk of Rain 2" },
  { search: "breath of the wild", title: "Breath of the Wild" },
  { search: "tears of the kingdom", title: "Tears of the Kingdom" },
  { search: "legend of zelda", title: "The Legend of Zelda" },
  { search: "counter-strike 2", title: "Counter-Strike 2" },
  { search: "dota 2", title: "Dota 2" },
  // Single words (word-boundary checked to avoid false positives)
  { search: "warcraft", title: "World of Warcraft" },
  { search: "minecraft", title: "Minecraft" },
  { search: "terraria", title: "Terraria" },
  { search: "valheim", title: "Valheim" },
  { search: "starfield", title: "Starfield" },
  { search: "cyberpunk", title: "Cyberpunk 2077" },
  { search: "overwatch", title: "Overwatch" },
  { search: "fortnite", title: "Fortnite" },
  { search: "valorant", title: "Valorant" },
  { search: "hearthstone", title: "Hearthstone" },
  { search: "genshin", title: "Genshin Impact" },
  { search: "stardew", title: "Stardew Valley" },
  { search: "pokemon", title: "Pokémon" },
  { search: "pokémon", title: "Pokémon" },
  { search: "zelda", title: "The Legend of Zelda" },
  { search: "hades", title: "Hades" },
  { search: "skyrim", title: "Skyrim" },
  { search: "oblivion", title: "Oblivion" },
  { search: "diablo", title: "Diablo" },
  { search: "warframe", title: "Warframe" },
  { search: "ffxiv", title: "Final Fantasy XIV" },
  { search: "ff14", title: "Final Fantasy XIV" },
  { search: "csgo", title: "Counter-Strike" },
  { search: "dota", title: "Dota 2" },
  { search: "wow", title: "World of Warcraft" },
  { search: "bg3", title: "Baldur's Gate 3" },
  { search: "poe", title: "Path of Exile" },
  // Creator platforms
  { search: "youtube", title: "YouTube" },
  { search: "tiktok", title: "TikTok" },
  { search: "twitch", title: "Twitch" },
]

/**
 * Scan the lowercased idea for a known game/product title.
 * Multi-word phrases use substring matching; single words require word boundaries.
 * Returns the proper-cased title, or null if nothing matches.
 */
function extractKnownTitle(lowerIdea: string): string | null {
  const multiWord = KNOWN_TITLES.filter((e) => e.search.includes(" "))
  const singleWord = KNOWN_TITLES.filter((e) => !e.search.includes(" "))

  for (const { search, title } of multiWord) {
    if (lowerIdea.includes(search)) return title
  }
  for (const { search, title } of singleWord) {
    const re = new RegExp(`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
    if (re.test(lowerIdea)) return title
  }
  return null
}

// ============ Hub descriptions ============

const HUB_DESCRIPTIONS: Record<string, string> = {
  // Gaming
  "Survival Mechanics": "Survival fundamentals — food, water, shelter, and staying alive.",
  "Crafting & Materials": "Material farming, crafting recipes, and station progression.",
  "PvP & Combat": "Combat mechanics, PvP loadouts, and engagement strategy.",
  "Builds & Loadouts": "Character builds, gear setups, and playstyle optimization.",
  "Boss Guides": "Phase-by-phase strategies, attack patterns, and counter builds.",
  "Patch Notes": "Update summaries, balance changes, and new content breakdowns.",
  "Beginner Guides": "Core mechanics and first-hour walkthroughs for new players.",
  "Progression Guides": "Leveling routes, gear tiers, and endgame roadmaps.",
  "Economy & Trading": "Currency management, market strategy, and trading tips.",
  "Farming & Resources": "Efficient resource routes and rare drop hunting guides.",
  "Multiplayer & Co-op": "Group composition, co-op strategy, and team play tips.",
  "Lore & World Building": "Story context, faction guides, and world timeline.",
  "Quests & Missions": "Main story and optional quest walkthroughs.",
  "Strategy & Tactics": "Macro planning and moment-to-moment decision making.",
  "Community Highlights": "Top community guides and featured discussion threads.",
  "Tier Lists": "Meta rankings for PvE and PvP across all content phases.",
  "Maps & Locations": "Region overviews, hidden areas, and points of interest.",
  // Repair / tech
  "Diagnostics & Testing": "Structured triage from first look to confirmed root cause.",
  "Safety Procedures": "Mandatory safety steps before starting any repair job.",
  "Tools & Equipment": "Required and specialty tools for each repair type.",
  "Troubleshooting": "Most-reported problems and step-by-step fixes.",
  "Preventive Maintenance": "Scheduled tasks to prevent failures before they happen.",
  "Installation Guides": "First-time setup and drop-in replacement procedures.",
  // Training / operations
  "Onboarding": "First-day through first-month guides for new team members.",
  "Compliance & Policies": "Internal and regulatory compliance references.",
  "Workflows & Processes": "Day-to-day and exception handling procedures.",
  "Assessments & Quizzes": "Knowledge checks and formal certification paths.",
  "Core Curriculum": "Foundation concepts and applied practice materials.",
  "Advanced Topics": "Expert-level deep dives for experienced practitioners.",
  "Daily Operations": "Opening, closing, and routine operational procedures.",
  "Food Safety": "Temperature logs, sanitation checklists, and compliance records.",
  "Launch Checklist": "Launch readiness steps from branding to legal.",
  "Client Onboarding": "Intake workflows, contracts, and first-engagement guides.",
  // Wellness / creator / personal knowledge
  "Programs": "Structured wellness and training program guides.",
  "Nutrition": "Meal planning, macros, and supplement guidance.",
  "Habits & Mindset": "Daily habit systems and mindset fundamentals.",
  "Content Planning": "Editorial calendar, topic research, and batch planning.",
  "Production Workflow": "Filming, recording, and editing workflow guides.",
  "Publishing": "Upload checklists and multi-platform publishing procedures.",
  "Analytics & Growth": "Performance tracking and channel growth strategies.",
  "Daily Planning": "Morning routines, task management, and weekly reviews.",
  "Projects": "Active and archived project documentation.",
  "Learning & Goals": "Learning notes, skill tracking, and long-term goals.",
  "Reviews & Reflections": "Weekly and monthly review templates.",
  // Home systems
  "Family Routines": "Daily, weekly, and seasonal family schedules and chore assignments.",
  "Medications & Health": "Medication schedules, allergies, and healthcare contacts.",
  "Emergency & Safety": "Emergency contacts, evacuation plans, and first aid procedures.",
  "Seasonal Maintenance": "Seasonal home tasks and maintenance checklists.",
  "Baby & Infant Care": "Supplies, feeding schedules, sleep routines, and infant care.",
  "Home Systems": "HVAC, plumbing, electrical, and appliance documentation.",
  // Generic
  "Getting Started": "Quick-start guides and essential first steps.",
  "Resources": "Reference links, tools, templates, and external reading.",
  "Best Practices": "Recommended patterns and anti-patterns to skip.",
  "News & Updates": "Announcements, roadmap updates, and changelog entries.",
  "FAQ": "Frequently asked questions and detailed answers.",
  "Reference": "Data tables, glossary, and searchable reference material.",
  "Team Resources": "Internal directories, shared templates, and team tools.",
}

/**
 * Generate suggested hubs based on network type and idea.
 * TYPE-AWARE: "build"/"builds" only map to Builds & Loadouts for gaming.
 * For home_systems, "build" is ignored to prevent gaming hub leakage.
 */
function generateHubSuggestions(type: string, idea: string, words: string[]): string[] {
  const lowerIdea = idea.toLowerCase()

  // Type-aware keyword-to-hub map: each network type has its own keyword set
  const typeSpecificKeywordToHub: Record<string, Record<string, string>> = {
    gaming: {
      "survival": "Survival Mechanics",
      "crafting": "Crafting & Materials",
      "pvp": "PvP & Combat",
      "pve": "PvE & Combat",
      "build": "Builds & Loadouts",
      "builds": "Builds & Loadouts",
      "loadout": "Builds & Loadouts",
      "boss": "Boss Guides",
      "bosses": "Boss Guides",
      "raid": "Boss Guides",
      "patch": "Patch Notes",
      "beginner": "Beginner Guides",
      "progression": "Progression Guides",
      "economy": "Economy & Trading",
      "farming": "Farming & Resources",
      "multiplayer": "Multiplayer & Co-op",
      "lore": "Lore & World Building",
      "quest": "Quests & Missions",
      "strategy": "Strategy & Tactics",
      "map": "Maps & Locations",
      "tier": "Tier Lists",
      "community": "Community Highlights",
    },
    tech_repair: {
      "diagnostic": "Diagnostics & Testing",
      "diagnostics": "Diagnostics & Testing",
      "safety": "Safety Procedures",
      "tools": "Tools & Equipment",
      "troubleshoot": "Troubleshooting",
      "maintenance": "Preventive Maintenance",
      "installation": "Installation Guides",
    },
    home_systems: {
      "routine": "Family Routines",
      "routines": "Family Routines",
      "medication": "Medications & Health",
      "medicin": "Medications & Health",
      "allergies": "Medications & Health",
      "allergy": "Medications & Health",
      "emergency": "Emergency & Safety",
      "contact": "Emergency & Safety",
      "contacts": "Emergency & Safety",
      "seasonal": "Seasonal Maintenance",
      "baby": "Baby & Infant Care",
      "infant": "Baby & Infant Care",
      "supply": "Baby & Infant Care",
      "supplies": "Baby & Infant Care",
      "hvac": "Home Systems",
      "plumbing": "Home Systems",
      "electrical": "Home Systems",
      "appliance": "Home Systems",
      "household": "Family Routines",
      "kids": "Family Routines",
      "children": "Family Routines",
      "family": "Family Routines",
      // Note: "build" is intentionally NOT mapped to prevent leakage of gaming hubs
    },
    small_business: {
      "onboarding": "Onboarding",
      "compliance": "Compliance & Policies",
      "workflow": "Workflows & Processes",
      "assessment": "Assessments & Quizzes",
      "curriculum": "Core Curriculum",
      "launch": "Launch Checklist",
      "client": "Client Onboarding",
    },
    restaurant_training: {
      "onboarding": "Onboarding",
      "operations": "Daily Operations",
      "food safety": "Food Safety",
      "compliance": "Compliance & Policies",
    },
    wellness_training: {
      "program": "Programs",
      "nutrition": "Nutrition",
      "habit": "Habits & Mindset",
      "assessment": "Assessments & Quizzes",
      "wellness": "Programs",
    },
    creator_workflow: {
      "content": "Content Planning",
      "production": "Production Workflow",
      "publish": "Publishing",
      "analytics": "Analytics & Growth",
      "resource": "Resources",
    },
    personal_knowledge: {
      "planning": "Daily Planning",
      "project": "Projects",
      "learning": "Learning & Goals",
      "goal": "Learning & Goals",
      "review": "Reviews & Reflections",
    },
  }

  // Pull hubs detected directly from the idea (type-aware only)
  const detected: string[] = []
  const seen = new Set<string>()
  
  // Only check keywords relevant to this network type
  const relevantKeywords = typeSpecificKeywordToHub[type] || {}
  for (const [keyword, hubName] of Object.entries(relevantKeywords)) {
    if (lowerIdea.includes(keyword) && !seen.has(hubName)) {
      detected.push(hubName)
      seen.add(hubName)
    }
  }

  // Fallback defaults per type (keyed by registry id)
  const defaults: Record<string, string[]> = {
    gaming: ["Beginner Guides", "Builds & Loadouts", "Boss Guides", "Patch Notes", "Community Highlights"],
    tech_repair: ["Diagnostics & Testing", "Safety Procedures", "Tools & Equipment", "Troubleshooting", "Preventive Maintenance"],
    home_systems: ["Family Routines", "Medications & Health", "Emergency & Safety", "Seasonal Maintenance", "Baby & Infant Care"],
    small_business: ["Launch Checklist", "Client Onboarding", "Daily Operations", "Compliance & Policies", "Team Resources"],
    restaurant_training: ["Onboarding", "Daily Operations", "Food Safety", "Compliance & Policies", "Team Resources"],
    wellness_training: ["Programs", "Nutrition", "Habits & Mindset", "Assessments & Quizzes", "Resources"],
    creator_workflow: ["Content Planning", "Production Workflow", "Publishing", "Analytics & Growth", "Resources"],
    personal_knowledge: ["Daily Planning", "Projects", "Learning & Goals", "Resources", "Reviews & Reflections"],
    general: ["Getting Started", "Best Practices", "Community Highlights", "Resources", "Troubleshooting"],
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

// ============ Scaffold suggestion (hubs + collections) ============

/**
 * Per-hub starter collection map. Keys are the canonical hub display names
 * produced by `generateHubSuggestions`. Each hub gets 2-3 starter
 * collections so the Step 2 preview and Step 3 editor have meaningful
 * content out of the box.
 *
 * If a hub name is not in this map, a generic 2-collection seed is used.
 */
const HUB_TO_COLLECTIONS: Record<string, SmartFillCollectionSuggestion[]> = {
  // Gaming
  "Survival Mechanics": [
    { name: "Day-One Survival", slug: "day-one-survival", description: "First night, food, water, shelter." },
    { name: "Long-Term Survival", slug: "long-term-survival", description: "Sustainable bases and food cycles." },
    { name: "Environmental Hazards", slug: "environmental-hazards", description: "Weather, biomes, status effects." },
  ],
  "Crafting & Materials": [
    { name: "Resource Gathering", slug: "resource-gathering", description: "Where and how to farm materials." },
    { name: "Crafting Recipes", slug: "crafting-recipes", description: "Reference list of recipes." },
    { name: "Workbenches & Stations", slug: "workbenches-stations", description: "Tier progression of stations." },
  ],
  "PvP & Combat": [
    { name: "Combat Fundamentals", slug: "combat-fundamentals", description: "Mechanics, dodge, parry." },
    { name: "PvP Strategy", slug: "pvp-strategy", description: "Loadouts, positioning, baiting." },
  ],
  "Builds & Loadouts": [
    { name: "Beginner Builds", slug: "beginner-builds", description: "Easy-to-pilot starter builds." },
    { name: "Endgame Builds", slug: "endgame-builds", description: "Optimized builds for late content." },
    { name: "Niche & Off-Meta", slug: "niche-off-meta", description: "Fun and experimental builds." },
  ],
  "Boss Guides": [
    { name: "Early-Game Bosses", slug: "early-game-bosses", description: "First major encounters." },
    { name: "Late-Game Bosses", slug: "late-game-bosses", description: "Endgame and post-game fights." },
    { name: "Optional Bosses", slug: "optional-bosses", description: "Hidden and superbosses." },
  ],
  "Patch Notes": [
    { name: "Major Updates", slug: "major-updates", description: "Headline patch breakdowns." },
    { name: "Balance Changes", slug: "balance-changes", description: "Buffs, nerfs, and tuning." },
  ],
  "Beginner Guides": [
    { name: "Getting Started", slug: "getting-started", description: "First-hour walkthrough." },
    { name: "Core Concepts", slug: "core-concepts", description: "Systems every player needs to know." },
    { name: "Common Mistakes", slug: "common-mistakes", description: "Pitfalls new players hit." },
  ],
  "Progression Guides": [
    { name: "Leveling Routes", slug: "leveling-routes", description: "Fastest paths to cap." },
    { name: "Gear Progression", slug: "gear-progression", description: "What to chase at each tier." },
  ],
  "Economy & Trading": [
    { name: "Currency Sinks", slug: "currency-sinks", description: "Where to spend wisely." },
    { name: "Trading Strategies", slug: "trading-strategies", description: "Player market and flipping." },
  ],
  "Farming & Resources": [
    { name: "Daily Farms", slug: "daily-farms", description: "High-yield daily routes." },
    { name: "Rare Drops", slug: "rare-drops", description: "Hunting low-chance items." },
  ],
  "Multiplayer & Co-op": [
    { name: "Group Composition", slug: "group-composition", description: "Role balance and synergy." },
    { name: "Co-op Etiquette", slug: "co-op-etiquette", description: "Working well with teammates." },
  ],
  "Lore & World Building": [
    { name: "Story Timeline", slug: "story-timeline", description: "Major events in order." },
    { name: "Factions & Characters", slug: "factions-characters", description: "Who is who in the world." },
  ],
  "Quests & Missions": [
    { name: "Main Story Quests", slug: "main-story-quests", description: "Critical-path walkthroughs." },
    { name: "Side Quests", slug: "side-quests", description: "Optional content worth doing." },
  ],
  "Strategy & Tactics": [
    { name: "Macro Strategy", slug: "macro-strategy", description: "Long-game planning." },
    { name: "Micro Tactics", slug: "micro-tactics", description: "Moment-to-moment execution." },
  ],
  "Community Highlights": [
    { name: "Top Creators", slug: "top-creators", description: "Curated community guides." },
    { name: "Hot Takes", slug: "hot-takes", description: "Discussion and debate." },
  ],
  "Tier Lists": [
    { name: "PvE Tier Lists", slug: "pve-tier-lists", description: "Best picks for PvE content." },
    { name: "PvP Tier Lists", slug: "pvp-tier-lists", description: "Best picks for PvP modes." },
  ],
  "Maps & Locations": [
    { name: "Region Overviews", slug: "region-overviews", description: "What each area offers." },
    { name: "Points of Interest", slug: "points-of-interest", description: "Notable spots worth visiting." },
  ],

  // Repair / Technical
  "Diagnostics & Testing": [
    { name: "Initial Triage", slug: "initial-triage", description: "First questions and quick tests." },
    { name: "Deep Diagnostics", slug: "deep-diagnostics", description: "Detailed test procedures." },
  ],
  "Safety Procedures": [
    { name: "Electrical Safety", slug: "electrical-safety", description: "Working safely with power." },
    { name: "PPE & Workspace", slug: "ppe-workspace", description: "Gear and environment setup." },
  ],
  "Tools & Equipment": [
    { name: "Required Tools", slug: "required-tools", description: "Minimum kit for most repairs." },
    { name: "Specialty Tools", slug: "specialty-tools", description: "Job-specific equipment." },
  ],
  "Troubleshooting": [
    { name: "Common Issues", slug: "common-issues", description: "Most-reported problems." },
    { name: "Edge Cases", slug: "edge-cases", description: "Unusual symptoms and fixes." },
  ],
  "Preventive Maintenance": [
    { name: "Routine Checklists", slug: "routine-checklists", description: "Daily, weekly, monthly tasks." },
    { name: "Seasonal Service", slug: "seasonal-service", description: "Periodic deeper service." },
  ],
  "Installation Guides": [
    { name: "First-Time Install", slug: "first-time-install", description: "Out-of-box setup." },
    { name: "Replacement Install", slug: "replacement-install", description: "Swapping an existing unit." },
  ],

  // Training / SOP
  "Onboarding": [
    { name: "First Day", slug: "first-day", description: "Logins, intros, paperwork." },
    { name: "First Week", slug: "first-week", description: "Core training and shadowing." },
    { name: "First Month", slug: "first-month", description: "Independent task ramp." },
  ],
  "Compliance & Policies": [
    { name: "Company Policies", slug: "company-policies", description: "Internal policies to follow." },
    { name: "Regulatory Compliance", slug: "regulatory-compliance", description: "External requirements." },
  ],
  "Workflows & Processes": [
    { name: "Daily Workflows", slug: "daily-workflows", description: "Day-to-day procedures." },
    { name: "Exception Workflows", slug: "exception-workflows", description: "Handling edge cases." },
  ],
  "Assessments & Quizzes": [
    { name: "Knowledge Checks", slug: "knowledge-checks", description: "Short quizzes per topic." },
    { name: "Certifications", slug: "certifications", description: "Formal sign-off paths." },
  ],
  "Core Curriculum": [
    { name: "Foundations", slug: "foundations", description: "Essential concepts." },
    { name: "Applied Practice", slug: "applied-practice", description: "Hands-on application." },
  ],
  "Advanced Topics": [
    { name: "Deep Dives", slug: "deep-dives", description: "Topic-specific deep content." },
    { name: "Expert Techniques", slug: "expert-techniques", description: "Pro-level material." },
  ],

  // General
  "News & Updates": [
    { name: "Announcements", slug: "announcements", description: "Official news." },
    { name: "Roadmap", slug: "roadmap", description: "What's coming next." },
  ],
  "FAQ": [
    { name: "General Questions", slug: "general-questions", description: "Most common questions." },
    { name: "Technical Questions", slug: "technical-questions", description: "Detail-level Q&A." },
  ],
  "Reference": [
    { name: "Data Tables", slug: "data-tables", description: "Numeric references." },
    { name: "Glossary", slug: "glossary", description: "Key terms defined." },
  ],
  "Getting Started": [
    { name: "Quickstart", slug: "quickstart", description: "Five-minute intro." },
    { name: "First Project", slug: "first-project", description: "Hands-on starter walkthrough." },
  ],
  "Resources": [
    { name: "Recommended Reading", slug: "recommended-reading", description: "Books, articles, links." },
    { name: "Tools & Templates", slug: "tools-templates", description: "Downloadable assets." },
  ],
  "Configuration & Settings": [
    { name: "Initial Setup", slug: "initial-setup", description: "Out-of-the-box configuration." },
    { name: "Advanced Settings", slug: "advanced-settings", description: "Power-user options." },
  ],
  "Performance & Optimization": [
    { name: "Performance Basics", slug: "performance-basics", description: "Quick wins and defaults." },
    { name: "Deep Optimization", slug: "deep-optimization", description: "Profile-driven tuning." },
  ],
  "Security": [
    { name: "Account Security", slug: "account-security", description: "Passwords, 2FA, recovery." },
    { name: "Operational Security", slug: "operational-security", description: "Day-to-day safe practices." },
  ],
  "Core Procedures": [
    { name: "Standard Procedures", slug: "standard-procedures", description: "Day-to-day SOPs." },
    { name: "Quality Checks", slug: "quality-checks", description: "Verification steps." },
  ],
  "Team Resources": [
    { name: "Team Directory", slug: "team-directory", description: "Who to ask for what." },
    { name: "Shared Templates", slug: "shared-templates", description: "Reusable starting points." },
  ],
  "Fundamentals": [
    { name: "Core Concepts", slug: "core-concepts", description: "Essential ideas." },
    { name: "First Steps", slug: "first-steps", description: "Hands-on starter material." },
  ],
  "Intermediate": [
    { name: "Building Skills", slug: "building-skills", description: "Stepping up from basics." },
    { name: "Common Patterns", slug: "common-patterns", description: "Recurring approaches." },
  ],
  "Best Practices": [
    { name: "Do This", slug: "do-this", description: "Recommended patterns." },
    { name: "Avoid This", slug: "avoid-this", description: "Anti-patterns to skip." },
  ],

  // Home Systems / Family
  "Family Routines": [
    { name: "Daily Routines", slug: "daily-routines", description: "Morning, afternoon, and evening routines." },
    { name: "School & Activities", slug: "school-activities", description: "School schedules and extracurriculars." },
    { name: "Household Chores", slug: "household-chores", description: "Chore assignments and cleaning schedules." },
  ],
  "Medications & Health": [
    { name: "Medication Schedules", slug: "medication-schedules", description: "Daily medication reminders and tracking." },
    { name: "Allergies & Restrictions", slug: "allergies-restrictions", description: "Known allergies and dietary restrictions." },
    { name: "Doctor & Provider Info", slug: "doctor-provider-info", description: "Healthcare provider contact information." },
  ],
  "Emergency & Safety": [
    { name: "Emergency Contacts", slug: "emergency-contacts", description: "Family contacts and emergency services." },
    { name: "Emergency Plans", slug: "emergency-plans", description: "Evacuation procedures and disaster prep." },
    { name: "First Aid & CPR", slug: "first-aid-cpr", description: "First aid supplies and medical procedures." },
  ],
  "Seasonal Maintenance": [
    { name: "Spring Tasks", slug: "spring-tasks", description: "Spring cleaning and yard preparation." },
    { name: "Fall Tasks", slug: "fall-tasks", description: "Heating prep and winterization." },
    { name: "Summer & Winter", slug: "summer-winter-tasks", description: "Summer AC care and winter maintenance." },
  ],
  "Baby & Infant Care": [
    { name: "Supplies & Inventory", slug: "supplies-inventory", description: "Diaper sizes and restock lists." },
    { name: "Feeding & Nutrition", slug: "feeding-nutrition", description: "Feeding schedules and food allergies." },
    { name: "Sleep & Routines", slug: "sleep-routines", description: "Sleep schedules and bedtime routines." },
  ],
  "Home Systems": [
    { name: "HVAC & Climate", slug: "hvac-climate", description: "Thermostat settings and filter replacement." },
    { name: "Plumbing & Electrical", slug: "plumbing-electrical", description: "Shut-offs, circuit breakers, and procedures." },
    { name: "Appliances", slug: "appliances", description: "Appliance manuals and maintenance schedules." },
  ],
}

/**
 * Collection-name → specific guide idea. Checked before pattern matching to avoid repeating
 * generic titles (e.g. "Best Starter Build" appearing in every build-related collection).
 * Keys are the canonical collection display names from HUB_TO_COLLECTIONS.
 */
const COLLECTION_GUIDE_IDEAS: Record<string, StarterGuideIdea> = {
  // Builds & Loadouts
  "Beginner Builds": { title: "Beginner-Friendly Build Starter Guide", summary: "An easy-to-pilot build with flexible stats — great for your first hours.", guideType: "character-build", difficulty: "beginner" },
  "Endgame Builds": { title: "Endgame Raid Build Checklist", summary: "Optimized gear priorities, stats, and rotation for late-game content.", guideType: "character-build", difficulty: "advanced" },
  "Niche & Off-Meta": { title: "Off-Meta Build Evaluation Guide", summary: "When to run off-meta and how to make it work at each difficulty tier.", guideType: "guide", difficulty: "intermediate" },
  // Boss Guides
  "Early-Game Bosses": { title: "First Boss Mechanics Checklist", summary: "Phase patterns, safe spots, and damage windows for early encounters.", guideType: "boss-guide", difficulty: "beginner" },
  "Late-Game Bosses": { title: "Endgame Boss Prep Guide", summary: "Required gear, mechanics overview, and callout cheatsheet for late-game fights.", guideType: "boss-guide", difficulty: "advanced" },
  "Optional Bosses": { title: "Optional Boss Rewards & Route Guide", summary: "Which optional fights are worth doing and in what order.", guideType: "guide", difficulty: "intermediate" },
  // Beginner Guides
  "Getting Started": { title: "First-Hour Beginner Roadmap", summary: "Your first steps from character creation to the first meaningful milestone.", guideType: "guide", difficulty: "beginner" },
  "Core Concepts": { title: "Core Systems Explained", summary: "The mechanics every player must understand to progress confidently.", guideType: "guide", difficulty: "beginner" },
  "Common Mistakes": { title: "Beginner Mistakes to Avoid", summary: "The most common new-player pitfalls and exactly how to skip them.", guideType: "guide", difficulty: "beginner" },
  // Patch Notes
  "Major Updates": { title: "Patch Summary & Player Impact Guide", summary: "What's new, what changed, and how it affects your current build.", guideType: "reference", difficulty: "beginner" },
  "Balance Changes": { title: "Class Balance Impact Breakdown", summary: "Buffs, nerfs, and meta shifts explained for every class.", guideType: "reference", difficulty: "intermediate" },
  // Progression
  "Leveling Routes": { title: "Fastest Leveling Route Guide", summary: "The most time-efficient path from level 1 to cap.", guideType: "guide", difficulty: "intermediate" },
  "Gear Progression": { title: "Fresh Max-Level Gear Priority Guide", summary: "What to chase first after hitting max level and why.", guideType: "guide", difficulty: "intermediate" },
  // Tier Lists
  "PvE Tier Lists": { title: "PvE Class Tier List", summary: "Rankings by damage output, survivability, and ease of play for PvE.", guideType: "tier-list", difficulty: "intermediate" },
  "PvP Tier Lists": { title: "PvP Class & Loadout Tier List", summary: "Top picks for ranked and unranked PvP modes this patch.", guideType: "tier-list", difficulty: "intermediate" },
  // Quests
  "Main Story Quests": { title: "Main Story Quest Walkthrough", summary: "Critical-path quest guide with important choices explained.", guideType: "walkthrough", difficulty: "beginner" },
  "Side Quests": { title: "Best Side Quests Worth Completing", summary: "Hidden storylines and side content with the best rewards.", guideType: "guide", difficulty: "beginner" },
  // PvP / Combat
  "Combat Fundamentals": { title: "Combat Mechanics Primer", summary: "Dodge, parry, cooldown management, and core engagement rules.", guideType: "guide", difficulty: "beginner" },
  "PvP Strategy": { title: "PvP Build & Positioning Guide", summary: "Loadouts, positioning, and baiting strategies for competitive play.", guideType: "guide", difficulty: "intermediate" },
  // Farming
  "Daily Farms": { title: "Efficient Daily Farm Route", summary: "The highest-yield daily routes completable in under 30 minutes.", guideType: "guide", difficulty: "intermediate" },
  "Rare Drops": { title: "Rare Drop Hunting Guide", summary: "Target locations, farm methods, and expected drop rates for top loot.", guideType: "guide", difficulty: "intermediate" },
  // Survival / Crafting
  "Day-One Survival": { title: "Day One Survival Checklist", summary: "How to survive your first night and get a stable foothold.", guideType: "guide", difficulty: "beginner" },
  "Long-Term Survival": { title: "Base Building & Sustainability Guide", summary: "Sustainable bases, food cycles, and long-term resource planning.", guideType: "guide", difficulty: "intermediate" },
  "Environmental Hazards": { title: "Environmental Hazard Field Guide", summary: "Weather, biomes, and status effects — what to watch for and how to prep.", guideType: "reference", difficulty: "beginner" },
  "Resource Gathering": { title: "Resource Gathering Route Guide", summary: "Where and how to efficiently farm each resource type.", guideType: "guide", difficulty: "beginner" },
  "Crafting Recipes": { title: "Crafting Recipe Quick Reference", summary: "Full recipe list with material counts and unlock requirements.", guideType: "reference", difficulty: "beginner" },
  "Workbenches & Stations": { title: "Crafting Station Progression Guide", summary: "Which stations to build first and what they unlock.", guideType: "guide", difficulty: "beginner" },
  // Economy
  "Currency Sinks": { title: "Where to Spend Your Currency Wisely", summary: "The best currency investments at each stage of progression.", guideType: "guide", difficulty: "intermediate" },
  "Trading Strategies": { title: "Player Market & Trading Guide", summary: "How to flip items, find deals, and build wealth efficiently.", guideType: "guide", difficulty: "intermediate" },
  // Training / SOP
  "First Day": { title: "First Day Orientation Checklist", summary: "Logins, introductions, paperwork, and your first-day task list.", guideType: "sop", difficulty: "beginner" },
  "First Week": { title: "First Week Training Checklist", summary: "Core training, shadowing sessions, and first independent tasks.", guideType: "sop", difficulty: "beginner" },
  "First Month": { title: "First Month Milestone Checklist", summary: "Independent task ramp, review meetings, and onboarding sign-off.", guideType: "sop", difficulty: "beginner" },
  "Company Policies": { title: "Company Policy Quick Reference", summary: "The policies every new hire must know and where to find them.", guideType: "reference", difficulty: "beginner" },
  "Regulatory Compliance": { title: "Regulatory Compliance Checklist", summary: "External requirements and how to document compliance correctly.", guideType: "sop", difficulty: "beginner" },
  "Knowledge Checks": { title: "Module Knowledge Check Guide", summary: "Short quizzes for each core topic linked to the curriculum.", guideType: "reference", difficulty: "beginner" },
  // Restaurant
  "Opening Procedures": { title: "Opening Procedures SOP", summary: "Step-by-step morning setup checklist for the shift lead.", guideType: "sop", difficulty: "beginner" },
  "Closing Procedures": { title: "Closing Procedures SOP", summary: "End-of-shift cleanup and close-out checklist.", guideType: "sop", difficulty: "beginner" },
  // Home systems
  "Daily Routines": { title: "Daily Household Routine Checklist", summary: "Morning, afternoon, and evening routines for the whole family.", guideType: "sop", difficulty: "beginner" },
  "Household Chores": { title: "Weekly Chore Assignment Guide", summary: "Who does what and when — a repeatable chore rotation.", guideType: "guide", difficulty: "beginner" },
  "School & Activities": { title: "School Schedule & Pickup Procedure Guide", summary: "Daily school timing, extracurriculars, and pickup contacts.", guideType: "reference", difficulty: "beginner" },
  "Medication Schedules": { title: "Medication Schedule Quick Reference", summary: "Daily doses, times, and caregiver notes at a glance.", guideType: "reference", difficulty: "beginner" },
  "Allergies & Restrictions": { title: "Allergy & Dietary Restriction Reference Card", summary: "Known allergies, safe substitutions, and what to avoid.", guideType: "reference", difficulty: "beginner" },
  "Doctor & Provider Info": { title: "Healthcare Provider Contact Sheet", summary: "Primary care, specialists, pharmacy, and insurance contacts.", guideType: "reference", difficulty: "beginner" },
  "Emergency Contacts": { title: "Emergency Contact Reference Sheet", summary: "Family, neighbors, doctors, and emergency services — all in one place.", guideType: "reference", difficulty: "beginner" },
  "Emergency Plans": { title: "Home Emergency Plan Guide", summary: "Evacuation routes, severe weather procedures, and disaster prep checklist.", guideType: "guide", difficulty: "beginner" },
  "First Aid & CPR": { title: "First Aid & CPR Quick Reference", summary: "Key procedures, supply locations, and when to call 911.", guideType: "reference", difficulty: "beginner" },
  "Spring Tasks": { title: "Spring Home Maintenance Checklist", summary: "Spring cleaning, yard prep, and HVAC startup checks.", guideType: "sop", difficulty: "beginner" },
  "Fall Tasks": { title: "Fall Winterization Checklist", summary: "Heating prep, gutter cleaning, and cold-weather readiness.", guideType: "sop", difficulty: "beginner" },
  "Summer & Winter": { title: "Summer & Winter Home Care Guide", summary: "AC maintenance, outdoor care, and snow/heating procedures.", guideType: "guide", difficulty: "beginner" },
  "Supplies & Inventory": { title: "Baby Supplies Inventory & Restock List", summary: "Current diaper sizes, formula brand, clothing sizes, and restock thresholds.", guideType: "reference", difficulty: "beginner" },
  "Feeding & Nutrition": { title: "Feeding Schedule & Allergy Reference", summary: "Feeding times, bottle prep, introduced foods, and known allergies.", guideType: "reference", difficulty: "beginner" },
  "Sleep & Routines": { title: "Sleep Schedule & Bedtime Routine Guide", summary: "Nap times, bedtime routine steps, and sleep regression notes.", guideType: "guide", difficulty: "beginner" },
  "HVAC & Climate": { title: "HVAC & Thermostat Settings Guide", summary: "Seasonal settings, filter schedule, and service contact.", guideType: "reference", difficulty: "beginner" },
  "Plumbing & Electrical": { title: "Shut-Off & Breaker Reference Guide", summary: "Water shut-off locations, circuit breaker map, and emergency contacts.", guideType: "reference", difficulty: "beginner" },
  "Appliances": { title: "Appliance Maintenance & Warranty Reference", summary: "Model numbers, warranty expiry, filter schedules, and service contacts.", guideType: "reference", difficulty: "beginner" },
  // Creator workflow
  "Content Planning": { title: "Weekly Content Planning Checklist", summary: "How to plan, batch, and schedule content for the week.", guideType: "guide", difficulty: "beginner" },
  "Upload Checklist": { title: "Upload QA Checklist Before Publishing", summary: "Title, thumbnail, tags, description, and scheduling review.", guideType: "sop", difficulty: "beginner" },
  "Promotion Workflow": { title: "Post-Upload Promotion Checklist", summary: "Where and how to share each new video after publishing.", guideType: "sop", difficulty: "beginner" },
  // Launch Checklist (small business)
  "Branding Basics": { title: "Brand Setup Quick Guide", summary: "Logo, name, colors, and consistent branding from day one.", guideType: "guide", difficulty: "beginner" },
  "Legal & Admin": { title: "Business Registration Checklist", summary: "LLC/sole-proprietor, EIN, bank account, and insurance setup.", guideType: "sop", difficulty: "beginner" },
  "Intro Workflow": { title: "First Client Intake Workflow", summary: "Discovery call, contract, deposit, and kickoff SOP.", guideType: "sop", difficulty: "beginner" },
  "Contracts & Billing": { title: "Service Contract & Invoice Guide", summary: "What to include in service contracts and how to send invoices.", guideType: "guide", difficulty: "beginner" },
  "Daily Workflows": { title: "Daily Operations Workflow", summary: "The repeatable day-to-day process for delivering your service.", guideType: "sop", difficulty: "beginner" },
}

/**
 * Generate 1-2 starter guide ideas for a given collection based on its name and parent hub.
 * These are purely informational — shown in the scaffold preview, not auto-saved.
 * @param subject - Optional known game/product name (e.g. "World of Warcraft") for personalized summaries.
 */
function generateStarterGuideIdeas(hubName: string, collectionName: string, subject?: string): StarterGuideIdea[] {
  // Check exact collection name first — guarantees variety across similar collections
  const exact = COLLECTION_GUIDE_IDEAS[collectionName]
  if (exact) {
    // Inject subject into summary for gaming collections when it adds meaning
    if (subject && exact.guideType !== "sop" && exact.guideType !== "reference") {
      const summary = exact.summary.replace(/\bnew players\b/, `new ${subject} players`)
        .replace(/\byour (build|playstyle|gear|stats)\b/, `your ${subject} $1`)
      return [{ ...exact, summary }]
    }
    return [{ ...exact }]
  }

  const lower = `${hubName} ${collectionName}`.toLowerCase()
  const s = subject ? `${subject} ` : ""

  // Gaming-specific ideas
  if (lower.includes("getting started") || lower.includes("quickstart") || lower.includes("first")) {
    return [{ title: `${collectionName}: Complete Beginner's Walkthrough`, summary: `Everything a new ${s}player needs to know in the first hour.`, guideType: "guide", difficulty: "beginner" }]
  }
  if (lower.includes("build") || lower.includes("loadout")) {
    return [
      { title: "Best Starter Build for New Players", summary: `A forgiving, easy-to-pilot ${s}build for your first hours.`, guideType: "character-build", difficulty: "beginner" },
      { title: "Endgame Meta Build Guide", summary: `Optimized ${s}stat distribution for late-game content.`, guideType: "character-build", difficulty: "advanced" },
    ]
  }
  if (lower.includes("boss")) {
    return [{ title: "Boss Fight Strategy Guide", summary: subject ? `${subject} boss phase breakdowns, attack patterns, and counter builds.` : "Boss phase breakdowns, attack patterns, and counter builds.", guideType: "boss-guide", difficulty: "intermediate" }]
  }
  if (lower.includes("patch") || lower.includes("balance") || lower.includes("update")) {
    return [{ title: "Patch Notes Summary & Impact Analysis", summary: `What changed and how it affects your ${s}playstyle.`, guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("tier") || lower.includes("tier list")) {
    return [{ title: "Current Meta Tier List", summary: subject ? `${subject} meta rankings — win rate, ease of play, and flexibility.` : "Meta rankings based on win rate, ease of play, and flexibility.", guideType: "tier-list", difficulty: "intermediate" }]
  }
  if (lower.includes("farming") || lower.includes("resource") || lower.includes("daily")) {
    return [{ title: "Efficient Daily Farm Route", summary: `Maximize ${s}resources per hour with this optimized route.`, guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("pvp") || lower.includes("combat") || lower.includes("strategy") || lower.includes("tactic")) {
    return [{ title: "PvP Fundamentals Guide", summary: `Core ${s}combat mechanics, positioning, and engagement rules.`, guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("lore") || lower.includes("story") || lower.includes("world")) {
    return [{ title: `${subject ? `${subject} ` : ""}Lore Overview`, summary: subject ? `Key factions, timeline, and story context for ${subject}.` : "Key factions, timeline, and story context for new readers.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("crafting") || lower.includes("recipe")) {
    return [{ title: "Crafting System Explained", summary: `How the ${s}crafting system works, from basic to advanced.`, guideType: "guide", difficulty: "beginner" }]
  }
  if (lower.includes("progression") || lower.includes("leveling") || lower.includes("gear")) {
    return [{ title: "Progression Roadmap", summary: `The fastest path from start to ${s}endgame — gear tiers and key milestones.`, guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("economy") || lower.includes("trading") || lower.includes("currency")) {
    return [{ title: "Economy & Trading Basics", summary: `How to earn and spend ${s}currency efficiently.`, guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("survival") || lower.includes("beginner")) {
    return [{ title: "Beginner's Survival Guide", summary: `Core ${s}mechanics every new player must know to survive the first night.`, guideType: "beginner-guide", difficulty: "beginner" }]
  }

  // Training / business ideas
  if (lower.includes("onboarding") || lower.includes("first day") || lower.includes("first week")) {
    return [{ title: "New Team Member Onboarding Checklist", summary: "Everything to complete in the first week.", guideType: "sop", difficulty: "beginner" }]
  }
  if (lower.includes("compliance") || lower.includes("policy") || lower.includes("regulatory")) {
    return [{ title: "Compliance Policy Overview", summary: "Key policies every team member must know.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("food safety") || lower.includes("sanitation") || lower.includes("temperature")) {
    return [{ title: "Food Safety Daily Checklist", summary: "Temperature logs, sanitation steps, and sign-off procedure.", guideType: "sop", difficulty: "beginner" }]
  }
  if (lower.includes("opening") || lower.includes("closing") || lower.includes("operations")) {
    return [{ title: "Opening Procedures SOP", summary: "Step-by-step opening checklist for the shift lead.", guideType: "sop", difficulty: "beginner" }]
  }

  // Repair / tech ideas
  if (lower.includes("diagnostic") || lower.includes("triage")) {
    return [{ title: "Initial Triage Checklist", summary: "First questions to ask and quick tests to run.", guideType: "troubleshooting", difficulty: "intermediate" }]
  }
  if (lower.includes("safety") || lower.includes("ppe")) {
    return [{ title: "Safety Procedures Before Any Repair", summary: "Mandatory steps to protect yourself and equipment.", guideType: "sop", difficulty: "beginner" }]
  }
  if (lower.includes("troubleshoot") || lower.includes("common issue")) {
    return [{ title: "Common Issues Quick Reference", summary: "The 10 most-reported problems and their fixes.", guideType: "troubleshooting", difficulty: "intermediate" }]
  }

  // Home systems
  if (lower.includes("routine") || lower.includes("daily")) {
    return [{ title: "Daily Household Routine Guide", summary: "A structured routine for the whole family.", guideType: "guide", difficulty: "beginner" }]
  }
  if (lower.includes("medication") || lower.includes("allergy")) {
    return [{ title: "Medication Schedule Template", summary: "Daily medication times, doses, and caregiver notes.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("emergency") || lower.includes("contact")) {
    return [{ title: "Emergency Contacts Reference Card", summary: "Family, neighbors, doctors, and emergency services.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("seasonal") || lower.includes("maintenance")) {
    return [{ title: "Seasonal Home Maintenance Checklist", summary: "Tasks to complete each season to keep systems running.", guideType: "sop", difficulty: "beginner" }]
  }

  // Creator workflow
  if (lower.includes("content") || lower.includes("calendar") || lower.includes("planning")) {
    return [{ title: "Weekly Content Planning Template", summary: "How to plan, batch, and schedule content for the week.", guideType: "guide", difficulty: "beginner" }]
  }
  if (lower.includes("upload") || lower.includes("publish") || lower.includes("production")) {
    return [{ title: "Video Upload Checklist", summary: "Title, tags, thumbnail, description, and publishing steps.", guideType: "sop", difficulty: "beginner" }]
  }

  // Generic fallback
  const subjectPrefix = subject ? `${subject}: ` : ""
  return [{ title: `${subjectPrefix}${collectionName} Overview`, summary: `Introduction to ${collectionName.toLowerCase()} — what it covers and how to use it.`, guideType: "guide", difficulty: "beginner" }]
}

/**
 * Build a hierarchical scaffold from the flat hub-name suggestion list.
 * Each hub receives 2-3 starter collections from `HUB_TO_COLLECTIONS`,
 * falling back to a generic two-collection seed when the hub is unknown.
 * Each collection receives 1-2 starter guide ideas (proposal-only metadata).
 */
function generateScaffoldSuggestion(
  typeId: string,
  hubNames: string[],
  subject?: string,
): SmartFillScaffoldSuggestion {
  // Track seen idea titles across the whole scaffold to prevent duplicates
  const seenTitles = new Set<string>()

  const hubs: SmartFillHubSuggestion[] = hubNames.map((hubName) => {
    const collections =
      HUB_TO_COLLECTIONS[hubName] ??
      [
        { name: "Overview", slug: "overview", description: `${hubName} overview and starting points.` },
        { name: "Resources", slug: "resources", description: `Reference material for ${hubName}.` },
      ]

    return {
      name: hubName,
      slug: slugify(hubName),
      description: HUB_DESCRIPTIONS[hubName] ?? `${hubName} guides and resources.`,
      collections: collections.map((c) => {
        const ideas = generateStarterGuideIdeas(hubName, c.name, subject)
        // Dedupe: filter out any title already seen in this scaffold
        const deduped = ideas.filter((idea) => {
          const key = idea.title.toLowerCase().replace(/[^a-z0-9]/g, "")
          if (seenTitles.has(key)) return false
          seenTitles.add(key)
          return true
        })
        return {
          ...c,
          starterGuideIdeas: deduped.length > 0 ? deduped : undefined,
        }
      }),
    }
  })

  return { hubs }
}
