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
 * Normalize a networkId (slug or mock ID) to a real Supabase UUID
 * Examples:
 *   "network_questline" -> lookup by slug "questline" -> returns UUID
 *   "questline" -> lookup by slug -> returns UUID
 *   "550e8400-e29b-41d4-a716-446655440000" -> already UUID, return as-is
 */
async function normalizeNetworkIdForSupabase(networkId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, cannot normalize networkId")
    return null
  }

  console.log("[v0] Original networkId:", networkId)

  // If it's already a UUID, return it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(networkId)) {
    console.log("[v0] networkId is already UUID:", networkId)
    return networkId
  }

  // Try to normalize mock IDs like "network_questline" to "questline"
  let slug = networkId
  if (networkId.startsWith("network_")) {
    slug = networkId.replace("network_", "")
  }

  console.log("[v0] Looking up network by slug:", slug)

  try {
    const { data, error } = await supabase
      .from("networks")
      .select("id")
      .eq("slug", slug)
      .single()

    if (error) {
      console.error("[v0] Network lookup error:", error.message)
      return null
    }

    if (data?.id) {
      console.log("[v0] Normalized network UUID:", data.id)
      return data.id
    }

    return null
  } catch (err) {
    console.error("[v0] Network lookup exception:", err)
    return null
  }
}

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
    
    // Only include schema-supported fields. Do NOT include UI-only fields.
    // The networks table only has: id, slug, name, description, created_at, updated_at
    // All other fields (theme, visibility, branding, etc) are UI-only and stored in app state
    const networkData = {
      slug: draft.slug,
      name: draft.name,
      description: draft.description,
    }

    console.log("[v0] Network save payload:", networkData)

    const { data, error } = await supabase
      .from("networks")
      .insert([networkData])
      .select()
      .single()

    if (error) {
      console.error("[v0] Network save error:", error.message)
      return { network: {} as Network, source: "supabase", error: error.message }
    }

    console.log("[v0] Network saved:", data.id)
    return { network: data as Network, source: "supabase" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Network save error:", message)
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
    // Do not filter by profileId - column may not exist in schema
    const { data, error } = await supabase
      .from("networks")
      .select("*")

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
      console.warn("[v0] Error loading network by slug:", error.message)
      return null
    }

    return data as Network
  } catch (err) {
    console.warn("[v0] Exception loading network by slug:", err)
    return null
  }
}

/**
 * Get a single network by UUID
 */
export async function getNetworkById(id: string): Promise<Network | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    console.log("[v0] Looking up network by ID:", id)
    
    const { data, error } = await supabase
      .from("networks")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.warn("[v0] Error loading network by ID:", error.message)
      return null
    }

    console.log("[v0] Found network:", data?.name)
    return data as Network
  } catch (err) {
    console.warn("[v0] Exception loading network by ID:", err)
    return null
  }
}

/**
 * Resolve a network param (UUID, slug, or mock ID) to a Network object
 * This is the main entry point for loading networks in dashboard routes
 */
export async function resolveNetworkParam(networkId: string): Promise<Network | null> {
  console.log("[v0] Dashboard route networkId:", networkId)

  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured")
    return null
  }

  // Check if it's a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(networkId)) {
    const network = await getNetworkById(networkId)
    if (network) {
      console.log("[v0] Resolved network by UUID:", network.name)
      return network
    }
    console.log("[v0] Network load failed: No network found with UUID", networkId)
    return null
  }

  // Try as slug
  let slug = networkId
  if (networkId.startsWith("network_")) {
    slug = networkId.replace("network_", "")
  }

  const network = await getNetworkBySlug(slug)
  if (network) {
    console.log("[v0] Resolved network by slug:", network.name)
    return network
  }

  console.log("[v0] Network load failed: No network found with slug", slug)
  return null
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
    console.log("[v0] Create hub route networkId:", networkId)

    // Normalize networkId to real UUID
    const normalizedNetworkId = await normalizeNetworkIdForSupabase(networkId)
    if (!normalizedNetworkId) {
      const error = `Could not find network with ID or slug: ${networkId}`
      console.error("[v0] Hub save error:", error)
      return { hub: {} as Hub, source: "supabase", error }
    }

    console.log("[v0] Resolved hub network UUID:", normalizedNetworkId)

    const profileId = await getCurrentProfileId()
    
    // Only include schema-supported fields
    const hubData = {
      network_id: normalizedNetworkId,
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

    console.log("[v0] Hub save result:", data)

    // Update network's hubIds if supported
    const { data: network, error: networkError } = await supabase
      .from("networks")
      .select("hub_ids")
      .eq("id", normalizedNetworkId)
      .single()

    if (network && !networkError) {
      const hubIds = Array.isArray(network.hub_ids) ? network.hub_ids : []
      await supabase
        .from("networks")
        .update({ hub_ids: [...hubIds, data.id] })
        .eq("id", normalizedNetworkId)
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
    // Normalize networkId in case it's a slug or mock ID
    const normalizedNetworkId = await normalizeNetworkIdForSupabase(networkId)
    if (!normalizedNetworkId) {
      console.warn("[v0] Could not normalize networkId for hub lookup:", networkId)
      return []
    }

    console.log("[v0] Dashboard loaded hubs for network:", normalizedNetworkId)

    // Query using network_id (snake_case) which is the actual column name
    const { data, error } = await supabase
      .from("hubs")
      .select("*")
      .eq("network_id", normalizedNetworkId)

    if (error) {
      console.warn("[v0] Error loading hubs:", error.message)
      return []
    }

    console.log("[v0] Hubs tab rendered hubs:", data?.length || 0)
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
    
    // Only include schema-supported fields (collections belong to hubs, not networks)
    const collectionData = {
      hub_id: hubId,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] Collection selected hub:", hubId)
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

    console.log("[v0] Collection save result:", data.id)
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
    console.log("[v0] Dashboard loaded collections for network hub:", hubId)

    // Query using hub_id (snake_case) which is the actual column name
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("hub_id", hubId)

    if (error) {
      console.warn("[v0] Error loading collections:", error.message)
      return []
    }

    console.log("[v0] Collections tab rendered collections:", data?.length || 0)
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


// ========== GUIDES (Network-Scoped) ==========

/**
 * Get all guides for a network (scoped: network → hubs → collections → guides)
 * This ensures dashboards only show guides for the current network
 */
export async function getGuidesByNetworkId(networkId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, returning empty guides for network")
    return []
  }

  try {
    console.log("[v0] Loading guides for network:", networkId)

    // First get all hubs for this network
    const { data: hubs, error: hubsError } = await supabase
      .from("hubs")
      .select("id")
      .eq("network_id", networkId)

    if (hubsError) {
      console.warn("[v0] Error loading hubs:", hubsError.message)
      return []
    }

    if (!hubs || hubs.length === 0) {
      console.log("[v0] Network has no hubs")
      return []
    }

    const hubIds = hubs.map(h => h.id)
    console.log("[v0] Network hubs:", hubIds.length)

    // Get all collections for those hubs
    const { data: collections, error: collectionsError } = await supabase
      .from("collections")
      .select("id")
      .in("hub_id", hubIds)

    if (collectionsError) {
      console.warn("[v0] Error loading collections:", collectionsError.message)
      return []
    }

    if (!collections || collections.length === 0) {
      console.log("[v0] Network has no collections")
      return []
    }

    const collectionIds = collections.map(c => c.id)
    console.log("[v0] Network collections:", collectionIds.length)

    // Get all guides for those collections
    const { data: guides, error: guidesError } = await supabase
      .from("guides")
      .select("*")
      .in("collection_id", collectionIds)

    if (guidesError) {
      console.warn("[v0] Error loading guides:", guidesError.message)
      return []
    }

    console.log("[v0] Network guides:", guides?.length || 0)
    return guides || []
  } catch (err) {
    console.warn("[v0] Exception loading network guides:", err)
    return []
  }
}

/**
 * Get draft guides (status=draft or status=in-review) for a network
 */
export async function getDraftGuidesByNetworkId(networkId: string): Promise<any[]> {
  const guides = await getGuidesByNetworkId(networkId)
  return guides.filter(g => g.status === "draft" || g.status === "in-review")
}

/**
 * Get published guides (status=published) for a network
 */
export async function getPublishedGuidesByNetworkId(networkId: string): Promise<any[]> {
  const guides = await getGuidesByNetworkId(networkId)
  return guides.filter(g => g.status === "published")
}
