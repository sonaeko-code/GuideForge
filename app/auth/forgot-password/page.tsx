import Link from 'next/link'
import { SiteHeader } from '@/components/guideforge/site-header'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Forgot Password | GuideForge',
  description: 'Reset your GuideForge password',
}

/**
 * Forgot password page - Phase 1 Foundation
 * Phase 2: Will integrate with Supabase Auth password reset
 */
export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-md px-4 py-20">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
          <p className="text-muted-foreground">Phase 2 will implement password recovery</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Password reset functionality will be available in Auth Phase 2.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
