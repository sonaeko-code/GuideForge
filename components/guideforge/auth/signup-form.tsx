'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Mail, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field'
import { SiteHeader } from '@/components/guideforge/site-header'
import { supabase, isSupabaseConfigured } from '@/lib/guideforge/supabase-client'

/**
 * Signup form - Phase 2: Supabase Auth integration
 * Calls supabase.auth.signUp() on submit
 */
export function SignupForm() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return
    }

    if (!isSupabaseConfigured() || !supabase) {
      setError('Authentication service not available')
      setIsLoading(false)
      return
    }

    try {
      console.log('[v0] SignupForm: Signing up with email:', email)
      console.log('[v0] SignupForm: Display name length:', displayName.trim().length)
      
      const trimmedDisplayName = displayName.trim()
      
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            // Phase 3C: Store display name in multiple metadata fields for compatibility
            display_name: trimmedDisplayName,
            name: trimmedDisplayName,
            full_name: trimmedDisplayName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        console.error('[v0] SignupForm: Auth error:', authError.message)
        setError(authError.message)
        setIsLoading(false)
        return
      }

      console.log('[v0] SignupForm: Signup response:', data.user?.id)
      console.log('[v0] SignupForm: User metadata keys:', data.user?.user_metadata ? Object.keys(data.user.user_metadata) : 'none')
      
      // Check if email confirmation is required
      if (data.user?.identities?.length === 0) {
        // User already exists
        setError('Email already registered')
        setIsLoading(false)
        return
      }

      // Supabase may require email confirmation
      if (data.session) {
        console.log('[v0] SignupForm: Session created immediately')
        
        // Phase 3C: Attempt immediate profile bootstrap with signup metadata
        try {
          console.log('[v0] SignupForm: Attempting immediate profile bootstrap after signup')
          const { ensureCurrentUserProfile } = await import('@/lib/guideforge/supabase-profiles')
          const profileId = await ensureCurrentUserProfile()
          if (profileId) {
            console.log('[v0] SignupForm: Profile bootstrap successful after signup, profileId:', profileId)
          } else {
            console.warn('[v0] SignupForm: Profile bootstrap returned null after signup, will retry on login')
          }
        } catch (bootstrapErr) {
          console.warn('[v0] SignupForm: Profile bootstrap failed after signup:', bootstrapErr instanceof Error ? bootstrapErr.message : String(bootstrapErr), '- will retry on login')
        }
        
        setSuccessMessage('Account created! Redirecting...')
        setTimeout(() => {
          router.push('/builder/networks')
        }, 1000)
      } else {
        console.log('[v0] SignupForm: Email confirmation required, profile bootstrap will happen after confirmation')
        setSuccessMessage('Check your email to confirm your account.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      console.error('[v0] SignupForm error:', message)
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground">Join GuideForge to start building guides</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="displayName">Display name</FieldLabel>
            <div className="relative">
              <User className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
            <FieldDescription>At least 8 characters</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </Field>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full gap-2"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
