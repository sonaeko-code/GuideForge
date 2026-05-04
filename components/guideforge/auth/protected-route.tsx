'use client'

import { useAuth } from '@/lib/guideforge/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Protected route wrapper - redirects to login if not authenticated
 * Phase 2: Will implement actual auth checks
 */
export function ProtectedRoute({ 
  children,
  requiredPath?: string,
}: { 
  children: React.ReactNode
  requiredPath?: string
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Phase 2: Implement actual auth check and redirect
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return children
}
