/**
 * Supabase Persistence Adapter
 * Phase 1: Browser-based draft persistence using Supabase with seeded dev profile fallback
 * 
 * Uses public anon key with row-level security (RLS) policies.
 * Uses seeded dev profile (550e8400-e29b-41d4-a716-446655440000) when no session.
 * Falls back to localStorage if Supabase is unavailable or on error.
 * 
 * Saves to:
 * - guides: Main guide data
 * - guide_steps: Individual guide steps
 * - generation_events: Track AI generation events (optional)
 */

import type { Guide, GuideStep } from "./types"
import { supabase, isSupabaseConfigured, getSupabaseSession } from "./supabase-client"
import { LocalStoragePersistenceAdapter } from "./persistence"

// Phase 1: Seeded dev profile UUID
const DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

// Phase 1: Known seeded IDs from seed data
const SEEDED_IDS = {
  networkId: "questline", // Will be resolved by slug
  hubs: {
    emberfall: "emberfall",
    starfallOutriders: "starfall-outriders",
  },
  collections: {
    characterBuilds: "character-builds",
    bossBattles: "boss-battles",
    quests: "quests",
  },
}

/**
 * Supabase implementation of GuidePersistenceAdapter
 * Includes localStorage fallback and seeded dev profile support for Phase 1
 */
export class SupabasePersistenceAdapter {
  private localStorageAdapter = new LocalStoragePersistenceAdapter()

  /**
   * Get effective author ID for Supabase writes.
   * Uses authenticated user ID if available, else seeded dev profile ID.
   */
  private async getAuthorId(): Promise<string> {
    try {
      const session = await getSupabaseSession()
      if (session?.user?.id) {
        return session.user.id
      }
    } catch (error) {
      console.warn("[v0] Failed to get session, using dev profile", error)
    }
    console.log("[v0] Using seeded dev profile:", DEV_PROFILE_ID)
    return DEV_PROFILE_ID
  }

  /**
   * Save a guide draft to Supabase
   * Inserts/updates guide record and related guide_steps
   * Falls back to localStorage on error
   */
  async saveDraft(guide: Guide): Promise<string> {
    const configured = isSupabaseConfigured()
    console.log("[v0] saveDraft: Supabase configured =", configured, "| guide.id =", guide.id)

    if (!configured || !supabase) {
      console.log("[v0] saveDraft: No Supabase — using localStorage only")
      this.localStorageAdapter.saveDraftSync(guide)
      return guide.id
    }

    try {
      const authorId = await this.getAuthorId()

      // Resolve IDs to seeded values
      const hubId = guide.hubId || "emberfall"
      const collectionId = guide.collectionId || "character-builds"
      const networkId = guide.networkId || "questline"

      const guideData = {
        id: guide.id,
        collection_id: collectionId,
        hub_id: hubId,
        network_id: networkId,
        title: guide.title,
        slug: guide.slug || guide.id,
        summary: guide.summary,
        type: guide.type,
        difficulty: guide.difficulty,
        version: guide.version || null,
        author_id: authorId,
        status: guide.status || "draft",
        verification_status: guide.verification || "unverified",
        created_at: guide.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: guide.publishedAt || null,
      }

      console.log("[v0] saveDraft: Upserting guide to Supabase", {
        id: guideData.id,
        title: guideData.title.substring(0, 50),
        hub_id: guideData.hub_id,
        collection_id: guideData.collection_id,
        network_id: guideData.network_id,
        author_id: guideData.author_id,
      })

      const { data: upsertResult, error: guideError } = await supabase
        .from("guides")
        .upsert(guideData, { onConflict: "id" })

      if (guideError) {
        console.error("[v0] saveDraft: Supabase guides insert FAILED", {
          code: guideError.code,
          message: guideError.message,
          details: guideError.details,
          hint: guideError.hint,
        })
        console.log("[v0] saveDraft: Falling back to localStorage because Supabase insert failed")
        this.localStorageAdapter.saveDraftSync(guide)
        return guide.id
      }

      console.log("[v0] saveDraft: Supabase guides upsert SUCCESS")

      // Save guide steps
      const stepCount = guide.steps?.length ?? 0
      if (stepCount > 0) {
        const stepsData = guide.steps!.map((step, index) => ({
          id: step.id,
          guide_id: guide.id,
          title: step.title,
          body: step.body,
          kind: step.kind,
          order_index: step.order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        console.log("[v0] saveDraft: Deleting old guide_steps for guide", guide.id)
        const { error: deleteError } = await supabase
          .from("guide_steps")
          .delete()
          .eq("guide_id", guide.id)

        if (deleteError) {
          console.warn("[v0] saveDraft: Warning deleting old steps:", deleteError.message)
        }

        console.log("[v0] saveDraft: Inserting", stepCount, "new guide_steps")
        const { error: stepsError } = await supabase
          .from("guide_steps")
          .insert(stepsData)

        if (stepsError) {
          console.error("[v0] saveDraft: Supabase guide_steps insert FAILED", {
            code: stepsError.code,
            message: stepsError.message,
            details: stepsError.details,
            stepCount,
          })
        } else {
          console.log("[v0] saveDraft: Supabase guide_steps insert SUCCESS —", stepCount, "steps")
        }
      }

      // Mirror to localStorage after successful Supabase save
      this.localStorageAdapter.saveDraftSync(guide)
      console.log("[v0] saveDraft: Also mirrored to localStorage")

      return guide.id
    } catch (error) {
      console.error("[v0] saveDraft: Unexpected error", error)
      console.log("[v0] saveDraft: Falling back to localStorage because of exception")
      this.localStorageAdapter.saveDraftSync(guide)
      return guide.id
    }
  }

  /**
   * Load a guide draft from Supabase
   * Reconstructs guide with related steps
   * Falls back to localStorage if not found or error
   */
  async loadDraft(draftId: string): Promise<Guide | null> {
    if (!isSupabaseConfigured() || !supabase) {
      const guide = this.localStorageAdapter.loadDraftSync(draftId)
      if (guide) {
        console.log("[v0] Editor loaded source:localStorage | id:", guide.id, "| title:", guide.title, "| steps:", guide.steps?.length ?? 0)
      }
      return guide
    }

    try {
      console.log("[v0] Loading draft from Supabase:", draftId)
      
      // Fetch guide
      const { data: guideData, error: guideError } = await supabase
        .from("guides")
        .select("*")
        .eq("id", draftId)
        .single()

      if (guideError || !guideData) {
        console.log("[v0] Guide not found in Supabase, trying localStorage:", draftId)
        // Fall back to localStorage
        return this.localStorageAdapter.loadDraftSync(draftId)
      }

      console.log("[v0] Loaded guide from Supabase:", guideData)

      // Fetch steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("guide_steps")
        .select("*")
        .eq("guide_id", draftId)
        .order("order_index", { ascending: true })

      if (stepsError) {
        console.warn("[v0] Failed to load guide steps:", stepsError.message)
      }

      console.log("[v0] Loaded", (stepsData || []).length, "steps from Supabase")
      console.log("[v0] Steps data:", stepsData)

      // Reconstruct guide from Supabase data
      const guide: Guide = {
        id: guideData.id,
        collectionId: guideData.collection_id,
        hubId: guideData.hub_id || "",
        networkId: guideData.network_id || "",
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
        verification: guideData.verification_status,
        requirements: [],
        warnings: [],
        version: guideData.version,
        steps: (stepsData || []).map((step: any) => ({
          id: step.id,
          guideId: step.guide_id,
          order: step.order_index,
          kind: step.kind,
          title: step.title,
          body: step.body,
        })),
        author: {
          id: guideData.author_id || "",
          displayName: "Author",
          handle: "author",
        },
        createdAt: guideData.created_at,
        updatedAt: guideData.updated_at,
        publishedAt: guideData.published_at,
      }

      console.log("[v0] Editor loaded source:supabase | id:", guide.id, "| title:", guide.title, "| steps:", guide.steps.length)

      return guide
    } catch (error) {
      console.error("[v0] Supabase load error:", error)
      const fallback = this.localStorageAdapter.loadDraftSync(draftId)
      if (fallback) {
        console.log("[v0] Editor loaded source:localStorage | id:", fallback.id, "| title:", fallback.title, "| steps:", fallback.steps?.length ?? 0)
      }
      return fallback
    }
  }

  /**
   * Check if draft exists in Supabase or localStorage
   */
  async hasDraft(draftId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.localStorageAdapter.hasDraftSync(draftId)
    }

    try {
      const { data, error } = await supabase
        .from("guides")
        .select("id")
        .eq("id", draftId)
        .single()

      if (error || !data) {
        // Check localStorage
        return this.localStorageAdapter.hasDraftSync(draftId)
      }

      return true
    } catch (error) {
      return this.localStorageAdapter.hasDraftSync(draftId)
    }
  }

  /**
   * Delete a draft from Supabase and localStorage
   */
  async deleteDraft(draftId: string): Promise<void> {
    // Always delete from localStorage
    this.localStorageAdapter.deleteDraftSync(draftId)

    if (!isSupabaseConfigured() || !supabase) {
      return
    }

    try {
      const { error } = await supabase
        .from("guides")
        .delete()
        .eq("id", draftId)

      if (error) {
        console.warn("[v0] Failed to delete from Supabase:", error.message)
      }
    } catch (error) {
      console.warn("[v0] Supabase delete error:", error)
    }
  }

  /**
   * Get all drafts for a network from Supabase
   * Falls back to localStorage if Supabase unavailable
   */
  async getDraftsByNetwork(networkId: string): Promise<Guide[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.localStorageAdapter.getDraftsByNetworkSync(networkId)
    }

    try {
      const { data: guidesData, error } = await supabase
        .from("guides")
        .select("*, guide_steps(*)")
        .eq("network_id", networkId)
        .order("updated_at", { ascending: false })

      if (error) {
        console.warn("[v0] Failed to fetch network drafts from Supabase:", error.message)
        const localDrafts = this.localStorageAdapter.getDraftsByNetworkSync(networkId)
        console.log("[v0] Dashboard loaded draft source:localStorage | count:", localDrafts.length)
        return localDrafts
      }

      if (!guidesData || guidesData.length === 0) {
        console.log("[v0] No drafts found in Supabase for network:", networkId, "— checking localStorage")
        const localDrafts = this.localStorageAdapter.getDraftsByNetworkSync(networkId)
        console.log("[v0] Dashboard loaded draft source:localStorage | count:", localDrafts.length)
        return localDrafts
      }

      console.log("[v0] Dashboard loaded draft source:supabase | count:", guidesData.length)

      // Reconstruct guides
      return guidesData.map((guideData: any) => ({
        id: guideData.id,
        collectionId: guideData.collection_id,
        hubId: guideData.hub_id || "",
        networkId: guideData.network_id || "",
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
        verification: guideData.verification_status,
        requirements: [],
        warnings: [],
        version: guideData.version,
        steps: (guideData.guide_steps || []).map((step: any) => ({
          id: step.id,
          guideId: step.guide_id,
          order: step.order_index,
          kind: step.kind,
          title: step.title,
          body: step.body,
        })),
        author: {
          id: guideData.author_id || "",
          displayName: "Author",
          handle: "author",
        },
        createdAt: guideData.created_at,
        updatedAt: guideData.updated_at,
        publishedAt: guideData.published_at,
      }))
    } catch (error) {
      console.error("[v0] Supabase getDraftsByNetwork error:", error)
      return this.localStorageAdapter.getDraftsByNetworkSync(networkId)
    }
  }

  /**
   * Get all drafts from Supabase or localStorage
   */
  async getAllDrafts(): Promise<Guide[]> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.localStorageAdapter.getAllDraftsSync()
    }

    try {
      const { data: guidesData, error } = await supabase
        .from("guides")
        .select("*, guide_steps(*)")
        .order("updated_at", { ascending: false })

      if (error || !guidesData) {
        return this.localStorageAdapter.getAllDraftsSync()
      }

      return guidesData.map((guideData: any) => ({
        id: guideData.id,
        collectionId: guideData.collection_id,
        hubId: guideData.hub_id || "",
        networkId: guideData.network_id || "",
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
        verification: guideData.verification_status,
        requirements: [],
        warnings: [],
        version: guideData.version,
        steps: (guideData.guide_steps || []).map((step: any) => ({
          id: step.id,
          guideId: step.guide_id,
          order: step.order_index,
          kind: step.kind,
          title: step.title,
          body: step.body,
        })),
        author: {
          id: guideData.author_id || "",
          displayName: "Author",
          handle: "author",
        },
        createdAt: guideData.created_at,
        updatedAt: guideData.updated_at,
        publishedAt: guideData.published_at,
      }))
    } catch (error) {
      console.error("[v0] Supabase getAllDrafts error:", error)
      return this.localStorageAdapter.getAllDraftsSync()
    }
  }

  /**
   * Get recent drafts from Supabase or localStorage
   */
  async getRecentDrafts(limit = 10): Promise<Guide[]> {
    const all = await this.getAllDrafts()
    return all.slice(0, limit)
  }

  /**
   * Clear all drafts from localStorage and Supabase (destructive)
   */
  async clearAllDrafts(): Promise<void> {
    this.localStorageAdapter.clearAllDraftsSync()

    if (!isSupabaseConfigured() || !supabase) {
      return
    }

    try {
      const { error } = await supabase
        .from("guides")
        .delete()
        .neq("id", "") // Delete all

      if (error) {
        console.warn("[v0] Failed to clear Supabase drafts:", error.message)
      }
    } catch (error) {
      console.warn("[v0] Supabase clearAllDrafts error:", error)
    }
  }

  /**
   * Update draft status in Supabase and localStorage
   */
  async updateDraftStatus(draftId: string, status: string): Promise<void> {
    this.localStorageAdapter.updateDraftStatusSync(draftId, status)

    if (!isSupabaseConfigured() || !supabase) {
      return
    }

    try {
      console.log("[v0] Updating draft status to", status, ":", draftId)
      
      const { error } = await supabase
        .from("guides")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", draftId)

      if (error) {
        console.warn("[v0] Failed to update status in Supabase:", error.message)
      } else {
        console.log("[v0] Updated draft status in Supabase:", draftId)
      }
    } catch (error) {
      console.warn("[v0] Supabase updateDraftStatus error:", error)
    }
  }
}
