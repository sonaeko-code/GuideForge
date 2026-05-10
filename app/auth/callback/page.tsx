'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/guideforge/auth-context'

/**
 * Auth callback page with returnTo support
 * Handles email confirmation redirects from Supabase
 * Supports returnTo query parameter to redirect back to original flow
 */
function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const [showTimeout, setShowTimeout] = useState(false)

  // Get returnTo from query params and validate it
  const getReturnTo = (): string | null => {
    const returnTo = searchParams?.get('returnTo')
    if (!returnTo) return null
    
    // Only allow internal paths starting with /
    if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
      return returnTo
    }
    
    return null
  }

  const returnTo = getReturnTo()

  useEffect(() => {
    // If already authenticated (session loaded), redirect to builder or returnTo
    if (!isLoading && user) {
      const destination = returnTo || '/builder/networks'
      console.log('[v0] AuthCallback: User session detected, redirecting to', destination)
      router.push(destination)
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
  }, [user, isLoading, router, returnTo])

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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
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
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
