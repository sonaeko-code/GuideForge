import Link from "next/link"
import {
  ArrowRight,
  Gamepad2,
  GraduationCap,
  LifeBuoy,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import type { NetworkType } from "@/lib/guideforge/types"

interface DirectionOption {
  type: NetworkType
  title: string
  blurb: string
  icon: LucideIcon
  href: string
  recommended?: boolean
  available?: boolean
}

const OPTIONS: DirectionOption[] = [
  {
    type: "gaming",
    title: "Gaming Guide Network",
    blurb:
      "Builds, walkthroughs, raid mechanics, patch notes. The first demo path.",
    icon: Gamepad2,
    href: "/builder/network/new?type=gaming",
    recommended: true,
    available: true,
  },
  {
    type: "repair",
    title: "Repair / Support Platform",
    blurb:
      "Procedural repair guides with safety callouts and product targeting.",
    icon: Wrench,
    href: "/builder/network/new?type=repair",
  },
  {
    type: "sop",
    title: "Business SOP Portal",
    blurb:
      "Process owners, revisions, and structured SOPs your team will actually follow.",
    icon: LifeBuoy,
    href: "/builder/network/new?type=sop",
  },
  {
    type: "creator",
    title: "Creator Guide Hub",
    blurb:
      "Personal teaching networks: tutorials, courses, and reference material.",
    icon: Sparkles,
    href: "/builder/network/new?type=creator",
  },
  {
    type: "training",
    title: "Training Library",
    blurb:
      "Curriculum-shaped collections with audience targeting and prerequisites.",
    icon: GraduationCap,
    href: "/builder/network/new?type=training",
  },
  {
    type: "community",
    title: "Community Knowledge Base",
    blurb:
      "Structured community guides with trust tiers and contributor credit.",
    icon: Users,
    href: "/builder/network/new?type=community",
  },
]

export default function BuilderWelcomePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10">
          <WizardProgress
            steps={BUILDER_WIZARD_STEPS}
            currentStepIndex={getWizardIndex("welcome")}
          />
        </div>

        <header className="mb-10 flex flex-col gap-3 md:max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step 1 — Choose direction
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            What kind of guide world are you building?
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Each direction comes with its own opinionated Forge Rules and
            starter pages. You can change theme, branding, and rules later.
          </p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const cardClasses = [
              "group relative flex h-full flex-col gap-4 rounded-xl border bg-card p-5 text-left transition-colors",
              option.available
                ? "border-primary/30 ring-1 ring-primary/20 hover:border-primary/60"
                : "border-border hover:border-primary/40 hover:bg-accent/40",
            ].join(" ")

            return (
              <li key={option.type}>
                <Link
                  href={option.available ? option.href : "#"}
                  aria-disabled={!option.available}
                  className={cardClasses}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    {option.recommended ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Recommended
                      </span>
                    ) : !option.available ? (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Coming next
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {option.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {option.blurb}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary">
                    {option.available ? "Continue" : "Available soon"}
                    {option.available ? (
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="mt-8 text-sm text-muted-foreground">
          Not sure yet? Start with{" "}
          <Link
            href="/builder/network/new?type=gaming"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Gaming Guide Network
          </Link>{" "}
          — the demo path is fully wired.
        </p>
      </div>
    </main>
  )
}
