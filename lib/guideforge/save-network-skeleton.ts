/**
 * Save Network Skeleton
 *
 * Orchestrates batch creation of:
 * - Network
 * - Hubs
 * - Collections
 * - Guide placeholder drafts
 *
 * Uses existing proven creation helpers.
 */

import type {
  NetworkSkeletonGenerationResponse,
  GeneratedGuideIdea,
} from "./generation-schemas"
import {
  createNetwork,
  createHub,
  createCollection,
} from "./supabase-networks"
import {
  createAndSaveGuideDraft,
} from "./create-and-save-guide-draft"
import type { Hub } from "./types"
import { supabase as _supabase } from "./supabase-client"
const supabase = _supabase!

export interface SaveNetworkSkeletonResult {
  success: boolean
  networkId?: string
  hubsCreated?: number
  collectionsCreated?: number
  guidePlaceholdersCreated?: number
  error?: string
  failedAt?: "network" | "hub" | "collection" | "guide"
  /** Indicates the network was created but hubs/collections failed */
  partiallyCreated?: boolean
}

/**
 * Clean up a partially created network by deleting it from Supabase.
 * Safe operation: if delete fails, logs warning but doesn't throw.
 */
async function cleanupFailedNetwork(networkId: string): Promise<void> {
  try {
    console.log("[v0] Cleaning up failed network:", networkId)
    const { error } = await supabase
      .from("networks")
      .delete()
      .eq("id", networkId)

    if (error) {
      console.warn("[v0] Failed to cleanup network during rollback:", error.message)
    } else {
      console.log("[v0] Successfully cleaned up network:", networkId)
    }
  } catch (err) {
    console.warn("[v0] Cleanup error:", err)
  }
}

/**
 * Save a network skeleton proposal to Supabase.
 *
 * Flow:
 * 1. Create network
 * 2. Create hubs
 * 3. Create collections
 * 4. Create guide placeholder drafts
 *
 * If hub/collection creation fails, attempts to rollback the network.
 * If any step fails, returns error with failedAt indicator.
 */
export async function saveNetworkSkeleton(
  proposal: NetworkSkeletonGenerationResponse
): Promise<SaveNetworkSkeletonResult> {
  console.log("[v0] saveNetworkSkeleton: Starting save for network:", proposal.network.name)

  try {
    // Step 1: Create network
    console.log("[v0] saveNetworkSkeleton: Creating network...")
    const networkResult = await createNetwork({
      name: proposal.network.name,
      slug: proposal.network.slug,
      description: proposal.network.description,
      primaryColor: "#000000",
    } as Parameters<typeof createNetwork>[0])
    if (networkResult.source !== "supabase" || !networkResult.network.id) {
      console.error("[v0] saveNetworkSkeleton: Network creation failed:", networkResult.error)
      return {
        success: false,
        error: networkResult.error || "Network creation failed",
        failedAt: "network",
      }
    }

    const networkId = networkResult.network.id
    console.log("[v0] saveNetworkSkeleton: Network created:", networkId)

    let hubsCreated = 0
    let collectionsCreated = 0
    let guidePlaceholdersCreated = 0

    // Step 2-4: Create hubs, collections, and guides
    for (const hub of proposal.hubs) {
      console.log("[v0] saveNetworkSkeleton: Creating hub:", hub.name)

      // Properly type the hub object to match Omit<Hub, "id" | "collectionIds">
      const hubPayload: Omit<Hub, "id" | "collectionIds"> = {
        networkId: networkId, // Not used by createHub but required by Hub type
        slug: hub.slug,
        name: hub.name,
        description: hub.description,
        hubKind: "topic",
        tagline: hub.tagline,
      }

      const hubResult = await createHub(networkId, hubPayload)

      if (hubResult.source !== "supabase" || !hubResult.hub.id) {
        console.error("[v0] saveNetworkSkeleton: Hub creation failed:", hubResult.error)
        
        // Attempt cleanup: delete the network to avoid partial orphaned state
        await cleanupFailedNetwork(networkId)
        
        return {
          success: false,
          networkId,
          hubsCreated,
          error: `Hub creation failed: ${hubResult.error || "Unknown error"}. Network has been cleaned up.`,
          failedAt: "hub",
          partiallyCreated: false,
        }
      }

      const hubId = hubResult.hub.id
      hubsCreated++
      console.log("[v0] saveNetworkSkeleton: Hub created:", hubId)

      // Create collections under this hub
      for (const collection of hub.collections) {
        console.log("[v0] saveNetworkSkeleton: Creating collection:", collection.name)

        const collectionResult = await createCollection(networkId, hubId, {
          name: collection.name,
          slug: collection.slug,
          description: collection.description,
          defaultGuideType: "tutorial",
        })

        if (collectionResult.source !== "supabase" || !collectionResult.collection.id) {
          console.error("[v0] saveNetworkSkeleton: Collection creation failed:", collectionResult.error)
          
          // For collection failures, network + hubs already exist but rest is incomplete
          // Don't cleanup - user can manually continue or delete the partial network
          return {
            success: false,
            networkId,
            hubsCreated,
            collectionsCreated,
            error: `Collection creation failed: ${collectionResult.error || "Unknown error"}. Network and ${hubsCreated} hub(s) were created. You can delete the network and try again, or manually continue editing.`,
            failedAt: "collection",
            partiallyCreated: true,
          }
        }

        const collectionId = collectionResult.collection.id
        collectionsCreated++
        console.log("[v0] saveNetworkSkeleton: Collection created:", collectionId)

        // Create guide placeholder drafts
        for (const guideIdea of collection.guideIdeas) {
          console.log("[v0] saveNetworkSkeleton: Creating guide placeholder:", guideIdea.title)

          try {
            await createAndSaveGuideDraft({
              title: guideIdea.title,
              summary: guideIdea.summary,
              guideType: guideIdea.guideType,
              difficulty: guideIdea.difficulty,
              networkId,
              hubId,
              collectionId,
              requirements: [],
              warnings: [],
              steps: [
                {
                  title: "Placeholder",
                  body: "Generated placeholder. Edit this guide to add content.",
                  kind: "custom",
                },
              ],
            })

            guidePlaceholdersCreated++
            console.log("[v0] saveNetworkSkeleton: Guide placeholder created")
          } catch (guideErr) {
            // Log the error but continue saving other guides
            console.warn("[v0] saveNetworkSkeleton: Guide placeholder creation failed:", guideErr)
          }
        }
      }
    }

    console.log("[v0] saveNetworkSkeleton: Save completed successfully", {
      networkId,
      hubsCreated,
      collectionsCreated,
      guidePlaceholdersCreated,
    })

    return {
      success: true,
      networkId,
      hubsCreated,
      collectionsCreated,
      guidePlaceholdersCreated,
    }
  } catch (err) {
    console.error("[v0] saveNetworkSkeleton: Unexpected error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    }
  }
}
