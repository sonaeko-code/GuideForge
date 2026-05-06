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

    if (!userId) {
      console.log('[v0] ensureCurrentUserProfile: User not authenticated')
      return null
    }

    console.log('[v0] ensureCurrentUserProfile: Checking profile for user:', userId)

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.warn('[v0] ensureCurrentUserProfile: Error checking profile:', checkError.message)
      return null
    }

    // Profile already exists
    if (existingProfile) {
      console.log('[v0] ensureCurrentUserProfile: Profile already exists:', userId)
      return userId
    }

    // Profile doesn't exist, create one
    console.log('[v0] ensureCurrentUserProfile: Creating new profile for user:', userId)

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          display_name: session.user?.email?.split('@')[0] || 'User',
          handle: null,
          avatar_url: session.user?.user_metadata?.avatar_url || null,
          bio: null,
          role: 'user',
        },
      ])
      .select('id')
      .maybeSingle()

    if (createError) {
      console.error('[v0] ensureCurrentUserProfile: Error creating profile:', createError.message)
      return null
    }

    if (!newProfile) {
      console.warn('[v0] ensureCurrentUserProfile: Profile creation returned no data')
      return null
    }

    console.log('[v0] ensureCurrentUserProfile: Profile created successfully:', newProfile.id)
    return newProfile.id
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[v0] ensureCurrentUserProfile: Exception:', message)
    return null
  }
}
