import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import { getDefaultForgeRules } from "@/lib/guideforge/forge-rules"
import { cn } from "@/lib/utils"

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  metadata:
    "Information that must be present for routing, versioning, or discovery.",
  structure: "How the guide is organized and sectioned.",
  tone: "Voice, accessibility, and reader experience.",
  safety: "Warnings, spoilers, and responsible disclosure.",
  lifecycle: "Status tracking and versioning.",
}

const CATEGORY_COLORS: Record<string, string> = {
  metadata: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200",
  structure:
    "bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200",
  tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  safety: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
  lifecycle:
    "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
}

export default async function ForgeRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams
  const rules = getDefaultForgeRules("gaming")

  const rulesByCategory = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = []
      }
      acc[rule.category].push(rule)
      return acc
    },
    {} as Record<string, typeof rules>
  )

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10">
          <WizardProgress
            steps={BUILDER_WIZARD_STEPS}
            currentStepIndex={getWizardIndex("forge-rules")}
          />
        </div>

        <header className="mb-8 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step 4 — Forge rules
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {name ? `${name} — guide standards` : "Review guide standards"}
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            These Forge Rules define what every guide in your network must
            follow. They ensure quality, consistency, and clarity across all
            content.
          </p>
        </header>

        <div className="mb-8 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
          <Sparkles className="mt-0.5 size-4 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Suggest Rules:</span> GuideForge can generate starter Forge Rules tailored to your network type. Rules shown are defaults for <span className="font-mono text-xs">gaming</span>. You can enable/disable rules now or edit anytime. <span className="text-xs text-muted-foreground">Mock generation — no credits used.</span>
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
            <section key={category} className="space-y-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h2>
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[category] || ""}
                  >
                    {categoryRules.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              </div>

              <div className="space-y-2">
                {categoryRules.map((rule) => (
                  <Card
                    key={rule.id}
                    className="border border-border/50 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex size-5 items-center justify-center rounded border-2 border-primary bg-primary">
                        <svg
                          className="size-3 text-background"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 gap-1">
                        <h3 className="font-semibold text-foreground">
                          {rule.label}
                          {rule.required && (
                            <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                              Required
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 space-y-4 rounded-lg border border-border/50 bg-muted/30 p-6">
          <h3 className="font-semibold text-foreground">What happens next?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>
                Every guide you create will be checked against these rules.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>Guides that meet all required rules are marked "Ready".</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">✓</span>
              <span>You can customize these rules later in your dashboard.</span>
            </li>
          </ul>
        </div>

        <div className="mt-12 flex gap-3">
          <Button asChild variant="outline">
            <Link href={`/builder/network/starter-pages${name ? `?name=${name}` : ""}`}>
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/builder/network/network_questline/dashboard`}>
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
