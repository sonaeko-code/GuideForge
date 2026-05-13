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

export interface SmartFillCollectionSuggestion {
  name: string
  slug: string
  description: string
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
    gaming: "Game Strategy Network",
    tech_repair: "Repair & Diagnostics Hub",
    home_systems: "Home Maintenance Guide",
    small_business: "Business Launch Playbook",
    restaurant_training: "Restaurant Operations Runbook",
    wellness_training: "Wellness & Training Program",
    creator_workflow: "Creator Workflow System",
    personal_knowledge: "Personal Knowledge System",
    general: "General Knowledge Network",
  }

  // Domain-anchor keywords: short, brandable nouns we'll bias toward when crafting a title.
  // These describe the "thing" the network is about (a genre, a product family, etc.).
  const DOMAIN_ANCHORS: Record<string, string> = {
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
    // Repair/SOP/training anchors
    "laptop": "Laptop",
    "printer": "Printer",
    "mobile": "Mobile Device",
    "appliance": "Appliance",
    "automotive": "Automotive",
    "onboarding": "Onboarding",
    "compliance": "Compliance",
    "safety": "Safety",
    "fitness": "Fitness",
    "wellness": "Wellness",
    "cooking": "Cooking",
    "photography": "Photography",
    "music": "Music",
    "design": "Design",
    "marketing": "Marketing",
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
    gaming: "Strategy",
    tech_repair: "Repair",
    home_systems: "Maintenance",
    small_business: "Operations",
    restaurant_training: "Training",
    wellness_training: "Wellness",
    creator_workflow: "Workflow",
    personal_knowledge: "Knowledge",
    general: "Community",
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
    // "Survival RPG Strategy Guides" / "Laptop Repair Hub" / "Onboarding Training Network".
    const anchorPhrase = detectedAnchors.join(" ")
    // Avoid duplication: if descriptor already appears as an anchor, drop it.
    const lowerAnchor = anchorPhrase.toLowerCase()
    const useDescriptor = !lowerAnchor.includes(descriptor.toLowerCase())
    name = useDescriptor
      ? `${anchorPhrase} ${descriptor} ${sfx}`
      : `${anchorPhrase} ${sfx}`
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
 * Prefers explicit topics mentioned in the rough idea over generic defaults.
 */
function generateHubSuggestions(type: string, idea: string, words: string[]): string[] {
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

  // Fallback defaults per type (keyed by registry id)
  const defaults: Record<string, string[]> = {
    gaming: ["Beginner Guides", "Builds & Loadouts", "Boss Guides", "Patch Notes", "Community Highlights"],
    tech_repair: ["Diagnostics & Testing", "Safety Procedures", "Tools & Equipment", "Troubleshooting", "Preventive Maintenance"],
    home_systems: ["Seasonal Maintenance", "Home Systems", "Emergency Prep", "Tools & Equipment", "Common Issues"],
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
}

/**
 * Build a hierarchical scaffold from the flat hub-name suggestion list.
 * Each hub receives 2-3 starter collections from `HUB_TO_COLLECTIONS`,
 * falling back to a generic two-collection seed when the hub is unknown.
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
      collections: collections.map((c) => ({ ...c })),
    }
  })

  return { hubs }
}
