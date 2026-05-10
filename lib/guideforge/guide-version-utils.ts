import { supabase } from '@/lib/guideforge/supabase-client'
import type { Guide } from '@/lib/guideforge/types'

/**
 * Fetch all guides in a revision family (root + all revisions)
 * Used for Version History display
 */
export async function getGuideRevisionFamily(guideId: string): Promise<Guide[]> {
  if (!supabase) {
    console.warn('[v0] Supabase not available for fetching revision family')
    return []
  }

  try {
    // Load the guide itself to check if it's a revision
    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .select('id, revision_of, revision_number')
      .eq('id', guideId)
      .maybeSingle()

    if (guideError || !guide) {
      console.error('[v0] Failed to load guide for revision family:', guideError?.message)
      return []
    }

    // Determine the root guide ID
    const rootGuideId = guide.revision_of ?? guide.id

    // Fetch all guides in the root family
    const { data: familyGuides, error: familyError } = await supabase
      .from('guides')
      .select('id, revision_of, revision_number, status, published_at, updated_at, title')
      .or(`id.eq.${rootGuideId},revision_of.eq.${rootGuideId}`)
      .order('revision_number', { ascending: false })

    if (familyError) {
      console.error('[v0] Failed to load revision family:', familyError.message)
      return []
    }

    return familyGuides || []
  } catch (err) {
    console.error('[v0] Exception loading revision family:', err)
    return []
  }
}
