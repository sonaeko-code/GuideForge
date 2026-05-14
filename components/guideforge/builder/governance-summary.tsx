'use client'

import { Shield } from 'lucide-react'
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

  const cell =
    "inline-flex items-center rounded-full border border-[oklch(0.45_0.08_45)] bg-[oklch(0.18_0.012_55)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.86_0.1_70)]"

  return (
    <div className="surface-graphite relative overflow-hidden rounded-xl p-6 shadow-forge-lg">
      <div className="absolute inset-0 bg-constellation opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass-300)]">
              Forge Governance
            </p>
            <h3 className="mt-1 text-lg font-bold leading-tight text-foreground">
              Trust &amp; Standards
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Network rules and verification policy
            </p>
          </div>
          <div className="forge-seal flex size-10 items-center justify-center rounded-full text-[oklch(0.18_0.02_50)] flex-shrink-0">
            <Shield className="size-4" aria-hidden="true" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {/* Verification Level */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[var(--brass-300)] uppercase tracking-[0.15em]">
              Verification
            </p>
            <span className={cell}>{verificationLabelMap[governance.verificationLevel]}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[var(--brass-300)] uppercase tracking-[0.15em]">
              Standard
            </p>
            <span className={cell}>{contentStandardMap[governance.contentStandard]}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[var(--brass-300)] uppercase tracking-[0.15em]">
              AI Policy
            </p>
            <span className={cell}>{aiPolicyMap[governance.aiPolicy]}</span>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[var(--brass-300)] uppercase tracking-[0.15em]">
              Contributors
            </p>
            <span className={cell}>{contributorModeMap[governance.contributorMode]}</span>
          </div>
        </div>

        {/* Brass divider */}
        <div className="divider-brass my-5" aria-hidden="true" />

        <div>
          <p className="mb-3 text-[10px] font-semibold text-[var(--brass-300)] uppercase tracking-[0.15em]">
            Public Trust Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {governance.trustBadges.showVerified && (
              <span className={cell}>
                <Shield className="mr-1 size-3" aria-hidden="true" />
                Verified
              </span>
            )}
            {governance.trustBadges.showLastUpdated && (
              <span className={cell}>Last Updated</span>
            )}
            {governance.trustBadges.showAuthor && (
              <span className={cell}>Author</span>
            )}
            {!governance.trustBadges.showVerified &&
              !governance.trustBadges.showLastUpdated &&
              !governance.trustBadges.showAuthor && (
                <span className="text-xs text-muted-foreground italic">None enabled</span>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}
