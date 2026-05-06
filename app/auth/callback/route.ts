import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth callback route - handles email confirmation
 * Phase 3C: After email confirmation, ensures profile is created with signup metadata
 * 
 * Supabase sends the user to this URL after email confirmation.
 * We verify the token and redirect back to the app.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/builder/networks'

  console.log('[v0] Auth callback: Starting, code:', code ? 'present' : 'missing')

  if (!code) {
    console.warn('[v0] Auth callback: No code parameter, redirecting to login')
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }

  try {
    // Create Supabase client for server-side token exchange
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[v0] Auth callback: Supabase env vars missing')
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Exchange code for session
    console.log('[v0] Auth callback: Exchanging code for session')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[v0] Auth callback: Token exchange failed:', error.message)
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    if (!data.user?.id) {
      console.error('[v0] Auth callback: No user ID returned')
      return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
    }

    console.log('[v0] Auth callback: Session exchanged, user:', data.user.id)
    console.log('[v0] Auth callback: User metadata keys:', data.user.user_metadata ? Object.keys(data.user.user_metadata) : 'none')

    // Create a response that redirects back to the app
    // The session cookie will be set automatically by Supabase
    const response = NextResponse.redirect(new URL(next, requestUrl.origin))

    // For client-side profile bootstrap to work, the session needs to be available
    // It will be picked up by AuthProvider on the next page load
    console.log('[v0] Auth callback: Redirecting to:', next)

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[v0] Auth callback: Exception:', message)
    return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
  }
}
