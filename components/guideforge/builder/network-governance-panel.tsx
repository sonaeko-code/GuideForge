'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Users, Shield, Check, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/guideforge/auth-context'
import {
  getRoleDefinitionsForNetwork,
  getNetworkMembersForNetwork,
  getCurrentUserNetworkMembership,
  claimOwnerlessNetwork,
} from '@/lib/guideforge/supabase-networks'
import type { NetworkRoleDefinition, NetworkMember, Network } from '@/lib/guideforge/types'

interface NetworkGovernancePanelProps {
  networkId: string
  network?: Network
}

/**
 * Network Governance Panel - Phase 2 & 3
 * Phase 2: Read-only display of network roles and members
 * Phase 3: Allow claiming ownerless networks
 */
export function NetworkGovernancePanel({ networkId, network }: NetworkGovernancePanelProps) {
  const { user, isAuthenticated } = useAuth()
  const [roles, setRoles] = useState<NetworkRoleDefinition[]>([])
  const [members, setMembers] = useState<NetworkMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<NetworkMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadGovernanceData = async () => {
    setIsLoading(true)
    const [roleData, memberData, userMembership] = await Promise.all([
      getRoleDefinitionsForNetwork(networkId),
      getNetworkMembersForNetwork(networkId),
      isAuthenticated ? getCurrentUserNetworkMembership(networkId) : Promise.resolve(null),
    ])
    setRoles(roleData)
    setMembers(memberData)
    setCurrentUserRole(userMembership)
    setIsLoading(false)
  }

  useEffect(() => {
    loadGovernanceData()
  }, [networkId, isAuthenticated])

  // Governance Phase 3: Claim ownerless network
  const handleClaimNetwork = async () => {
    if (!user?.id || !network) {
      setClaimMessage({ type: 'error', text: 'User not authenticated or network data missing' })
      return
    }

    setIsClaiming(true)
    setClaimMessage(null)

    try {
      const result = await claimOwnerlessNetwork(networkId, user.id)
      if (result.success) {
        setClaimMessage({ type: 'success', text: 'Network claimed successfully!' })
        // Reload governance data to reflect new ownership
        await loadGovernanceData()
      } else {
        setClaimMessage({ type: 'error', text: result.error || 'Failed to claim network' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setClaimMessage({ type: 'error', text: `Error claiming network: ${message}` })
    } finally {
      setIsClaiming(false)
    }
  }

  // Determine if claim button should show
  // Only show if: authenticated, network is ownerless, current user not already a member
  const canClaim = isAuthenticated && network && !network.ownerUserId && !currentUserRole

  if (isLoading) {
    return (
      <Card className="border-border/50 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Governance & Roles</h2>
        <div className="text-sm text-muted-foreground">Loading governance information...</div>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Shield className="size-5" aria-hidden="true" />
        Governance & Roles
      </h2>

      <div className="space-y-8">
        {/* Claim Button - Phase 3 */}
        {canClaim && (
          <div className="p-4 rounded-lg border-2 border-primary/50 bg-primary/5">
            <p className="text-sm text-foreground mb-3">
              This network has no owner. You can claim it to become the owner and manage roles and members.
            </p>
            <Button
              onClick={handleClaimNetwork}
              disabled={isClaiming}
              size="sm"
              className="w-full"
            >
              {isClaiming ? 'Claiming...' : 'Claim Network'}
            </Button>
            {claimMessage && (
              <div className={`mt-3 p-3 rounded text-sm flex items-start gap-2 ${
                claimMessage.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/10 text-red-700 dark:text-red-300'
              }`}>
                {claimMessage.type === 'success' ? (
                  <Check className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <X className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{claimMessage.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Current User Role */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Your Role</h3>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            {isAuthenticated ? (
              currentUserRole ? (
                <>
                  <div className="size-3 rounded-full bg-emerald-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{currentUserRole.displayName || currentUserRole.canonicalRole}</p>
                    <p className="text-xs text-muted-foreground">in this network</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">No network role assigned</p>
                    <p className="text-xs text-muted-foreground">You can still view this network</p>
                  </div>
                </>
              )
            ) : (
              <>
                <AlertCircle className="size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">Signed out</p>
                  <p className="text-xs text-muted-foreground">Sign in to see your role</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Role Definitions */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="size-4" aria-hidden="true" />
            Role Definitions ({roles.length})
          </h3>
          {roles.length > 0 ? (
            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{role.displayName}</p>
                      <p className="text-xs text-muted-foreground">{role.canonicalRole}</p>
                    </div>
                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded text-foreground">
                      Weight: {role.reviewWeight}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={role.canSubmitGuides ? 'text-foreground' : 'text-muted-foreground'}>
                      {role.canSubmitGuides ? '✓' : '✗'} Submit guides
                    </div>
                    <div className={role.canVoteOnReviews ? 'text-foreground' : 'text-muted-foreground'}>
                      {role.canVoteOnReviews ? '✓' : '✗'} Vote on reviews
                    </div>
                    <div className={role.canManageMembers ? 'text-foreground' : 'text-muted-foreground'}>
                      {role.canManageMembers ? '✓' : '✗'} Manage members
                    </div>
                    <div className={role.canPublishOverride ? 'text-foreground' : 'text-muted-foreground'}>
                      {role.canPublishOverride ? '✓' : '✗'} Publish override
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/30">
              No role definitions found.
            </div>
          )}
        </div>

        {/* Network Members */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="size-4" aria-hidden="true" />
            Network Members ({members.length})
          </h3>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.id} className="p-3 rounded-lg border border-border/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.displayName || member.userId}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {member.userId}
                    </p>
                  </div>
                  <div className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded">
                    {member.canonicalRole}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/30">
              No members assigned yet.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
