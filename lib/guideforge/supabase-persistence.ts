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
import type { GuidePersistenceAdapter } from "./persistence"
import { supabase, isSupabaseConfigured, getSupabaseSession } from "./supabase-client"
import { LocalStoragePersistenceAdapter } from "./persistence"

// Phase 1: Seeded dev profile UUID
const DEV_PROFILE_ID = "550e8400-e29b-41d4-a716-446655440000"

/**
 * Normalize requirements for Supabase storage.
 * Converts string array or multiline string to trimmed string array, removing empty lines.
 */
function normalizeRequirementsForSupabase(requirements?: string | string[] | null): string[] {
  if (!requirements) {
    return []
  }

  let items: string[] = []

  if (typeof requirements === "string") {
    // Split by newlines, trim, and filter
    items = requirements
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
  } else if (Array.isArray(requirements)) {
    // Already an array, just trim each item and filter
    items = requirements
      .map(item => (typeof item === "string" ? item.trim() : String(item)))
      .filter(item => item.length > 0)
  }

  console.log("[v0] Saving requirements:", items)
  return items
}

/**
 * Normalize frontend guide type to Supabase-allowed values.
 * Frontend uses descriptive names like "character-build", "boss-guide", etc.
 * Supabase only allows: 'guide', 'build', 'strategy', 'quest', 'walkthrough', 'repair', 'sop', 'custom'
 */
function normalizeGuideTypeForSupabase(type?: string): string {
  if (!type) {
    console.log("[v0] Original guide type: (empty/null)")
    console.log("[v0] Supabase guide type: guide")
    return "guide"
  }

  console.log("[v0] Original guide type:", type)

  let normalized: string
  const lowerType = type.toLowerCase()

  // Map frontend types to Supabase allowed values
  if (lowerType.includes("build") || lowerType === "character-build") {
    normalized = "build"
  } else if (lowerType.includes("boss") || lowerType === "strategy") {
    normalized = "strategy"
  } else if (lowerType.includes("quest") || lowerType === "quest") {
    normalized = "quest"
  } else if (lowerType === "walkthrough") {
    normalized = "walkthrough"
  } else if (lowerType.includes("repair") || lowerType === "repair-procedure") {
    normalized = "repair"
  } else if (lowerType === "sop") {
    normalized = "sop"
  } else if (lowerType.includes("beginner") || lowerType.includes("tutorial")) {
    normalized = "guide"
  } else if (lowerType.includes("reference") || lowerType.includes("guide")) {
    normalized = "guide"
  } else {
    normalized = "custom"
  }

  console.log("[v0] Supabase guide type:", normalized)
  return normalized
}

/**
 * Normalize frontend guide status to Supabase-allowed values.
 * Frontend uses: 'draft', 'in-review', 'ready', 'published', 'needs-update', 'deprecated', 'archived'
 * Supabase only allows: 'draft', 'ready', 'published', 'archived'
 */
function normalizeGuideStatusForSupabase(status?: string): string {
  if (!status) {
    console.log("[v0] Original guide status: (empty/null)")
    console.log("[v0] Supabase guide status: draft")
    return "draft"
  }

  console.log("[v0] Original guide status:", status)

  let normalized: string
  const lowerStatus = status.toLowerCase()

  // Map frontend statuses to Supabase allowed values
  if (lowerStatus === "draft") {
    normalized = "draft"
  } else if (lowerStatus === "in-review" || lowerStatus === "ready" || lowerStatus === "needs-update") {
    normalized = "ready"
  } else if (lowerStatus === "published") {
    normalized = "published"
  } else if (lowerStatus === "archived" || lowerStatus === "deprecated") {
    normalized = "archived"
  } else {
    normalized = "draft"
  }

  console.log("[v0] Supabase guide status:", normalized)
  return normalized
}

/**
 * Normalize frontend difficulty to Supabase-allowed values.
 * Frontend uses: 'beginner', 'intermediate', 'advanced', 'expert'
 * Supabase allows: 'beginner', 'intermediate', 'advanced', 'expert' (same!)
 */
function normalizeGuideDifficultyForSupabase(difficulty?: string): string | null {
  if (!difficulty) {
    console.log("[v0] Original guide difficulty: (empty/null)")
    console.log("[v0] Supabase guide difficulty: null")
    return null
  }

  console.log("[v0] Original guide difficulty:", difficulty)

  const lowerDifficulty = difficulty.toLowerCase()
  const allowed = ["beginner", "intermediate", "advanced", "expert"]

  if (allowed.includes(lowerDifficulty)) {
    console.log("[v0] Supabase guide difficulty:", lowerDifficulty)
    return lowerDifficulty
  }

  console.warn(`[v0] Unknown difficulty: ${difficulty}, using null`)
  console.log("[v0] Supabase guide difficulty: null")
  return null
}

/**
 * Generate a unique slug by appending a number suffix if the slug already exists in collection.
 * Queries Supabase to check for existing slugs and auto-increments: slug, slug-2, slug-3, etc.
 */
async function generateUniqueSlugForCollection(
  baseSlug: string,
  collectionId: string | null
): Promise<string> {
  if (!supabase || !collectionId) {
    return baseSlug
  }

  try {
    // Check if this exact slug already exists in the collection
    const { data: existing } = await supabase
      .from("guides")
      .select("id")
      .eq("slug", baseSlug)
      .eq("collection_id", collectionId)
      .limit(1)

    if (!existing || existing.length === 0) {
      return baseSlug
    }

    // Slug exists, find the next available number
    console.log("[v0] Duplicate slug detected:", baseSlug)
    let counter = 2
    let uniqueSlug = `${baseSlug}-${counter}`

    while (true) {
      const { data: checkExisting } = await supabase
        .from("guides")
        .select("id")
        .eq("slug", uniqueSlug)
        .eq("collection_id", collectionId)
        .limit(1)

      if (!checkExisting || checkExisting.length === 0) {
        console.log("[v0] Retrying with slug:", uniqueSlug)
        return uniqueSlug
      }

      counter++
      uniqueSlug = `${baseSlug}-${counter}`

      // Safety limit
      if (counter > 100) {
        console.warn("[v0] Too many slug duplicates, using timestamp suffix")
        return `${baseSlug}-${Date.now()}`
      }
    }
  } catch (error) {
    console.error("[v0] Error checking slug uniqueness:", error)
    return baseSlug
  }
}

/**
 * Map frontend collection identifiers to Supabase collection UUIDs.
 * The frontend uses slug-like identifiers (e.g., "collection_character_builds"),
 * but Supabase stores real UUIDs. This function looks up the real UUID.
 * 
 * During Phase 1, we query the database to find UUIDs by slug.
 * Unknown slugs return null (which allows null collection_id in guides).
 */
async function normalizeCollectionIdForSupabase(
  collectionId: string | null | undefined
): Promise<string | null> {
  if (!collectionId) {
    console.log("[v0] Original collectionId: (empty/null)")
    console.log("[v0] Supabase collection_id: null")
    return null
  }

  console.log("[v0] Original collectionId:", collectionId)

  // If it's already a UUID format (has dashes), assume it's real
  if (collectionId.includes("-") && collectionId.length === 36) {
    console.log("[v0] Supabase collection_id:", collectionId, "(already UUID)")
    return collectionId
  }

  // For slug-like identifiers, try to look up the UUID
  if (supabase) {
    try {
      // Map known frontend collection slugs to Supabase slugs
      // Frontend uses "collection_character_builds", Supabase stores "character-builds"
      let supabaseSlug = collectionId

      if (collectionId === "collection_character_builds") {
        supabaseSlug = "character-builds"
      } else if (collectionId === "character-builds") {
        supabaseSlug = "character-builds"
      } else if (collectionId === "collection_boss_strategies" || collectionId === "boss-strategies") {
        supabaseSlug = "boss-strategies"
      }

      console.log("[v0] Looking up collection UUID for slug:", supabaseSlug)

      const { data, error } = await supabase
        .from("collections")
        .select("id")
        .eq("slug", supabaseSlug)
        .single()

      if (error) {
        console.warn("[v0] Collection lookup failed for slug", supabaseSlug, ":", error.message)
        console.log("[v0] Supabase collection_id: null (lookup failed)")
        return null
      }

      if (data?.id) {
        console.log("[v0] Supabase collection_id:", data.id)
        return data.id
      }
    } catch (error) {
      console.error("[v0] Error looking up collection UUID:", error)
    }
  }

  console.warn(`[v0] Unknown collection identifier: ${collectionId}, using null`)
  console.log("[v0] Supabase collection_id: null (unknown identifier)")
  return null
}

/**
 * Supabase implementation of GuidePersistenceAdapter
 * Includes localStorage fallback and seeded dev profile support for Phase 1
 */
export class SupabasePersistenceAdapter implements GuidePersistenceAdapter {
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
   * Save a guide draft to Supabase and return source.
   * Returns { id, source: "supabase" } if save succeeds.
   * Returns { id, source: "localStorage", error } if save fails or Supabase unavailable.
   */
  async saveDraft(guide: Guide): Promise<{ id: string; source: "supabase" | "localStorage"; error?: string }> {
    const configured = isSupabaseConfigured()

    if (!configured || !supabase) {
      const reason = !supabase 
        ? "Supabase client not initialized" 
        : "Supabase env vars missing or invalid"
      console.log("[v0] saveDraft:", reason, "— using localStorage")
      this.localStorageAdapter.saveDraftSync(guide)
      return { id: guide.id, source: "localStorage", error: reason }
    }

    try {
      const authorId = await this.getAuthorId()

      // Normalize collection_id: convert frontend slug to real Supabase UUID
      const normalizedCollectionId = await normalizeCollectionIdForSupabase(guide.collectionId)

      // HARD-STOP: refuse to write to Supabase without a collection_id.
      // Guides are required to belong to a collection. If the caller did not
      // resolve one, do not silently insert null — return an explicit error
      // so the UI can show "Cannot save guide because no collection is selected."
      if (!normalizedCollectionId) {
        const reason =
          "Cannot save guide because no collection is selected (collection_id is missing)."
        console.error("[v0] Guide save fallback reason:", reason)
        // Mirror to localStorage so the user does not lose their edits, but
        // surface the error so the UI does not present this as a Supabase save.
        this.localStorageAdapter.saveDraftSync(guide)
        return { id: guide.id, source: "localStorage", error: reason }
      }

      // Normalize type, status, and difficulty to Supabase-allowed values
      const normalizedType = normalizeGuideTypeForSupabase(guide.type)
      const normalizedStatus = normalizeGuideStatusForSupabase(guide.status)
      const normalizedDifficulty = normalizeGuideDifficultyForSupabase(guide.difficulty)

      // Determine save mode: update existing by id, or insert new
      // For new guides, ensure slug is unique within the collection
      let finalSlug = guide.slug || guide.id
      const isExistingGuide = guide.id && guide.id.length > 0 && guide.id !== "new"
      const saveMode = isExistingGuide ? "update" : "insert"

      if (saveMode === "insert") {
        // For new guides, generate unique slug if needed
        finalSlug = await generateUniqueSlugForCollection(finalSlug, normalizedCollectionId)
      }

      console.log("[v0] Guide save mode:", saveMode)
      console.log("[v0] Existing guide id:", isExistingGuide ? guide.id : "new guide")
      console.log("[v0] Guide collection_id:", normalizedCollectionId)
      console.log("[v0] Original slug:", guide.slug || guide.id)
      console.log("[v0] Final slug:", finalSlug)

      console.log("[v0] saveDraft: Guide object before save:", {
        id: guide.id,
        title: guide.title,
        collectionId: normalizedCollectionId,
        type: normalizedType,
        status: normalizedStatus,
        difficulty: normalizedDifficulty,
        authorId,
        stepsCount: guide.steps?.length ?? 0,
      })

      // Normalize requirements to Supabase format
      const normalizedRequirements = normalizeRequirementsForSupabase(guide.requirements)

      // Only include columns that exist in the guides table schema:
      // id, collection_id, title, slug, summary, type, difficulty, version,
      // author_id, reviewer_id, status, verification_status, latest_check_run_id,
      // published_at, created_at, updated_at, requirements
      const guideData = {
        id: guide.id,
        collection_id: normalizedCollectionId,
        title: guide.title,
        slug: finalSlug,
        summary: guide.summary,
        type: normalizedType,
        difficulty: normalizedDifficulty,
        version: guide.version || null,
        author_id: authorId,
        status: normalizedStatus,
        verification_status: guide.verification || "unverified",
        created_at: guide.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: guide.publishedAt || null,
        requirements: normalizedRequirements,
      }

      console.log("[v0] Supabase guide upsert payload:", JSON.stringify({
        id: guideData.id,
        title: guideData.title.substring(0, 50),
        collection_id: guideData.collection_id,
        author_id: guideData.author_id,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
      }, null, 2))

      const { error: guideError } = await supabase
        .from("guides")
        .upsert(guideData, { onConflict: "id" })

      // Handle duplicate slug error for inserts
      if (guideError && guideError.code === "23505" && saveMode === "insert") {
        console.warn("[v0] Duplicate slug handled:", guideError.message)
        // Generate another unique slug and retry once
        finalSlug = await generateUniqueSlugForCollection(`${finalSlug}-2`, normalizedCollectionId)
        guideData.slug = finalSlug
        console.log("[v0] Retrying with new slug:", finalSlug)
        
        const { error: retryError } = await supabase
          .from("guides")
          .upsert(guideData, { onConflict: "id" })
        
        if (retryError) {
          console.error("[v0] Supabase guide save FAILED after retry:", retryError)
          this.localStorageAdapter.saveDraftSync(guide)
          return { id: guide.id, source: "localStorage", error: retryError.message }
        }
      } else if (guideError) {
        const errorMsg = `${guideError.code}: ${guideError.message}${guideError.hint ? ` (${guideError.hint})` : ""}`
        console.error("[v0] Supabase guide save FAILED:", errorMsg)
        console.error("[v0] Full error:", JSON.stringify(guideError, null, 2))
        this.localStorageAdapter.saveDraftSync(guide)
        return { id: guide.id, source: "localStorage", error: errorMsg }
      }

      console.log("[v0] Guide save result: success")

      // Save guide steps
      const stepCount = guide.steps?.length ?? 0
      console.log("[v0] Guide steps before Supabase save:", guide.steps)
      console.log("[v0] Step count:", stepCount)
      
      if (stepCount > 0) {
        const stepsData = guide.steps!.map((step, idx) => {
          // Normalize step.kind to Supabase-allowed values
          // Frontend uses: overview, strengths, weaknesses, gear, skill-priority, rotation, leveling, mistakes, patch-notes, final-tips, requirements, warning, custom
          // Supabase allows: intro, section, step, tip, warning, summary, example, conclusion
          let normalizedKind: string = "section"
          const stepKind = (step.kind || "custom").toLowerCase()
          
          if (stepKind === "overview" || stepKind === "intro") {
            normalizedKind = "intro"
          } else if (stepKind === "warning") {
            normalizedKind = "warning"
          } else if (stepKind === "tip" || stepKind === "final-tips") {
            normalizedKind = "tip"
          } else if (stepKind === "summary" || stepKind === "conclusion") {
            normalizedKind = "summary"
          } else if (stepKind === "example") {
            normalizedKind = "example"
          } else {
            // Default all other frontend kinds to "section"
            normalizedKind = "section"
          }

          const stepData = {
            id: step.id,
            guide_id: guide.id,
            title: step.title,
            body: step.body,
            kind: normalizedKind,
            order_index: step.order,
            is_spoiler: step.isSpoiler || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          
          if (idx === 0) {
            console.log("[v0] First step payload:", JSON.stringify(stepData, null, 2))
          }
          
          return stepData
        })

        console.log("[v0] guide_steps delete starting for guide", guide.id)
        const { error: deleteError } = await supabase.from("guide_steps").delete().eq("guide_id", guide.id)
        if (deleteError) {
          console.log("[v0] guide_steps delete error:", deleteError.message)
        } else {
          console.log("[v0] guide_steps delete succeeded")
        }

        console.log("[v0] guide_steps insert starting:", stepCount, "steps")
        const { error: stepsError } = await supabase
          .from("guide_steps")
          .insert(stepsData)

        console.log("[v0] guide_steps insert error:", stepsError)
        
        if (stepsError) {
          console.error("[v0] guide_steps insert FAILED:", {
            code: stepsError.code,
            message: stepsError.message,
            details: stepsError.details,
            stepCount,
          })
        } else {
          console.log("[v0] guide_steps insert SUCCESS:", stepCount, "steps saved")
        }
      } else {
        console.log("[v0] No guide steps found to save")
      }

      // Mirror to localStorage
      this.localStorageAdapter.saveDraftSync(guide)
      console.log("[v0] saveDraft: Supabase save complete, returning source:supabase")
      return { id: guide.id, source: "supabase" }
    } catch (error) {
      console.error("[v0] saveDraft: Unexpected error", error)
      this.localStorageAdapter.saveDraftSync(guide)
      return { id: guide.id, source: "localStorage" }
    }
  }

  /**
   * Load a guide draft from Supabase or localStorage.
   * Tries Supabase first, falls back to localStorage if not found or error.
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
      if ((stepsData || []).length > 0) {
        console.log("[v0] First step:", stepsData?.[0])
      }

      // Log loaded requirements
      console.log("[v0] Loaded requirements:", guideData.requirements)

      // Reconstruct guide from Supabase data
      // Note: guides table does NOT have hub_id or network_id columns
      // Those are derived from the collection -> hub -> network hierarchy
      const guide: Guide = {
        id: guideData.id,
        collectionId: guideData.collection_id || "",
        hubId: "", // Not stored in guides table - derive from collection if needed
        networkId: "", // Not stored in guides table - derive from collection->hub if needed
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
        verification: guideData.verification_status,
        requirements: Array.isArray(guideData.requirements) ? guideData.requirements : [],
        warnings: [],
        version: guideData.version,
        steps: (stepsData || []).map((step: any) => ({
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
   * Note: The guides table does NOT have a network_id column.
   * Network is derived via: guide -> collection -> hub -> network
   * For Phase 1, we fetch all drafts and filter by author, or use localStorage.
   */
  async getDraftsByNetwork(networkId: string): Promise<Guide[]> {
    // Since guides table has no network_id column, we need to join through
    // collections -> hubs -> networks. For Phase 1, use getAllDrafts instead.
    // The frontend stores networkId in localStorage guides, so that works.
    if (!isSupabaseConfigured() || !supabase) {
      return this.localStorageAdapter.getDraftsByNetworkSync(networkId)
    }

    try {
      // Fetch all drafts for the current author (no network filter at DB level)
      const authorId = await this.getAuthorId()
      const { data: guidesData, error } = await supabase
        .from("guides")
        .select("*, guide_steps(*)")
        .eq("author_id", authorId)
        .order("updated_at", { ascending: false })

      if (error) {
        console.warn("[v0] Failed to fetch drafts from Supabase:", error.message)
        const localDrafts = this.localStorageAdapter.getDraftsByNetworkSync(networkId)
        console.log("[v0] Dashboard loaded draft source:localStorage | count:", localDrafts.length)
        return localDrafts
      }

      if (!guidesData || guidesData.length === 0) {
        console.log("[v0] No drafts found in Supabase — checking localStorage")
        const localDrafts = this.localStorageAdapter.getDraftsByNetworkSync(networkId)
        console.log("[v0] Dashboard loaded draft source:localStorage | count:", localDrafts.length)
        return localDrafts
      }

      console.log("[v0] Dashboard loaded draft source:supabase | count:", guidesData.length)

      // Reconstruct guides (networkId not stored in DB, set to empty)
      return guidesData.map((guideData: any) => ({
        id: guideData.id,
        collectionId: guideData.collection_id || "",
        hubId: "", // Not in guides table
        networkId: "", // Not in guides table
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
          isSpoiler: step.is_spoiler || false,
          callout: step.callout,
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
        collectionId: guideData.collection_id || "",
        hubId: "", // Not in guides table
        networkId: "", // Not in guides table
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        type: guideData.type,
        difficulty: guideData.difficulty,
        status: guideData.status,
        verification: guideData.verification_status,
        requirements: Array.isArray(guideData.requirements) ? guideData.requirements : [],
        warnings: [],
        version: guideData.version,
        steps: (guideData.guide_steps || []).map((step: any) => ({
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
