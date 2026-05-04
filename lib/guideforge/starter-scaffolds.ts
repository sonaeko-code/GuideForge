/**
 * GuideForge Starter Scaffolds
 * 
 * Dormant template system for AI scaffold builder (Phase 2).
 * Not wired into network creation yet. When implemented, will generate
 * scaffold templates based on game/topic and guide type.
 */

import type { Guide } from "./types"

/**
 * Scaffold template for generating new guides
 */
export interface GuideScaffold {
  type: string
  title: string
  description: string
  summaryTemplate: string
  sectionsTemplate: Array<{
    title: string
    placeholder: string
    kind?: string
  }>
}

/**
 * Gets starter scaffold for a guide type.
 * DORMANT: Not currently used. Will be integrated when AI scaffold builder is added.
 * 
 * @param guideType - The type of guide (e.g., "character-build", "walkthrough")
 * @returns A scaffold template or null if not found
 */
export function getScaffoldForType(guideType: string): GuideScaffold | null {
  const scaffolds: Record<string, GuideScaffold> = {
    "character-build": {
      type: "character-build",
      title: "[Class] Build - [Theme/Purpose]",
      description: "A complete character build guide including stats, gear, and playstyle.",
      summaryTemplate:
        "A ${difficulty} build for ${class} focused on ${playstyle}. Best for ${audience}.",
      sectionsTemplate: [
        { title: "Overview", placeholder: "Explain the core concept and playstyle." },
        { title: "Stats Priority", placeholder: "List stat priority and explain choices." },
        { title: "Gear Recommendations", placeholder: "Suggest gear with reasoning." },
        { title: "Playstyle Tips", placeholder: "Describe optimal gameplay approach." },
        { title: "Troubleshooting", placeholder: "Address common issues and solutions." },
      ],
    },
    "walkthrough": {
      type: "walkthrough",
      title: "[Location/Boss] Walkthrough",
      description: "Step-by-step guide to complete a location or defeat a boss.",
      summaryTemplate:
        "A ${difficulty} walkthrough for ${location}. Takes about ${duration} minutes.",
      sectionsTemplate: [
        { title: "Preparation", placeholder: "Explain what to prepare before starting." },
        { title: "Map Overview", placeholder: "Describe the layout and key areas." },
        { title: "Step-by-Step", placeholder: "Break down the walkthrough into clear steps." },
        { title: "Secrets", placeholder: "List hidden items or alternate paths." },
        { title: "Common Mistakes", placeholder: "Warn about common pitfalls." },
      ],
    },
    "boss-guide": {
      type: "boss-guide",
      title: "[Boss Name] Guide",
      description: "Detailed guide to defeating a specific boss.",
      summaryTemplate:
        "How to defeat ${boss} on ${difficulty} difficulty. Requires ${requirements}.",
      sectionsTemplate: [
        { title: "Overview", placeholder: "Introduce the boss and its threat level." },
        { title: "Phase 1", placeholder: "Describe phase 1 mechanics and strategy." },
        { title: "Phase 2", placeholder: "Describe phase 2 mechanics and strategy." },
        { title: "Rewards", placeholder: "List rewards and drops." },
      ],
    },
    "beginner-guide": {
      type: "beginner-guide",
      title: "Beginner's Guide to ${Topic}",
      description: "Comprehensive guide for newcomers to a topic.",
      summaryTemplate:
        "Learn the basics of ${topic} in this ${difficulty} guide. Perfect for ${audience}.",
      sectionsTemplate: [
        { title: "Getting Started", placeholder: "Introduce the basics and core concepts." },
        { title: "Essential Knowledge", placeholder: "Cover must-know information." },
        { title: "First Steps", placeholder: "Guide first practical actions." },
        { title: "Common Questions", placeholder: "Answer frequently asked questions." },
      ],
    },
  }

  return scaffolds[guideType] || null
}

/**
 * Generates a new guide from a scaffold template.
 * DORMANT: Not currently used. Will be called by AI scaffold builder.
 * 
 * @param scaffold - The scaffold template to use
 * @param metadata - Additional metadata for the guide
 * @returns A partially filled guide object
 */
export function generateGuideFromScaffold(
  scaffold: GuideScaffold,
  metadata: {
    title: string
    networkId: string
    hubId: string
    collectionId: string
    difficulty?: string
    audience?: string[]
  }
): Partial<Guide> {
  return {
    title: metadata.title,
    networkId: metadata.networkId,
    hubId: metadata.hubId,
    collectionId: metadata.collectionId,
    status: "draft",
    difficulty: (metadata.difficulty as any) || "beginner",
    audience: metadata.audience || [],
    summary: scaffold.summaryTemplate,
    steps: scaffold.sectionsTemplate.map((section) => ({
      title: section.title,
      body: section.placeholder,
      kind: section.kind || "section",
    })),
  }
}
