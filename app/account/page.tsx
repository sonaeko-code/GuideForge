import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/guideforge/site-header'
import { AccountProfileCard } from '@/components/guideforge/account/account-profile-card'

/**
 * Account Page - Phase 1
 * Display user profile information and prepare for future profile editing
 */
export default function AccountPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link href="/builder/networks" className="flex items-center gap-2">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Builder
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Account</h1>
          <p className="text-muted-foreground">Manage your profile and account settings</p>
        </div>

        <AccountProfileCard />
      </div>
    </main>
  )
}
