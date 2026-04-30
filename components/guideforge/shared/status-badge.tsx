import { cn } from "@/lib/utils"
import type { GuideStatus, VerificationStatus } from "@/lib/guideforge/types"

type StatusKind = "guide" | "verification"

interface StatusBadgeProps {
  /** When kind="guide", pass a GuideStatus. When kind="verification", pass a VerificationStatus. */
  status: GuideStatus | VerificationStatus
  kind?: StatusKind
  className?: string
}

const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: "Draft",
  "in-review": "In Review",
  ready: "Ready",
  published: "Published",
  "needs-update": "Needs update",
  deprecated: "Deprecated",
  archived: "Archived",
}

const GUIDE_STATUS_STYLE: Record<GuideStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  "in-review": "bg-accent text-accent-foreground border-accent",
  ready: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "needs-update":
    "bg-destructive/10 text-destructive border-destructive/30",
  deprecated:
    "bg-muted text-muted-foreground border-border line-through opacity-80",
  archived: "bg-muted text-muted-foreground border-border opacity-70",
}

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  reviewed: "Reviewed",
  "expert-reviewed": "Expert-reviewed",
  "community-proven": "Community-proven",
  "forge-verified": "Forge-verified",
  forged: "Forged",
}

const VERIFICATION_STYLE: Record<VerificationStatus, string> = {
  unverified: "bg-muted text-muted-foreground border-border",
  reviewed: "bg-secondary text-secondary-foreground border-border",
  "expert-reviewed": "bg-accent text-accent-foreground border-accent",
  "community-proven": "bg-accent text-accent-foreground border-accent",
  "forge-verified": "bg-primary/10 text-primary border-primary/30",
  forged: "bg-primary text-primary-foreground border-primary",
}

export function StatusBadge({
  status,
  kind = "guide",
  className,
}: StatusBadgeProps) {
  const label =
    kind === "guide"
      ? GUIDE_STATUS_LABEL[status as GuideStatus]
      : VERIFICATION_LABEL[status as VerificationStatus]

  const style =
    kind === "guide"
      ? GUIDE_STATUS_STYLE[status as GuideStatus]
      : VERIFICATION_STYLE[status as VerificationStatus]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style,
        className,
      )}
    >
      <span
        className="size-1.5 rounded-full bg-current opacity-70"
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
