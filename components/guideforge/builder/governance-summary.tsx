'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Zap } from 'lucide-react'
import type { Network } from '@/lib/guideforge/types'
import { getDefaultNetworkGovernanceSettings } from '@/lib/guideforge/types'

interface GovernanceSummaryProps {
  network: Network
}

/**
 * Governance Summary Card (Lane 2A)
 * 
 * Displays a compact overview of network governance settings on the dashboard.
 * Shows verification level, content standard, AI policy, and contributor mode.
 */
export function GovernanceSummary({ network }: GovernanceSummaryProps) {
  const governance = network.governanceSettings || getDefaultNetworkGovernanceSettings()

  const verificationLabelMap = {
    'open': 'Open',
    'moderated': 'Moderated',
    'verified-only': 'Verified Only',
  }

  const contentStandardMap = {
    'lenient': 'Lenient',
    'standard': 'Standard',
    'strict': 'Strict',
  }

  const aiPolicyMap = {
    'allowed': 'Allowed',
    'disclosed': 'Disclosed',
    'disallowed': 'Disallowed',
  }

  const contributorModeMap = {
    'owner-only': 'Owner Only',
    'invite': 'Invite',
    'open': 'Open',
  }

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card to-card/50 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-foreground leading-tight">Governance</h3>
          <p className="text-xs text-muted-foreground mt-1">Network rules and settings</p>
        </div>
        <Shield className="size-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Verification Level */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Verification
          </p>
          <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 text-xs font-medium">
            {verificationLabelMap[governance.verificationLevel]}
          </span>
        </div>

        {/* Content Standard */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Standard
          </p>
          <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 text-xs font-medium">
            {contentStandardMap[governance.contentStandard]}
          </span>
        </div>

        {/* AI Policy */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            AI Policy
          </p>
          <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 text-xs font-medium">
            {aiPolicyMap[governance.aiPolicy]}
          </span>
        </div>

        {/* Contributor Mode */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Contributors
          </p>
          <span className="inline-flex rounded-full border border-border/40 bg-muted/40 px-2.5 py-1 text-xs font-medium">
            {contributorModeMap[governance.contributorMode]}
          </span>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Trust Badges
        </p>
        <div className="flex flex-wrap gap-2">
          {governance.trustBadges.showVerified && (
            <Badge variant="outline" className="text-xs">✓ Verified</Badge>
          )}
          {governance.trustBadges.showLastUpdated && (
            <Badge variant="outline" className="text-xs">📅 Updated</Badge>
          )}
          {governance.trustBadges.showAuthor && (
            <Badge variant="outline" className="text-xs">👤 Author</Badge>
          )}
          {!governance.trustBadges.showVerified && 
           !governance.trustBadges.showLastUpdated && 
           !governance.trustBadges.showAuthor && (
            <span className="text-xs text-muted-foreground">None enabled</span>
          )}
        </div>
      </div>
    </Card>
  )
}
