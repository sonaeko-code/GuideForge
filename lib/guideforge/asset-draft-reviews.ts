/**
 * Asset Draft Review/Publish Helpers (Lane 2B)
 *
 * Applies guide review/publish workflow to attached asset drafts.
 * Mirrors the guide review model but operates on asset_drafts table.
 *
 * Workflow:
 *   draft → pending_review → published
 *
 * Asset stays in asset_drafts table throughout; only status changes.
 * Public site filters out draft and pending_review assets.
 */

import { isSupabaseConfigured, supabase, getSupabaseSession } from "./supabase-client"
import { getCurrentUserNetworkAuthority } from "./supabase-networks"
import type { AssetDraft } from "./asset-draft-types"

/**
 * Submit an attached asset draft for review (Lane 2B)
 * Changes status from "draft" to "pending_review"
 * Only works for assets attached to a network collection
 */
export async function submitAssetDraftForReview(
  assetId: string
): Promise<{
  success: boolean
  error?: string
  assetId: string
  previousStatus?: string
  newStatus?: string
  networkId?: string
  canSubmit?: boolean
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
      assetId,
    }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
        assetId,
      }
    }

    // Fetch asset to verify ownership and attachment
    const { data: asset, error: fetchError } = await supabase
      .from("asset_drafts")
      .select("id, owner_id, attached_collection_id, attached_network_id, status")
      .eq("id", assetId)
      .maybeSingle()

    if (fetchError || !asset) {
      return {
        success: false,
        error: "Asset not found",
        assetId,
      }
    }

    // Verify user owns the asset
    if (asset.owner_id !== userId) {
      return {
        success: false,
        error: "You do not own this asset",
        assetId,
      }
    }

    // Verify asset is attached to a network
    if (!asset.attached_network_id || !asset.attached_collection_id) {
      return {
        success: false,
        error: "Asset must be attached to a network collection to submit for review",
        assetId,
      }
    }

    // Check asset is in draft status
    if (asset.status !== "draft") {
      return {
        success: false,
        error: `Asset is already in ${asset.status} status`,
        assetId,
        previousStatus: asset.status,
      }
    }

    // Check user has permission to submit in network
    const authority = await getCurrentUserNetworkAuthority(asset.attached_network_id)

    if (!authority.isSignedIn || !authority.canSubmitGuides) {
      return {
        success: false,
        error: "You do not have permission to submit assets for review in this network",
        assetId,
        previousStatus: asset.status,
        networkId: asset.attached_network_id,
        canSubmit: authority.canSubmitGuides,
      }
    }

    // Update asset status to pending_review
    const { data: updateResult, error: updateError } = await supabase
      .from("asset_drafts")
      .update({
        status: "pending_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)
      .select("id, status")
      .maybeSingle()

    if (updateError) {
      console.error("[v0] submitAssetDraftForReview: Update error:", updateError?.message)
      
      // Check for common database constraint errors
      if (updateError.message?.includes("asset_drafts_status_check") || 
          updateError.message?.includes("check constraint") ||
          updateError.message?.includes("domain") ||
          updateError.code === "23514") {
        return {
          success: false,
          error: "Asset status update not supported yet. Please ensure your database schema supports pending_review status.",
          assetId,
          previousStatus: asset.status,
          networkId: asset.attached_network_id,
        }
      }
      
      return {
        success: false,
        error: `Failed to submit asset: ${updateError?.message}`,
        assetId,
        previousStatus: asset.status,
        networkId: asset.attached_network_id,
      }
    }

    console.log("[v0] Asset submitted for review:", assetId)

    return {
      success: true,
      assetId,
      previousStatus: "draft",
      newStatus: "pending_review",
      networkId: asset.attached_network_id,
      canSubmit: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] submitAssetDraftForReview: Exception:", message)
    return {
      success: false,
      error: message,
      assetId,
    }
  }
}

/**
 * Return an asset draft from pending_review back to draft (Lane 2B)
 * Only owner/admin can do this
 */
export async function returnAssetDraftToDraft(
  assetId: string
): Promise<{
  success: boolean
  error?: string
  assetId: string
  previousStatus?: string
  newStatus?: string
  networkId?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
      assetId,
    }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
        assetId,
      }
    }

    // Fetch asset
    const { data: asset, error: fetchError } = await supabase
      .from("asset_drafts")
      .select("id, owner_id, attached_network_id, status")
      .eq("id", assetId)
      .maybeSingle()

    if (fetchError || !asset) {
      return {
        success: false,
        error: "Asset not found",
        assetId,
      }
    }

    // Check user has permission
    if (asset.owner_id !== userId && asset.attached_network_id) {
      const authority = await getCurrentUserNetworkAuthority(asset.attached_network_id)
      if (!authority.isSignedIn || !authority.canPublishOverride) {
        return {
          success: false,
          error: "You do not have permission to return this asset to draft",
          assetId,
          networkId: asset.attached_network_id,
        }
      }
    }

    // Check asset is in pending_review status
    if (asset.status !== "pending_review") {
      return {
        success: false,
        error: `Asset is in ${asset.status} status, not pending_review`,
        assetId,
        previousStatus: asset.status,
      }
    }

    // Update asset status back to draft
    const { error: updateError } = await supabase
      .from("asset_drafts")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)

    if (updateError) {
      console.error("[v0] returnAssetDraftToDraft: Update error:", updateError.message)
      return {
        success: false,
        error: `Failed to return asset to draft: ${updateError.message}`,
        assetId,
        previousStatus: asset.status,
        networkId: asset.attached_network_id,
      }
    }

    console.log("[v0] Asset returned to draft:", assetId)

    return {
      success: true,
      assetId,
      previousStatus: "pending_review",
      newStatus: "draft",
      networkId: asset.attached_network_id,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] returnAssetDraftToDraft: Exception:", message)
    return {
      success: false,
      error: message,
      assetId,
    }
  }
}

/**
 * Publish an asset draft (Lane 2B)
 * Changes status from "pending_review" to "published"
 * Only owner/admin can publish
 */
export async function publishAssetDraft(
  assetId: string
): Promise<{
  success: boolean
  error?: string
  assetId: string
  previousStatus?: string
  newStatus?: string
  networkId?: string
  canPublish?: boolean
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: "Supabase not configured",
      assetId,
    }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        success: false,
        error: "User not authenticated",
        assetId,
      }
    }

    // Fetch asset
    const { data: asset, error: fetchError } = await supabase
      .from("asset_drafts")
      .select("id, owner_id, attached_network_id, status")
      .eq("id", assetId)
      .maybeSingle()

    if (fetchError || !asset) {
      return {
        success: false,
        error: "Asset not found",
        assetId,
      }
    }

    // Check user has permission
    if (asset.owner_id !== userId && asset.attached_network_id) {
      const authority = await getCurrentUserNetworkAuthority(asset.attached_network_id)
      if (!authority.isSignedIn || !authority.canPublishOverride) {
        return {
          success: false,
          error: "You do not have permission to publish assets in this network",
          assetId,
          networkId: asset.attached_network_id,
          canPublish: authority.canPublishOverride,
        }
      }
    }

    // Check asset is in pending_review status
    if (asset.status !== "pending_review") {
      return {
        success: false,
        error: `Asset is in ${asset.status} status, not pending_review`,
        assetId,
        previousStatus: asset.status,
      }
    }

    // Update asset status to published
    const { error: updateError } = await supabase
      .from("asset_drafts")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assetId)

    if (updateError) {
      console.error("[v0] publishAssetDraft: Update error:", updateError.message)
      
      // Check for common database constraint errors
      if (updateError.message?.includes("asset_drafts_status_check") || 
          updateError.message?.includes("check constraint") ||
          updateError.message?.includes("domain") ||
          updateError.code === "23514") {
        return {
          success: false,
          error: "Asset status update not supported yet. Please ensure your database schema supports published status.",
          assetId,
          previousStatus: asset.status,
          networkId: asset.attached_network_id,
        }
      }
      
      return {
        success: false,
        error: `Failed to publish asset: ${updateError.message}`,
        assetId,
        previousStatus: asset.status,
        networkId: asset.attached_network_id,
      }
    }

    console.log("[v0] Asset published:", assetId)

    return {
      success: true,
      assetId,
      previousStatus: "pending_review",
      newStatus: "published",
      networkId: asset.attached_network_id,
      canPublish: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v0] publishAssetDraft: Exception:", message)
    return {
      success: false,
      error: message,
      assetId,
    }
  }
}

/**
 * Check if an asset draft is public-visible
 * Only published assets are visible on public site
 */
export function isAssetDraftPublic(status: string): boolean {
  return status === "published"
}

/**
 * Get standardized label for asset draft status
 */
export function getAssetDraftStatusLabel(status: string): {
  label: string
  displayName: string
  description: string
  isPublic: boolean
} {
  switch (status) {
    case "draft":
      return {
        label: "draft",
        displayName: "Draft",
        description: "Private workspace, not on public site",
        isPublic: false,
      }
    case "pending_review":
      return {
        label: "pending_review",
        displayName: "Pending Review",
        description: "Submitted for review, awaiting approval",
        isPublic: false,
      }
    case "published":
      return {
        label: "published",
        displayName: "Published",
        description: "Approved in workspace. Public guide rendering will be added in a future lane.",
        isPublic: false,
      }
    case "archived":
      return {
        label: "archived",
        displayName: "Archived",
        description: "Preserved for reference",
        isPublic: false,
      }
    default:
      return {
        label: "unknown",
        displayName: "Unknown",
        description: "Status unknown",
        isPublic: false,
      }
  }
}
