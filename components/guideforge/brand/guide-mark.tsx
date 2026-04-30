import { cn } from "@/lib/utils"

interface GuideMarkProps {
  className?: string
  /** Render only the inner glyph (no rounded background container). */
  bare?: boolean
  "aria-hidden"?: boolean
}

/**
 * GuideForge brand mark.
 *
 * A compass rose inspired by wayfinding and trustworthy direction.
 * A cardinal point (north/top) marks the primary direction, with
 * cardinal and intercardinal lines forming a structured path mark.
 * Communicates: guided routes, structured navigation, hosted knowledge,
 * warm and crafted direction.
 */
export function GuideMark({
  className,
  bare,
  "aria-hidden": ariaHidden = true,
}: GuideMarkProps) {
  const glyph = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      className={cn(bare && className)}
    >
      {/* Cardinal lines: N, S, E, W */}
      <path d="M12 2 L12 22" />
      <path d="M2 12 L22 12" />
      
      {/* Intercardinal lines: NE, NW, SE, SW */}
      <path d="M5.5 5.5 L18.5 18.5" />
      <path d="M18.5 5.5 L5.5 18.5" />
      
      {/* Outer circle */}
      <circle cx="12" cy="12" r="10" />
      
      {/* North point highlight: larger marker at top */}
      <path d="M12 2 L10.5 6 L12 5.5 L13.5 6 Z" fill="currentColor" />
      
      {/* Center circle */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )

  if (bare) return glyph

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
    >
      {glyph}
    </span>
  )
}
