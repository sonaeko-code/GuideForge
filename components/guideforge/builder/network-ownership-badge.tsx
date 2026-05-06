'use client'

import { useAuth } from '@/lib/guideforge/auth-context'
import { getNetworkOwnershipStatus, getOwnershipLabel } from '@/lib/guideforge/utils'
import { Badge } from '@/components/ui/badge'

interface NetworkOwnershipBadgeProps {
  ownerUserId?: string | null
  variant?: 'default' | 'secondary'
}

/**
 * Ownership Labels Phase: Client-side badge component
 * Shows ownership status on server-rendered pages
 * 
 * Displays:
 * - "Owned by you" if network.ownerUserId === current user id
 * - "No owner assigned" if ownerUserId is null
 * - "Owned by another user" if owned but not by current user
 * - Works when signed out (shows "Owned by another user" for owned networks)
 */
export function NetworkOwnershipBadge({ ownerUserId, variant = 'secondary' }: NetworkOwnershipBadgeProps) {
  const { user } = useAuth()
  
  const status = getNetworkOwnershipStatus(ownerUserId, user?.id)
  const label = getOwnershipLabel(status)
  
  return (
    <Badge variant={variant} className="text-xs">
      {label}
    </Badge>
  )
}
