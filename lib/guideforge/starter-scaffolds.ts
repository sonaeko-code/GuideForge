/**
 * Starter Scaffolds for Guide Types
 * 
 * Provides type-specific section templates for manual guide creation.
 * Each guide type gets seeded with an appropriate set of starter sections.
 * 
 * Phase 2: Will be extended with AI-powered section generation.
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
