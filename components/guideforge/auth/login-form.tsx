'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Mail, Lock } from 'lucide-react'
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
 * Login form - Phase 2: Supabase Auth integration
 * Calls supabase.auth.signInWithPassword() on submit
 */
export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!isSupabaseConfigured() || !supabase) {
      setError('Authentication service not available')
      setIsLoading(false)
      return
    }

    try {
      console.log('[v0] LoginForm: Signing in with email:', email)
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('[v0] LoginForm: Auth error:', authError.message)
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (!data.session) {
        console.error('[v0] LoginForm: No session returned')
        setError('Login failed - no session')
        setIsLoading(false)
        return
      }

      console.log('[v0] LoginForm: Login successful, user:', data.user.id)
      
      // Session is stored in Supabase and AuthProvider will pick it up via onAuthStateChange
      // Redirect to builder
      router.push('/builder/networks')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      console.error('[v0] LoginForm error:', message)
      setError(message)
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your GuideForge account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

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
            <FieldDescription>
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </FieldDescription>
          </Field>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full gap-2"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
