import { getSupabaseSession, isSupabaseConfigured, supabase } from './supabase-client'
import { getCurrentUserNetworkMembership } from './supabase-networks'

/**
 * Get review summary for a guide
 * Phase 8: Guide Review Voting Lite
 * 
 * Fetches guide_review_votes and calculates weighted vote totals.
 * Checks current user's voting permission based on network role.
 * Returns vote summary with approve/request_changes weights.
 */
export async function getGuideReviewSummary(guideId: string): Promise<{
  guideId: string
  networkId: string | null
  approveWeight: number
  requestChangesWeight: number
  totalVotes: number
  currentUserVote: 'approve' | 'request_changes' | null
  currentUserRole: string | null
  canCurrentUserVote: boolean
  votes: Array<{
    voterId: string
    voterRole: string
    voterDisplayName: string | null
    vote: string
    weight: number
    notes: string | null
    createdAt: string
  }>
} | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[v0] getGuideReviewSummary: Supabase not configured')
    return null
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    // Fetch guide to get network_id
    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .select('id, network_id')
      .eq('id', guideId)
      .maybeSingle()

    if (guideError || !guide) {
      console.warn('[v0] getGuideReviewSummary: Guide not found:', guideError?.message || 'no guide')
      return null
    }

    const networkId = guide.network_id

    // Fetch all votes for this guide
    const { data: votes, error: votesError } = await supabase
      .from('guide_review_votes')
      .select('voter_id, voter_role, vote, weight, notes, created_at')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: true })

    if (votesError) {
      console.warn('[v0] getGuideReviewSummary: Error fetching votes:', votesError.message)
      return null
    }

    // Get voter display names from profiles
    const voterIds = (votes || []).map((v) => v.voter_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', voterIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

    // Calculate totals
    let approveWeight = 0
    let requestChangesWeight = 0

    const formattedVotes = (votes || []).map((v) => {
      if (v.vote === 'approve') {
        approveWeight += v.weight || 0
      } else if (v.vote === 'request_changes') {
        requestChangesWeight += v.weight || 0
      }
      return {
        voterId: v.voter_id,
        voterRole: v.voter_role,
        voterDisplayName: profileMap.get(v.voter_id) || null,
        vote: v.vote,
        weight: v.weight || 0,
        notes: v.notes,
        createdAt: v.created_at,
      }
    })

    // Check current user's voting permission
    let currentUserVote: 'approve' | 'request_changes' | null = null
    let currentUserRole: string | null = null
    let canCurrentUserVote = false

    if (userId) {
      const membership = await getCurrentUserNetworkMembership(networkId || '')
      if (membership) {
        currentUserRole = membership.canonicalRole
        canCurrentUserVote = membership.can_vote_on_reviews === true
        
        // Find current user's vote
        const userVote = (votes || []).find((v) => v.voter_id === userId)
        if (userVote) {
          currentUserVote = userVote.vote as 'approve' | 'request_changes'
        }
      }
    }

    return {
      guideId,
      networkId: networkId || null,
      approveWeight,
      requestChangesWeight,
      totalVotes: formattedVotes.length,
      currentUserVote,
      currentUserRole,
      canCurrentUserVote,
      votes: formattedVotes,
    }
  } catch (err) {
    console.warn('[v0] getGuideReviewSummary: Exception:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Cast or update a guide review vote
 * Phase 8: Guide Review Voting Lite
 * 
 * Uses UNIQUE(guide_id, voter_id) to upsert votes.
 * Requires user to have can_vote_on_reviews = true in their network role.
 * Returns updated review summary.
 */
export async function castGuideReviewVote(
  guideId: string,
  vote: 'approve' | 'request_changes',
  notes?: string
): Promise<{ success: boolean; error?: string; summary?: Awaited<ReturnType<typeof getGuideReviewSummary>> }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    // Fetch guide to get network_id
    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .select('id, network_id')
      .eq('id', guideId)
      .maybeSingle()

    if (guideError || !guide) {
      return { success: false, error: 'Guide not found' }
    }

    const networkId = guide.network_id

    // Check user's network authority
    const membership = await getCurrentUserNetworkMembership(networkId || '')
    if (!membership || !membership.can_vote_on_reviews) {
      return { success: false, error: 'You do not have permission to vote on guide reviews' }
    }

    const voterRole = membership.canonicalRole
    const weight = membership.weight || 0

    console.log('[v0] castGuideReviewVote: Casting vote for guide:', guideId, 'vote:', vote, 'weight:', weight)

    // Upsert vote using UNIQUE(guide_id, voter_id)
    const { data: upsertResult, error: upsertError } = await supabase
      .from('guide_review_votes')
      .upsert([
        {
          guide_id: guideId,
          network_id: networkId,
          voter_id: userId,
          voter_role: voterRole,
          vote,
          weight,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .maybeSingle()

    if (upsertError) {
      console.error('[v0] castGuideReviewVote: Upsert error:', upsertError.message)
      return { success: false, error: `Failed to cast vote: ${upsertError.message}` }
    }

    console.log('[v0] castGuideReviewVote: Vote cast successfully')

    // Fetch updated summary
    const summary = await getGuideReviewSummary(guideId)

    return { success: true, summary: summary || undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] castGuideReviewVote: Exception:', message)
    return { success: false, error: message }
  }
}

/**
 * Submit a draft guide for review
 * Phase 8: Guide Review Voting Lite
 * 
 * Updates guide.status from 'draft' to 'ready'.
 * Requires user to have can_submit_guides = true.
 * Does not auto-publish or set verification_status.
 */
export async function submitGuideForReview(
  guideId: string
): Promise<{ success: boolean; error?: string; status?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    // Fetch guide to check status and get network_id
    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .select('id, status, network_id')
      .eq('id', guideId)
      .maybeSingle()

    if (guideError || !guide) {
      return { success: false, error: 'Guide not found' }
    }

    // Only allow submission from draft status
    if (guide.status !== 'draft') {
      return { success: false, error: `Guide is already in ${guide.status} status` }
    }

    // Check user's network authority
    const membership = await getCurrentUserNetworkMembership(guide.network_id || '')
    if (!membership || !membership.can_submit_guides) {
      return { success: false, error: 'You do not have permission to submit guides for review' }
    }

    console.log('[v0] submitGuideForReview: Submitting guide:', guideId, 'for review')

    // Update guide status to 'ready'
    const { data: updateResult, error: updateError } = await supabase
      .from('guides')
      .update({
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', guideId)
      .select('id, status')
      .maybeSingle()

    if (updateError) {
      console.error('[v0] submitGuideForReview: Update error:', updateError.message)
      return { success: false, error: `Failed to submit guide: ${updateError.message}` }
    }

    console.log('[v0] submitGuideForReview: Guide submitted successfully, new status:', updateResult?.status)

    return { success: true, status: updateResult?.status || 'ready' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] submitGuideForReview: Exception:', message)
    return { success: false, error: message }
  }
}
