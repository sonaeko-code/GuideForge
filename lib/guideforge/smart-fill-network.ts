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

  let name: string

  const sfx = typeSuffix[typeId] ?? "Guide Hub"
  const defaultName = typeDefaultNames[typeId] ?? "Knowledge Network"
  const descriptor = typeDescriptor[typeId] ?? "Guide"

  if (quotedMatch) {
    // Use quoted text as the core name
    name = `${quotedMatch[1]} ${sfx}`
  } else if (detectedAnchors.length > 0) {
    // Combine detected domain anchors with type descriptor + suffix.
    // "Survival RPG Strategy Guides" / "Laptop Repair Hub" / "Onboarding Team Runbook".
    const anchorPhrase = detectedAnchors.join(" ")
    name = `${anchorPhrase} ${descriptor}`
  } else if (properNounMatch && properNounMatch[1].length > 2) {
    // Use detected proper noun
    name = `${properNounMatch[1]} ${sfx}`
  } else {
    // Fall back to a cleaned-up, concise version: take first meaningful noun phrase
    // Remove type-describing words and pick up to 3 specific words
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
      // Capitalize first letters
      const core = candidateWords
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
      name = `${core} ${sfx}`
    } else {
      name = defaultName
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
  const suggestedScaffold = generateScaffoldSuggestion(typeId, suggestedHubs)

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
 * Generate 1-2 starter guide ideas for a given collection based on its name and parent hub.
 * These are purely informational — shown in the scaffold preview, not auto-saved.
 */
function generateStarterGuideIdeas(hubName: string, collectionName: string): StarterGuideIdea[] {
  const lower = `${hubName} ${collectionName}`.toLowerCase()

  // Gaming-specific ideas
  if (lower.includes("getting started") || lower.includes("quickstart") || lower.includes("first")) {
    return [{ title: `${collectionName}: Complete Beginner's Walkthrough`, summary: "Everything a new player needs to know in the first hour.", guideType: "guide", difficulty: "beginner" }]
  }
  if (lower.includes("build") || lower.includes("loadout")) {
    return [
      { title: "Best Starter Build for New Players", summary: "A forgiving, easy-to-pilot build for your first hours.", guideType: "character-build", difficulty: "beginner" },
      { title: "Endgame Meta Build Guide", summary: "Optimized stat distribution for late-game content.", guideType: "character-build", difficulty: "advanced" },
    ]
  }
  if (lower.includes("boss")) {
    return [{ title: "Boss Fight Strategy Guide", summary: "Phase breakdowns, attack patterns, and counter strategies.", guideType: "boss-guide", difficulty: "intermediate" }]
  }
  if (lower.includes("patch") || lower.includes("balance") || lower.includes("update")) {
    return [{ title: "Patch Notes Summary & Impact Analysis", summary: "What changed and how it affects your playstyle.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("tier") || lower.includes("tier list")) {
    return [{ title: "Current Meta Tier List", summary: "Rankings based on win rate, ease of play, and flexibility.", guideType: "tier-list", difficulty: "intermediate" }]
  }
  if (lower.includes("farming") || lower.includes("resource") || lower.includes("daily")) {
    return [{ title: "Efficient Daily Farm Route", summary: "Maximize resources per hour with this optimized route.", guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("pvp") || lower.includes("combat") || lower.includes("strategy") || lower.includes("tactic")) {
    return [{ title: "PvP Fundamentals Guide", summary: "Core mechanics, positioning, and engagement rules.", guideType: "guide", difficulty: "intermediate" }]
  }
  if (lower.includes("lore") || lower.includes("story") || lower.includes("world")) {
    return [{ title: "World Lore Overview", summary: "Key factions, timeline, and story context for new readers.", guideType: "reference", difficulty: "beginner" }]
  }
  if (lower.includes("crafting") || lower.includes("recipe")) {
    return [{ title: "Crafting System Explained", summary: "How the crafting system works, from basic to advanced.", guideType: "guide", difficulty: "beginner" }]
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
  return [{ title: `${collectionName} Overview Guide`, summary: `Introduction to ${collectionName.toLowerCase()} — what it covers and how to use it.`, guideType: "guide", difficulty: "beginner" }]
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
): SmartFillScaffoldSuggestion {
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
      description: `${hubName} for your network.`,
      collections: collections.map((c) => ({
        ...c,
        starterGuideIdeas: generateStarterGuideIdeas(hubName, c.name),
      })),
    }
  })

  return { hubs }
}
