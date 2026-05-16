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
  // Draft: warm parchment/amber — soft and unfinished
  draft:
    "bg-[color-mix(in_oklch,var(--brass-100)_85%,var(--background))] text-[oklch(0.42_0.08_55)] border-[color-mix(in_oklch,var(--brass-500)_30%,transparent)]",
  // In Review: brand steel blue (--brand-steel-blue #35546B, hue 225)
  "in-review":
    "bg-[oklch(0.94_0.015_225)] dark:bg-[oklch(0.24_0.04_225)] text-[oklch(0.34_0.055_225)] dark:text-[oklch(0.78_0.065_225)] border-[oklch(0.37_0.05_225)]/40",
  // Ready: brand teal (--brand-teal #2F8A87, hue 185) — vetted, awaiting publish
  ready:
    "bg-[oklch(0.93_0.03_185)] dark:bg-[oklch(0.24_0.05_185)] text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)] border-[oklch(0.55_0.09_185)]/40",
  // Published: brand teal — live and verified
  published:
    "bg-[oklch(0.93_0.03_185)]/70 text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)] border-[oklch(0.55_0.09_185)]/40",
  "needs-update":
    "border-[#D9A097] bg-[#F4DCD8] text-[#8A2A1C]",
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
  "expert-reviewed":
    "bg-[color-mix(in_oklch,var(--brass-100)_85%,var(--card))] text-[var(--brass-700)] border-[color-mix(in_oklch,var(--brass-500)_40%,transparent)]",
  "community-proven":
    "bg-[color-mix(in_oklch,var(--brass-100)_85%,var(--card))] text-[var(--brass-700)] border-[color-mix(in_oklch,var(--brass-500)_40%,transparent)]",
  // Forge-verified: brass on parchment
  "forge-verified":
    "bg-[color-mix(in_oklch,var(--brass-100)_70%,var(--card))] text-[var(--brass-700)] border-[var(--brass-500)] font-semibold",
  // Forged: graphite plate with brass text — the premium status
  forged:
    "bg-[oklch(0.22_0.014_55)] text-[oklch(0.86_0.1_70)] border-[oklch(0.45_0.08_45)] font-bold uppercase tracking-[0.1em] shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--brass-300)_70%,transparent)]",
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
