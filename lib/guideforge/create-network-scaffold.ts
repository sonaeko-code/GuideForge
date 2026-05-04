/**
 * Create Network Scaffold
 * 
 * Orchestrates batch creation of network, hubs, and collections from a scaffold template.
 * Uses proven Supabase save paths - no mock data, no localStorage success.
 * Returns real errors if any insert fails.
 * 
 * Writes to Supabase tables:
 * - networks (1 row)
 * - hubs (multiple rows, one per hub in template)
 * - collections (multiple rows, one per collection in template)
 */

import {
  createNetwork,
  createHub,
  createCollection,
} from "./supabase-networks"
import { ScaffoldTemplate, validateScaffoldTemplate } from "./starter-scaffolds"
import type { Network, Hub, Collection } from "./types"

export interface CreateScaffoldResult {
  success: boolean
  network?: Network
  hubs?: Hub[]
  collections?: Collection[]
  error?: string
  failedAt?: "network" | "hub" | "collection"
}

/**
 * Create a complete network scaffold from a template
 * 
 * Flow:
 * 1. Validate template structure
 * 2. Create network (stop if fails)
 * 3. Create all hubs (stop if any fails)
 * 4. Create all collections (stop if any fails)
 * 5. Return all created resources
 * 
 * On any failure, returns error with failedAt indicator.
 * No cleanup of partial scaffolds - user sees what was created.
 */
export async function createNetworkScaffold(
  template: ScaffoldTemplate,
  overrides?: {
    networkName?: string
    networkSlug?: string
    networkDescription?: string
  }
): Promise<CreateScaffoldResult> {
  console.log("[v0] createNetworkScaffold: Starting scaffold creation for template:", template.id)

  // Validate template structure
  const validation = validateScaffoldTemplate(template)
  if (!validation.valid) {
    console.error("[v0] createNetworkScaffold: Template validation failed:", validation.errors)
    return {
      success: false,
      error: `Invalid template: ${validation.errors.join(", ")}`,
    }
  }

  try {
    // Prepare network data with overrides
    const networkDraft = {
      name: overrides?.networkName || template.networkTemplate.name,
      slug: overrides?.networkSlug || template.networkTemplate.slug,
      description: overrides?.networkDescription || template.networkTemplate.description,
      primaryColor: "#000000", // Placeholder - UI-only field
    }

    console.log("[v0] createNetworkScaffold: Creating network:", networkDraft)

    // Step 1: Create network
    const networkResult = await createNetwork(networkDraft)
    if (networkResult.source !== "supabase" || !networkResult.network.id) {
      console.error("[v0] createNetworkScaffold: Network creation failed:", networkResult.error)
      return {
        success: false,
        error: networkResult.error || "Failed to create network",
        failedAt: "network",
      }
    }

    const networkId = networkResult.network.id
    console.log("[v0] createNetworkScaffold: Network created successfully:", networkId)

    // Step 2: Create all hubs
    const createdHubs: Hub[] = []
    for (const hubGroup of template.hubs) {
      const hubResult = await createHub(networkId, {
        name: hubGroup.hub.name,
        slug: hubGroup.hub.slug,
        description: hubGroup.hub.description,
        hubKind: "category", // Default hub kind
        collectionIds: [],
      })

      if (hubResult.source !== "supabase" || !hubResult.hub.id) {
        console.error("[v0] createNetworkScaffold: Hub creation failed:", hubResult.error)
        return {
          success: false,
          error: hubResult.error || `Failed to create hub: ${hubGroup.hub.name}`,
          network: networkResult.network,
          hubs: createdHubs,
          failedAt: "hub",
        }
      }

      createdHubs.push(hubResult.hub)
      console.log("[v0] createNetworkScaffold: Hub created:", hubResult.hub.id)
    }

    console.log("[v0] createNetworkScaffold: All hubs created successfully:", createdHubs.length)

    // Step 3: Create all collections
    const createdCollections: Collection[] = []
    for (let hubIndex = 0; hubIndex < template.hubs.length; hubIndex++) {
      const hubGroup = template.hubs[hubIndex]
      const hub = createdHubs[hubIndex]

      for (const collectionTemplate of hubGroup.collections) {
        const collectionResult = await createCollection(networkId, hub.id, {
          name: collectionTemplate.name,
          slug: collectionTemplate.slug,
          description: collectionTemplate.description,
          guideIds: [],
        })

        if (collectionResult.source !== "supabase" || !collectionResult.collection.id) {
          console.error("[v0] createNetworkScaffold: Collection creation failed:", collectionResult.error)
          return {
            success: false,
            error: collectionResult.error || `Failed to create collection: ${collectionTemplate.name}`,
            network: networkResult.network,
            hubs: createdHubs,
            collections: createdCollections,
            failedAt: "collection",
          }
        }

        createdCollections.push(collectionResult.collection)
        console.log("[v0] createNetworkScaffold: Collection created:", collectionResult.collection.id)
      }
    }

    console.log("[v0] createNetworkScaffold: All collections created successfully:", createdCollections.length)
    console.log("[v0] createNetworkScaffold: Scaffold creation complete")

    return {
      success: true,
      network: networkResult.network,
      hubs: createdHubs,
      collections: createdCollections,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] createNetworkScaffold: Exception:", message)
    return {
      success: false,
      error: message,
    }
  }
}
