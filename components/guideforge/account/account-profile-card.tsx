'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, User, Lock, Users, Settings, Folder, Shield, CheckCircle2, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/guideforge/auth-context'
import { getAllNetworks, getNetworkMembershipsForUser } from '@/lib/guideforge/supabase-networks'
import { getNetworkOwnershipStatus, getOwnershipLabel } from '@/lib/guideforge/utils'
import type { Network, NetworkMembership } from '@/lib/guideforge/types'

/**
 * Account Profile Card - Phase 1 & 2
 * Phase 1: Display user profile information and owned networks
 * Phase 2: Display all network memberships with roles
 */
export function AccountProfileCard() {
  const { user, isAuthenticated } = useAuth()
  const [networks, setNetworks] = useState<Network[]>([])
  const [memberships, setMemberships] = useState<NetworkMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load networks to show owned networks list, and memberships for all networks
  // Phase 6: Also bootstrap profile on account page load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Phase 6: Ensure profile exists for authenticated user
      if (isAuthenticated && user?.id) {
        try {
          const { ensureCurrentUserProfile } = await import('@/lib/guideforge/supabase-profiles')
          await ensureCurrentUserProfile()
          console.log('[v0] Profile bootstrapped on account page for user:', user.id)
        } catch (err) {
          console.warn('[v0] Profile bootstrap on account page failed:', err)
        }
      }
      
      const [allNetworks, userMemberships] = await Promise.all([
        getAllNetworks(),
        isAuthenticated && user ? getNetworkMembershipsForUser(user.id) : Promise.resolve([]),
      ])
      setNetworks(allNetworks)
      setMemberships(userMemberships)
      setIsLoading(false)
    }
    
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated, user])

  if (!isAuthenticated || !user) {
    return null
  }

  const displayName = user.displayName || user.email

  // Filter owned networks (Ownership Phase 2)
  const ownedNetworks = networks.filter(
    (n) => getNetworkOwnershipStatus(n.ownerUserId, user.id) === "owned-by-you"
  )

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="border-border/50 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Profile Information</h2>
        
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <User className="size-4" aria-hidden="true" />
              Display Name
            </label>
            <p className="text-foreground">{user.displayName || 'Not set'}</p>
            {!user.displayName && (
              <p className="text-xs text-muted-foreground mt-1">Using email as display name</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <Mail className="size-4" aria-hidden="true" />
              Email Address
            </label>
            <p className="text-foreground">{user.email}</p>
          </div>

          {/* User ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <Lock className="size-4" aria-hidden="true" />
              User ID
            </label>
            <p className="text-foreground font-mono text-xs break-all">{user.id}</p>
          </div>

          {/* Auth Status */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              Auth Status
            </label>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-sm text-foreground">Authenticated</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Owned Networks Section - Ownership Phase 2 */}
      {!isLoading && ownedNetworks.length > 0 && (
        <Card className="border-border/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Owned Networks ({ownedNetworks.length})</h2>
          
          <div className="space-y-2">
            {ownedNetworks.map((network) => (
              <Link
                key={network.id}
                href={`/builder/network/${network.id}/dashboard`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <Folder className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{network.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{network.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Network Memberships Section - Account Phase 2 */}
      {!isLoading && (
        <Card className="border-border/50 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="size-5" aria-hidden="true" />
            Network Memberships ({memberships.length})
          </h2>
          
          {memberships.length > 0 ? (
            <div className="space-y-3">
              {memberships.map((membership) => (
                <div
                  key={`${membership.networkId}-${membership.userId}`}
                  className="p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{membership.networkName}</p>
                      <p className="text-xs text-muted-foreground">/{membership.networkSlug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs font-semibold text-foreground">{membership.roleDisplayName}</span>
                    </div>
                  </div>

                  {/* Role Weight Badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
                      Weight: {membership.reviewWeight}
                    </span>
                  </div>

                  {/* Permissions Chips */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {membership.canSubmitGuides && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Submit Guides
                      </span>
                    )}
                    {membership.canVoteOnReviews && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Vote Reviews
                      </span>
                    )}
                    {membership.canManageMembers && (
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Manage Members
                      </span>
                    )}
                    {membership.canPublishOverride && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Publish Override
                      </span>
                    )}
                  </div>

                  {/* Action Links */}
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    <Button asChild size="sm" variant="ghost" className="flex-1 h-8 text-xs">
                      <Link href={`/builder/network/${membership.networkId}/dashboard`}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="flex-1 h-8 text-xs">
                      <Link href={`/builder/network/${membership.networkId}/settings`}>
                        <Settings2 className="size-3 mr-1" aria-hidden="true" />
                        Settings
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No network memberships yet.</p>
            </div>
          )}
        </Card>
      )}

      {/* Empty State for Memberships */}
      {!isLoading && memberships.length === 0 && ownedNetworks.length === 0 && (
        <Card className="border-border/50 border-dashed p-6 text-center">
          <Users className="size-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No network memberships yet.</p>
        </Card>
      )}

      {/* Coming Soon Section */}
      <Card className="border-border/50 bg-muted/30 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Coming Soon</h2>
        
        <div className="space-y-3">
          {/* Edit Display Name */}
          <div className="flex items-start justify-between pb-3 border-b border-border/30">
            <div className="flex items-start gap-3">
              <User className="size-4 mt-1 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Edit Display Name</p>
                <p className="text-xs text-muted-foreground mt-0.5">Change how your name appears in networks</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 rounded-md bg-background">Soon</span>
          </div>

          {/* Avatar */}
          <div className="flex items-start justify-between pb-3 border-b border-border/30">
            <div className="flex items-start gap-3">
              <Users className="size-4 mt-1 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Avatar</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upload and manage your profile picture</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 rounded-md bg-background">Soon</span>
          </div>

          {/* Account Settings */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Settings className="size-4 mt-1 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">Account Settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">Email preferences and security settings</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-muted-foreground px-2 py-1 rounded-md bg-background">Soon</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
