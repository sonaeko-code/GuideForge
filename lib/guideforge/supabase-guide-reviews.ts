import { getSupabaseSession, isSupabaseConfigured, supabase } from './supabase-client'
import { getCurrentUserNetworkMembership, getCurrentUserNetworkAuthority } from './supabase-networks'

/**
 * Resolve guide network context by traversing collection → hub → network
 * The guides table does not have network_id; we must derive it from:
 * guide.collection_id → collection.hub_id → hub.network_id
 */
async function resolveGuideReviewContext(guideId: string): Promise<{
  guideId: string
  collectionId: string
  hubId: string
  networkId: string
  status: string
  verificationStatus: string
} | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null
  }

  try {
    // 1. Fetch guide with collection_id
    const { data: guide, error: guideError } = await supabase
      .from('guides')
      .select('id, collection_id, status, verification_status')
      .eq('id', guideId)
      .maybeSingle()

    if (guideError || !guide) {
      console.error('[v0] resolveGuideReviewContext: Guide not found:', guideError?.message || 'no guide')
      return null
    }

    if (!guide.collection_id) {
      console.error('[v0] resolveGuideReviewContext: Guide is missing collection_id')
      return null
    }

    // 2. Fetch collection with hub_id
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, hub_id')
      .eq('id', guide.collection_id)
      .maybeSingle()

    if (collectionError || !collection) {
      console.error('[v0] resolveGuideReviewContext: Collection not found:', collectionError?.message || 'no collection')
      return null
    }

    if (!collection.hub_id) {
      console.error('[v0] resolveGuideReviewContext: Collection is missing hub_id')
      return null
    }

    // 3. Fetch hub with network_id
    const { data: hub, error: hubError } = await supabase
      .from('hubs')
      .select('id, network_id')
      .eq('id', collection.hub_id)
      .maybeSingle()

    if (hubError || !hub) {
      console.error('[v0] resolveGuideReviewContext: Hub not found:', hubError?.message || 'no hub')
      return null
    }

    if (!hub.network_id) {
      console.error('[v0] resolveGuideReviewContext: Hub is missing network_id')
      return null
    }

    return {
      guideId: guide.id,
      collectionId: guide.collection_id,
      hubId: collection.hub_id,
      networkId: hub.network_id,
      status: guide.status,
      verificationStatus: guide.verification_status,
    }
  } catch (err) {
    console.error('[v0] resolveGuideReviewContext: Exception:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/**
 * Get review summary for a guide
 * Phase 8: Guide Review Voting Lite + Phase 9A: Publish Eligibility Visibility
 * 
 * Fetches guide_review_votes and calculates weighted vote totals.
 * Checks current user's voting permission based on network role.
 * Returns vote summary with approve/request_changes weights and publish eligibility.
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
  publishEligibility: {
    publishEligible: boolean
    needsChanges: boolean
    needsMoreReview: boolean
    approveWeight: number
    requestChangesWeight: number
    netApprovalWeight: number
    requiredApproveWeight: number
    blockingRequestChanges: boolean
    label: string
    helperText: string
  }
  error?: string
} | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[v0] getGuideReviewSummary: Supabase not configured')
    return null
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    // Resolve guide network context through collection → hub
    const context = await resolveGuideReviewContext(guideId)
    
    if (!context) {
      console.warn('[v0] getGuideReviewSummary: Could not resolve guide network context')
      return {
        guideId,
        networkId: null,
        approveWeight: 0,
        requestChangesWeight: 0,
        totalVotes: 0,
        currentUserVote: null,
        currentUserRole: null,
        canCurrentUserVote: false,
        votes: [],
        publishEligibility: {
          publishEligible: false,
          needsChanges: false,
          needsMoreReview: true,
          approveWeight: 0,
          requestChangesWeight: 0,
          netApprovalWeight: 0,
          requiredApproveWeight: 10,
          blockingRequestChanges: false,
          label: 'Needs more review',
          helperText: 'More approval weight is needed before this guide should be published.',
        },
        error: 'Could not resolve guide context. Please verify guide is attached to a collection and hub.',
      }
    }

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

    // Check current user's voting permission using the same authority resolver
    let currentUserVote: 'approve' | 'request_changes' | null = null
    let currentUserRole: string | null = null
    let canCurrentUserVote = false

    if (userId) {
      const authority = await getCurrentUserNetworkAuthority(context.networkId)
      if (authority.isSignedIn && authority.canonicalRole) {
        currentUserRole = authority.canonicalRole
        canCurrentUserVote = authority.canVoteOnReviews === true
        
        // Find current user's vote
        const userVote = (votes || []).find((v) => v.voter_id === userId)
        if (userVote) {
          currentUserVote = userVote.vote as 'approve' | 'request_changes'
        }
      }
    }

    // Calculate publish eligibility
    const requiredApproveWeight = 10
    const publishEligible = approveWeight >= requiredApproveWeight && requestChangesWeight === 0
    const needsChanges = requestChangesWeight > 0
    const needsMoreReview = !publishEligible && !needsChanges
    const netApprovalWeight = approveWeight - requestChangesWeight

    let label = 'Needs more review'
    let helperText = 'More approval weight is needed before this guide should be published.'

    if (publishEligible) {
      label = 'Publish eligible'
      helperText = 'This guide has enough approval weight for publishing, but publishing is not enforced yet.'
    } else if (needsChanges) {
      label = 'Changes requested'
      helperText = 'A reviewer requested changes. Resolve feedback before publishing.'
    }

    return {
      guideId,
      networkId: context.networkId,
      approveWeight,
      requestChangesWeight,
      totalVotes: formattedVotes.length,
      currentUserVote,
      currentUserRole,
      canCurrentUserVote,
      votes: formattedVotes,
      publishEligibility: {
        publishEligible,
        needsChanges,
        needsMoreReview,
        approveWeight,
        requestChangesWeight,
        netApprovalWeight,
        requiredApproveWeight,
        blockingRequestChanges: requestChangesWeight > 0,
        label,
        helperText,
      },
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
 * Checks for existing vote on (guide_id, voter_id).
 * Updates if exists, inserts if new.
 * Prevents duplicate key violations on UNIQUE(guide_id, voter_id).
 * 
 * Requires user to have can_vote_on_reviews = true in their network role.
 * Returns updated review summary.
 */
export async function castGuideReviewVote(
  guideId: string,
  vote: 'approve' | 'request_changes',
  notes?: string
): Promise<{ 
  success: boolean
  error?: string
  vote?: 'approve' | 'request_changes'
  action?: 'inserted' | 'updated'
  guideId?: string
  voterId?: string
  networkId?: string
  weight?: number
  summary?: Awaited<ReturnType<typeof getGuideReviewSummary>>
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return { success: false, error: 'User not authenticated' }
    }

    // Resolve guide network context through collection → hub
    const context = await resolveGuideReviewContext(guideId)
    
    if (!context) {
      return { success: false, error: 'Could not resolve guide network context. Guide may be missing collection or hub.' }
    }

    // Check user's network authority using the same resolver
    const authority = await getCurrentUserNetworkAuthority(context.networkId)
    if (!authority.isSignedIn || !authority.canVoteOnReviews) {
      return { success: false, error: 'You do not have permission to vote on guide reviews' }
    }

    const voterRole = authority.canonicalRole || 'member'
    const weight = authority.roleDefinition?.review_weight || 0

    console.log('[v0] castGuideReviewVote saving vote', {
      guideId,
      voterId: userId,
      networkId: context.networkId,
      vote,
      weight,
      action: 'checking-for-existing',
    })

    // Check for existing vote
    const { data: existingVote, error: queryError } = await supabase
      .from('guide_review_votes')
      .select('id')
      .eq('guide_id', guideId)
      .eq('voter_id', userId)
      .maybeSingle()

    if (queryError) {
      console.error('[v0] castGuideReviewVote: Query error:', queryError.message)
      return { success: false, error: `Failed to check existing vote: ${queryError.message}` }
    }

    let action: 'inserted' | 'updated' = 'inserted'

    if (existingVote) {
      // Update existing vote
      console.log('[v0] castGuideReviewVote: Updating existing vote', { voteId: existingVote.id })
      
      const { error: updateError } = await supabase
        .from('guide_review_votes')
        .update({
          vote,
          voter_role: voterRole,
          weight,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingVote.id)

      if (updateError) {
        console.error('[v0] castGuideReviewVote: Update error:', updateError.message)
        return { success: false, error: `Failed to cast vote: ${updateError.message}` }
      }

      action = 'updated'
    } else {
      // Insert new vote
    console.log('[v0] castGuideReviewVote: Inserting new vote')
      
      const { error: insertError } = await supabase
        .from('guide_review_votes')
        .insert({
          guide_id: guideId,
          network_id: context.networkId,
          voter_id: userId,
          voter_role: voterRole,
          vote,
          weight,
          notes: notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('[v0] castGuideReviewVote: Insert error:', insertError.message)
        return { success: false, error: `Failed to cast vote: ${insertError.message}` }
      }

      action = 'inserted'
    }

    console.log('[v0] castGuideReviewVote success', {
      guideId,
      voterId: userId,
      vote,
      weight,
      action,
    })

    // Fetch updated summary
    const summary = await getGuideReviewSummary(guideId)

    return { 
      success: true, 
      vote,
      action,
      guideId,
      voterId: userId,
      networkId: context.networkId,
      weight,
      summary: summary || undefined 
    }
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
 * 
 * Returns structured result with complete context for debugging.
 */
export async function submitGuideForReview(
  guideId: string
): Promise<{ 
  success: boolean
  error?: string
  guideId: string
  previousStatus?: string
  newStatus?: string
  networkId?: string
  canSubmit?: boolean
  stage?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Supabase not configured',
      guideId,
      stage: 'supabase-check',
    }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
        guideId,
        stage: 'get-user',
      }
    }

    // Resolve guide network context through collection → hub
    const context = await resolveGuideReviewContext(guideId)
    
    if (!context) {
      return {
        success: false,
        error: 'Could not resolve guide network context. Guide may be missing collection or hub.',
        guideId,
        stage: 'resolve-context',
      }
    }

    // Only allow submission from draft status
    if (context.status !== 'draft') {
      return {
        success: false,
        error: `Guide is already in ${context.status} status`,
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        stage: 'permission-check',
      }
    }

    // Check user's network authority using the same resolver as the rest of the app
    // This handles owner fallback + role definition lookup
    const authority = await getCurrentUserNetworkAuthority(context.networkId)

    if (!authority.isSignedIn || !authority.canSubmitGuides) {
      return {
        success: false,
        error: 'You do not have permission to submit guides for review',
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        canSubmit: authority.canSubmitGuides,
        stage: 'get-network-authority',
      }
    }

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
      return {
        success: false,
        error: `Failed to submit guide: ${updateError.message}`,
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        stage: 'update-guide-status',
      }
    }

    // Verify the update persisted
    if (!updateResult || updateResult.status !== 'ready') {
      console.error('[v0] submitGuideForReview: Update returned but status not ready:', updateResult?.status)
      return {
        success: false,
        error: 'Submit for Review update did not persist.',
        guideId,
        previousStatus: context.status,
        newStatus: updateResult?.status,
        networkId: context.networkId,
        stage: 'verify-updated-guide',
      }
    }

    // Re-fetch to verify the change persisted to the database
    const { data: verifiedGuide, error: verifyError } = await supabase
      .from('guides')
      .select('id, status, verification_status')
      .eq('id', guideId)
      .maybeSingle()

    if (verifyError || !verifiedGuide) {
      console.error('[v0] submitGuideForReview: Verification query failed:', verifyError?.message)
      return {
        success: false,
        error: 'Could not verify guide status after submission',
        guideId,
        previousStatus: context.status,
        newStatus: updateResult?.status,
        networkId: context.networkId,
        stage: 'verify-updated-guide',
      }
    }

    if (verifiedGuide.status !== 'ready') {
      console.error('[v0] submitGuideForReview: Verified status is not ready:', verifiedGuide.status)
      return {
        success: false,
        error: 'Submit for Review update did not persist.',
        guideId,
        previousStatus: context.status,
        newStatus: verifiedGuide.status,
        networkId: context.networkId,
        stage: 'verify-updated-guide',
      }
    }

    console.log('[v0] submitGuideForReview: Guide submitted successfully, verified status:', verifiedGuide.status)

    return {
      success: true,
      guideId,
      previousStatus: context.status,
      newStatus: 'ready',
      networkId: context.networkId,
      canSubmit: true,
      stage: 'complete',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] submitGuideForReview: Exception:', message)
    return {
      success: false,
      error: message,
      guideId,
      stage: 'exception',
    }
  }
}

/**
 * Publish an eligible guide manually
 * Phase 9B: Manual Publish Button
 * 
 * Publishes a guide from status "ready" to "published".
 * Requires:
 * - Guide status === "ready"
 * - Publish eligibility === true (approve >= 10, no request changes)
 * - User has canPublishOverride permission in network role
 * - Does NOT auto-publish; only publishes on explicit user action
 * 
 * Sets: status = "published", published_at = now()
 * Leaves: verification_status unchanged
 */
export async function publishEligibleGuide(
  guideId: string
): Promise<{
  success: boolean
  error?: string
  guideId: string
  previousStatus?: string
  newStatus?: string
  publishedAt?: string
  networkId?: string
  canPublish?: boolean
  stage?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Supabase not configured',
      guideId,
      stage: 'supabase-check',
    }
  }

  try {
    const session = await getSupabaseSession()
    const userId = session?.user?.id

    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated',
        guideId,
        stage: 'get-user',
      }
    }

    // Resolve guide network context
    const context = await resolveGuideReviewContext(guideId)
    
    if (!context) {
      return {
        success: false,
        error: 'Could not resolve guide network context. Guide may be missing collection or hub.',
        guideId,
        stage: 'resolve-context',
      }
    }

    // Get user's network authority
    const authority = await getCurrentUserNetworkAuthority(context.networkId)
    
    if (!authority.isSignedIn) {
      return {
        success: false,
        error: 'User not authenticated',
        guideId,
        networkId: context.networkId,
        stage: 'get-network-authority',
      }
    }

    // Check publish permission (canPublishOverride)
    if (!authority.canPublishOverride) {
      return {
        success: false,
        error: 'You do not have permission to publish guides',
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        canPublish: false,
        stage: 'permission-check',
      }
    }

    // Guide must be in "ready" status
    if (context.status !== 'ready') {
      return {
        success: false,
        error: `Guide is in ${context.status} status, not ready for publishing`,
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        stage: 'status-check',
      }
    }

    // Get current review summary to verify publish eligibility
    const summary = await getGuideReviewSummary(guideId)
    
    if (!summary || !summary.publishEligibility.publishEligible) {
      return {
        success: false,
        error: 'Guide is not eligible for publishing. Requires 10+ approval weight and no request changes.',
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        stage: 'eligibility-check',
      }
    }

    console.log('[v0] publishEligibleGuide: Publishing guide:', guideId)

    // Update guide status to 'published' and set published_at
    const now = new Date().toISOString()
    const { data: updateResult, error: updateError } = await supabase
      .from('guides')
      .update({
        status: 'published',
        published_at: now,
        updated_at: now,
      })
      .eq('id', guideId)
      .select('id, status, published_at')
      .maybeSingle()

    if (updateError) {
      console.error('[v0] publishEligibleGuide: Update error:', updateError.message)
      return {
        success: false,
        error: `Failed to publish guide: ${updateError.message}`,
        guideId,
        previousStatus: context.status,
        networkId: context.networkId,
        stage: 'update-guide-status',
      }
    }

    // Verify the update persisted
    if (!updateResult || updateResult.status !== 'published') {
      console.error('[v0] publishEligibleGuide: Update returned but status not published:', updateResult?.status)
      return {
        success: false,
        error: 'Publish update did not persist.',
        guideId,
        previousStatus: context.status,
        newStatus: updateResult?.status,
        networkId: context.networkId,
        stage: 'verify-published-guide',
      }
    }

    // Re-fetch to verify the change persisted to the database
    const { data: verifiedGuide, error: verifyError } = await supabase
      .from('guides')
      .select('id, status, published_at')
      .eq('id', guideId)
      .maybeSingle()

    if (verifyError || !verifiedGuide) {
      console.error('[v0] publishEligibleGuide: Verification query failed:', verifyError?.message)
      return {
        success: false,
        error: 'Could not verify guide status after publishing',
        guideId,
        previousStatus: context.status,
        newStatus: updateResult?.status,
        networkId: context.networkId,
        stage: 'verify-published-guide',
      }
    }

    if (verifiedGuide.status !== 'published') {
      console.error('[v0] publishEligibleGuide: Verified status is not published:', verifiedGuide.status)
      return {
        success: false,
        error: 'Publish update did not persist.',
        guideId,
        previousStatus: context.status,
        newStatus: verifiedGuide.status,
        networkId: context.networkId,
        stage: 'verify-published-guide',
      }
    }

    console.log('[v0] publishEligibleGuide: Guide published successfully, verified status:', verifiedGuide.status)

    return {
      success: true,
      guideId,
      previousStatus: context.status,
      newStatus: 'published',
      publishedAt: verifiedGuide.published_at,
      networkId: context.networkId,
      canPublish: true,
      stage: 'complete',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] publishEligibleGuide: Exception:', message)
    return {
      success: false,
      error: message,
      guideId,
      stage: 'exception',
    }
  }
}
