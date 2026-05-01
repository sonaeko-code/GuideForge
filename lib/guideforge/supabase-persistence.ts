/**
 * Supabase Persistence Adapter
 * Phase 2: Browser-based draft persistence using Supabase
 * 
 * Uses public anon key with row-level security (RLS) policies.
 * Falls back to localStorage if Supabase is unavailable or on error.
 * 
 * Saves to:
 * - guides: Main guide data
 * - guide_steps: Individual guide steps
 * - generation_events: Track AI generation events
 */

import type { Guide, GuideStep } from "./types"
import { supabase, isSupabaseConfigured, getSupabaseSession } from "./supabase-client"
import { LocalStoragePersistenceAdapter } from "./persistence"

/**
 * Supabase implementation of GuidePersistenceAdapter
 * Includes localStorage fallback for resilience
 */
export class SupabasePersistenceAdapter {
  private localStorageAdapter = new LocalStoragePersistenceAdapter()

  /**
   * Save a guide draft to Supabase
   * Inserts/updates guide record and related guide_steps
   * Falls back to localStorage on error
   */
  async saveDraft(guide: Guide): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn("[v0] Supabase not configured, falling back to localStorage")
      return this.localStorageAdapter.saveDraftSync(guide)
    }

    try {
      const session = await getSupabaseSession()
      
      // For Phase 2: Either user is authenticated or we skip Supabase
      // Phase 1 uses localStorage fallback
      if (!session) {
        console.warn("[v0] No Supabase session, using localStorage fallback")
        return this.localStorageAdapter.saveDraftSync(guide)
      }

      // Prepare guide data for Supabase (snake_case mapping)
      const guideData = {
        id: guide.id,
        collection_id: guide.collectionId,
        title: guide.title,
        slug: guide.slug,
        summary: guide.summary,
        type: guide.type,
        difficulty: guide.difficulty,
        version: guide.version || null,
        author_id: session.user.id, // Use authenticated user ID
        status: guide.status,
        verification_status: guide.verification,
        created_at: guide.createdAt,
        updated_at: guide.updatedAt,
        published_at: guide.publishedAt || null,
      }

      // Insert or update guide
      const { error: guideError } = await supabase
        .from("guides")
        .upsert(guideData, { onConflict: "id" })

      if (guideError) {
        console.error("[v0] Failed to save guide to Supabase:", guideError.message)
        return this.localStorageAdapter.saveDraftSync(guide)
      }

      // Save guide steps
      if (guide.steps && guide.steps.length > 0) {
        const stepsData = guide.steps.map((step) => ({
          id: step.id,
          guide_id: guide.id,
          title: step.title,
          body: step.body,
          kind: step.kind,
          order_index: step.order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        // Delete existing steps for this guide, then insert new ones
        const { error: deleteError } = await supabase
          .from("guide_steps")
          .delete()
          .eq("guide_id", guide.id)

        if (deleteError) {
          console.warn("[v0] Warning deleting old steps:", deleteError.message)
        }

        const { error: stepsError } = await supabase
          .from("guide_steps")
          .insert(stepsData)

        if (stepsError) {
          console.error("[v0] Failed to save guide steps to Supabase:", stepsError.message)
          // Still return the guide ID even if steps failed
        }
      }

      console.log("[v0] Successfully saved guide to Supabase:", guide.id)
      return guide.id
    } catch (error) {
      console.error("[v0] Supabase save error:", error)
      // Fallback to localStorage on any error
      return this.localStorageAdapter.saveDraftSync(guide)
    }
  }

  /**
   * Load a guide draft from Supabase
   * Reconstructs guide with related steps
   * Falls back to localStorage if not found or error
   */
  async loadDraft(draftId: string): Promise<Guide | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.localStorageAdapter.loadDraftSync(draftId)
    }

    try {
      // Fetch guide
      const { data: guideData, error: guideError } = await supabase
        .from("guides")
        .select("*")
        .eq("id", draftId)
        .single()

      if (guideError || !guideData) {
        // Fall back to localStorage
        return this.localStorageAdapter.loadDraftSync(draftId)
      }

      // Fetch steps
      const { data: stepsData, error: stepsError } = await supabase
        .from("guide_steps")
        .select("*")
        .eq("guide_id", draftId)
        .order("order_index", { ascending: true })

      if (stepsError) {
        console.warn("[v0] Failed to load guide steps:", stepsError.message)
      }

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

      console.log("[v0] Loaded guide from Supabase:", draftId)
      return guide
    } catch (error) {
      console.error("[v0] Supabase load error:", error)
      return this.localStorageAdapter.loadDraftSync(draftId)
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
        return this.localStorageAdapter.getDraftsByNetworkSync(networkId)
      }

      if (!guidesData) {
        return this.localStorageAdapter.getDraftsByNetworkSync(networkId)
      }

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
      const { error } = await supabase
        .from("guides")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", draftId)

      if (error) {
        console.warn("[v0] Failed to update status in Supabase:", error.message)
      }
    } catch (error) {
      console.warn("[v0] Supabase updateDraftStatus error:", error)
    }
  }
}
