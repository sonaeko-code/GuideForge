/**
 * Public Supabase utilities for loading published guides on QuestLine pages
 */
import { createClient } from "@supabase/supabase-js"
import type { Guide } from "./types"

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
