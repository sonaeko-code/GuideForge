'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Users, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/guideforge/auth-context'
import {
  getRoleDefinitionsForNetwork,
  getNetworkMembersForNetwork,
  getCurrentUserNetworkMembership,
} from '@/lib/guideforge/supabase-networks'
import type { NetworkRoleDefinition, NetworkMember } from '@/lib/guideforge/types'

interface NetworkGovernancePanelProps {
  networkId: string
}

/**
 * Network Governance Panel - Phase 2
 * Read-only display of network roles and members
 * No editing, no enforcement, visibility only
 */
export function NetworkGovernancePanel({ networkId }: NetworkGovernancePanelProps) {
  const { user, isAuthenticated } = useAuth()
  const [roles, setRoles] = useState<NetworkRoleDefinition[]>([])
  const [members, setMembers] = useState<NetworkMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<NetworkMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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

    loadGovernanceData()
  }, [networkId, isAuthenticated])

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
