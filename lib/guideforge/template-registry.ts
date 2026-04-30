/**
 * GuideForge Template Registry
 *
 * Defines reusable template metadata for public site rendering.
 * Each template describes what data it needs and what it renders.
 *
 * Future use:
 *   1. AI generates structured data (GeneratedGuide, GeneratedNetwork, etc.)
 *   2. Data is persisted to Supabase
 *   3. Public routes query Supabase and render using these templates
 *   4. Multiple networks can use the same templates (e.g., QuestLine, CraftWiki, RepairHub)
 */

import type { NetworkType, GuideType, ThemeDirection } from "./types"

export type TemplateId =
  | "questline_gaming_network"
  | "network_homepage"
  | "game_hub"
  | "collection_page"
  | "guide_page"
  | "patch_news_page"

export interface TemplateMetadata {
  /** Unique identifier for the template. */
  id: TemplateId
  /** Human-readable name. */
  name: string
  /** Long-form description. */
  description: string
  /** Network types this template supports. */
  supportedNetworkTypes: NetworkType[]
  /** Guide types this template can render. */
  supportedGuideTypes: GuideType[]
  /** Required fields that must be present in generated data. */
  requiredFields: string[]
  /** Optional fields that enhance rendering. */
  optionalFields: string[]
  /** Current version of the template. */
  version: string
  /** Route pattern, e.g. "/n/questline/[hubSlug]/[guideSlug]" */
  routePattern?: string
  /** Theme directions this template works well with. */
  compatibleThemes: ThemeDirection[]
}

export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateMetadata> = {
  questline_gaming_network: {
    id: "questline_gaming_network",
    name: "QuestLine Gaming Network Template",
    description:
      "Complete template pack for a gaming network with game hubs, guide collections, and editorial dispatch news.",
    supportedNetworkTypes: ["gaming"],
    supportedGuideTypes: [
      "character-build",
      "walkthrough",
      "boss-guide",
      "beginner-guide",
      "patch-notes",
      "news",
    ],
    requiredFields: [
      "networkId",
      "networkName",
      "hubs",
      "collections",
      "guides",
    ],
    optionalFields: [
      "branding",
      "forgeRules",
      "dispatchItems",
      "bannerUrls",
      "authorAvatars",
    ],
    version: "1.0",
    compatibleThemes: ["ember", "arcane", "neutral"],
  },

  network_homepage: {
    id: "network_homepage",
    name: "Network Homepage",
    description:
      "Editorial homepage with featured story, news feed, hub grid, and recently forged guides.",
    supportedNetworkTypes: ["gaming", "creator", "community"],
    supportedGuideTypes: [
      "character-build",
      "walkthrough",
      "boss-guide",
      "beginner-guide",
      "patch-notes",
      "news",
    ],
    requiredFields: ["networkId", "networkName", "hubs"],
    optionalFields: [
      "featuredGuideId",
      "dispatchItems",
      "recentGuides",
      "editorsPick",
    ],
    version: "1.0",
    routePattern: "/n/[networkSlug]",
    compatibleThemes: ["ember", "parchment", "copper", "neutral"],
  },

  game_hub: {
    id: "game_hub",
    name: "Game Hub",
    description:
      "Per-game mini-site with banner, collections grid, patch dispatches, and featured guide.",
    supportedNetworkTypes: ["gaming"],
    supportedGuideTypes: [
      "character-build",
      "walkthrough",
      "boss-guide",
      "patch-notes",
      "news",
    ],
    requiredFields: ["hubId", "hubName", "collections"],
    optionalFields: ["bannerUrl", "dispatchItems", "featuredGuideId", "tagline"],
    version: "1.0",
    routePattern: "/n/[networkSlug]/[hubSlug]",
    compatibleThemes: ["ember", "arcane", "neutral"],
  },

  collection_page: {
    id: "collection_page",
    name: "Collection Page",
    description: "Collection landing with guide grid, sort/filter UI, and related collections.",
    supportedNetworkTypes: ["gaming", "creator", "community"],
    supportedGuideTypes: [
      "character-build",
      "walkthrough",
      "boss-guide",
      "beginner-guide",
      "patch-notes",
    ],
    requiredFields: ["collectionId", "collectionName", "guideIds"],
    optionalFields: ["heroImageUrl", "relatedCollectionIds", "filterTags"],
    version: "1.0",
    routePattern: "/n/[networkSlug]/[hubSlug]/[collectionSlug]",
    compatibleThemes: ["ember", "parchment", "copper", "neutral"],
  },

  guide_page: {
    id: "guide_page",
    name: "Guide Page",
    description:
      "Full editorial guide with hero, metadata sidebar, sections, related guides, and shared footer.",
    supportedNetworkTypes: [
      "gaming",
      "repair",
      "sop",
      "creator",
      "training",
      "community",
    ],
    supportedGuideTypes: [
      "character-build",
      "walkthrough",
      "boss-guide",
      "beginner-guide",
      "patch-notes",
      "repair-procedure",
      "sop",
      "tutorial",
      "reference",
    ],
    requiredFields: ["guideId", "title", "sections"],
    optionalFields: [
      "summary",
      "difficulty",
      "requirements",
      "warnings",
      "author",
      "reviewer",
      "estimatedMinutes",
      "bannerUrl",
      "relatedGuideIds",
    ],
    version: "1.0",
    routePattern: "/n/[networkSlug]/[hubSlug]/[guideSlug]",
    compatibleThemes: [
      "ember",
      "parchment",
      "copper",
      "neutral",
      "industrial",
      "arcane",
    ],
  },

  patch_news_page: {
    id: "patch_news_page",
    name: "Patch / News Page",
    description: "Short-form dispatch item rendered as a news post or patch summary.",
    supportedNetworkTypes: ["gaming", "community"],
    supportedGuideTypes: ["patch-notes", "news"],
    requiredFields: ["itemId", "title", "body"],
    optionalFields: [
      "hubId",
      "authorHandle",
      "publishedAt",
      "bannerUrl",
      "tags",
    ],
    version: "1.0",
    routePattern: "/n/[networkSlug]/dispatch/[itemSlug]",
    compatibleThemes: ["ember", "neutral"],
  },
}

/**
 * Lookup a template by ID.
 *
 * Future: This could validate that generated data matches the template shape.
 */
export function getTemplate(id: TemplateId): TemplateMetadata | undefined {
  return TEMPLATE_REGISTRY[id]
}

/**
 * List all templates for a given network type.
 */
export function getTemplatesForNetworkType(
  networkType: NetworkType
): TemplateMetadata[] {
  return Object.values(TEMPLATE_REGISTRY).filter((t) =>
    t.supportedNetworkTypes.includes(networkType)
  )
}
