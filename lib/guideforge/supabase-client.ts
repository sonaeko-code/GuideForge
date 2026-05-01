/**
 * Supabase Client
 * Browser client for GuideForge using public anon key
 * 
 * Only reads/writes with row-level security (RLS) policies.
 * No service_role key or admin operations.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

// Log environment detection at module load time (runs once in browser)
if (typeof window !== "undefined") {
  const urlPresent = !!supabaseUrl
  const urlValid = urlPresent && supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co")
  const keyPresent = !!supabaseAnonKey
  const keyLooksLikeJWT = keyPresent && supabaseAnonKey.includes(".") && supabaseAnonKey.length > 50

  console.log("[v0] Supabase env check:")
  console.log("  - NEXT_PUBLIC_SUPABASE_URL present:", urlPresent)
  if (urlPresent) {
    console.log("    - starts with https://:", supabaseUrl.startsWith("https://"))
    console.log("    - includes supabase.co:", supabaseUrl.includes("supabase.co"))
  }
  console.log("  - NEXT_PUBLIC_SUPABASE_ANON_KEY present:", keyPresent)
  if (keyPresent) {
    console.log("    - looks like JWT (has . and length > 50):", keyLooksLikeJWT)
  }
  console.log("  - Overall isSupabaseConfigured result:", urlValid && keyLooksLikeJWT)
}

/**
 * Supabase client instance
 * Initialized with public anon key for browser usage
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Check if Supabase is properly configured
 * Returns true only if URL is valid https:// supabase.co URL and key exists
 */
export function isSupabaseConfigured(): boolean {
  if (!supabaseUrl || !supabaseAnonKey) {
    return false
  }
  
  // URL must be a valid Supabase URL
  const isValidUrl = supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co")
  
  // Key must look like a JWT (contains . and reasonable length)
  const isValidKey = supabaseAnonKey.includes(".") && supabaseAnonKey.length > 50
  
  return isValidUrl && isValidKey && supabase !== null
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
