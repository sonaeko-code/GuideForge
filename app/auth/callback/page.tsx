'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/guideforge/auth-context'

/**
 * Auth callback page
 * Handles email confirmation redirects from Supabase
 * Waits for AuthProvider to detect session, then redirects to /builder/networks
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [showTimeout, setShowTimeout] = useState(false)

  useEffect(() => {
    // If already authenticated (session loaded), redirect to builder
    if (!isLoading && user) {
      console.log('[v0] AuthCallback: User session detected, redirecting to builder')
      router.push('/builder/networks')
      return
    }

    // Set timeout to show helpful message if session isn't detected quickly
    const timeoutId = setTimeout(() => {
      if (!user) {
        console.log('[v0] AuthCallback: Session not detected after timeout')
        setShowTimeout(true)
      }
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [user, isLoading, router])

  // Still loading - show signing in message
  if (isLoading || (user === null && !showTimeout)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-foreground mb-2">Signing you in…</p>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    )
  }

  // Timeout reached without session - show helpful message
  if (showTimeout && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-4">
          <p className="text-foreground font-semibold mb-2">Confirmation Issue</p>
          <p className="text-sm text-muted-foreground mb-6">
            If you clicked a confirmation link but didn&apos;t see this page redirect, try:
          </p>
          <ul className="text-sm text-muted-foreground text-left mb-6 space-y-2">
            <li>1. Refreshing the page</li>
            <li>2. Checking your email again</li>
            <li>3. Returning to sign in to try again</li>
          </ul>
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Return to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return null
}
