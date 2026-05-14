'use client'

import { Shield } from 'lucide-react'

interface ForgedBadgeProps {
  /** Whether the guide has forged/verified status */
  isForged?: boolean
  /** Whether to show the badge label text */
  showLabel?: boolean
  /** Custom class name for styling */
  className?: string
}

/**
 * Forged Badge Component (Lane 2A Placeholder → 2D Premium Visual)
 * 
 * Displays a premium "Forged" badge for guides that have passed
 * network governance and review requirements. Currently display-only;
 * the badge is not awarded automatically.
 * 
 * Visual: Dark graphite/brass styling inspired by the Forged brand board,
 * with subtle premium feel using copper/gold accents.
 * 
 * Future: Will be connected to full review/vote workflow in Lane 2B.
 */
export function ForgedBadge({ isForged = false, showLabel = true, className = '' }: ForgedBadgeProps) {
  if (!isForged) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.45_0.08_45)] bg-[oklch(0.22_0.014_55)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[oklch(0.86_0.1_70)] shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--brass-300)_70%,transparent),inset_0_-1px_0_0_color-mix(in_oklch,var(--brass-900)_70%,transparent)] ${className}`}
    >
      <Shield className="size-3 fill-[oklch(0.66_0.13_45)] text-[oklch(0.22_0.014_55)]" aria-hidden="true" strokeWidth={2.5} />
      {showLabel && 'Forged'}
    </span>
  )
}
