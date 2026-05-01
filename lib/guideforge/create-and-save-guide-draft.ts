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
 * - Returns { id, source } to indicate save success
 * - Includes comprehensive debug logging
 */

import type { Guide, GuideStep, GuideType, DifficultyLevel } from "./types"
import { saveGuideDraft, loadGuideDraft } from "./guide-drafts-storage"
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

export interface CreateGuideDraftResult {
  id: string
  source: "supabase" | "localStorage"
  verified: boolean
  error?: string
}

/**
 * Create and save a guide draft with all form data preserved.
 * HARD-STOP: Verifies save-then-load before returning success.
 * If immediate reload fails, returns error and verified: false.
 * 
 * @param input - All guide creation data
 * @returns Promise<CreateGuideDraftResult> - Result with id, source, verified status, and optional error
 */
export async function createAndSaveGuideDraft(
  input: CreateGuideDraftInput
): Promise<CreateGuideDraftResult> {
  console.log("[v0] Create flow guide id before save:", {
    title: input.title,
    summary: input.summary?.substring(0, 60),
    guideType: input.guideType,
    difficulty: input.difficulty,
    networkId: input.networkId,
    hubId: input.hubId,
    collectionId: input.collectionId,
    inputStepsCount: input.steps?.length ?? 0,
  })

  // Generate guide ID
  const guideId = uuidv4()
  console.log("[v0] Generated guide id for new draft:", guideId)
  
  // Seeded dev profile ID for Phase 1 (no auth yet)
  const SEEDED_DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

  // Build steps array.
  // If steps were provided (generate path), use them directly — do NOT prepend a starter.
  // If no steps were provided (manual create path), add a single starter Overview section.
  const hasProvidedSteps = input.steps && input.steps.length > 0

  const steps: GuideStep[] = hasProvidedSteps
    ? input.steps!.map((step, index) => ({
        id: step.id || uuidv4(),
        guideId,
        order: index,
        kind: step.kind || "custom",
        title: step.title || "Untitled Step",
        body: step.body || "",
        isSpoiler: step.isSpoiler || false,
        callout: step.callout,
      }))
    : [
        {
          id: uuidv4(),
          guideId,
          order: 0,
          kind: "overview" as const,
          title: "Overview",
          body: input.summary || "Start writing this guide section.",
          isSpoiler: false,
        },
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

  console.log("[v0] createAndSaveGuideDraft: canonical guide object built", {
    id: guide.id,
    title: guide.title,
    stepsCount: guide.steps.length,
    stepTitles: guide.steps.map((s) => s.title),
    hubId: guide.hubId,
    collectionId: guide.collectionId,
    networkId: guide.networkId,
    status: guide.status,
  })

  // Save to Supabase/localStorage - use saveGuideDraft to get actual storage source
  let saveResult: { id: string; source: "supabase" | "localStorage"; error?: string }
  try {
    saveResult = await saveGuideDraft(guide)
    console.log("[v0] createAndSaveGuideDraft: Save returned id:", saveResult.id)
    console.log("[v0] createAndSaveGuideDraft: Save returned source:", saveResult.source)
    if (saveResult.error) {
      console.log("[v0] createAndSaveGuideDraft: Save returned error:", saveResult.error)
    }
  } catch (error) {
    console.error("[v0] createAndSaveGuideDraft: Error saving guide:", error)
    return {
      id: guide.id,
      source: "localStorage",
      verified: false,
      error: `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }

  // HARD-STOP VERIFICATION: Immediately reload the saved guide
  console.log("[v0] createAndSaveGuideDraft: Attempting immediate reload of saved guide:", saveResult.id)
  try {
    const reloadedGuide = await loadGuideDraft(saveResult.id)
    
    if (!reloadedGuide) {
      console.error("[v0] createAndSaveGuideDraft: Immediate reload result: null (FAILED)")
      
      // Log debug info
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage)
        const guideforgeKeys = keys.filter((k) => k.includes("guideforge"))
        console.log("[v0] localStorage keys:", guideforgeKeys)
      }
      
      return {
        id: saveResult.id,
        source: saveResult.source,
        verified: false,
        error: "Guide save failed verification. Could not reload saved guide.",
      }
    }
    
    console.log("[v0] createAndSaveGuideDraft: Immediate reload result: SUCCESS")
    console.log("[v0] createAndSaveGuideDraft: Reloaded guide title:", reloadedGuide.title)
    console.log("[v0] createAndSaveGuideDraft: Reloaded guide steps:", reloadedGuide.steps.length)
    
    // Pass through any Supabase error even if localStorage fallback succeeded
    return {
      id: saveResult.id,
      source: saveResult.source,
      verified: true,
      error: saveResult.error, // Will be undefined if Supabase succeeded
    }
  } catch (reloadError) {
    console.error("[v0] createAndSaveGuideDraft: Immediate reload error:", reloadError)
    return {
      id: saveResult.id,
      source: saveResult.source,
      verified: false,
      error: `Verification failed: ${reloadError instanceof Error ? reloadError.message : "Unknown error"}`,
    }
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

