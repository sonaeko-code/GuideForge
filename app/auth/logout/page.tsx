'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/guideforge/supabase-client'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        if (!isSupabaseConfigured() || !supabase) {
          console.log('[v0] Logout: Supabase not configured, just redirect')
          router.push('/')
          return
        }

        console.log('[v0] Logout: Calling supabase.auth.signOut()')
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error('[v0] Logout: Error:', error.message)
          // Still redirect even if logout fails
          router.push('/')
          return
        }

        console.log('[v0] Logout: Success')
        // AuthProvider will pick up the auth state change and clear user
        // Redirect to home
        router.push('/')
      } catch (err) {
        console.error('[v0] Logout: Exception:', err)
        router.push('/')
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing out...</p>
    </div>
  )
}
