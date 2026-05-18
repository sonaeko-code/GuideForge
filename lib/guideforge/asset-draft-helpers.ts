/**
 * Asset Draft Helpers
 * 
 * Manage user's personal account-bound asset drafts.
 * These use auth.uid() for ownership.
 * 
 * NOTE: The asset_drafts table must be created first by running:
 *   supabase/asset_drafts_schema.sql
 * 
 * If you see "Could not find the table 'public.asset_drafts'" errors:
 * 1. Open Supabase SQL Editor
 * 2. Copy and paste the entire contents of supabase/asset_drafts_schema.sql
 * 3. Click "Run"
 * 4. (Optional) Refresh Supabase schema cache if needed
 */

import { supabase as _supabase } from "./supabase-client"
const supabase = _supabase!
import type { AssetDraft, CreateAssetDraftInput, UpdateAssetDraftInput } from "./asset-draft-types"

const ASSET_DRAFTS_TABLE = "asset_drafts"
const SETUP_INSTRUCTION =
  "Asset draft storage not set up. Run supabase/asset_drafts_schema.sql in Supabase SQL Editor."

/**
 * Create and save an asset draft to user's workspace.
 * Requires authenticated user.
 */
export async function createAssetDraft(input: CreateAssetDraftInput): Promise<{ id: string; error?: string }> {
  try {
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authData?.user?.id) {
      return {
        id: "",
        error: "Must be signed in to save asset drafts",
      }
    }

    const userId = authData.user.id

    const { data, error } = await supabase
      .from("asset_drafts")
      .insert({
        owner_id: userId,
        asset_type: input.assetType,
        title: input.title,
        summary: input.summary,
        payload: input.payload,
        source: input.source || "generated",
      })
      .select("id")
      .single()

    if (error) {
      console.error("[v0] createAssetDraft error:", error)
      // Detect if table doesn't exist
      if (error.message?.includes("asset_drafts") || error.code === "PGRST103") {
        return {
          id: "",
          error: SETUP_INSTRUCTION,
        }
      }
      return {
        id: "",
        error: error.message,
      }
    }

    console.log("[v0] Asset draft created:", data.id)
    return { id: data.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] createAssetDraft exception:", err)
    return {
      id: "",
      error: msg,
    }
  }
}

/**
 * Get a single asset draft by ID.
 * User can only see their own drafts (enforced by RLS).
 */
export async function getAssetDraft(assetId: string): Promise<AssetDraft | null> {
  try {
    const { data, error } = await supabase
      .from("asset_drafts")
      .select("*")
      .eq("id", assetId)
      .single()

    if (error) {
      console.error("[v0] getAssetDraft error:", error)
      return null
    }

    return {
      id: data.id,
      ownerId: data.owner_id,
      assetType: data.asset_type,
      title: data.title,
      summary: data.summary,
      payload: data.payload,
      status: data.status,
      source: data.source,
      attachedNetworkId: data.attached_network_id,
      attachedHubId: data.attached_hub_id,
      attachedCollectionId: data.attached_collection_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.error("[v0] getAssetDraft exception:", err)
    return null
  }
}

/**
 * List all asset drafts for authenticated user.
 */
export async function listMyAssetDrafts(): Promise<AssetDraft[]> {
  try {
    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authData?.user?.id) {
      console.error("[v0] listMyAssetDrafts: Not authenticated")
      return []
    }

    const { data, error } = await supabase
      .from("asset_drafts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] listMyAssetDrafts error:", error)
      return []
    }

    return data.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      assetType: row.asset_type,
      title: row.title,
      summary: row.summary,
      payload: row.payload,
      status: row.status,
      source: row.source,
      attachedNetworkId: row.attached_network_id,
      attachedHubId: row.attached_hub_id,
      attachedCollectionId: row.attached_collection_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.error("[v0] listMyAssetDrafts exception:", err)
    return []
  }
}

/**
 * Update an asset draft.
 */
export async function updateAssetDraft(
  assetId: string,
  input: UpdateAssetDraftInput & { payload?: any }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {}
    
    if (input.title !== undefined) updates.title = input.title
    if (input.summary !== undefined) updates.summary = input.summary
    if (input.status !== undefined) updates.status = input.status
    if (input.attachedNetworkId !== undefined) updates.attached_network_id = input.attachedNetworkId
    if (input.attachedHubId !== undefined) updates.attached_hub_id = input.attachedHubId
    if (input.attachedCollectionId !== undefined) updates.attached_collection_id = input.attachedCollectionId
    if (input.payload !== undefined) updates.payload = input.payload

    const { error } = await supabase
      .from("asset_drafts")
      .update(updates)
      .eq("id", assetId)

    if (error) {
      console.error("[v0] updateAssetDraft error:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    console.log("[v0] Asset draft updated:", assetId)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] updateAssetDraft exception:", err)
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Delete an asset draft.
 */
export async function deleteAssetDraft(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("asset_drafts")
      .delete()
      .eq("id", assetId)

    if (error) {
      console.error("[v0] deleteAssetDraft error:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    console.log("[v0] Asset draft deleted:", assetId)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] deleteAssetDraft exception:", err)
    return {
      success: false,
      error: msg,
    }
  }
}
