'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Users, Shield, Check, X, Edit2, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/guideforge/auth-context'
import {
  getRoleDefinitionsForNetwork,
  getNetworkMembersForNetwork,
  getCurrentUserNetworkMembership,
  claimOwnerlessNetwork,
  updateNetworkRoleDisplayNames,
  addNetworkMember,
  updateNetworkMemberRole,
  removeNetworkMember,
  getCurrentUserNetworkAuthority,
} from '@/lib/guideforge/supabase-networks'
import { shortUUID } from '@/lib/guideforge/uuid-utils'
import type { NetworkRoleDefinition, NetworkMember, Network } from '@/lib/guideforge/types'

interface NetworkGovernancePanelProps {
  networkId: string
  network?: Network
}

/**
 * Network Governance Panel - Phase 2, 3, 4, & 5
 * Phase 2: Read-only display of network roles and members
 * Phase 3: Allow claiming ownerless networks
 * Phase 4: Editable role display names (theme labels)
 * Phase 5: Basic member management (add/update/remove)
 */
export function NetworkGovernancePanel({ networkId, network }: NetworkGovernancePanelProps) {
  const { user, isAuthenticated } = useAuth()
  const [roles, setRoles] = useState<NetworkRoleDefinition[]>([])
  const [members, setMembers] = useState<NetworkMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<NetworkMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Phase 4: Editable display names
  const [isEditingLabels, setIsEditingLabels] = useState(false)
  const [editedDisplayNames, setEditedDisplayNames] = useState<Record<string, string>>({})
  const [isUpdatingLabels, setIsUpdatingLabels] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Phase 5: Member management
  const [newMemberId, setNewMemberId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [memberMessage, setMemberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [updatingMemberRoles, setUpdatingMemberRoles] = useState<Record<string, string>>({})
  const [isUpdatingMemberRole, setIsUpdatingMemberRole] = useState<Record<string, boolean>>({})
  const [isRemovingMember, setIsRemovingMember] = useState<Record<string, boolean>>({})

  // Phase 6: Permission gating
  const [canManageMembers, setCanManageMembers] = useState(false)

  const loadGovernanceData = async () => {
    setIsLoading(true)
    const [roleData, memberData, userMembership, authority] = await Promise.all([
      getRoleDefinitionsForNetwork(networkId),
      getNetworkMembersForNetwork(networkId),
      isAuthenticated ? getCurrentUserNetworkMembership(networkId) : Promise.resolve(null),
      isAuthenticated ? getCurrentUserNetworkAuthority(networkId) : Promise.resolve(null),
    ])
    setRoles(roleData)
    setMembers(memberData)
    setCurrentUserRole(userMembership)
    if (authority) {
      setCanManageMembers(authority.canManageMembers)
    }
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

  // Governance Phase 4: Edit role display names
  const handleStartEditing = () => {
    const initial: Record<string, string> = {}
    roles.forEach((role) => {
      initial[role.canonicalRole] = role.displayName
    })
    setEditedDisplayNames(initial)
    setIsEditingLabels(true)
    setUpdateMessage(null)
  }

  const handleCancelEditing = () => {
    setIsEditingLabels(false)
    setEditedDisplayNames({})
    setUpdateMessage(null)
  }

  const handleSaveLabels = async () => {
    // Validate changes exist
    const changes = roles.filter(
      (role) => editedDisplayNames[role.canonicalRole] !== role.displayName
    )

    if (changes.length === 0) {
      setUpdateMessage({ type: 'error', text: 'No changes to save' })
      return
    }

    setIsUpdatingLabels(true)
    setUpdateMessage(null)

    try {
      const updates = changes.map((role) => ({
        canonicalRole: role.canonicalRole,
        displayName: editedDisplayNames[role.canonicalRole],
      }))

      const result = await updateNetworkRoleDisplayNames(networkId, updates)

      if (result.success) {
        setUpdateMessage({ type: 'success', text: 'Role labels saved successfully!' })
        setIsEditingLabels(false)
        // Reload to get updated display names
        await loadGovernanceData()
      } else {
        setUpdateMessage({ type: 'error', text: result.error || 'Failed to save labels' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setUpdateMessage({ type: 'error', text: `Error saving labels: ${message}` })
    } finally {
      setIsUpdatingLabels(false)
    }
  }

  const handleDisplayNameChange = (canonicalRole: string, value: string) => {
    setEditedDisplayNames((prev) => ({
      ...prev,
      [canonicalRole]: value,
    }))
  }

  // Determine if claim button should show
  // Only show if: authenticated, network is ownerless, current user not already a member
  const canClaim = isAuthenticated && network && !network.ownerUserId && !currentUserRole

  // Governance Phase 5: Member management
  const handleAddMember = async () => {
    if (!newMemberId.trim()) {
      setMemberMessage({ type: 'error', text: 'User ID cannot be empty' })
      return
    }

    if (!newMemberRole) {
      setMemberMessage({ type: 'error', text: 'Role cannot be empty' })
      return
    }

    setIsAddingMember(true)
    setMemberMessage(null)

    try {
      const result = await addNetworkMember(networkId, newMemberId.trim(), newMemberRole)
      if (result.success) {
        setMemberMessage({ type: 'success', text: `Member added successfully!` })
        setNewMemberId('')
        setNewMemberRole('member')
        await loadGovernanceData()
      } else {
        setMemberMessage({ type: 'error', text: result.error || 'Failed to add member' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMemberMessage({ type: 'error', text: `Error adding member: ${message}` })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, userId: string) => {
    const newRole = updatingMemberRoles[memberId]
    if (!newRole) {
      setMemberMessage({ type: 'error', text: 'Role cannot be empty' })
      return
    }

    setIsUpdatingMemberRole((prev) => ({ ...prev, [memberId]: true }))
    setMemberMessage(null)

    try {
      const result = await updateNetworkMemberRole(networkId, userId, newRole)
      if (result.success) {
        setMemberMessage({ type: 'success', text: 'Member role updated!' })
        setUpdatingMemberRoles((prev) => {
          const updated = { ...prev }
          delete updated[memberId]
          return updated
        })
        await loadGovernanceData()
      } else {
        setMemberMessage({ type: 'error', text: result.error || 'Failed to update role' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMemberMessage({ type: 'error', text: `Error updating role: ${message}` })
    } finally {
      setIsUpdatingMemberRole((prev) => ({ ...prev, [memberId]: false }))
    }
  }

  const handleRemoveMember = async (memberId: string, userId: string) => {
    setIsRemovingMember((prev) => ({ ...prev, [memberId]: true }))
    setMemberMessage(null)

    try {
      const result = await removeNetworkMember(networkId, userId, user?.id)
      if (result.success) {
        setMemberMessage({ type: 'success', text: 'Member removed!' })
        await loadGovernanceData()
      } else {
        setMemberMessage({ type: 'error', text: result.error || 'Failed to remove member' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setMemberMessage({ type: 'error', text: `Error removing member: ${message}` })
    } finally {
      setIsRemovingMember((prev) => ({ ...prev, [memberId]: false }))
    }
  }

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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="size-4" aria-hidden="true" />
              Role Definitions ({roles.length})
            </h3>
            {!isEditingLabels && roles.length > 0 && (
              <Button
                onClick={handleStartEditing}
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
              >
                <Edit2 className="size-3" aria-hidden="true" />
                Edit Role Labels
              </Button>
            )}
          </div>

          {isEditingLabels ? (
            <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-muted/30 mb-4">
              <p className="text-xs text-muted-foreground mb-4">
                Display names change what users see. Permissions still use the locked canonical role.
              </p>
              {roles.map((role) => (
                <div key={role.id} className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    {role.canonicalRole} (canonical role - locked)
                  </label>
                  <Input
                    type="text"
                    value={editedDisplayNames[role.canonicalRole] || ''}
                    onChange={(e) =>
                      handleDisplayNameChange(
                        role.canonicalRole,
                        e.target.value
                      )
                    }
                    placeholder={`Display name for ${role.canonicalRole}`}
                    maxLength={40}
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(editedDisplayNames[role.canonicalRole] || '').length}/40
                  </p>
                </div>
              ))}

              {updateMessage && (
                <div
                  className={`p-3 rounded text-sm flex items-start gap-2 ${
                    updateMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-500/10 text-red-700 dark:text-red-300'
                  }`}
                >
                  {updateMessage.type === 'success' ? (
                    <Check className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <X className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{updateMessage.text}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveLabels}
                  disabled={isUpdatingLabels}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                >
                  {isUpdatingLabels ? 'Saving...' : 'Save Role Labels'}
                </Button>
                <Button
                  onClick={handleCancelEditing}
                  disabled={isUpdatingLabels}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

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

        {/* Network Members - Phase 5: Manage Members, Phase 6: Permission gating */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="size-4" aria-hidden="true" />
            Manage Members ({members.length})
          </h3>

          {!canManageMembers ? (
            <>
              {/* Read-only member list when user cannot manage */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Only network owners/admins can manage members.
                </p>
              </div>

              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="p-3 rounded-lg border border-border/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {member.displayName || member.userId}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono break-all" title={member.userId}>
                            {shortUUID(member.userId)}
                          </p>
                        </div>
                        <div className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                          {member.displayName || member.canonicalRole}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/30">
                  No members assigned yet.
                </div>
              )}
            </>
          ) : (
            <>
          {/* Add Member Form */}
          <div className="p-4 rounded-lg border border-border/50 bg-muted/30 mb-4">
            <p className="text-xs text-muted-foreground mb-3">Add a new member by user ID</p>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="User ID (UUID)"
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value)}
                className="h-8 text-sm"
              />
              <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.canonicalRole} value={role.canonicalRole}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddMember}
                disabled={isAddingMember || !newMemberId.trim() || !newMemberRole}
                size="sm"
                className="w-full h-8 text-xs gap-1"
              >
                <Plus className="size-3" aria-hidden="true" />
                {isAddingMember ? 'Adding...' : 'Add Member'}
              </Button>
            </div>

            {memberMessage && (
              <div
                className={`mt-3 p-3 rounded text-sm flex items-start gap-2 ${
                  memberMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/10 text-red-700 dark:text-red-300'
                }`}
              >
                {memberMessage.type === 'success' ? (
                  <Check className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <X className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{memberMessage.text}</span>
              </div>
            )}
          </div>

          {/* Members List */}
          {members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member) => {
                const isEditingRole = updatingMemberRoles[member.id]
                const newRole = isEditingRole || member.canonicalRole
                return (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg border border-border/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {member.displayName || member.userId}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono break-all" title={member.userId}>
                          {shortUUID(member.userId)}
                        </p>
                      </div>
                    </div>

                    {/* Role selector and actions */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-muted-foreground block mb-1">
                          Role
                        </label>
                        <Select
                          value={isEditingRole ? updatingMemberRoles[member.id] : member.canonicalRole}
                          onValueChange={(value) =>
                            setUpdatingMemberRoles((prev) => ({
                              ...prev,
                              [member.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.canonicalRole} value={role.canonicalRole}>
                                {role.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Save button - only shows if role changed */}
                      {isEditingRole && updatingMemberRoles[member.id] !== member.canonicalRole && (
                        <Button
                          onClick={() => handleUpdateMemberRole(member.id, member.userId)}
                          disabled={isUpdatingMemberRole[member.id]}
                          size="sm"
                          className="h-8 text-xs"
                        >
                          {isUpdatingMemberRole[member.id] ? 'Saving...' : 'Save'}
                        </Button>
                      )}

                      {/* Remove button */}
                      <Button
                        onClick={() => handleRemoveMember(member.id, member.userId)}
                        disabled={isRemovingMember[member.id] || isAddingMember}
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 text-red-600 dark:text-red-400"
                      >
                        {isRemovingMember[member.id] ? (
                          'Removing...'
                        ) : (
                          <>
                            <Trash2 className="size-3" aria-hidden="true" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/30">
              No members assigned yet.
            </div>
          )}
        </>
          )}
        </div>
      </div>
    </Card>
  )
}
