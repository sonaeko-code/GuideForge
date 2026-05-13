import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import {
  getEnabledRegistryTypes,
  getComingNextRegistryTypes,
} from "@/lib/guideforge/network-types"
import { getThemeIcon } from "@/lib/guideforge/network-themes"

export default function BuilderWelcomePage() {
  const enabledTypes = getEnabledRegistryTypes()
  const comingNextTypes = getComingNextRegistryTypes()

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

        {/* Quick Idea Intake — for users who want to describe their idea first */}
        <div className="mb-12 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Start with an idea</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Describe what you want to build, and GuideForge will suggest the best path forward.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const idea = (e.currentTarget.elements.namedItem("quick-idea") as HTMLInputElement)?.value
              if (idea.trim()) {
                // Store the idea in sessionStorage for the wizard to pick up
                sessionStorage.setItem("guideforge:quick-idea", idea)
                // Route to network creation with the idea
                window.location.href = "/builder/network/new"
              }
            }}
            className="flex gap-2 flex-col sm:flex-row"
          >
            <input
              name="quick-idea"
              type="text"
              placeholder="e.g. Build a survival RPG guide network for my gaming community..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              Let&apos;s Build
            </button>
          </form>
        </div>

        {/* Enabled Network Types */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enabledTypes.map((entry) => {
            const Icon = getThemeIcon(entry.defaultTheme)
            const cardClasses = [
              "group relative flex h-full flex-col gap-4 rounded-xl border bg-card p-5 text-left transition-colors",
              entry.id === "gaming"
                ? "border-primary/30 ring-1 ring-primary/20 hover:border-primary/60"
                : "border-border hover:border-primary/40 hover:bg-accent/40",
            ].join(" ")

            return (
              <li key={entry.id}>
                <Link
                  href={`/builder/network/new?type=${entry.id}`}
                  className={cardClasses}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    {entry.id === "gaming" && (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      {entry.label}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary">
                    Continue
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Coming Next Section */}
        {comingNextTypes.length > 0 && (
          <>
            <div className="mt-12 mb-6">
              <h2 className="text-lg font-semibold text-foreground">Coming Next</h2>
              <p className="text-sm text-muted-foreground">
                More network types coming soon as GuideForge expands.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {comingNextTypes.map((entry) => {
                const Icon = getThemeIcon(entry.defaultTheme)
                return (
                  <li
                    key={entry.id}
                    className="relative flex h-full flex-col gap-4 rounded-xl border border-border/50 bg-card/40 p-5 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Coming soon
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {entry.label}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {entry.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

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
