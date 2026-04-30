import type {
  Collection,
  Guide,
  GuideAuthor,
  GuideStep,
  Hub,
  Network,
} from "./types"
import { getDefaultForgeRules } from "./forge-rules"

/**
 * GuideForge — Mock Seed Data
 *
 * This file is the single source of truth for the demo build until
 * Supabase is wired in.
 *
 * Demo path:
 *   QuestLine (network)
 *     -> Emberfall (hub / game)
 *       -> Character Builds (collection)
 *         -> Best Fire Warden Beginner Build (guide)
 *
 * TODO: Replace with Supabase queries once persistence is added.
 */

// ---------- Authors ----------

// ---------- Authors ----------

const AUTHOR_RILEY: GuideAuthor = {
  id: "author_riley",
  displayName: "Riley Ashford",
  handle: "riley.ashford",
}

const AUTHOR_NOVA: GuideAuthor = {
  id: "author_nova",
  displayName: "Nova Petrov",
  handle: "nova.petrov",
}

const AUTHOR_MARCUS: GuideAuthor = {
  id: "author_marcus",
  displayName: "Marcus Chen",
  handle: "marcus.chen",
}

const AUTHOR_YUKI: GuideAuthor = {
  id: "author_yuki",
  displayName: "Yuki Tanaka",
  handle: "yuki.tanaka",
}

const AUTHOR_ALEX: GuideAuthor = {
  id: "author_alex",
  displayName: "Alex Rodriguez",
  handle: "alex.rodriguez",
}

// ---------- Guide steps (sections) ----------

const FIRE_WARDEN_STEPS: GuideStep[] = [
  {
    id: "step_overview",
    guideId: "guide_fire_warden_beginner",
    order: 1,
    kind: "overview",
    title: "Overview",
    body: "The Fire Warden is a sustain-focused mage built around stacking burn damage and converting it into shields. This beginner build prioritizes survivability while you learn the rotation, then leans into damage as your gear improves.",
  },
  {
    id: "step_strengths",
    guideId: "guide_fire_warden_beginner",
    order: 2,
    kind: "strengths",
    title: "Strengths",
    body: "Strong solo clear, very forgiving rotation, and one of the best self-sustain kits in Emberfall. Excellent for new players who want to learn fights without dying every pull.",
  },
  {
    id: "step_weaknesses",
    guideId: "guide_fire_warden_beginner",
    order: 3,
    kind: "weaknesses",
    title: "Weaknesses",
    body: "Damage ramps slowly. Struggles against fights with frequent target swaps. Single-target burst is below average until you unlock Tier 3 gear.",
  },
  {
    id: "step_gear",
    guideId: "guide_fire_warden_beginner",
    order: 4,
    kind: "gear",
    title: "Recommended Gear",
    body: "Two-piece Cinderweave for the burn extension, Pyre Focus offhand for shield uptime, and any sustain ring you find at level 18+. Do not waste shards rerolling stats this early.",
  },
  {
    id: "step_skill_priority",
    guideId: "guide_fire_warden_beginner",
    order: 5,
    kind: "skill-priority",
    title: "Skill Priority",
    body: "Max Emberlash first, then Smoldering Ward, then Cauterize. Leave Inferno Pact at one point until your gear can support the cooldown.",
  },
  {
    id: "step_rotation",
    guideId: "guide_fire_warden_beginner",
    order: 6,
    kind: "rotation",
    title: "Rotation",
    body: "Open with Smoldering Ward, apply Emberlash twice, weave Cauterize on cooldown, and only press Inferno Pact when you have at least 60 percent shield. Repeat. The rotation is intentionally short so you can focus on positioning.",
  },
  {
    id: "step_leveling",
    guideId: "guide_fire_warden_beginner",
    order: 7,
    kind: "leveling",
    title: "Leveling Path",
    body: "Quest through the Ashvale starter zone until level 12, then run Ember Hollow dungeons until 20. Avoid the Frostmarch arc until you have at least 1,200 resistance.",
  },
  {
    id: "step_mistakes",
    guideId: "guide_fire_warden_beginner",
    order: 8,
    kind: "mistakes",
    title: "Common Mistakes",
    body: "Pressing Inferno Pact on cooldown, ignoring Smoldering Ward uptime, and over-investing in critical strike before reaching the 35 percent burn-damage breakpoint.",
  },
  {
    id: "step_patch_notes",
    guideId: "guide_fire_warden_beginner",
    order: 9,
    kind: "patch-notes",
    title: "Patch Notes Impact",
    body: "Patch 4.2 buffed Emberlash duration by 15 percent and softly nerfed Inferno Pact shield generation. The build is still strong; the rotation did not change.",
  },
  {
    id: "step_final_tips",
    guideId: "guide_fire_warden_beginner",
    order: 10,
    kind: "final-tips",
    title: "Final Tips",
    body: "Do not chase optimal gear. Hit your rotation cleanly and the Fire Warden carries itself. Re-read the rotation section after every two hours of play and refine one habit at a time.",
  },
]

// ---------- Additional guides (other games) ----------

const SCOUT_LOADOUT_STEPS: GuideStep[] = [
  {
    id: "step_overview_scout",
    guideId: "guide_scout_loadout",
    order: 1,
    kind: "overview",
    title: "Scout Loadout Overview",
    body: "The Scout class excels at mobility and hit-and-run tactics. This beginner loadout focuses on survivability while you master movement mechanics.",
  },
  {
    id: "step_scout_weapons",
    guideId: "guide_scout_loadout",
    order: 2,
    kind: "custom",
    title: "Recommended Weapons",
    body: "Start with the Plasma Rifle for reliable damage output. Pair it with the Stun Pulse pistol for crowd control. The Early Access tier is sufficient until level 15.",
  },
  {
    id: "step_scout_mods",
    guideId: "guide_scout_loadout",
    order: 3,
    kind: "custom",
    title: "Essential Mods",
    body: "Install the Mobility Frame for bonus movement speed and the Reflexive Shield module. Skip power cores for now; focus on staying alive.",
  },
]

const SCOUT_LOADOUT_GUIDE: Guide = {
  id: "guide_scout_loadout",
  collectionId: "collection_starfall_builds",
  hubId: "hub_starfall",
  networkId: "network_questline",
  slug: "best-scout-loadout-for-new-players",
  title: "Best Scout Loadout for New Players",
  summary: "A survival-first loadout for Starfall Outriders scouts. Focus on mobility and positioning.",
  type: "character-build",
  difficulty: "beginner",
  status: "published",
  verification: "forge-verified",
  requirements: ["Level 5 or higher", "Starter weapons from tutorial"],
  warnings: [],
  version: "Season 3",
  estimatedMinutes: 6,
  steps: SCOUT_LOADOUT_STEPS,
  author: AUTHOR_MARCUS,
  reviewer: AUTHOR_YUKI,
  createdAt: "2025-10-15T11:00:00.000Z",
  updatedAt: "2025-11-02T14:30:00.000Z",
  publishedAt: "2025-10-15T12:00:00.000Z",
}

const SHADOW_MONK_STEPS: GuideStep[] = [
  {
    id: "step_overview_monk",
    guideId: "guide_shadow_monk",
    order: 1,
    kind: "overview",
    title: "Shadow Monk Overview",
    body: "The Shadow Monk is a hybrid damage/stealth class. This guide covers the early leveling build that emphasizes burst damage from stealth.",
  },
]

const SHADOW_MONK_GUIDE: Guide = {
  id: "guide_shadow_monk",
  collectionId: "collection_hollowspire_builds",
  hubId: "hub_hollowspire",
  networkId: "network_questline",
  slug: "shadow-monk-leveling-build",
  title: "Shadow Monk Leveling Build",
  summary: "Maximize damage output while learning stealth mechanics. This build prioritizes burst and escape.",
  type: "character-build",
  difficulty: "intermediate",
  status: "published",
  verification: "reviewed",
  requirements: ["Level 1", "Complete Hollowspire tutorial"],
  warnings: ["Patch 3.8 changed shadow mechanics significantly"],
  version: "Patch 3.8",
  estimatedMinutes: 12,
  steps: SHADOW_MONK_STEPS,
  author: AUTHOR_ALEX,
  reviewer: AUTHOR_RILEY,
  createdAt: "2025-09-20T09:15:00.000Z",
  updatedAt: "2025-11-01T16:45:00.000Z",
  publishedAt: "2025-09-21T10:00:00.000Z",
}

const MECH_BUILD_STEPS: GuideStep[] = [
  {
    id: "step_overview_mech",
    guideId: "guide_mech_build",
    order: 1,
    kind: "overview",
    title: "Starter Mech Build",
    body: "A heat-efficient starter build for Mechbound Tactics. Learn positioning before worrying about damage optimization.",
  },
]

const MECH_BUILD_GUIDE: Guide = {
  id: "guide_mech_build",
  collectionId: "collection_mechbound_builds",
  hubId: "hub_mechbound",
  networkId: "network_questline",
  slug: "starter-mech-build",
  title: "Starter Mech Build",
  summary: "Heat management fundamentals for pilots just starting Mechbound Tactics arena.",
  type: "character-build",
  difficulty: "beginner",
  status: "published",
  verification: "forge-verified",
  requirements: ["Complete campaign intro"],
  warnings: [],
  version: "Patch 2.1",
  estimatedMinutes: 7,
  steps: MECH_BUILD_STEPS,
  author: AUTHOR_YUKI,
  reviewer: AUTHOR_MARCUS,
  createdAt: "2025-10-01T13:20:00.000Z",
  updatedAt: "2025-10-28T11:00:00.000Z",
  publishedAt: "2025-10-01T14:00:00.000Z",
}

const FROSTMARCH_BOSS_STEPS: GuideStep[] = [
  {
    id: "step_overview_boss",
    guideId: "guide_frostmarch_boss",
    order: 1,
    kind: "overview",
    title: "Frostmarch Boss Mechanics",
    body: "The Frostmarch boss is one of Emberfall's most mechanically complex fights. This guide breaks down every phase.",
  },
]

const FROSTMARCH_BOSS_GUIDE: Guide = {
  id: "guide_frostmarch_boss",
  collectionId: "collection_boss_guides",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "frostmarch-boss-mechanics",
  title: "Frostmarch Boss Mechanics",
  summary: "Detailed phase breakdown and mechanic timings for the Frostmarch boss encounter.",
  type: "boss-guide",
  difficulty: "intermediate",
  status: "published",
  verification: "forge-verified",
  requirements: ["Level 28+", "Access to Frostmarch raid"],
  warnings: ["Mechanics differ slightly between normal and hard modes"],
  version: "Patch 4.2",
  estimatedMinutes: 14,
  steps: FROSTMARCH_BOSS_STEPS,
  author: AUTHOR_NOVA,
  reviewer: AUTHOR_RILEY,
  createdAt: "2025-08-10T08:00:00.000Z",
  updatedAt: "2025-11-03T10:15:00.000Z",
  publishedAt: "2025-08-12T09:00:00.000Z",
}

const BEGINNERS_LEVELING_STEPS: GuideStep[] = [
  {
    id: "step_overview_leveling",
    guideId: "guide_beginner_leveling",
    order: 1,
    kind: "overview",
    title: "Level 1–30 Path",
    body: "A safe, efficient leveling path for brand new Emberfall players. Designed to teach zone mechanics and combat fundamentals.",
  },
]

const BEGINNERS_LEVELING_GUIDE: Guide = {
  id: "guide_beginner_leveling",
  collectionId: "collection_beginner_guides",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "emberfall-beginner-leveling-path",
  title: "Emberfall Beginner Leveling Path",
  summary: "Your first 30 hours in Emberfall. Zone order, camp locations, and common mistakes to avoid.",
  type: "beginner-guide",
  difficulty: "beginner",
  status: "published",
  verification: "forge-verified",
  requirements: ["Fresh character", "Level 1"],
  warnings: [],
  version: "Patch 4.2",
  estimatedMinutes: 9,
  steps: BEGINNERS_LEVELING_STEPS,
  author: AUTHOR_RILEY,
  reviewer: AUTHOR_NOVA,
  createdAt: "2025-09-01T12:00:00.000Z",
  updatedAt: "2025-10-30T15:20:00.000Z",
  publishedAt: "2025-09-02T10:00:00.000Z",
}

const PATCH_42_CHANGES_STEPS: GuideStep[] = [
  {
    id: "step_overview_patch",
    guideId: "guide_patch_42",
    order: 1,
    kind: "overview",
    title: "Patch 4.2 Summary",
    body: "Patch 4.2 brings major balance changes to mage classes and introduces the new Ashvale expansion area.",
  },
]

const PATCH_42_GUIDE: Guide = {
  id: "guide_patch_42",
  collectionId: "collection_patch_notes",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "patch-4-2-build-changes",
  title: "Patch 4.2 Build Changes",
  summary: "Full analysis of how patch 4.2 affects meta builds and role balance.",
  type: "patch-notes",
  difficulty: "intermediate",
  status: "published",
  verification: "reviewed",
  requirements: [],
  warnings: [],
  version: "Patch 4.2",
  estimatedMinutes: 11,
  steps: PATCH_42_CHANGES_STEPS,
  author: AUTHOR_NOVA,
  reviewer: AUTHOR_RILEY,
  createdAt: "2025-10-20T16:00:00.000Z",
  updatedAt: "2025-11-04T09:02:00.000Z",
  publishedAt: "2025-10-21T11:00:00.000Z",
}

// ---------- Guide ----------

export const FIRE_WARDEN_GUIDE: Guide = {
  id: "guide_fire_warden_beginner",
  collectionId: "collection_character_builds",
  hubId: "hub_emberfall",
  networkId: "network_questline",

  slug: "best-fire-warden-beginner-build",
  title: "Best Fire Warden Beginner Build",
  summary:
    "A forgiving sustain-mage build for new Emberfall players. Learn the fights without getting punished, then transition into damage as your gear catches up.",

  type: "character-build",
  difficulty: "beginner",
  status: "published",
  verification: "forge-verified",

  requirements: [
    "Character level 10 or higher",
    "Access to Emberfall: Ashvale",
    "Two-piece Cinderweave (any tier)",
  ],
  warnings: [
    "Skill names changed in patch 4.2 — make sure your tooltips match this guide.",
  ],

  version: "Patch 4.2",
  estimatedMinutes: 8,

  steps: FIRE_WARDEN_STEPS,

  author: AUTHOR_RILEY,
  reviewer: AUTHOR_NOVA,

  createdAt: "2025-09-12T14:21:00.000Z",
  updatedAt: "2025-11-04T09:02:00.000Z",
  publishedAt: "2025-09-15T18:40:00.000Z",
}

// ---------- Collection ----------

export const CHARACTER_BUILDS_COLLECTION: Collection = {
  id: "collection_character_builds",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "character-builds",
  name: "Character Builds",
  description:
    "Curated builds for every class in Emberfall, ranked by clarity and current patch viability.",
  defaultGuideType: "character-build",
  guideIds: [FIRE_WARDEN_GUIDE.id],
}

const BEGINNER_GUIDES_COLLECTION: Collection = {
  id: "collection_beginner_guides",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "beginner-guides",
  name: "Beginner Guides",
  description: "First-30-hours guides written for brand new players.",
  defaultGuideType: "beginner-guide",
  guideIds: [BEGINNERS_LEVELING_GUIDE.id],
}

const BOSS_GUIDES_COLLECTION: Collection = {
  id: "collection_boss_guides",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "boss-guides",
  name: "Boss Guides",
  description: "Mechanic-by-mechanic walkthroughs for every Emberfall raid encounter.",
  defaultGuideType: "boss-guide",
  guideIds: [FROSTMARCH_BOSS_GUIDE.id],
}

const PATCH_NOTES_COLLECTION: Collection = {
  id: "collection_patch_notes",
  hubId: "hub_emberfall",
  networkId: "network_questline",
  slug: "patch-notes",
  name: "Patch Notes",
  description: "Plain-language patch summaries with impact analysis per role.",
  defaultGuideType: "patch-notes",
  guideIds: [PATCH_42_GUIDE.id],
}

// Starfall collections
const STARFALL_BUILDS_COLLECTION: Collection = {
  id: "collection_starfall_builds",
  hubId: "hub_starfall",
  networkId: "network_questline",
  slug: "loadouts",
  name: "Loadouts",
  description: "Optimized weapon and mod configurations for every Starfall class.",
  defaultGuideType: "character-build",
  guideIds: [SCOUT_LOADOUT_GUIDE.id],
}

const STARFALL_GUIDES_COLLECTION: Collection = {
  id: "collection_starfall_guides",
  hubId: "hub_starfall",
  networkId: "network_questline",
  slug: "guides",
  name: "Guides",
  description: "Mechanics guides and outpost defense strategies.",
  defaultGuideType: "beginner-guide",
  guideIds: [],
}

// Hollowspire collections
const HOLLOWSPIRE_BUILDS_COLLECTION: Collection = {
  id: "collection_hollowspire_builds",
  hubId: "hub_hollowspire",
  networkId: "network_questline",
  slug: "builds",
  name: "Builds",
  description: "Leveling and endgame builds for Hollowspire monks and warlocks.",
  defaultGuideType: "character-build",
  guideIds: [SHADOW_MONK_GUIDE.id],
}

const HOLLOWSPIRE_DUNGEON_COLLECTION: Collection = {
  id: "collection_hollowspire_dungeons",
  hubId: "hub_hollowspire",
  networkId: "network_questline",
  slug: "dungeons",
  name: "Dungeon Guides",
  description: "Boss strategies and treasure locations for every Hollowspire dungeon.",
  defaultGuideType: "walkthrough",
  guideIds: [],
}

// Mechbound collections
const MECHBOUND_BUILDS_COLLECTION: Collection = {
  id: "collection_mechbound_builds",
  hubId: "hub_mechbound",
  networkId: "network_questline",
  slug: "mech-builds",
  name: "Mech Builds",
  description: "Heat-efficient builds for every Mechbound mech class.",
  defaultGuideType: "character-build",
  guideIds: [MECH_BUILD_GUIDE.id],
}

const MECHBOUND_ARENA_COLLECTION: Collection = {
  id: "collection_mechbound_arena",
  hubId: "hub_mechbound",
  networkId: "network_questline",
  slug: "arena",
  name: "Arena Guides",
  description: "PvP strategies and control mechanics for ranked arena.",
  defaultGuideType: "beginner-guide",
  guideIds: [],
}

// ---------- Hub ----------

export const EMBERFALL_HUB: Hub = {
  id: "hub_emberfall",
  networkId: "network_questline",
  slug: "emberfall",
  name: "Emberfall",
  description:
    "A high-fantasy MMO of burning kingdoms and cinder magic. Builds, beginner paths, raid mechanics, and patch coverage.",
  tagline: "Burning kingdoms. Cinder magic. Better guides.",
  hubKind: "game",
  collectionIds: [
    CHARACTER_BUILDS_COLLECTION.id,
    BEGINNER_GUIDES_COLLECTION.id,
    BOSS_GUIDES_COLLECTION.id,
    PATCH_NOTES_COLLECTION.id,
  ],
}

export const STARFALL_HUB: Hub = {
  id: "hub_starfall",
  networkId: "network_questline",
  slug: "starfall-outriders",
  name: "Starfall Outriders",
  description:
    "A sci-fi action RPG featuring tactical squad gameplay, procedural missions, and intense outpost defense. Loadouts, strategy guides, and seasonal coverage.",
  tagline: "Hold the line. Adapt and survive.",
  hubKind: "game",
  collectionIds: [STARFALL_BUILDS_COLLECTION.id, STARFALL_GUIDES_COLLECTION.id],
}

export const HOLLOWSPIRE_HUB: Hub = {
  id: "hub_hollowspire",
  networkId: "network_questline",
  slug: "hollowspire",
  name: "Hollowspire",
  description:
    "A souls-like action RPG with deep class customization and relentless bosses. Builds, dungeon walkthroughs, and farming routes.",
  tagline: "Master the shadows. Conquer the void.",
  hubKind: "game",
  collectionIds: [HOLLOWSPIRE_BUILDS_COLLECTION.id, HOLLOWSPIRE_DUNGEON_COLLECTION.id],
}

export const MECHBOUND_HUB: Hub = {
  id: "hub_mechbound",
  networkId: "network_questline",
  slug: "mechbound-tactics",
  name: "Mechbound Tactics",
  description:
    "A tactical mech-based strategy game with heat management, arena rankings, and strategic loadout theory. Builds, control guides, and competitive analysis.",
  tagline: "Control the field. Master your heat.",
  hubKind: "game",
  collectionIds: [MECHBOUND_BUILDS_COLLECTION.id, MECHBOUND_ARENA_COLLECTION.id],
}

// ---------- Network ----------

export const QUESTLINE_NETWORK: Network = {
  id: "network_questline",
  slug: "questline",
  name: "QuestLine",
  description:
    "A structured gaming guide network for builds, walkthroughs, news, and community knowledge.",
  type: "gaming",
  visibility: "public",
  domain: "questline.guideforge.app",
  branding: {
    primaryColor: "ember",
    theme: "ember",
  },
  forgeRuleIds: getDefaultForgeRules("gaming").map((rule) => rule.id),
  hubIds: [EMBERFALL_HUB.id, STARFALL_HUB.id, HOLLOWSPIRE_HUB.id, MECHBOUND_HUB.id],
  createdAt: "2025-08-01T10:00:00.000Z",
  updatedAt: "2025-11-04T09:02:00.000Z",
}

// ---------- Aggregated exports ----------

export const MOCK_NETWORKS: Network[] = [QUESTLINE_NETWORK]
export const MOCK_HUBS: Hub[] = [
  EMBERFALL_HUB,
  STARFALL_HUB,
  HOLLOWSPIRE_HUB,
  MECHBOUND_HUB,
]
export const MOCK_COLLECTIONS: Collection[] = [
  CHARACTER_BUILDS_COLLECTION,
  BEGINNER_GUIDES_COLLECTION,
  BOSS_GUIDES_COLLECTION,
  PATCH_NOTES_COLLECTION,
  STARFALL_BUILDS_COLLECTION,
  STARFALL_GUIDES_COLLECTION,
  HOLLOWSPIRE_BUILDS_COLLECTION,
  HOLLOWSPIRE_DUNGEON_COLLECTION,
  MECHBOUND_BUILDS_COLLECTION,
  MECHBOUND_ARENA_COLLECTION,
]
export const MOCK_GUIDES: Guide[] = [
  FIRE_WARDEN_GUIDE,
  FROSTMARCH_BOSS_GUIDE,
  BEGINNERS_LEVELING_GUIDE,
  PATCH_42_GUIDE,
  SCOUT_LOADOUT_GUIDE,
  SHADOW_MONK_GUIDE,
  MECH_BUILD_GUIDE,
]

// ---------- Lookup helpers ----------

export function getNetworkById(id: string): Network | undefined {
  return MOCK_NETWORKS.find((n) => n.id === id)
}

export function getHubsByNetwork(networkId: string): Hub[] {
  return MOCK_HUBS.filter((h) => h.networkId === networkId)
}

export function getCollectionsByHub(hubId: string): Collection[] {
  return MOCK_COLLECTIONS.filter((c) => c.hubId === hubId)
}

export function getGuidesByCollection(collectionId: string): Guide[] {
  return MOCK_GUIDES.filter((g) => g.collectionId === collectionId)
}

export function getGuidesByHub(hubId: string): Guide[] {
  return MOCK_GUIDES.filter((g) => g.hubId === hubId)
}

export function getCollectionBySlug(slug: string): Collection | undefined {
  return MOCK_COLLECTIONS.find((c) => c.slug === slug)
}

export function getHubBySlug(slug: string): Hub | undefined {
  return MOCK_HUBS.find((h) => h.slug === slug)
}
