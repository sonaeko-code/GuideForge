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
import { getStarterSectionsForGuideType } from "./starter-scaffolds"
import { makeTempId } from "./utils"

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
  requirements?: string[] | string
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
  // Validate required fields before processing
  if (!input.title || !input.title.trim()) {
    return {
      id: "error",
      source: "localStorage",
      verified: false,
      error: "Guide title is required",
    }
  }
  
  // Validate collection ID is not empty
  if (!input.collectionId) {
    const msg = "Collection ID is required. Please select a collection before saving."
    console.error("[v0] createAndSaveGuideDraft: Missing collection ID:", msg)
    return {
      id: "error",
      source: "localStorage",
      verified: false,
      error: msg,
    }
  }
  
  if (!input.guideType) {
    return {
      id: "error",
      source: "localStorage",
      verified: false,
      error: "Guide type is required",
    }
  }
  
  if (!input.difficulty) {
    return {
      id: "error",
      source: "localStorage",
      verified: false,
      error: "Difficulty is required",
    }
  }
  
  // Normalize requirements: handle string (newline-separated) or array
  const normalizedRequirements = Array.isArray(input.requirements)
    ? input.requirements
    : typeof input.requirements === "string"
      ? input.requirements
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0)
      : []
  
  console.log("[v0] Manual guide create payload:", {
    title: input.title,
    summary: input.summary?.substring(0, 60),
    guideType: input.guideType,
    audience: input.audience,
    difficulty: input.difficulty,
    requirements: normalizedRequirements.length,
    collectionId: input.collectionId,
    hubId: input.hubId,
    sectionCount: input.steps?.length || 1,
    sections: input.steps?.map(s => s.title) || ["Overview"],
  })

  // Generate guide ID
  const guideId = makeTempId()
  console.log("[v0] Generated guide id for new draft:", guideId)
  
  // Seeded dev profile ID for Phase 1 (no auth yet)
  const SEEDED_DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

  // Build steps array.
  // If steps were provided (generate path), use them directly — do NOT prepend a starter.
  // If no steps were provided (manual create path), use type-specific starter sections.
  const hasProvidedSteps = input.steps && input.steps.length > 0

  const steps: GuideStep[] = hasProvidedSteps
    ? input.steps!.map((step, index) => ({
        id: step.id || makeTempId(),
        guideId,
        order: index,
        kind: step.kind || "custom",
        title: step.title || "Untitled Step",
        body: step.body || "",
        isSpoiler: step.isSpoiler || false,
        callout: step.callout,
      }))
    : getStarterSectionsForGuideType(input.guideType, guideId)

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
    
    requirements: normalizedRequirements,
    warnings: input.warnings || [],
    audience: input.audience || [],
    
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

  // HARD-STOP: If save fell back to localStorage (because Supabase save failed),
  // treat this as a failure for dashboard persistence. We only want Supabase saves
  // to count as success for the dashboard.
  if (saveResult.source === "localStorage" && saveResult.error) {
    console.error("[v0] createAndSaveGuideDraft: Supabase save failed with fallback to localStorage:", saveResult.error)
    return {
      id: saveResult.id,
      source: saveResult.source,
      verified: false,
      error: `Save to Supabase failed: ${saveResult.error}. The guide was saved locally only.`,
    }
  }

  console.log("[v0] createAndSaveGuideDraft: Save source confirmed:", saveResult.source)

  // HARD-STOP VERIFICATION: Immediately reload the saved guide from Supabase (or localStorage for fallback)
  // This ensures the guide was actually created and is accessible.
  console.log("[v0] createAndSaveGuideDraft: Attempting immediate reload of saved guide from", saveResult.source, ":", saveResult.id)
  try {
    const reloadedGuide = await loadGuideDraft(saveResult.id)
    
    if (!reloadedGuide) {
      console.error("[v0] createAndSaveGuideDraft: Immediate reload result: null (FAILED)")
      console.error("[v0] Failed to reload guide from", saveResult.source, "after save")
      
      return {
        id: saveResult.id,
        source: saveResult.source,
        verified: false,
        error: `Guide save verification failed. Could not reload ${saveResult.source} guide after save.`,
      }
    }
    
    console.log("[v0] createAndSaveGuideDraft: Immediate reload result: SUCCESS from", saveResult.source)
    console.log("[v0] createAndSaveGuideDraft: Reloaded guide title:", reloadedGuide.title)
    console.log("[v0] createAndSaveGuideDraft: Reloaded guide steps:", reloadedGuide.steps.length)
    
    // SUCCESS: If we got here, the guide was saved and reloaded successfully.
    // Only return verified: true if it was actually saved to Supabase (not localStorage fallback)
    const isVerified = saveResult.source === "supabase"
    
    if (!isVerified) {
      console.warn("[v0] createAndSaveGuideDraft: Reloaded guide from localStorage, not Supabase. Not counting as dashboard-persistent save.")
    }
    
    return {
      id: saveResult.id,
      source: saveResult.source,
      verified: isVerified,
      error: saveResult.error,
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

