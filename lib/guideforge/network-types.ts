/**
 * GuideForge — Central Network Type Registry
 *
 * Single source of truth for all network types.
 * Each entry has:
 *   - id: stable UI identifier (used in the form, draft, URLs)
 *   - dbType: the NetworkType value written to `networks.type` in Supabase.
 *             The database column only accepts the 6 original values:
 *             gaming | repair | sop | creator | training | community.
 *             New UI types that don't yet have a DB enum value map to the
 *             closest existing one here. No migrations required.
 *   - label: user-facing dropdown / wizard label
 *   - description: one-line description shown in UI
 *   - bestFor: example use-cases shown below the dropdown (Step 2 helper text)
 *   - defaultTheme: pre-selected theme when this type is chosen
 *   - defaultName: pre-filled network name
 *   - defaultSlug: pre-filled domain prefix
 *   - defaultDescription: pre-filled description
 *   - scaffoldKey: which ScaffoldTemplate id to use (or null → generic)
 *   - keywords: Smart Fill detection strings
 *   - enabled: false = rendered as "Coming next" on welcome, excluded from dropdown
 */

import type { NetworkType, ThemeDirection } from "./types"

export interface NetworkTypeEntry {
  /** Stable UI id — stored in the wizard draft, used in URLs, never empty. */
  id: string
  /**
   * DB-safe NetworkType value. Must be one of the 6 values the `networks.type`
   * column accepts: gaming | repair | sop | creator | training | community.
   * New types map to the closest existing DB value until a migration adds them.
   */
  dbType: NetworkType
  label: string
  description: string
  bestFor: string[]
  defaultTheme: ThemeDirection
  defaultName: string
  defaultSlug: string
  defaultDescription: string
  /** ScaffoldTemplate.id in starter-scaffolds.ts, or null to use generic scaffold. */
  scaffoldKey: string | null
  keywords: string[]
  enabled: boolean
}

export const NETWORK_TYPE_REGISTRY: NetworkTypeEntry[] = [
  {
    id: "gaming",
    dbType: "gaming",
    label: "Gaming Guide Network",
    description: "Multi-game guide platform with hubs, builds, and walkthroughs.",
    bestFor: ["Game builds & tier lists", "Boss walkthroughs", "Patch notes", "Esports strategy", "Community guides"],
    defaultTheme: "ember",
    defaultName: "QuestLine",
    defaultSlug: "questline",
    defaultDescription:
      "A structured gaming guide network for builds, walkthroughs, news, and community knowledge.",
    scaffoldKey: "gaming",
    keywords: [
      "game", "gaming", "quest", "boss", "build", "rpg", "survival", "mmorpg",
      "mmo", "steam", "dota", "wow", "raid", "dungeon", "esports", "fps", "moba",
      "roguelike", "crafting", "sandbox", "speedrun", "deckbuilder", "soulslike",
      "walkthrough", "patch notes", "tier list", "pvp", "pve", "loot",
    ],
    enabled: true,
  },
  {
    id: "tech_repair",
    dbType: "repair",
    label: "Tech Repair / Troubleshooting Network",
    description: "Device repair guides, diagnostics, and technical support documentation.",
    bestFor: ["Laptop & phone repair", "Diagnostics & triage", "Device support", "Tools & safety", "Repair SOPs"],
    defaultTheme: "industrial",
    defaultName: "FieldFix",
    defaultSlug: "fieldfix",
    defaultDescription:
      "Procedural repair guides with safety callouts, model targeting, and revision history.",
    scaffoldKey: "repair",
    keywords: [
      "repair", "fix", "troubleshoot", "diagnostic", "broken", "maintenance",
      "laptop", "printer", "phone", "mobile", "device", "hardware", "battery",
      "screen", "wifi", "network issue", "tool", "safety", "procedure",
    ],
    enabled: true,
  },
  {
    id: "creator_workflow",
    dbType: "creator",
    label: "Creator Workflow Network",
    description: "Workflow guides for content creators: YouTube, streaming, publishing, and newsletters.",
    bestFor: ["YouTube & streaming systems", "Thumbnail & editing checklists", "Content planning", "Publishing workflows", "Analytics & growth"],
    defaultTheme: "copper",
    defaultName: "CreatorKit",
    defaultSlug: "creatorkit",
    defaultDescription:
      "Practical workflows and checklists for content creators across YouTube, podcasting, and streaming.",
    scaffoldKey: null,
    keywords: [
      "youtube", "streaming", "content creator", "thumbnail", "editing",
      "publishing", "newsletter", "podcast", "twitch", "tiktok", "analytics",
      "monetize", "channel", "audience", "social media", "video", "clip",
    ],
    enabled: true,
  },
  {
    id: "small_business",
    dbType: "sop",
    label: "Small Business Launch Network",
    description: "Guides for launching and running a small business: branding, operations, onboarding.",
    bestFor: ["Business launch checklists", "Client onboarding", "Pricing & offers", "Branding & website", "Team SOPs"],
    defaultTheme: "copper",
    defaultName: "LaunchBook",
    defaultSlug: "launchbook",
    defaultDescription:
      "Practical guides for launching and running a small business, from branding to daily operations.",
    scaffoldKey: "sop",
    keywords: [
      "small business", "business launch", "startup", "pricing", "clients",
      "branding", "website", "onboarding", "operations", "freelance",
      "invoice", "contract", "marketing", "offers", "agency", "revenue",
    ],
    enabled: true,
  },
  {
    id: "wellness_training",
    dbType: "training",
    label: "Wellness / Training Network",
    description: "Client education, fitness routines, wellness guides, and learning paths.",
    bestFor: ["Fitness routines & programs", "Nutrition & habits", "Client education", "Wellness protocols", "Learning paths"],
    defaultTheme: "soft",
    defaultName: "WellPath",
    defaultSlug: "wellpath",
    defaultDescription:
      "Structured wellness guides and training programs for clients and learners.",
    scaffoldKey: null,
    keywords: [
      "wellness", "fitness", "health", "nutrition", "workout", "routine",
      "habit", "breathwork", "mental health", "therapy", "coaching",
      "client education", "program", "training plan", "lab", "recovery",
    ],
    enabled: true,
  },
  {
    id: "home_systems",
    dbType: "repair",
    label: "Home Systems / Maintenance Network",
    description: "Household maintenance, home systems, recurring checklists, and emergency prep.",
    bestFor: ["Seasonal maintenance checklists", "HVAC & plumbing", "Home improvement", "Emergency prep", "Recurring household tasks"],
    defaultTheme: "parchment",
    defaultName: "HomeBase",
    defaultSlug: "homebase",
    defaultDescription:
      "Practical home maintenance guides, recurring checklists, and household system documentation.",
    scaffoldKey: "repair",
    keywords: [
      "home", "house", "maintenance", "hvac", "plumbing", "electrical",
      "lawn", "garden", "household", "chore", "cleaning", "emergency prep",
      "home improvement", "renovation", "appliance", "seasonal",
    ],
    enabled: true,
  },
  {
    id: "restaurant_training",
    dbType: "sop",
    label: "Restaurant / Team Training Network",
    description: "Staff onboarding, food safety SOPs, opening/closing checklists for food service teams.",
    bestFor: ["Kitchen SOPs", "Food safety checklists", "Staff onboarding", "Opening & closing procedures", "Team training"],
    defaultTheme: "industrial",
    defaultName: "KitchenRunbook",
    defaultSlug: "kitchen-runbook",
    defaultDescription:
      "SOPs, onboarding guides, and food safety checklists for restaurant and food service teams.",
    scaffoldKey: "sop",
    keywords: [
      "restaurant", "kitchen", "food safety", "staff onboarding", "opening",
      "closing", "pos", "menu", "server", "cook", "chef", "health inspection",
      "front of house", "back of house", "food service", "hospitality",
    ],
    enabled: true,
  },
  {
    id: "personal_knowledge",
    dbType: "creator",
    label: "Personal Knowledge System",
    description: "Life organization, project tracking, decision logs, routines, and learning notes.",
    bestFor: ["Daily planning & reviews", "Project checklists", "Habit systems", "Learning notes", "Decision logs & long-term goals"],
    defaultTheme: "arcane",
    defaultName: "MyNotebook",
    defaultSlug: "my-notebook",
    defaultDescription:
      "A personal knowledge system for organizing life, work, projects, routines, and learning goals.",
    scaffoldKey: null,
    keywords: [
      "personal", "knowledge", "life", "projects", "routines", "habit",
      "decision log", "learning goals", "notes", "planning", "review",
      "weekly review", "daily planning", "pkm", "second brain", "zettelkasten",
      "organize", "productivity", "journal", "goals",
    ],
    enabled: true,
  },
  {
    id: "general",
    dbType: "community",
    label: "General Knowledge Network",
    description: "A flexible, open-ended network for any knowledge, reference, or guide content.",
    bestFor: ["Flexible reference content", "Mixed topics", "Community wikis", "Any knowledge base"],
    defaultTheme: "parchment",
    defaultName: "KnowledgeBase",
    defaultSlug: "knowledge-base",
    defaultDescription:
      "A flexible general-purpose knowledge network for guides, reference, and community content.",
    scaffoldKey: null,
    keywords: [],
    enabled: true,
  },
]

// ---------- Lookup helpers ----------

/** All enabled types — used in the Step 2 dropdown. */
export function getEnabledRegistryTypes(): NetworkTypeEntry[] {
  return NETWORK_TYPE_REGISTRY.filter((t) => t.enabled)
}

/** All disabled types — used on the welcome page as "Coming next". */
export function getComingNextRegistryTypes(): NetworkTypeEntry[] {
  return NETWORK_TYPE_REGISTRY.filter((t) => !t.enabled)
}

/** Find an entry by its UI id. Returns undefined if not found. */
export function getRegistryTypeById(id: string): NetworkTypeEntry | undefined {
  return NETWORK_TYPE_REGISTRY.find((t) => t.id === id)
}

/** Resolve the DB-safe NetworkType from a UI id. Falls back to "gaming". */
export function resolveDbType(id: string): NetworkType {
  return getRegistryTypeById(id)?.dbType ?? "gaming"
}

/** Resolve the UI registry id from a DB NetworkType. Used to find the correct registry entry for a stored network. */
export function getRegistryIdFromDbType(dbType: NetworkType): string {
  const entry = NETWORK_TYPE_REGISTRY.find((t) => t.dbType === dbType)
  return entry?.id ?? "gaming"
}

/**
 * The set of valid UI type ids. Used to validate draft state so we never
 * write an empty string or unknown value into the draft.
 */
export const VALID_REGISTRY_IDS: ReadonlySet<string> = new Set(
  NETWORK_TYPE_REGISTRY.map((t) => t.id)
)

/** Return the first enabled registry type's id (safe default for fallbacks). */
export function getDefaultRegistryId(): string {
  return NETWORK_TYPE_REGISTRY.find((t) => t.enabled)?.id ?? "gaming"
}

/**
 * Scaffold key to registry id map — used by buildDefaultScaffoldDraft to find
 * which ScaffoldTemplate covers a given UI type id.
 */
export function getScaffoldKeyForType(id: string): string | null {
  return getRegistryTypeById(id)?.scaffoldKey ?? null
}
