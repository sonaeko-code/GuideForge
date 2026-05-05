'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, User, Lock, Users, Settings, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/guideforge/auth-context'
import { getAllNetworks } from '@/lib/guideforge/supabase-networks'
import { getNetworkOwnershipStatus, getOwnershipLabel } from '@/lib/guideforge/utils'
import type { Network } from '@/lib/guideforge/types'

/**
 * Account Profile Card - Phase 1
 * Displays user profile information and owned networks
 */
export function AccountProfileCard() {
  const { user, isAuthenticated } = useAuth()
  const [networks, setNetworks] = useState<Network[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load networks to show owned networks list
  useEffect(() => {
    const loadNetworks = async () => {
      setIsLoading(true)
      const allNetworks = await getAllNetworks()
      setNetworks(allNetworks)
      setIsLoading(false)
    }
    
    if (isAuthenticated) {
      loadNetworks()
    }
  }, [isAuthenticated])

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
