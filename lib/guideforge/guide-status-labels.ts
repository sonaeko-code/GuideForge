/**
 * Guide Status Language (Lane 2A)
 * 
 * Standardized labels for guide lifecycle states:
 * - Draft: Private workspace item, not public
 * - Pending Review: Submitted for review, not public unless rules allow provisional display
 * - Published: Visible on public network
 * - Forged: Higher-trust verified status after governance/review (placeholder, not automatic)
 */

import type { GuideStatus, VerificationStatus } from './types'

export interface StatusLabel {
  label: string
  description: string
  displayName: string
  isPublic: boolean
}

/**
 * Get standardized status label for a guide
 */
export function getGuideStatusLabel(status: GuideStatus): StatusLabel {
  switch (status) {
    case 'draft':
      return {
        label: 'draft',
        displayName: 'Draft',
        description: 'Private workspace item, not public',
        isPublic: false,
      }
    case 'in-review':
      return {
        label: 'pending-review',
        displayName: 'Pending Review',
        description: 'Submitted for review, not public unless rules allow provisional display',
        isPublic: false,
      }
    case 'ready':
      return {
        label: 'pending-review',
        displayName: 'Pending Review',
        description: 'Ready for review, awaiting approval',
        isPublic: false,
      }
    case 'published':
      return {
        label: 'published',
        displayName: 'Published',
        description: 'Visible on public network',
        isPublic: true,
      }
    case 'needs-update':
      return {
        label: 'needs-update',
        displayName: 'Needs Update',
        description: 'Requires content refresh',
        isPublic: false,
      }
    case 'deprecated':
      return {
        label: 'deprecated',
        displayName: 'Deprecated',
        description: 'No longer recommended',
        isPublic: false,
      }
    case 'archived':
      return {
        label: 'archived',
        displayName: 'Archived',
        description: 'Preserved for reference',
        isPublic: false,
      }
    default:
      return {
        label: 'unknown',
        displayName: 'Unknown',
        description: 'Status unknown',
        isPublic: false,
      }
  }
}

/**
 * Get standardized label for verification status
 */
export function getVerificationStatusLabel(verification: VerificationStatus): StatusLabel {
  switch (verification) {
    case 'unverified':
      return {
        label: 'unverified',
        displayName: 'Unverified',
        description: 'Not yet reviewed',
        isPublic: false,
      }
    case 'reviewed':
      return {
        label: 'reviewed',
        displayName: 'Reviewed',
        description: 'Passed initial review',
        isPublic: true,
      }
    case 'expert-reviewed':
      return {
        label: 'expert-reviewed',
        displayName: 'Expert Reviewed',
        description: 'Reviewed by a subject expert',
        isPublic: true,
      }
    case 'community-proven':
      return {
        label: 'community-proven',
        displayName: 'Community Proven',
        description: 'Validated by community feedback',
        isPublic: true,
      }
    case 'forge-verified':
    case 'forged':
      return {
        label: 'forged',
        displayName: 'Forged',
        description: 'Highest trust tier (verified and governance-approved)',
        isPublic: true,
      }
    default:
      return {
        label: 'unknown',
        displayName: 'Unknown',
        description: 'Verification status unknown',
        isPublic: false,
      }
  }
}

/**
 * Check if guide should be visible on public site
 * based on status and verification
 */
export function isGuidPublic(status: GuideStatus, verification?: VerificationStatus): boolean {
  const statusLabel = getGuideStatusLabel(status)
  
  // Only published guides are public
  if (status !== 'published') {
    return false
  }

  // Published guides are public by default
  return statusLabel.isPublic
}
