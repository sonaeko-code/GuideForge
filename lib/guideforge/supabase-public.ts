/**
 * Public Supabase utilities for loading published guides on QuestLine pages
 */
import { createClient } from "@supabase/supabase-js"
import type { Guide } from "./types"
import type { AssetDraft } from "./asset-draft-types"

/**
 * Load published guides from Supabase for public display
 */
export async function loadPublishedGuides(): Promise<Guide[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[v0] Supabase not configured, using mock data only")
      return []
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("guides")
      .select(`
        *,
        guide_steps (
          id,
          guide_id,
          order_index,
          kind,
          title,
          body,
          is_spoiler,
          callout
        )
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading published guides:", error)
      return []
    }

    if (!data) {
      return []
    }

    console.log("[v0] Published guides loaded:", data.length)

    return data.map((row: any) => ({
      id: row.id,
      collectionId: row.collection_id || "",
      hubId: "",
      networkId: "",
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      type: row.type,
      difficulty: row.difficulty,
      status: row.status,
      verification: row.verification_status,
      requirements: Array.isArray(row.requirements) ? row.requirements : [],
      warnings: [],
      version: row.version,
      steps: (row.guide_steps || []).map((step: any) => ({
        id: step.id,
        guideId: step.guide_id,
        order: step.order_index,
        kind: step.kind,
        title: step.title,
        body: step.body,
        isSpoiler: step.is_spoiler || false,
        callout: step.callout,
      })),
      author: {
        id: row.author_id || "",
        displayName: "Author",
        handle: "author",
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    }))
  } catch (error) {
    console.error("[v0] Error loading published guides:", error)
    return []
  }
}

/**
 * Load a single published guide by slug
 */
export async function loadPublishedGuide(slug: string): Promise<Guide | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[v0] Supabase not configured for guide lookup")
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("guides")
      .select(`
        *,
        guide_steps (
          id,
          guide_id,
          order_index,
          kind,
          title,
          body,
          is_spoiler,
          callout
        )
      `)
      .eq("status", "published")
      .eq("slug", slug)
      .single()

    if (error) {
      console.error("[v0] Error loading guide:", error)
      return null
    }

    if (!data) {
      return null
    }

    return {
      id: data.id,
      collectionId: data.collection_id || "",
      hubId: "",
      networkId: "",
      slug: data.slug,
      title: data.title,
      summary: data.summary,
      type: data.type,
      difficulty: data.difficulty,
      status: data.status,
      verification: data.verification_status,
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      warnings: [],
      version: data.version,
      steps: (data.guide_steps || []).map((step: any) => ({
        id: step.id,
        guideId: step.guide_id,
        order: step.order_index,
        kind: step.kind,
        title: step.title,
        body: step.body,
        isSpoiler: step.is_spoiler || false,
        callout: step.callout,
      })),
      author: {
        id: data.author_id || "",
        displayName: "Author",
        handle: "author",
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      publishedAt: data.published_at,
    }
  } catch (error) {
    console.error("[v0] Error loading published guide:", error)
    return null
  }
}

// ========== Lane 2D: Public Asset Rendering ==========

/**
 * Lane 2D: Load published assets (checklists and single guides only) for a network
 * Only shows:
 * - status = 'published'
 * - attached_network_id = networkId
 * - assetType in ('single_guide', 'checklist')
 * 
 * Hides:
 * - Draft, pending_review, archived assets
 * - Assets from other networks
 * - Non-public asset types (recipe, sop, troubleshooting_flow)
 */
export async function loadPublishedAssetsForNetwork(
  networkId: string
): Promise<AssetDraft[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[v0] Supabase not configured, cannot load assets")
      return []
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query only published, publicly-renderable asset types attached to this network
    const { data, error } = await supabase
      .from("asset_drafts")
      .select("*")
      .eq("status", "published")
      .eq("attached_network_id", networkId)
      .in("asset_type", ["single_guide", "checklist"])
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading published assets:", error)
      return []
    }

    if (!data) {
      return []
    }

    console.log("[v0] Published assets loaded for network:", {
      networkId,
      count: data.length,
      types: data.map((a) => a.asset_type),
    })

    return data.map((row: any) => ({
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
  } catch (error) {
    console.error("[v0] Error loading published assets:", error)
    return []
  }
}

/**
 * Lane 2D: Load a single published asset by ID and verify it belongs to the network
 * Ensures:
 * - Asset exists
 * - status = 'published'
 * - attached_network_id matches
 * - assetType is publicly renderable
 */
export async function loadPublishedAsset(
  assetId: string,
  networkId: string
): Promise<AssetDraft | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.log("[v0] Supabase not configured for asset lookup")
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("asset_drafts")
      .select("*")
      .eq("id", assetId)
      .eq("status", "published")
      .eq("attached_network_id", networkId)
      .in("asset_type", ["single_guide", "checklist"])
      .single()

    if (error) {
      console.error("[v0] Error loading asset:", error)
      return null
    }

    if (!data) {
      return null
    }

    console.log("[v0] Published asset loaded:", {
      id: data.id,
      assetType: data.asset_type,
      title: data.title,
    })

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
  } catch (error) {
    console.error("[v0] Error loading published asset:", error)
    return null
  }
}
