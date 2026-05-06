/**
 * Supabase Network, Hub, and Collection Persistence
 * 
 * Handles CRUD operations for:
 * - networks
 * - hubs
 * - collections
 * 
 * Falls back to localStorage if Supabase is unavailable.
 * 
 * GuideForge Data Spine Contract:
 * - Dashboard guide loading uses: networkId → hubs → collections → collection IDs → guides WHERE collection_id IN (ids)
 * - getGuidesForNetworkCollections must receive array of NormalizedCollection objects with valid id fields
 * - Guide query filters by collection_id matching collection.id (Supabase UUID)
 * - Normalized status mapping: draft→draft, ready/ready_to_publish→ready, published/active→published
 */

import type { Network, Hub, Collection, NetworkDraft, NetworkRoleDefinition, NetworkMember, NetworkMembership } from "./types"
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

/**
 * Normalize a raw Supabase network row to the Network type
 * Maps snake_case columns to camelCase properties
 * Handles Ownership Phase 2: owner_user_id → ownerUserId
 */
function normalizeNetwork(row: any): Network {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    visibility: row.visibility,
    domain: row.domain,
    branding: row.branding,
    forgeRuleIds: row.forgeRuleIds || [],
    hubIds: row.hubIds || [],
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    // Ownership Phase 2: Map snake_case owner_user_id to camelCase ownerUserId
    ownerUserId: row.owner_user_id || row.ownerUserId || null,
  }
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
    // The networks table only has: id, slug, name, description, created_at, updated_at, owner_user_id
    // All other fields (theme, visibility, branding, etc) are UI-only and stored in app state
    const networkData: Record<string, any> = {
      slug: draft.slug,
      name: draft.name,
      description: draft.description,
    }

    // Ownership Phase 2: Include owner_user_id if user is logged in
    // If profileId is DEV_PROFILE_ID (no real user session), omit owner_user_id to save as null
    if (profileId !== DEV_PROFILE_ID) {
      networkData.owner_user_id = profileId
      console.log("[v0] Network save with owner_user_id:", profileId)
    } else {
      console.log("[v0] Network save without owner (signed out or mock)")
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

    console.log("[v0] Network saved:", data.id, "owner:", data.owner_user_id || "null")
    // Normalize snake_case Supabase columns to camelCase Network type
    return { network: normalizeNetwork(data), source: "supabase" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Network save error:", message)
    return { network: {} as Network, source: "supabase", error: message }
  }
}

/**
 * Update an existing network's editable fields
 */
export async function updateNetwork(
  networkId: string,
  updates: {
    name?: string
    slug?: string
    description?: string
  }
): Promise<{ network: Network | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] Supabase not configured, cannot update network")
    return { network: null, error: "Supabase not configured" }
  }

  if (!networkId) {
    return { network: null, error: "No network ID provided" }
  }

  try {
    // Normalize networkId to UUID if needed
    let normalizedId = networkId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(networkId)) {
      // Try to look up by slug
      const bySlug = await getNetworkBySlug(networkId)
      if (bySlug) {
        normalizedId = bySlug.id
      } else {
        return { network: null, error: `No network found for id: ${networkId}` }
      }
    }

    const updateData: Record<string, any> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.slug !== undefined) updateData.slug = updates.slug
    if (updates.description !== undefined) updateData.description = updates.description
    updateData.updated_at = new Date().toISOString()

    console.log("[v0] Network update payload:", updateData)

    const { data, error } = await supabase
      .from("networks")
      .update(updateData)
      .eq("id", normalizedId)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[v0] Network update error:", error.message)
      return { network: null, error: error.message }
    }

    if (!data) {
      const notFoundError = `No network found for id: ${networkId}`
      console.error("[v0] Network update error:", notFoundError)
      return { network: null, error: notFoundError }
    }

    console.log("[v0] Network updated:", data.id, data.name)
    // Normalize snake_case Supabase columns to camelCase Network type
    return { network: normalizeNetwork(data) }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Network update error:", message)
    return { network: null, error: message }
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
    // Normalize snake_case Supabase columns to camelCase Network type
    return (data || []).map(normalizeNetwork)
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

    // Normalize snake_case Supabase columns to camelCase Network type
    return data ? normalizeNetwork(data) : null
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
    // Normalize snake_case Supabase columns to camelCase Network type
    return data ? normalizeNetwork(data) : null
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
 * Update an existing hub
 */
export async function updateHub(
  hubId: string,
  updates: {
    name?: string
    slug?: string
    description?: string
  }
): Promise<{ hub: Hub | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { hub: null, error: "Supabase not configured" }
  }

  if (!hubId) {
    return { hub: null, error: "No hub ID provided" }
  }

  try {
    const updateData: Record<string, any> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.slug !== undefined) updateData.slug = updates.slug
    if (updates.description !== undefined) updateData.description = updates.description
    updateData.updated_at = new Date().toISOString()

    console.log("[v0] Hub update payload:", updateData)

    const { data, error } = await supabase
      .from("hubs")
      .update(updateData)
      .eq("id", hubId)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[v0] Hub update error:", error.message)
      return { hub: null, error: error.message }
    }

    if (!data) {
      const notFoundError = `No hub found for id: ${hubId}`
      console.error("[v0] Hub update error:", notFoundError)
      return { hub: null, error: notFoundError }
    }

    console.log("[v0] Hub updated:", data.id, data.name)
    return { hub: data as Hub }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Hub update error:", message)
    return { hub: null, error: message }
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
    console.log("[v0] Loading collections for hub:", hubId)

    // Query using hub_id (snake_case) which is the actual column name
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("hub_id", hubId)

    if (error) {
      console.warn("[v0] Error loading collections:", error.message)
      return []
    }

    console.log("[v0] Collections loaded from Supabase:", data?.length || 0)
    
    // Normalize snake_case from Supabase to camelCase for the app
    const normalized = (data || []).map((col: any) => ({
      id: col.id,
      hubId: col.hub_id,
      networkId: col.network_id,
      slug: col.slug,
      name: col.name,
      description: col.description,
      defaultGuideType: col.default_guide_type,
      guideIds: col.guide_ids || [],
    })) as Collection[]
    
    return normalized
  } catch (err) {
    console.warn("[v0] Exception loading collections:", err)
    return []
  }
}

/**
 * Update an existing collection
 */
export async function updateCollection(
  collectionId: string,
  updates: {
    name?: string
    slug?: string
    description?: string
  }
): Promise<{ collection: Collection | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { collection: null, error: "Supabase not configured" }
  }

  if (!collectionId) {
    return { collection: null, error: "No collection ID provided" }
  }

  try {
    const updateData: Record<string, any> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.slug !== undefined) updateData.slug = updates.slug
    if (updates.description !== undefined) updateData.description = updates.description
    updateData.updated_at = new Date().toISOString()

    console.log("[v0] Collection update payload:", updateData)

    const { data, error } = await supabase
      .from("collections")
      .update(updateData)
      .eq("id", collectionId)
      .select("*")
      .maybeSingle()

    if (error) {
      console.error("[v0] Collection update error:", error.message)
      return { collection: null, error: error.message }
    }

    if (!data) {
      const notFoundError = `No collection found for id: ${collectionId}`
      console.error("[v0] Collection update error:", notFoundError)
      return { collection: null, error: notFoundError }
    }

    console.log("[v0] Collection updated:", data.id, data.name)
    
    // Normalize the returned data
    const normalized = {
      id: data.id,
      hubId: data.hub_id,
      networkId: data.network_id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      defaultGuideType: data.default_guide_type,
      guideIds: data.guide_ids || [],
    }
    
    return { collection: normalized as Collection }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Collection update error:", message)
    return { collection: null, error: message }
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
 * Get all guides for a network's collections with full normalization
 * Converts snake_case to camelCase and attaches collection/hub context
 */
export async function getGuidesForNetworkCollections(
  collections: NormalizedCollection[]
): Promise<Guide[]> {
  if (!isSupabaseConfigured()) {
    console.log("[v0] getGuidesForNetworkCollections: Supabase not configured")
    return []
  }

  if (!collections || collections.length === 0) {
    console.log("[v0] getGuidesForNetworkCollections: No collections provided")
    return []
  }

  try {
    const collectionIds = collections.map(c => c.id)
    console.log("[v0] getGuidesForNetworkCollections: Querying guides for collections:", collectionIds)

    // Query guides by collection IDs (this is the proven working query)
    const { data: guides, error: guidesError } = await supabase
      .from("guides")
      .select("*")
      .in("collection_id", collectionIds)

    if (guidesError) {
      console.warn("[v0] getGuidesForNetworkCollections: Query error:", guidesError.message)
      return []
    }

    if (!guides || guides.length === 0) {
      console.log("[v0] getGuidesForNetworkCollections: No guides found")
      return []
    }

    // Normalize guides: convert snake_case to camelCase and attach collection/hub context
    const normalizedGuides = guides.map((g: any) => {
      const collection = collections.find(c => c.id === g.collection_id)
      return {
        id: g.id,
        title: g.title,
        slug: g.slug,
        description: g.description,
        summary: g.summary,
        status: g.status,
        difficulty: g.difficulty,
        requirements: g.requirements,
        steps: g.steps,
        version: g.version,
        forgeRulesCheckResult: g.forge_rules_check_result,
        forgeRulesCheckTimestamp: g.forge_rules_check_timestamp,
        collectionId: g.collection_id,
        collectionName: collection?.name || "Unknown",
        hubId: collection?.hubId,
        hubName: collection?.hubName,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        publishedAt: g.published_at,
        authorId: g.author_id,
        reviewerId: g.reviewer_id,
        verificationStatus: g.verification_status,
      }
    })

    console.log("[v0] getGuidesForNetworkCollections: Normalized", normalizedGuides.length, "guides")
    return normalizedGuides
  } catch (err) {
    console.warn("[v0] getGuidesForNetworkCollections: Exception:", err)
    return []
  }
}

/**
 * Get all guides for a network (scoped: network → hubs → collections → guides)
 * This ensures dashboards only show guides for the current network
 * 
 * Detailed diagnostics for debugging RLS and selection issues.
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
    console.log("[v0] Guide load hub IDs:", hubIds)

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
    console.log("[v0] Guide load collection IDs:", collectionIds)

    // Get all guides for those collections
    const { data: guides, error: guidesError } = await supabase
      .from("guides")
      .select("*")
      .in("collection_id", collectionIds)

    console.log("[v0] Guide load raw Supabase result:", {
      rows: guides?.length || 0,
      error: guidesError?.message || null,
      errorCode: guidesError?.code || null,
    })

    if (guidesError) {
      console.warn("[v0] Guide load Supabase error:", guidesError.message, {
        code: guidesError.code,
        details: guidesError.details,
      })
      // Even on error, check if we got partial results
      if (guides && guides.length > 0) {
        console.log("[v0] Despite error, got partial guides:", guides.length)
        return guides
      }
      return []
    }

    if (guides && guides.length > 0) {
      console.log("[v0] Guide load sample rows:", guides.slice(0, 2).map(g => ({
        id: g.id,
        title: g.title,
        slug: g.slug,
        collection_id: g.collection_id,
        status: g.status,
      })))
    }

    return guides || []
  } catch (err) {
    console.warn("[v0] Exception loading network guides:", err)
    return []
  }
}

/**
 * Diagnostic helper: Check if guides table is readable at all
 * Useful for detecting RLS issues where guides exist but cannot be selected
 */
export async function checkGuidesTableReadability(): Promise<{ canRead: boolean; rowCount: number; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { canRead: false, rowCount: 0, error: "Supabase not configured" }
  }

  try {
    const { data, error, count } = await supabase
      .from("guides")
      .select("id, title, collection_id", { count: "exact" })
      .limit(10)

    if (error) {
      console.log("[v0] Guide table RLS check - SELECT blocked:", error.message)
      return { canRead: false, rowCount: 0, error: error.message }
    }

    console.log("[v0] Guide table RLS check - SELECT allowed:", { rowCount: count || 0 })
    return { canRead: true, rowCount: count || 0 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log("[v0] Guide table RLS check - exception:", msg)
    return { canRead: false, rowCount: 0, error: msg }
  }
}

/**
 * Diagnostic helper: Get guides by specific collection IDs without network scoping
 * Useful for testing if a known collection has guides but network query returned none
 */
export async function getGuidesByCollectionIds(collectionIds: string[]): Promise<{ guides: any[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { guides: [] }
  }

  if (!collectionIds || collectionIds.length === 0) {
    return { guides: [] }
  }

  try {
    const { data, error } = await supabase
      .from("guides")
      .select("*")
      .in("collection_id", collectionIds)

    if (error) {
      console.log("[v0] Guide collection query error:", error.message)
      return { guides: [], error: error.message }
    }

    console.log("[v0] Guide collection query result:", {
      collectionIds,
      rowCount: data?.length || 0,
      sample: data?.slice(0, 1).map(g => ({ id: g.id, title: g.title, collection_id: g.collection_id })) || [],
    })

    return { guides: data || [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log("[v0] Guide collection query exception:", msg)
    return { guides: [], error: msg }
  }
}


export async function getDraftGuidesByNetworkId(networkId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) {
    return []
  }
  const guides = await getGuidesByNetworkId(networkId)
  return guides.filter(g => g.status === "draft" || g.status === "in-review")
}

/**
 * Get published guides (status=published) for a network
 */
export async function getPublishedGuidesByNetworkId(networkId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) {
    return []
  }
  const guides = await getGuidesByNetworkId(networkId)
  return guides.filter(g => g.status === "published")
}

// ========== UNIFIED BUILDER CONTEXT LOADER ==========

/**
 * Normalized, denormalized collection used in builder pages.
 * Always carries its parent hub identity so cards/forms can render
 * unambiguous "Hub: X" badges even when collection names collide.
 */
export interface NormalizedHub {
  id: string
  name: string
  slug: string
  description: string
  hubKind?: string
}

export interface NormalizedCollection {
  id: string
  name: string
  slug: string
  description: string
  hubId: string
  hubName: string
  hubSlug: string
  guideIds: string[]
}

export interface NetworkBuilderContext {
  network: Network | null
  networkId: string
  hubs: NormalizedHub[]
  collections: NormalizedCollection[]
  collectionsByHub: Record<string, NormalizedCollection[]>
  errors: string[]
  source: "supabase" | "mock" | "none"
}

/**
 * loadNetworkBuilderContext
 *
 * Single source of truth for network → hub → collection data used by
 * dashboard, generate, and guide/new pages.
 *
 * Resolution rules:
 * - If networkParam is a UUID, load network by id.
 * - If networkParam is a slug (or `network_<slug>`), load network by slug.
 * - If networkParam refers to the legacy QuestLine mock and the Supabase
 *   row exists, prefer the real Supabase data.
 * - Only fall back to mock-data when the route truly is the QuestLine
 *   mock/demo path AND no Supabase network exists for it.
 * - Never throw. Always returns arrays (possibly empty) and an `errors[]`.
 */
export async function loadNetworkBuilderContext(
  networkParam: string
): Promise<NetworkBuilderContext> {
  const errors: string[] = []
  console.log("[v0] Builder context input networkParam:", networkParam)

  // Step 1: Resolve the network
  let network: Network | null = null
  let source: "supabase" | "mock" | "none" = "none"

  try {
    network = await resolveNetworkParam(networkParam)
    if (network) {
      source = "supabase"
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[v0] Builder context network resolve error:", msg)
    errors.push(`network resolve: ${msg}`)
  }

  // Step 2: QuestLine demo fallback ONLY if Supabase has nothing AND route is QuestLine
  const isQuestLineRoute =
    networkParam === "questline" ||
    networkParam === "network_questline"

  if (!network && isQuestLineRoute) {
    try {
      const { getNetworkById: mockGetNetworkById } = await import("./mock-data")
      const mockNet = mockGetNetworkById("network_questline")
      if (mockNet) {
        network = mockNet
        source = "mock"
        console.log("[v0] Builder context using QuestLine mock fallback")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`mock fallback: ${msg}`)
    }
  }

  if (!network) {
    console.log("[v0] Builder context resolved network: null")
    return {
      network: null,
      networkId: networkParam,
      hubs: [],
      collections: [],
      collectionsByHub: {},
      errors,
      source: "none",
    }
  }

  console.log(
    "[v0] Builder context resolved network:",
    network.id,
    network.name,
    "source:",
    source
  )

  const resolvedNetworkId = network.id

  // Step 3: Load hubs
  let rawHubs: any[] = []
  if (source === "supabase" && isSupabaseConfigured()) {
    try {
      rawHubs = await getHubsByNetworkId(resolvedNetworkId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`hubs: ${msg}`)
      rawHubs = []
    }
  } else if (source === "mock") {
    try {
      const { getHubsByNetwork } = await import("./mock-data")
      rawHubs = getHubsByNetwork(resolvedNetworkId) || []
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`mock hubs: ${msg}`)
      rawHubs = []
    }
  }

  const hubs: NormalizedHub[] = rawHubs.map((h: any) => ({
    id: h.id,
    name: h.name,
    slug: h.slug ?? h.id,
    description: h.description ?? "",
    hubKind: h.hub_kind ?? h.hubKind,
  }))

  console.log("[v0] Builder context hubs:", hubs.length)

  // Step 4: Load collections per hub
  const collections: NormalizedCollection[] = []
  const collectionsByHub: Record<string, NormalizedCollection[]> = {}

  for (const hub of hubs) {
    let rawCols: any[] = []
    if (source === "supabase" && isSupabaseConfigured()) {
      try {
        rawCols = await getCollectionsByHubId(hub.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`collections for hub ${hub.id}: ${msg}`)
        rawCols = []
      }
    } else if (source === "mock") {
      try {
        const { getCollectionsByHub } = await import("./mock-data")
        rawCols = getCollectionsByHub(hub.id) || []
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`mock collections for hub ${hub.id}: ${msg}`)
        rawCols = []
      }
    }

    const normalized: NormalizedCollection[] = rawCols.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? c.id,
      description: c.description ?? "",
      hubId: c.hubId ?? c.hub_id ?? hub.id,
      hubName: hub.name,
      hubSlug: hub.slug,
      guideIds: c.guideIds ?? c.guide_ids ?? [],
    }))

    collectionsByHub[hub.id] = normalized
    collections.push(...normalized)
  }

  console.log("[v0] Builder context collections:", collections.length)
  if (errors.length > 0) {
    console.log("[v0] Builder context errors:", errors)
  }

  return {
    network,
    networkId: resolvedNetworkId,
    hubs,
    collections,
    collectionsByHub,
    errors,
    source,
  }
}

// ========== GOVERNANCE (Phase 2+) ==========

/**
 * Get role definitions for a network
 * Returns all canonical roles defined for this network
 * Reads only, no RLS enforcement
 */
export async function getRoleDefinitionsForNetwork(
  networkId: string
): Promise<NetworkRoleDefinition[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from("network_role_definitions")
      .select("*")
      .eq("network_id", networkId)
      .eq("is_active", true)
      .order("review_weight", { ascending: false })

    if (error) {
      console.warn("[v0] Error loading role definitions:", error.message)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      networkId: row.network_id,
      canonicalRole: row.canonical_role,
      displayName: row.display_name,
      reviewWeight: row.review_weight,
      canSubmitGuides: row.can_submit_guides,
      canVoteOnReviews: row.can_vote_on_reviews,
      canManageMembers: row.can_manage_members,
      canPublishOverride: row.can_publish_override,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.warn("[v0] Exception loading role definitions:", err)
    return []
  }
}

/**
 * Get network members for a network
 * Returns all member assignments for this network
 * Reads only, no RLS enforcement
 */
export async function getNetworkMembersForNetwork(
  networkId: string
): Promise<NetworkMember[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from("network_members")
      .select("*")
      .eq("network_id", networkId)
      .order("created_at", { ascending: true })

    if (error) {
      console.warn("[v0] Error loading network members:", error.message)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      networkId: row.network_id,
      userId: row.user_id,
      canonicalRole: row.canonical_role,
      displayName: row.display_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (err) {
    console.warn("[v0] Exception loading network members:", err)
    return []
  }
}

/**
 * Get current user's network membership
 * Returns user's role in this network, or null if not a member
 * Reads only, no RLS enforcement
 */
export async function getCurrentUserNetworkMembership(
  networkId: string
): Promise<NetworkMember | null> {
  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id
    if (!userId) {
      return null
    }

    const { data, error } = await supabase
      .from("network_members")
      .select("*")
      .eq("network_id", networkId)
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not a member (single() returned no rows)
        return null
      }
      console.warn("[v0] Error loading user network membership:", error.message)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      networkId: data.network_id,
      userId: data.user_id,
      canonicalRole: data.canonical_role,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (err) {
    console.warn("[v0] Exception loading user network membership:", err)
    return null
  }
}

/**
 * Claim an ownerless network as the current user
 * Returns error if network already has an owner
 * Governance Phase 3: Non-blocking, no RLS, no enforcement
 */
export async function claimOwnerlessNetwork(
  networkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured" }
  }

  try {
    // Step 1: Update networks.owner_user_id only where it's currently NULL
    const { data: updateData, error: updateError } = await supabase
      .from("networks")
      .update({ owner_user_id: userId })
      .eq("id", networkId)
      .is("owner_user_id", null)
      .select()

    if (updateError) {
      console.error("[v0] Error updating network owner:", updateError.message)
      return { success: false, error: `Failed to claim network: ${updateError.message}` }
    }

    // If update affected 0 rows, network already has an owner
    if (!updateData || updateData.length === 0) {
      console.warn("[v0] Network already owned, claim failed")
      return { success: false, error: "Network is already owned." }
    }

    console.log("[v0] Network owner updated to:", userId)

    // Step 2: Insert network_members row with owner role
    const { data: memberData, error: memberError } = await supabase
      .from("network_members")
      .insert([
        {
          network_id: networkId,
          user_id: userId,
          canonical_role: "owner",
          display_name: "Owner",
        },
      ])
      .select()
      .single()

    if (memberError) {
      console.error("[v0] Error creating network member:", memberError.message)
      // Don't fail completely—owner was set, just warn about member row
      return { success: true, error: `Network claimed but member row creation failed: ${memberError.message}` }
    }

    console.log("[v0] Network member row created for owner:", memberData?.id)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Exception claiming network:", message)
    return { success: false, error: `Exception claiming network: ${message}` }
  }
}

/**
 * Get all network memberships for a user
 * Returns memberships with network and role definition info
 * Account Phase 2: Read-only visibility, no RLS enforcement
 * Uses multi-query approach for reliability (avoids nested select issues)
 */
export async function getNetworkMembershipsForUser(userId: string): Promise<NetworkMembership[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  try {
    console.log("[v0] Loading memberships for user:", userId)

    // Step 1: Query network_members for this user
    const { data: memberData, error: memberError } = await supabase
      .from("network_members")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (memberError) {
      console.warn("[v0] Error loading network memberships:", memberError.message)
      return []
    }

    if (!memberData || memberData.length === 0) {
      console.log("[v0] User has no network memberships")
      return []
    }

    console.log("[v0] Found network members:", memberData.length)

    // Step 2: Collect unique network IDs
    const networkIds = memberData.map((m: any) => m.network_id)

    // Step 3: Query networks table for those IDs
    const { data: networkData, error: networkError } = await supabase
      .from("networks")
      .select("id, name, slug")
      .in("id", networkIds)

    if (networkError) {
      console.warn("[v0] Error loading networks:", networkError.message)
      return []
    }

    // Create map for quick lookup
    const networkMap = new Map(
      (networkData || []).map((n: any) => [n.id, { name: n.name, slug: n.slug }])
    )

    // Step 4: Query role definitions for all these networks and roles
    const roleQueries = memberData.map((m: any) => ({
      network_id: m.network_id,
      canonical_role: m.canonical_role,
    }))

    // Collect unique (network_id, canonical_role) pairs
    const uniqueRolePairs = Array.from(
      new Map(
        roleQueries.map((r) => [
          `${r.network_id}:${r.canonical_role}`,
          r,
        ])
      ).values()
    )

    // Query all role definitions needed
    let roleDefinitions: any[] = []
    if (uniqueRolePairs.length > 0) {
      // Use OR filters for multiple pairs
      let query = supabase.from("network_role_definitions").select("*")

      for (const pair of uniqueRolePairs) {
        query = query.or(
          `network_id.eq.${pair.network_id},canonical_role.eq.${pair.canonical_role}`
        )
      }

      const { data: roles, error: roleError } = await query

      if (roleError) {
        console.warn("[v0] Error loading role definitions:", roleError.message)
        // Continue without role definitions, will use defaults
      } else {
        roleDefinitions = roles || []
      }
    }

    // Create map for role definitions
    const roleMap = new Map(
      roleDefinitions.map((r: any) => [
        `${r.network_id}:${r.canonical_role}`,
        r,
      ])
    )

    // Step 5: Merge all data in TypeScript
    const membershipsWithRoles = memberData.map((member: any) => {
      const network = networkMap.get(member.network_id) || {
        name: "Unknown Network",
        slug: "",
      }
      const role = roleMap.get(`${member.network_id}:${member.canonical_role}`)

      return {
        networkId: member.network_id,
        networkName: network.name,
        networkSlug: network.slug,
        userId: member.user_id,
        canonicalRole: member.canonical_role,
        memberDisplayName: member.display_name,
        roleDisplayName: role?.display_name || member.canonical_role,
        reviewWeight: role?.review_weight || 0,
        canSubmitGuides: role?.can_submit_guides || false,
        canVoteOnReviews: role?.can_vote_on_reviews || false,
        canManageMembers: role?.can_manage_members || false,
        canPublishOverride: role?.can_publish_override || false,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      }
    })

    console.log("[v0] Loaded network memberships for user:", membershipsWithRoles.length)
    return membershipsWithRoles
  } catch (err) {
    console.warn("[v0] Exception loading network memberships:", err)
    return []
  }
}

/**
 * Update display_name for network role definitions
 * Governance Phase 4: Editable theme labels for roles
 * Only updates display_name, protects canonical_role and permissions
 * 
 * Updates is an array of: { canonicalRole: string, displayName: string }
 */
export async function updateNetworkRoleDisplayNames(
  networkId: string,
  updates: Array<{ canonicalRole: string; displayName: string }>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured" }
  }

  if (!updates || updates.length === 0) {
    return { success: false, error: "No updates provided" }
  }

  try {
    console.log("[v0] Updating role display names for network:", networkId, "updates:", updates.length)

    // Validate all updates
    for (const update of updates) {
      if (!update.displayName || !update.displayName.trim()) {
        return { success: false, error: `Display name cannot be empty for role ${update.canonicalRole}` }
      }
      const trimmed = update.displayName.trim()
      if (trimmed.length > 40) {
        return { success: false, error: `Display name too long (max 40 chars) for role ${update.canonicalRole}` }
      }
    }

    // Execute updates sequentially to ensure consistency
    let updatedCount = 0
    for (const update of updates) {
      const { data, error } = await supabase
        .from("network_role_definitions")
        .update({ display_name: update.displayName.trim() })
        .eq("network_id", networkId)
        .eq("canonical_role", update.canonicalRole)
        .select()

      if (error) {
        console.error(
          `[v0] Error updating display name for ${update.canonicalRole}:`,
          error.message
        )
        return {
          success: false,
          error: `Failed to update ${update.canonicalRole}: ${error.message}`,
        }
      }

      if (data && data.length > 0) {
        updatedCount++
        console.log(
          `[v0] Updated display name for ${update.canonicalRole} to "${update.displayName.trim()}"`
        )
      } else {
        console.warn(
          `[v0] No rows updated for ${update.canonicalRole} in network ${networkId}`
        )
      }
    }

    console.log("[v0] Successfully updated", updatedCount, "role display names")
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Exception updating role display names:", message)
    return { success: false, error: `Exception updating roles: ${message}` }
  }
}

