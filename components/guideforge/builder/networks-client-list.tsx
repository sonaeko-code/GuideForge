'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Settings, Layers, FolderTree, BookMarked, Sparkles, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/guideforge/auth-context'
import { supabase, isSupabaseConfigured } from '@/lib/guideforge/supabase-client'
import type { Network } from '@/lib/guideforge/types'

interface NetworkWithCounts extends Network {
  hubCount: number
  collectionCount: number
  guideCount?: number
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
        const ownerIds = networks
          .filter((n) => n.ownerUserId)
          .map((n) => n.ownerUserId!)

        const [membershipRows, ownerProfiles, roleDefinitions] = await Promise.all([
          // Get current user's memberships (snake_case column names)
          isAuthenticated && user?.id
            ? supabase
                .from('network_members')
                .select('network_id, role_id')
                .eq('user_id', user.id)
                .then((r) => r.data || [])
            : Promise.resolve([]),
          // Get profiles for all owners — only if there are ownerIds to look up
          ownerIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, display_name, handle')
                .in('id', ownerIds)
                .then((r) => r.data || [])
            : Promise.resolve([]),
          // Get role definitions — only if user is authenticated
          isAuthenticated && user?.id
            ? supabase
                .from('network_role_definitions')
                .select('id, network_id, can_manage_network')
                .then((r) => r.data || [])
            : Promise.resolve([]),
        ])

        // Build lookup maps (use snake_case keys from Supabase response)
        const membershipMap = new Map(
          membershipRows.map((m: any) => [m.network_id, m.role_id])
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
            // No owner_id in DB — if user is authenticated, assume they can manage it
            if (isAuthenticated && user?.id) {
              relationshipBadge = 'Network'
              canManageNetwork = true
            } else {
              relationshipBadge = 'Network'
              canManageNetwork = false
            }
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
            if (!net.ownerUserId) return 2 // Ownerless / network (user likely owns)
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
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => (
          <div key={network.id} className="card-foundry rounded-xl p-5 animate-pulse opacity-60">
            <div className="h-6 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {sortedNetworks.map((network) => {
        const isOwned = network.relationshipBadge === 'Owned by you'
        const guideCount = network.guideCount ?? 0
        return (
          <article
            key={network.id}
            className="card-foundry group relative flex flex-col gap-4 rounded-xl p-5"
          >
            {/* Owner pill — top right */}
            {network.relationshipBadge && (
              <div className="absolute right-4 top-4">
                <span
                  className={
                    isOwned
                      ? "pill-warm inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                      : "inline-flex whitespace-nowrap rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                  }
                >
                  {network.relationshipBadge}
                </span>
              </div>
            )}

            {/* Title block */}
            <div className="pr-24">
              <h3 className="text-lg font-bold leading-tight text-foreground text-balance">
                {network.name}
              </h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                /{network.slug}
              </p>
            </div>

            {/* Description */}
            {network.description && (
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {network.description}
              </p>
            )}

            {/* Counts row */}
            <div className="divider-brass" aria-hidden="true" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-foreground">
                  <BookMarked className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold leading-none tabular-nums">{guideCount}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {guideCount === 1 ? 'Guide' : 'Guides'}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5 border-x border-border/40">
                <div className="flex items-center gap-1 text-foreground">
                  <Layers className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold leading-none tabular-nums">{network.hubCount}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {network.hubCount === 1 ? 'Hub' : 'Hubs'}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-foreground">
                  <FolderTree className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold leading-none tabular-nums">{network.collectionCount}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {network.collectionCount === 1 ? 'Collection' : 'Collections'}
                </span>
              </div>
            </div>

            {/* Grouped actions — context-aware secondary action based on network state.
                Management-only buttons are hidden entirely when the user can't manage,
                rather than shown as disabled-with-lock. */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="flex-1 min-w-[120px]">
                  <Link href={`/builder/network/${network.id}/dashboard`}>
                    Open Dashboard
                  </Link>
                </Button>

                {/* Contextual secondary action — only for users who can manage */}
                {network.canManageNetwork && (() => {
                  if (network.hubCount === 0) {
                    return (
                      <Button asChild size="sm" variant="outline" className="flex-1 min-w-[120px]">
                        <Link href={`/builder/network/${network.id}/hub/new`}>
                          <Plus className="size-3.5 mr-1" aria-hidden="true" />
                          First Hub
                        </Link>
                      </Button>
                    )
                  }
                  if (network.collectionCount === 0) {
                    return (
                      <Button asChild size="sm" variant="outline" className="flex-1 min-w-[120px]">
                        <Link href={`/builder/network/${network.id}/collection/new`}>
                          <Plus className="size-3.5 mr-1" aria-hidden="true" />
                          First Collection
                        </Link>
                      </Button>
                    )
                  }
                  return (
                    <Button asChild size="sm" variant="outline" className="flex-1 min-w-[120px]">
                      <Link href={`/builder/network/${network.id}/generate`}>
                        <Sparkles className="size-3.5 mr-1" aria-hidden="true" />
                        Generate Guide
                      </Link>
                    </Button>
                  )
                })()}

                {network.canManageNetwork && (
                  <Button asChild size="sm" variant="outline" aria-label="Network settings" title="Settings">
                    <Link href={`/builder/network/${network.id}/settings`}>
                      <Settings className="size-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>
              {network.slug && (
                <Button asChild size="sm" variant="ghost" className="w-full justify-center gap-2 text-xs">
                  <Link href={`/n/${network.slug}`}>
                    Public View
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
