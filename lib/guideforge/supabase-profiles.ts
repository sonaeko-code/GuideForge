/**
 * Profile management for GuideForge
 * Ensures user profiles exist in the public.profiles table
 * Syncs with Supabase Auth users
 */

import { supabase, isSupabaseConfigured, getSupabaseSession } from './supabase-client'

/**
 * Ensure current authenticated user has a profile in the profiles table
 * Phase 6: Profile bootstrap for guide author_id foreign key constraint
 * 
 * Returns the profile ID if successful, null if not authenticated or error
 * Safe for client-side calls - uses authenticated user's own data only
 */
export async function ensureCurrentUserProfile(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[v0] ensureCurrentUserProfile: Supabase not configured')
    return null
  }

  try {
    // Get current authenticated user
    const session = await getSupabaseSession()
    const userId = session?.user?.id
    const userEmail = session?.user?.email

    if (!userId) {
      console.log('[v0] ensureCurrentUserProfile: User not authenticated')
      return null
    }

    console.log('[v0] ensureCurrentUserProfile: Starting profile check for user:', userId, 'email:', userEmail)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('[v0] ensureCurrentUserProfile: Error checking profile:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
      })
      return null
    }

    // Profile already exists
    if (existingProfile) {
      console.log('[v0] ensureCurrentUserProfile: Profile already exists for user:', userId)
      return userId
    }

    console.log('[v0] ensureCurrentUserProfile: Profile not found, attempting to create for user:', userId)

    // Profile doesn't exist, create one
    // Use upsert to handle race conditions (if another request creates it simultaneously)
    const { data: newProfile, error: upsertError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: userId,
          display_name: userEmail?.split('@')[0] || 'User',
          handle: null,
          avatar_url: session.user?.user_metadata?.avatar_url || null,
          bio: null,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ], {
        onConflict: 'id',
      })
      .select('id')
      .maybeSingle()

    if (upsertError) {
      console.error('[v0] ensureCurrentUserProfile: Error upserting profile:', {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      })
      // Try to identify if it's RLS or FK issue
      if (upsertError.code === '42501') {
        console.error('[v0] ensureCurrentUserProfile: RLS POLICY BLOCKED - user does not have permission to insert profiles')
      } else if (upsertError.code === '23503') {
        console.error('[v0] ensureCurrentUserProfile: FOREIGN KEY VIOLATION - profiles table may have FK constraint')
      }
      return null
    }

    if (!newProfile) {
      console.warn('[v0] ensureCurrentUserProfile: Profile upsert returned no data for user:', userId)
      return null
    }

    console.log('[v0] ensureCurrentUserProfile: Profile upserted successfully for user:', userId, 'profileId:', newProfile.id)
    return newProfile.id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] ensureCurrentUserProfile: Exception:', message, 'stack:', err instanceof Error ? err.stack : 'N/A')
    return null
  }
}
