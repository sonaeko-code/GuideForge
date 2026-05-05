/**
 * Auth Context for GuideForge
 * Phase 2: Integrated with Supabase Auth
 * - Session loading on mount
 * - Auth state listener for real-time updates
 * - User data from Supabase session
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/guideforge/supabase-client'

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  avatar?: string
}

export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      console.log('[v0] AuthProvider: Supabase not configured, skipping session load')
      setIsLoading(false)
      return
    }

    // Load current session on mount
    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[v0] AuthProvider: Session load error:', error.message)
          setIsLoading(false)
          return
        }

        if (session?.user) {
          console.log('[v0] AuthProvider: Session loaded:', session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
            avatar: session.user.user_metadata?.avatar_url,
          })
        } else {
          console.log('[v0] AuthProvider: No active session')
          setUser(null)
        }
      } catch (err) {
        console.error('[v0] AuthProvider: Session load failed:', err)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[v0] AuthProvider: Auth state changed:', event)
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            displayName: session.user.user_metadata?.display_name,
            avatar: session.user.user_metadata?.avatar_url,
          })
        } else {
          setUser(null)
        }
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
