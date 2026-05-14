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
 * Forged Badge Component (Lane 2A Placeholder)
 * 
 * Displays a placeholder "Forged" badge for guides that have passed
 * network governance and review requirements. Currently display-only;
 * the badge is not awarded automatically.
 * 
 * Future: Will be connected to full review/vote workflow in Lane 2B.
 */
export function ForgedBadge({ isForged = false, showLabel = true, className = '' }: ForgedBadgeProps) {
  if (!isForged) {
    return null
  }

  return (
    <Badge 
      className={`gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 ${className}`}
    >
      <Shield className="size-3" aria-hidden="true" />
      {showLabel && 'Forged'}
    </Badge>
  )
}
