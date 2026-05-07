/**
 * Guide Revisions
 * Phase 10A: Create draft revisions from published guides
 * 
 * A revision is a new draft copy of a published guide that can be edited and
 * submitted for review separately. The original published guide remains unchanged.
 * 
 * When approved, the revision becomes the new published version.
 * The original is preserved with history tracking.
 */

import { supabase, isSupabaseConfigured, getSupabaseSession } from './supabase-client'
import { getCurrentUserNetworkAuthority } from './supabase-networks'

/**
 * Resolve guide network context by traversing collection → hub → network
 * Shared with guide-reviews.ts
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

    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, hub_id')
      .eq('id', guide.collection_id)
      .maybeSingle()

    if (collectionError || !collection) {
      console.error('[v0] resolveGuideReviewContext: Collection not found:', collectionError?.message || 'no collection')
      return null
    }

    const { data: hub, error: hubError } = await supabase
      .from('hubs')
      .select('id, network_id')
      .eq('id', collection.hub_id)
      .maybeSingle()

    if (hubError || !hub) {
      console.error('[v0] resolveGuideReviewContext: Hub not found:', hubError?.message || 'no hub')
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
    console.error('[v0] resolveGuideReviewContext: Exception:', err)
    return null
  }
}

/**
 * Create a draft revision from a published guide
 * Phase 10A: Manual action only, creates new editable draft copy
 * 
 * Requirements:
 * - Guide status === "published"
 * - User has can_create_revisions permission (or canPublishOverride for now)
 * - Does NOT auto-publish
 * - Does NOT replace the original
 * - Original guide remains published and protected
 * 
 * Returns: New draft guide with revision_of pointing to source, revision_number incremented
 */
export async function createGuideRevisionDraft(
  publishedGuideId: string
): Promise<{
  success: boolean
  error?: string
  sourceGuideId?: string
  revisionGuideId?: string
  revisionNumber?: number
  stage?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Supabase not configured',
      sourceGuideId: publishedGuideId,
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
        sourceGuideId: publishedGuideId,
        stage: 'get-user',
      }
    }

    // 1. Load published guide
    const { data: sourceGuide, error: loadError } = await supabase
      .from('guides')
      .select('id, collection_id, title, slug, summary, requirements, type, difficulty, version, author_id, status, verification_status, published_at, revision_of, revision_number')
      .eq('id', publishedGuideId)
      .maybeSingle()

    if (loadError || !sourceGuide) {
      console.error('[v0] createGuideRevisionDraft: Failed to load source guide:', loadError?.message)
      return {
        success: false,
        error: 'Could not load source guide',
        sourceGuideId: publishedGuideId,
        stage: 'load-source-guide',
      }
    }

    // 2. Require source guide status === "published"
    if (sourceGuide.status !== 'published') {
      return {
        success: false,
        error: `Source guide status is "${sourceGuide.status}", not "published"`,
        sourceGuideId: publishedGuideId,
        stage: 'validate-source-published',
      }
    }

    // 3. Resolve guide context
    const context = await resolveGuideReviewContext(publishedGuideId)
    
    if (!context) {
      return {
        success: false,
        error: 'Could not resolve guide network context',
        sourceGuideId: publishedGuideId,
        stage: 'resolve-context',
      }
    }

    // 4. Get user network authority
    const authority = await getCurrentUserNetworkAuthority(context.networkId)

    if (!authority.isSignedIn) {
      return {
        success: false,
        error: 'User not authenticated in network',
        sourceGuideId: publishedGuideId,
        stage: 'get-network-authority',
      }
    }

    // 5. Check permission: can_create_revisions or canPublishOverride (fallback for Phase 10A)
    const canCreateRevisions = authority.canPublishOverride === true
    
    if (!canCreateRevisions) {
      return {
        success: false,
        error: 'You do not have permission to create revisions',
        sourceGuideId: publishedGuideId,
        stage: 'permission-check',
      }
    }

    // 6. Phase 10J: Resolve root guide ID
    // If sourceGuide is already a revision, use its revision_of as root
    // Otherwise, sourceGuide itself is the root
    const rootGuideId = sourceGuide.revision_of ?? sourceGuide.id

    // TEST LOG: Show root resolution
    console.log('[v0-TEST] createGuideRevisionDraft: Root resolution', {
      sourceGuideId: publishedGuideId,
      'sourceGuide.revision_of': sourceGuide.revision_of,
      rootGuideId,
    })

    // 7. Phase 10J: Calculate next revision number from entire root family
    // Query root guide + all revisions of root to find max revision_number
    const { data: rootFamily, error: familyError } = await supabase
      .from('guides')
      .select('id, revision_number')
      .or(`id.eq.${rootGuideId},revision_of.eq.${rootGuideId}`)
      .order('revision_number', { ascending: false })

    if (familyError) {
      console.error('[v0] createGuideRevisionDraft: Failed to query root family:', familyError.message)
      return {
        success: false,
        error: 'Failed to calculate revision number',
        sourceGuideId: publishedGuideId,
        stage: 'calculate-revision-number',
      }
    }

    const maxRevisionNumber = rootFamily && rootFamily.length > 0
      ? Math.max(...rootFamily.map(g => g.revision_number ?? 0))
      : 1
    
    const nextRevisionNumber = maxRevisionNumber + 1

    // TEST LOG: Show revision number calculation
    console.log('[v0-TEST] createGuideRevisionDraft: Revision number', {
      rootGuideId,
      maxRevisionNumber,
      nextRevisionNumber,
    })

    // 8. Create new guide row
    const revisionSlug = sourceGuide.slug + `-rev${nextRevisionNumber}`
    const now = new Date().toISOString()

    const { data: newGuide, error: createError } = await supabase
      .from('guides')
      .insert({
        collection_id: sourceGuide.collection_id,
        title: sourceGuide.title,
        slug: revisionSlug,
        summary: sourceGuide.summary,
        requirements: sourceGuide.requirements,
        type: sourceGuide.type,
        difficulty: sourceGuide.difficulty,
        version: sourceGuide.version,
        author_id: userId,
        reviewer_id: null,
        status: 'draft',
        verification_status: 'unverified',
        published_at: null,
        revision_of: rootGuideId,
        revision_number: nextRevisionNumber,
        created_at: now,
        updated_at: now,
      })
      .select('id, revision_of, revision_number')
      .maybeSingle()

    if (createError || !newGuide) {
      console.error('[v0] createGuideRevisionDraft: Failed to create revision guide:', createError?.message)
      return {
        success: false,
        error: `Failed to create revision guide: ${createError?.message}`,
        sourceGuideId: publishedGuideId,
        stage: 'create-revision-guide',
      }
    }

    // TEST LOG: Show inserted revision details
    console.log('[v0-TEST] createGuideRevisionDraft: Inserted revision', {
      'inserted id': newGuide.id,
      'inserted revision_of': newGuide.revision_of,
      'inserted revision_number': newGuide.revision_number,
      'expected revision_of (root)': rootGuideId,
      'revision_of matches root?': newGuide.revision_of === rootGuideId,
    })

    console.log('[v0] createGuideRevisionDraft: Created revision guide:', newGuide.id)

    // 8. Copy guide_steps from source to new revision
    const { data: sourceSteps, error: stepsLoadError } = await supabase
      .from('guide_steps')
      .select('title, body, kind, order_index, is_spoiler, callout')
      .eq('guide_id', publishedGuideId)
      .order('order_index', { ascending: true })

    if (stepsLoadError) {
      console.error('[v0] createGuideRevisionDraft: Failed to load source steps:', stepsLoadError.message)
      return {
        success: false,
        error: 'Failed to copy guide steps',
        sourceGuideId: publishedGuideId,
        revisionGuideId: newGuide.id,
        revisionNumber: newGuide.revision_number,
        stage: 'copy-steps',
      }
    }

    if (sourceSteps && sourceSteps.length > 0) {
      const stepsToInsert = sourceSteps.map((step: any) => ({
        guide_id: newGuide.id,
        title: step.title,
        body: step.body,
        kind: step.kind,
        order_index: step.order_index,
        is_spoiler: step.is_spoiler || false,
        callout: step.callout,
      }))

      const { error: insertStepsError } = await supabase
        .from('guide_steps')
        .insert(stepsToInsert)

      if (insertStepsError) {
        console.error('[v0] createGuideRevisionDraft: Failed to insert steps:', insertStepsError.message)
        return {
          success: false,
          error: 'Failed to copy guide steps',
          sourceGuideId: publishedGuideId,
          revisionGuideId: newGuide.id,
          revisionNumber: newGuide.revision_number,
          stage: 'copy-steps',
        }
      }

      console.log('[v0] createGuideRevisionDraft: Copied', sourceSteps.length, 'steps')
    }

    // 9. Verify revision was created
    const { data: verifyGuide, error: verifyError } = await supabase
      .from('guides')
      .select('id, status, revision_of, revision_number')
      .eq('id', newGuide.id)
      .maybeSingle()

    if (verifyError || !verifyGuide || verifyGuide.status !== 'draft' || verifyGuide.revision_of !== publishedGuideId) {
      console.error('[v0] createGuideRevisionDraft: Verification failed')
      return {
        success: false,
        error: 'Revision creation verification failed',
        sourceGuideId: publishedGuideId,
        revisionGuideId: newGuide.id,
        revisionNumber: newGuide.revision_number,
        stage: 'verify-revision',
      }
    }

    console.log('[v0] createGuideRevisionDraft: Revision created successfully:', newGuide.id)

    return {
      success: true,
      sourceGuideId: publishedGuideId,
      revisionGuideId: newGuide.id,
      revisionNumber: newGuide.revision_number,
      stage: 'complete',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] createGuideRevisionDraft: Exception:', message)
    return {
      success: false,
      error: message,
      sourceGuideId: publishedGuideId,
      stage: 'exception',
    }
  }
}
