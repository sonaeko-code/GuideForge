import { Stamp } from "lucide-react"
import { StatusBadge } from "@/components/guideforge/shared"

export function TrustSection() {
  return (
    <section id="trust" className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Trust & status
            </span>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Readers should know how trustworthy a guide is — at a glance.
            </h2>
            <p className="text-pretty leading-relaxed text-muted-foreground">
              Every guide carries a lifecycle status and a trust tier. Drafts
              are clearly marked. Reviewed and Expert-reviewed guides earn
              their badges. Forge-verified means the guide passes its
              network&apos;s required Forge Rules. <span className="font-medium text-foreground">Forged</span> is
              reserved for the highest-trust guides — fully vetted and stamped.
            </p>
            <p className="text-sm text-muted-foreground">
              The trust engine ships in a later release. The visual language
              is wired in from day one.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
              <Stamp
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Sample status surface
            </div>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-sm text-foreground">
                  Best Fire Warden Beginner Build
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="published" />
                  <StatusBadge status="forged" kind="verification" />
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-sm text-foreground">
                  Frostmarch Boss Mechanics
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="in-review" />
                  <StatusBadge status="expert-reviewed" kind="verification" />
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-sm text-foreground">
                  Patch 4.2 Impact Notes
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="needs-update" />
                  <StatusBadge status="community-proven" kind="verification" />
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <span className="text-sm text-foreground">
                  Patch 3.8 Class Tier List
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge status="deprecated" />
                  <StatusBadge status="reviewed" kind="verification" />
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
