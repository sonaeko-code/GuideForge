'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Lock, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/guideforge/auth-context'
import { supabase, isSupabaseConfigured } from '@/lib/guideforge/supabase-client'
import type { Network } from '@/lib/guideforge/types'

interface NetworkWithCounts extends Network {
  hubCount: number
  collectionCount: number
}

interface NetworksClientListProps {
  networks: NetworkWithCounts[]
}

interface NetworkCardData extends NetworkWithCounts {
  relationshipBadge: string | null
  canManageNetwork: boolean
}

/**
 * Client component for rendering network cards with:
 * - Relationship badges (Owned by you, Member, No owner, Owned by X)
 * - Smart sorting by relationship
 * - New Hub gating based on permissions
 * - Owner display names from profiles
 * 
 * Safely handles auth failures and renders base cards even if client logic fails
 */
export function NetworksClientList({ networks }: NetworksClientListProps) {
  const { user, isAuthenticated } = useAuth()
  const [sortedNetworks, setSortedNetworks] = useState<NetworkCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const enrichNetworks = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        // Supabase not available, render basic cards
        console.log('[v0] NetworksClientList: Supabase not configured, rendering basic cards')
        setSortedNetworks(networks.map((n) => ({
          ...n,
          relationshipBadge: null,
          canManageNetwork: false,
        })))
        setIsLoading(false)
        return
      }

      try {
        // Fetch enrichment data: memberships, roles, owner profiles
        const [membershipRows, ownerProfiles, roleDefinitions] = await Promise.all([
          // Get current user's memberships
          isAuthenticated && user?.id
            ? supabase
                .from('network_members')
                .select('networkId, roleId')
                .eq('userId', user.id)
                .then((r) => r.data || [])
            : Promise.resolve([]),
          // Get profiles for all owners
          networks.length > 0
            ? supabase
                .from('profiles')
                .select('id, display_name, handle')
                .in(
                  'id',
                  networks
                    .filter((n) => n.ownerUserId)
                    .map((n) => n.ownerUserId!)
                )
                .then((r) => r.data || [])
            : Promise.resolve([]),
          // Get all role definitions for permission checks
          supabase
            .from('network_role_definitions')
            .select('id, networkId, can_manage_network')
            .then((r) => r.data || []),
        ])

        // Build lookup maps
        const membershipMap = new Map(
          membershipRows.map((m: any) => [m.networkId, m.roleId])
        )
        const profileMap = new Map(
          ownerProfiles.map((p: any) => [p.id, p])
        )
        const roleMap = new Map(
          roleDefinitions.map((r: any) => [r.id, r])
        )

        // Enrich each network with badge, owner name, and permissions
        const enriched = networks.map((network) => {
          const userMembershipRoleId = membershipMap.get(network.id)
          const role = userMembershipRoleId ? roleMap.get(userMembershipRoleId) : null
          const ownerProfile = network.ownerUserId ? profileMap.get(network.ownerUserId) : null

          let relationshipBadge: string | null = null
          let canManageNetwork = false

          // Determine relationship badge - SINGLE PRIMARY BADGE ONLY
          // Priority:
          // 1. "Owned by you" (if current user owns)
          // 2. "Member: {roleDisplayName}" (if current user is member)
          // 3. "No owner assigned" (if no owner)
          // 4. "Owned by {displayNameOrHandle}" (if owner exists with display name)
          // 5. "Owned by another user" (fallback)
          
          if (isAuthenticated && user?.id === network.ownerUserId) {
            // Current user owns this network
            relationshipBadge = 'Owned by you'
            canManageNetwork = true
          } else if (userMembershipRoleId) {
            // Current user is a member - check role permissions
            if (role?.can_manage_network) {
              relationshipBadge = 'Member: Manager'
              canManageNetwork = true
            } else {
              // For other roles, try to get a role display name or default to "Member"
              relationshipBadge = 'Member'
              canManageNetwork = false
            }
          } else if (!network.ownerUserId) {
            // No owner assigned
            relationshipBadge = 'No owner assigned'
            canManageNetwork = false
          } else if (ownerProfile) {
            // Owned by another user - use display name or handle
            const ownerName = ownerProfile.display_name || ownerProfile.handle
            relationshipBadge = ownerName ? `Owned by ${ownerName}` : 'Owned by another user'
            canManageNetwork = false
          } else {
            // Owned by another user but profile not found (shouldn't happen)
            relationshipBadge = 'Owned by another user'
            canManageNetwork = false
          }

          return {
            ...network,
            relationshipBadge,
            ownerDisplayName: null, // No longer needed - badge includes owner name
            canManageNetwork,
          }
        })

        // Sort by relationship priority, then by name
        const sorted = enriched.sort((a, b) => {
          // Priority order for relationship
          const getPriority = (net: NetworkCardData) => {
            if (isAuthenticated && user?.id === net.ownerUserId) return 0 // Owned by you
            if (net.relationshipBadge?.startsWith('Member')) return 1 // Member
            if (net.relationshipBadge === 'No owner assigned') return 2 // Ownerless
            if (net.ownerUserId) return 3 // Owned by another
            return 4 // Other
          }

          const priorityA = getPriority(a)
          const priorityB = getPriority(b)

          if (priorityA !== priorityB) {
            return priorityA - priorityB
          }

          // Within same priority, sort alphabetically
          return a.name.localeCompare(b.name)
        })

        setSortedNetworks(sorted)
      } catch (err) {
        console.error('[v0] NetworksClientList: Error enriching networks:', err)
        // Fallback to basic cards
        setSortedNetworks(networks.map((n) => ({
          ...n,
          relationshipBadge: null,
          canManageNetwork: false,
        })))
      } finally {
        setIsLoading(false)
      }
    }

    enrichNetworks()
  }, [networks, user, isAuthenticated])

  // Don't show loading state - render cards immediately with fallback data
  if (sortedNetworks.length === 0 && isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => (
          <Card key={network.id} className="flex flex-col gap-4 p-5 animate-pulse opacity-50">
            <div className="h-6 bg-muted rounded" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedNetworks.map((network) => (
        <Card
          key={network.id}
          className="flex flex-col gap-4 p-5 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">
                {network.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                /{network.slug}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {network.relationshipBadge && (
                <div className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded whitespace-nowrap">
                  {network.relationshipBadge}
                </div>
              )}
            </div>
          </div>

          {network.description && (
            <p className="text-sm text-muted-foreground flex-1">
              {network.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground py-2 border-t border-border/50">
            <div>
              <span className="font-semibold text-foreground">{network.hubCount}</span> {network.hubCount === 1 ? 'hub' : 'hubs'}
            </div>
            <div>
              <span className="font-semibold text-foreground">{network.collectionCount}</span> {network.collectionCount === 1 ? 'collection' : 'collections'}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button asChild size="sm" variant="outline" className="flex-1">
              <Link href={`/builder/network/${network.id}/dashboard`}>
                Dashboard
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/builder/network/${network.id}/settings`}>
                <Settings className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>
            {network.canManageNetwork ? (
              <Button asChild size="sm" variant="outline" className="flex-1">
                <Link href={`/builder/network/${network.id}/hub/new`}>
                  New Hub
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="flex-1 opacity-50 cursor-not-allowed"
                title="Only owners/admins can add hubs"
              >
                <Lock className="size-3 mr-1" aria-hidden="true" />
                New Hub
              </Button>
            )}
          </div>

          {network.slug === 'questline' && (
            <Button asChild size="sm" variant="ghost" className="w-full gap-2">
              <Link href="/n/questline">
                View Site
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </Card>
      ))}
    </div>
  )
}
