import { cn } from "@/lib/utils"

interface QuestLineMarkProps {
  className?: string
  /** Render only the inner glyph (no rounded background container). */
  bare?: boolean
  "aria-hidden"?: boolean
}

/**
 * QuestLine brand mark.
 *
 * A 4-point quest waypoint star — a stylized diamond with extending
 * cardinal rays, reminiscent of map markers and quest objectives in
 * games. Distinct from GuideForge's compass: this mark is sharper,
 * more directional, more editorial.
 *
 * Communicates: gaming destinations, waypoints, quests, content paths.
 */
export function QuestLineMark({
  className,
  bare,
  "aria-hidden": ariaHidden = true,
}: QuestLineMarkProps) {
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
      {/* Outer 4-point star (rays) */}
      <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
      {/* Inner diamond fill */}
      <path
        d="M12 7 L15 12 L12 17 L9 12 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )

  if (bare) return glyph

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-foreground text-background",
        className,
      )}
    >
      {glyph}
    </span>
  )
}
