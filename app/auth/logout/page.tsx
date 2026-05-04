'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Phase 2: Call Supabase auth.signOut()
    console.log('[v0] Logout: Would call supabase.auth.signOut() in Phase 2')
    
    // For now, just redirect to home
    setTimeout(() => {
      router.push('/')
    }, 500)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Signing out...</p>
    </div>
  )
}
