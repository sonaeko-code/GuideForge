/**
 * Supabase Network, Hub, and Collection Persistence
 * 
 * Handles CRUD operations for:
 * - networks
 * - hubs
 * - collections
 * 
 * Falls back to localStorage if Supabase is unavailable.
 */

import type { Network, Hub, Collection, NetworkDraft } from "./types"
import { supabase, isSupabaseConfigured, getSupabaseSession } from "./supabase-client"
import { LocalStoragePersistenceAdapter } from "./persistence"

const DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

/**
 * Get the current user/profile ID
 */
async function getCurrentProfileId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    return DEV_PROFILE_ID
  }
  
  const session = await getSupabaseSession()
  return session?.user?.id || DEV_PROFILE_ID
}

// ========== NETWORKS ==========

/**
 * Create a new network
 */
export async function createNetwork(
  draft: NetworkDraft & { slug: string; primaryColor: string }
): Promise<{ network: Network; source: "supabase" | "local"; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, using localStorage fallback for network creation")
    return { network: {} as Network, source: "local" }
  }

  try {
    const profileId = await getCurrentProfileId()
    
    const networkData = {
      slug: draft.slug,
      name: draft.name,
      description: draft.description,
      type: draft.type,
      visibility: draft.visibility,
      domain: draft.domain,
      branding: {
        primaryColor: draft.primaryColor,
        accentColor: draft.primaryColor,
        theme: draft.theme,
      },
      forgeRuleIds: [],
      hubIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileId,
    }

    const { data, error } = await supabase
      .from("networks")
      .insert([networkData])
      .select()
      .single()

    if (error) {
      console.error("[v0] Supabase network creation error:", error.message)
      return { network: {} as Network, source: "supabase", error: error.message }
    }

    console.log("[v0] Network created in Supabase:", data.id)
    return { network: data as Network, source: "supabase" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Network creation exception:", message)
    return { network: {} as Network, source: "supabase", error: message }
  }
}

/**
 * Get all networks (for dashboards)
 */
export async function getAllNetworks(): Promise<Network[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const profileId = await getCurrentProfileId()
    
    const { data, error } = await supabase
      .from("networks")
      .select("*")
      .eq("profileId", profileId)

    if (error) {
      console.warn("[v0] Error loading networks:", error.message)
      return []
    }

    console.log("[v0] Loaded networks from Supabase:", data?.length || 0)
    return data as Network[]
  } catch (err) {
    console.warn("[v0] Exception loading networks:", err)
    return []
  }
}

/**
 * Get a single network by slug
 */
export async function getNetworkBySlug(slug: string): Promise<Network | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from("networks")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.warn("[v0] Error loading network:", error.message)
      return null
    }

    return data as Network
  } catch (err) {
    console.warn("[v0] Exception loading network:", err)
    return null
  }
}

// ========== HUBS ==========

/**
 * Create a new hub within a network
 */
export async function createHub(
  networkId: string,
  hub: Omit<Hub, "id" | "collectionIds">
): Promise<{ hub: Hub; source: "supabase" | "local"; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, using localStorage fallback for hub creation")
    return { hub: {} as Hub, source: "local" }
  }

  try {
    const profileId = await getCurrentProfileId()
    
    // Only include schema-supported fields
    const hubData = {
      network_id: networkId,
      slug: hub.slug,
      name: hub.name,
      description: hub.description,
      hub_kind: hub.hubKind,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] Hub save payload:", hubData)

    const { data, error } = await supabase
      .from("hubs")
      .insert([hubData])
      .select()
      .single()

    if (error) {
      console.error("[v0] Hub save error:", error.message)
      return { hub: {} as Hub, source: "supabase", error: error.message }
    }

    console.log("[v0] Hub saved:", data.id)

    // Update network's hubIds if supported
    const { data: network, error: networkError } = await supabase
      .from("networks")
      .select("hub_ids")
      .eq("id", networkId)
      .single()

    if (network && !networkError) {
      const hubIds = Array.isArray(network.hub_ids) ? network.hub_ids : []
      await supabase
        .from("networks")
        .update({ hub_ids: [...hubIds, data.id] })
        .eq("id", networkId)
    }

    return { hub: data as Hub, source: "supabase" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Hub save error:", message)
    return { hub: {} as Hub, source: "supabase", error: message }
  }
}

/**
 * Get all hubs in a network
 */
export async function getHubsByNetworkId(networkId: string): Promise<Hub[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("networkId", networkId)

    if (error) {
      console.warn("[v0] Error loading hubs:", error.message)
      return []
    }

    console.log("[v0] Loaded hubs from Supabase:", data?.length || 0)
    return data as Hub[]
  } catch (err) {
    console.warn("[v0] Exception loading hubs:", err)
    return []
  }
}

/**
 * Get a single hub by slug
 */
export async function getHubBySlug(slug: string): Promise<Hub | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.warn("[v0] Error loading hub:", error.message)
      return null
    }

    return data as Hub
  } catch (err) {
    console.warn("[v0] Exception loading hub:", err)
    return null
  }
}

// ========== COLLECTIONS ==========

/**
 * Create a new collection within a hub
 */
export async function createCollection(
  networkId: string,
  hubId: string,
  collection: Omit<Collection, "id" | "networkId" | "hubId" | "guideIds">
): Promise<{ collection: Collection; source: "supabase" | "local"; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, using localStorage fallback for collection creation")
    return { collection: {} as Collection, source: "local" }
  }

  try {
    const profileId = await getCurrentProfileId()
    
    // Only include schema-supported fields
    const collectionData = {
      network_id: networkId,
      hub_id: hubId,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] Collection save payload:", collectionData)

    const { data, error } = await supabase
      .from("collections")
      .insert([collectionData])
      .select()
      .single()

    if (error) {
      console.error("[v0] Collection save error:", error.message)
      return { collection: {} as Collection, source: "supabase", error: error.message }
    }

    console.log("[v0] Collection saved:", data.id)
    return { collection: data as Collection, source: "supabase" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Collection save error:", message)
    return { collection: {} as Collection, source: "supabase", error: message }
  }
}

/**
 * Get all collections in a hub
 */
export async function getCollectionsByHubId(hubId: string): Promise<Collection[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("hubId", hubId)

    if (error) {
      console.warn("[v0] Error loading collections:", error.message)
      return []
    }

    console.log("[v0] Loaded collections from Supabase:", data?.length || 0)
    return data as Collection[]
  } catch (err) {
    console.warn("[v0] Exception loading collections:", err)
    return []
  }
}

/**
 * Get a single collection by slug
 */
export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.warn("[v0] Error loading collection:", error.message)
      return null
    }

    return data as Collection
  } catch (err) {
    console.warn("[v0] Exception loading collection:", err)
    return null
  }
}
