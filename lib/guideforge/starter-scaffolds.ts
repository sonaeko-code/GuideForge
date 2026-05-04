/**
 * Starter Scaffolds for Guide Types & Network Templates
 * 
 * Provides:
 * 1. Type-specific section templates for manual guide creation
 * 2. Deterministic network scaffold templates (hubs + collections)
 * 
 * Phase 2: Will be extended with AI-powered section generation.
 * Phase 6: Network scaffolds for template-based network creation.
 */

import type { GuideStep, GuideType } from "./types"
import { makeTempId } from "./utils"

export interface StarterSection {
  kind: string
  title: string
  body: string
}

const STARTER_SECTIONS_BY_TYPE: Record<GuideType, StarterSection[]> = {
  "character-build": [
    { kind: "overview", title: "Overview", body: "Describe the overall character build and its playstyle." },
    { kind: "strengths", title: "Strengths", body: "List the key advantages of this build." },
    { kind: "weaknesses", title: "Weaknesses", body: "List the key disadvantages and when to avoid this build." },
    { kind: "gear", title: "Gear", body: "Recommended equipment and itemization." },
    { kind: "rotation", title: "Rotation", body: "Combat rotation and ability prioritization." },
  ],
  "walkthrough": [
    { kind: "overview", title: "Overview", body: "Walkthrough of the area or questline." },
    { kind: "custom", title: "Step 1", body: "First section of the walkthrough." },
    { kind: "custom", title: "Step 2", body: "Continue the walkthrough..." },
    { kind: "custom", title: "Tips", body: "Helpful tips and strategies." },
  ],
  "boss-guide": [
    { kind: "overview", title: "Overview", body: "Boss mechanics and general strategy." },
    { kind: "custom", title: "Phase 1", body: "Describe phase 1 mechanics and strategy." },
    { kind: "custom", title: "Phase 2", body: "Describe phase 2 mechanics and strategy." },
    { kind: "mistakes", title: "Common Mistakes", body: "List common mistakes to avoid." },
    { kind: "final-tips", title: "Final Tips", body: "Additional strategy and advice." },
  ],
  "beginner-guide": [
    { kind: "overview", title: "Overview", body: "Introduction for newcomers." },
    { kind: "custom", title: "Getting Started", body: "First steps in the game." },
    { kind: "custom", title: "Key Concepts", body: "Fundamental concepts explained." },
    { kind: "custom", title: "FAQ", body: "Frequently asked questions." },
  ],
  "patch-notes": [
    { kind: "overview", title: "Overview", body: "Summary of patch highlights." },
    { kind: "custom", title: "New Features", body: "New content and features." },
    { kind: "custom", title: "Balance Changes", body: "Buffs and nerfs." },
    { kind: "custom", title: "Bug Fixes", body: "Issues fixed in this patch." },
  ],
  "news": [
    { kind: "overview", title: "Overview", body: "News headline and summary." },
    { kind: "custom", title: "Details", body: "Detailed information." },
    { kind: "custom", title: "Impact", body: "How this affects players." },
  ],
  "repair-procedure": [
    { kind: "overview", title: "Overview", body: "What will be repaired and tools needed." },
    { kind: "custom", title: "Steps", body: "Step-by-step repair instructions." },
    { kind: "custom", title: "Troubleshooting", body: "Common issues and solutions." },
  ],
  "sop": [
    { kind: "overview", title: "Overview", body: "Standard Operating Procedure overview." },
    { kind: "custom", title: "Process", body: "Detailed process steps." },
    { kind: "custom", title: "Quality Checks", body: "Verification steps." },
  ],
  "tutorial": [
    { kind: "overview", title: "Overview", body: "What this tutorial covers." },
    { kind: "custom", title: "Basics", body: "Basic concepts." },
    { kind: "custom", title: "Practice", body: "Exercises and practice." },
  ],
  "reference": [
    { kind: "overview", title: "Overview", body: "Reference document overview." },
    { kind: "custom", title: "Content", body: "Reference content and data." },
  ],
}

/**
 * Get starter sections for a guide type.
 * Returns an array of GuideStep objects seeded with the type-specific template.
 */
export function getStarterSectionsForGuideType(
  guideType: GuideType,
  guideId: string
): GuideStep[] {
  const template = STARTER_SECTIONS_BY_TYPE[guideType] || STARTER_SECTIONS_BY_TYPE["reference"]
  
  return template.map((section, index) => ({
    id: makeTempId(),
    guideId,
    order: index,
    kind: section.kind as any,
    title: section.title,
    body: section.body,
    isSpoiler: false,
  }))
}

// ========== NETWORK SCAFFOLD TEMPLATES ==========

export interface ScaffoldHub {
  name: string
  slug: string
  description: string
}

export interface ScaffoldCollection {
  name: string
  slug: string
  description: string
}

export interface ScaffoldTemplate {
  id: string
  name: string
  description: string
  icon: string
  networkTemplate: {
    name: string
    slug: string
    description: string
  }
  hubs: {
    hub: ScaffoldHub
    collections: ScaffoldCollection[]
  }[]
}

/**
 * Gaming Guide Network Template
 * For game-related tutorials, walkthroughs, and builds
 */
export const GAMING_SCAFFOLD: ScaffoldTemplate = {
  id: "gaming",
  name: "Gaming Guide Network",
  description: "Organize game tutorials, builds, and walkthroughs",
  icon: "🎮",
  networkTemplate: {
    name: "Gaming Guides",
    slug: "gaming-guides",
    description: "A collection of guides for various games and genres",
  },
  hubs: [
    {
      hub: {
        name: "Beginner Guides",
        slug: "beginner-guides",
        description: "Getting started with games",
      },
      collections: [
        {
          name: "Getting Started",
          slug: "getting-started",
          description: "First steps and basic mechanics",
        },
        {
          name: "Controls & Settings",
          slug: "controls-settings",
          description: "Keyboard, controller, and configuration",
        },
      ],
    },
    {
      hub: {
        name: "Character & Builds",
        slug: "character-builds",
        description: "Character creation and build guides",
      },
      collections: [
        {
          name: "Class Builds",
          slug: "class-builds",
          description: "Optimized builds for each class",
        },
        {
          name: "Equipment Guides",
          slug: "equipment-guides",
          description: "Gear selection and optimization",
        },
      ],
    },
    {
      hub: {
        name: "Content & Progression",
        slug: "content-progression",
        description: "Raids, bosses, and progression paths",
      },
      collections: [
        {
          name: "Boss Guides",
          slug: "boss-guides",
          description: "Strategies for boss encounters",
        },
        {
          name: "Raid Guides",
          slug: "raid-guides",
          description: "Group content and raid mechanics",
        },
        {
          name: "Progression Systems",
          slug: "progression-systems",
          description: "Leveling, quests, and endgame content",
        },
      ],
    },
  ],
}

/**
 * Repair / Support Network Template
 * For technical support and device troubleshooting
 */
export const REPAIR_SCAFFOLD: ScaffoldTemplate = {
  id: "repair",
  name: "Repair / Support Network",
  description: "Device troubleshooting and support documentation",
  icon: "🔧",
  networkTemplate: {
    name: "Support & Repairs",
    slug: "support-repairs",
    description: "Troubleshooting guides and technical support",
  },
  hubs: [
    {
      hub: {
        name: "Common Issues",
        slug: "common-issues",
        description: "Frequent problems and quick fixes",
      },
      collections: [
        {
          name: "WiFi Issues",
          slug: "wifi-issues",
          description: "Network connectivity troubleshooting",
        },
        {
          name: "Power Issues",
          slug: "power-issues",
          description: "Power on/off and charging problems",
        },
        {
          name: "Performance Issues",
          slug: "performance-issues",
          description: "Speed and responsiveness problems",
        },
      ],
    },
    {
      hub: {
        name: "Device Categories",
        slug: "device-categories",
        description: "Device-specific troubleshooting",
      },
      collections: [
        {
          name: "Laptop / PC Issues",
          slug: "laptop-pc-issues",
          description: "Computer troubleshooting guides",
        },
        {
          name: "Printer Issues",
          slug: "printer-issues",
          description: "Printing problems and solutions",
        },
        {
          name: "Mobile Device Issues",
          slug: "mobile-device-issues",
          description: "Phone and tablet troubleshooting",
        },
      ],
    },
    {
      hub: {
        name: "Escalation",
        slug: "escalation",
        description: "Complex issues and escalation paths",
      },
      collections: [
        {
          name: "Hardware Replacement",
          slug: "hardware-replacement",
          description: "Component replacement procedures",
        },
        {
          name: "Advanced Troubleshooting",
          slug: "advanced-troubleshooting",
          description: "Complex diagnostic procedures",
        },
      ],
    },
  ],
}

/**
 * SOP / Training Network Template
 * For standard operating procedures and employee training
 */
export const SOP_SCAFFOLD: ScaffoldTemplate = {
  id: "sop",
  name: "SOP / Training Network",
  description: "Standard operating procedures and training materials",
  icon: "📋",
  networkTemplate: {
    name: "SOPs & Training",
    slug: "soaps-training",
    description: "Standard operating procedures and employee training guides",
  },
  hubs: [
    {
      hub: {
        name: "Onboarding",
        slug: "onboarding",
        description: "New employee training and orientation",
      },
      collections: [
        {
          name: "Employee Handbook",
          slug: "employee-handbook",
          description: "Policies and general information",
        },
        {
          name: "Systems & Tools",
          slug: "systems-tools",
          description: "Required software and tools setup",
        },
        {
          name: "Orientation Checklist",
          slug: "orientation-checklist",
          description: "First week tasks and introductions",
        },
      ],
    },
    {
      hub: {
        name: "Daily Operations",
        slug: "daily-operations",
        description: "Daily work procedures",
      },
      collections: [
        {
          name: "Opening Procedures",
          slug: "opening-procedures",
          description: "Morning startup and preparation",
        },
        {
          name: "Closing Procedures",
          slug: "closing-procedures",
          description: "End of day shutdown and cleanup",
        },
        {
          name: "Common Tasks",
          slug: "common-tasks",
          description: "Regular daily responsibilities",
        },
      ],
    },
    {
      hub: {
        name: "Role Training",
        slug: "role-training",
        description: "Role-specific training materials",
      },
      collections: [
        {
          name: "Team Lead Training",
          slug: "team-lead-training",
          description: "Leadership and management procedures",
        },
        {
          name: "Quality Assurance",
          slug: "quality-assurance",
          description: "QA procedures and checklists",
        },
      ],
    },
    {
      hub: {
        name: "Compliance",
        slug: "compliance",
        description: "Compliance and standards",
      },
      collections: [
        {
          name: "Safety Standards",
          slug: "safety-standards",
          description: "Safety procedures and protocols",
        },
        {
          name: "Data Protection",
          slug: "data-protection",
          description: "Data handling and privacy",
        },
      ],
    },
  ],
}

/**
 * Get all available scaffold templates
 */
export function getAllScaffoldTemplates(): ScaffoldTemplate[] {
  return [GAMING_SCAFFOLD, REPAIR_SCAFFOLD, SOP_SCAFFOLD]
}

/**
 * Get a specific template by ID
 */
export function getScaffoldTemplate(id: string): ScaffoldTemplate | null {
  const templates = getAllScaffoldTemplates()
  return templates.find((t) => t.id === id) || null
}

/**
 * Validate scaffold template structure (deterministic check, no side effects)
 */
export function validateScaffoldTemplate(template: ScaffoldTemplate): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check network template
  if (!template.networkTemplate.name) {
    errors.push("Network name is required")
  }
  if (!template.networkTemplate.slug) {
    errors.push("Network slug is required")
  }

  // Check hubs
  if (!template.hubs || template.hubs.length === 0) {
    errors.push("At least one hub is required")
  }

  template.hubs.forEach((hubGroup, hubIndex) => {
    if (!hubGroup.hub.name) {
      errors.push(`Hub ${hubIndex + 1}: name is required`)
    }
    if (!hubGroup.hub.slug) {
      errors.push(`Hub ${hubIndex + 1}: slug is required`)
    }
    if (!hubGroup.collections || hubGroup.collections.length === 0) {
      errors.push(`Hub ${hubIndex + 1}: at least one collection is required`)
    }

    hubGroup.collections.forEach((collection, colIndex) => {
      if (!collection.name) {
        errors.push(`Hub ${hubIndex + 1}, Collection ${colIndex + 1}: name is required`)
      }
      if (!collection.slug) {
        errors.push(`Hub ${hubIndex + 1}, Collection ${colIndex + 1}: slug is required`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
