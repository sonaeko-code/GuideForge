/**
 * Supabase Client
 * Browser client for GuideForge using public anon key
 * 
 * Only reads/writes with row-level security (RLS) policies.
 * No service_role key or admin operations.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Supabase client instance
 * Initialized with public anon key for browser usage
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

/**
 * Get authenticated user session
 * Returns null if no session or Supabase unavailable
 */
export async function getSupabaseSession() {
  if (!supabase) return null
  
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error("[v0] Supabase session error:", error.message)
      return null
    }
    
    return session
  } catch (error) {
    console.error("[v0] Supabase session fetch failed:", error)
    return null
  }
}
