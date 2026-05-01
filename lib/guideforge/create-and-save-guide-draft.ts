/**
 * Create and Save Guide Draft
 * 
 * Centralized function for both manual and generated guide creation.
 * Ensures consistent behavior across both creation paths.
 * 
 * Features:
 * - Preserves all form/generation data
 * - Creates valid Guide object with all required fields
 * - Ensures at least one starter section exists
 * - Saves to Supabase first (when configured), falls back to localStorage
 * - Returns guide ID for routing
 * - Includes comprehensive debug logging
 */

import type { Guide, GuideStep, GuideType, DifficultyLevel } from "./types"
import { saveGuideDraft } from "./guide-drafts-storage"
import { v4 as uuidv4 } from "uuid"

export interface CreateGuideDraftInput {
  // Required fields
  title: string
  summary: string
  guideType: GuideType
  difficulty: DifficultyLevel
  networkId: string
  hubId: string
  collectionId: string
  
  // Optional fields
  requirements?: string[]
  warnings?: string[]
  steps?: Partial<GuideStep>[]
  audience?: string[]
  version?: string
  estimatedMinutes?: number
  authorId?: string
}

/**
 * Create and save a guide draft with all form data preserved.
 * 
 * @param input - All guide creation data
 * @returns Promise<string> - The saved guide ID for routing
 */
export async function createAndSaveGuideDraft(
  input: CreateGuideDraftInput
): Promise<string> {
  console.log("[v0] createAndSaveGuideDraft started", {
    title: input.title,
    summary: input.summary.substring(0, 50) + "...",
    guideType: input.guideType,
    difficulty: input.difficulty,
    networkId: input.networkId,
    hubId: input.hubId,
    collectionId: input.collectionId,
    stepsCount: input.steps?.length || 0,
  })

  // Generate guide ID
  const guideId = uuidv4()
  
  // Seeded dev profile ID for Phase 1 (no auth yet)
  const SEEDED_DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

  // Create starter section if none provided
  const starterStep: GuideStep = {
    id: uuidv4(),
    guideId,
    order: 0,
    kind: "overview",
    title: "Overview",
    body: input.summary || "Start writing this guide section.",
    isSpoiler: false,
  }

  // Build steps array
  const steps: GuideStep[] = [
    starterStep,
    ...(input.steps?.map((step, index) => ({
      id: step.id || uuidv4(),
      guideId,
      order: index + 1,
      kind: step.kind || "custom",
      title: step.title || "Untitled Step",
      body: step.body || "",
      isSpoiler: step.isSpoiler || false,
      callout: step.callout,
    })) || []),
  ]

  // Build complete Guide object
  const guide: Guide = {
    id: guideId,
    networkId: input.networkId,
    hubId: input.hubId,
    collectionId: input.collectionId,
    
    slug: generateSlug(input.title),
    title: input.title || "Untitled Guide",
    summary: input.summary || "",
    
    type: input.guideType,
    difficulty: input.difficulty,
    status: "draft",
    verification: "unverified",
    
    requirements: input.requirements || [],
    warnings: input.warnings || [],
    
    version: input.version || "1.0",
    estimatedMinutes: input.estimatedMinutes,
    
    steps,
    
    author: {
      id: input.authorId || SEEDED_DEV_PROFILE_ID,
      displayName: "You",
      handle: "@builder",
    },
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  console.log("[v0] Created guide object:", {
    id: guide.id,
    title: guide.title,
    stepsCount: guide.steps.length,
    hubId: guide.hubId,
    collectionId: guide.collectionId,
    networkId: guide.networkId,
    status: guide.status,
  })

  // Save to Supabase/localStorage
  try {
    const savedId = await saveGuideDraft(guide)
    console.log("[v0] Guide saved successfully:", savedId)
    return savedId
  } catch (error) {
    console.error("[v0] Error saving guide:", error)
    throw error
  }
}

/**
 * Generate a URL-safe slug from a title.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100)
}
