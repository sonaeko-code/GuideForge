import { Guide } from "@/lib/guideforge/types"
import { supabase, isSupabaseConfigured } from "@/lib/guideforge/supabase-client"

/**
 * Phase 10B: Revision context for displaying revision drafts in relation to their original published guides.
 * This helper extracts revision metadata and loads minimal original guide info.
 */

export interface RevisionContext {
  isRevision: boolean
  revisionOf: string | null
  revisionNumber: number
  originalGuide?: {
    id: string
    title: string
    status: string
    publishedAt: string | null
  }
}

/**
 * Extract revision context from a guide.
 * If the guide has revision_of set, load minimal original guide info.
 *
 * @param guide The current guide (likely a revision draft)
 * @param allGuides Optional array of all guides to look up original in-memory (avoids extra DB queries)
 * @returns RevisionContext with isRevision flag and optional original guide info
 */
export function getGuideRevisionContext(
  guide: Guide | Partial<Guide>,
  allGuides?: (Guide | Partial<Guide>)[]
): RevisionContext {
  const revisionOf = guide.revisionOf || null
  const revisionNumber = guide.revisionNumber ?? 1

  const isRevision = !!revisionOf

  if (!isRevision) {
    return {
      isRevision: false,
      revisionOf: null,
      revisionNumber: revisionNumber,
    }
  }

  // Try to find original guide in provided array
  let originalGuide: RevisionContext["originalGuide"] | undefined
  if (allGuides) {
    const original = allGuides.find((g) => g.id === revisionOf)
    if (original) {
      originalGuide = {
        id: original.id || "",
        title: original.title || "Unknown Guide",
        status: original.status || "unknown",
        publishedAt: original.publishedAt || null,
      }
    }
  }

  return {
    isRevision: true,
    revisionOf,
    revisionNumber,
    originalGuide,
  }
}

/**
 * Load original guide info from Supabase for a revision draft.
 * This is used when original guide isn't available in the local guide list.
 * Phase 10B: Low-risk query to get minimal context info.
 */
export async function loadOriginalGuideInfo(
  revisionOfId: string
): Promise<{
  id: string
  title: string
  status: string
  publishedAt: string | null
} | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('guides')
      .select('id, title, status, published_at')
      .eq('id', revisionOfId)
      .maybeSingle()

    if (error) {
      console.error('[v0] loadOriginalGuideInfo error:', error)
      return null
    }

    if (!data) {
      return null
    }

    return {
      id: data.id,
      title: data.title || "Unknown Guide",
      status: data.status || "unknown",
      publishedAt: data.published_at || null,
    }
  } catch (err) {
    console.error('[v0] loadOriginalGuideInfo exception:', err)
    return null
  }
}

/**
 * Format revision number for UI display.
 * Example: 2 → "Revision #2"
 */
export function formatRevisionNumber(revisionNumber: number): string {
  if (!revisionNumber || revisionNumber <= 1) {
    return ""
  }
  return `Revision #${revisionNumber}`
}

/**
 * Get revision draft banner text.
 * Used in guide editor to show context about the revision.
 */
export function getRevisionDraftBannerText(context: RevisionContext): string {
  if (!context.isRevision) {
    return ""
  }

  const revisionLabel = formatRevisionNumber(context.revisionNumber)
  const originalTitle = context.originalGuide?.title || "the original guide"

  return `${revisionLabel} of ${originalTitle}. The published guide remains unchanged until this revision is approved and published.`
}

/**
 * Get revision review panel context text.
 * Used in guide review panel when reviewing a revision.
 */
export function getRevisionReviewPanelText(context: RevisionContext): string {
  if (!context.isRevision) {
    return ""
  }

  const revisionLabel = formatRevisionNumber(context.revisionNumber)
  const originalTitle = context.originalGuide?.title || "the original guide"

  return `This review is for ${revisionLabel} of ${originalTitle}. This is a proposed update to an already published guide.`
}
