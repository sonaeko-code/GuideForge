import { cn } from "@/lib/utils"
import type { DifficultyLevel } from "@/lib/guideforge/types"

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel
  className?: string
}

const LABEL: Record<DifficultyLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
}

const PIPS: Record<DifficultyLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
}

export function DifficultyBadge({
  difficulty,
  className,
}: DifficultyBadgeProps) {
  const filled = PIPS[difficulty]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-1 rounded-sm",
              i < filled ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </span>
      {LABEL[difficulty]}
    </span>
  )
}
