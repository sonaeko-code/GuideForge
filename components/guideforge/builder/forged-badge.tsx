'use client'

import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
    <Badge 
      className={`gap-1.5 border-amber-500/40 bg-gradient-to-br from-amber-500/8 to-amber-600/5 text-amber-700 dark:from-amber-700/15 dark:to-amber-800/10 dark:text-amber-300 font-semibold ${className}`}
    >
      <Shield className="size-3.5" aria-hidden="true" />
      {showLabel && 'Forged'}
    </Badge>
  )
}
