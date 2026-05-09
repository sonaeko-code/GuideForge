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
import type { NetworkDraft } from "./types"

export interface SaveNetworkSkeletonResult {
  success: boolean
  networkId?: string
  hubsCreated?: number
  collectionsCreated?: number
  guidePlaceholdersCreated?: number
  error?: string
  failedAt?: "network" | "hub" | "collection" | "guide"
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
 * If any step fails, returns error with failedAt indicator.
 */
export async function saveNetworkSkeleton(
  proposal: NetworkSkeletonGenerationResponse
): Promise<SaveNetworkSkeletonResult> {
  console.log("[v0] saveNetworkSkeleton: Starting save for network:", proposal.network.name)

  try {
    // Step 1: Create network
    console.log("[v0] saveNetworkSkeleton: Creating network...")
    const networkDraft: NetworkDraft = {
      name: proposal.network.name,
      slug: proposal.network.slug,
      description: proposal.network.description,
      primaryColor: "#000000", // Placeholder
    }

    const networkResult = await createNetwork(networkDraft)
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

      const hubResult = await createHub(networkId, {
        name: hub.name,
        slug: hub.slug,
        description: hub.description,
        tagline: hub.tagline,
        hubKind: "topic",
        collectionIds: [],
      } as any)

      if (hubResult.source !== "supabase" || !hubResult.hub.id) {
        console.error("[v0] saveNetworkSkeleton: Hub creation failed:", hubResult.error)
        return {
          success: false,
          networkId,
          hubsCreated,
          error: hubResult.error || "Hub creation failed",
          failedAt: "hub",
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
          defaultGuideType: "guide",
        })

        if (collectionResult.source !== "supabase" || !collectionResult.collection.id) {
          console.error("[v0] saveNetworkSkeleton: Collection creation failed:", collectionResult.error)
          return {
            success: false,
            networkId,
            hubsCreated,
            collectionsCreated,
            error: collectionResult.error || "Collection creation failed",
            failedAt: "collection",
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
              tags: guideIdea.tags,
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
