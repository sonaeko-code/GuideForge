/**
 * Save Structured Asset to Workspace
 *
 * NEW (Phase 2): Saves to user's account-bound asset_drafts table first.
 * No network/hub/collection required.
 * 
 * User can later attach/convert to a network guide.
 */

import type { GeneratedStructuredAsset } from "./generation-schemas"
import { createAssetDraft } from "./asset-draft-helpers"

export interface SaveStructuredAssetResult {
  success: boolean
  assetId?: string
  error?: string
  requiresAuth?: boolean
}

/**
 * Save structured asset to user's workspace (account-bound).
 * Requires authenticated user.
 */
export async function saveStructuredAssetToWorkspace(
  asset: GeneratedStructuredAsset
): Promise<SaveStructuredAssetResult> {
  try {
    console.log("[v0] saveStructuredAssetToWorkspace: Starting save for", asset.assetType, asset.title)

    const result = await createAssetDraft({
      assetType: asset.assetType,
      title: asset.title,
      summary: asset.summary,
      payload: asset,
      source: "generated",
    })

    if (!result.id) {
      return {
        success: false,
        error: result.error || "Failed to save asset draft",
        requiresAuth: result.error?.includes("signed in"),
      }
    }

    return {
      success: true,
      assetId: result.id,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] saveStructuredAssetToWorkspace error:", err)
    return {
      success: false,
      error: `Save failed: ${msg}`,
    }
  }
}

// Old assetToGuideSteps function removed - no longer needed for workspace save
// Asset payload is stored directly in asset_drafts.payload jsonb column
