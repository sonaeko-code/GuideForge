import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import { ForgeRulesEditor } from "@/components/guideforge/builder/forge-rules-editor"

/**
 * Step 4 — Forge Rules
 *
 * The actual interaction (reading the wizard draft, updating governance
 * options, and performing the final create) lives in the
 * `ForgeRulesEditor` client component. This page is the thin server-side
 * shell that renders the wizard chrome around it.
 */
export default function ForgeRulesPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
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
            Set your governance defaults
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Choose how strict reviews, AI drafts, and public badges work in your
            network. You can change any of these later from the dashboard.
            When you&apos;re ready, hit <span className="font-medium text-foreground">Create Network</span>
            {" "}to save everything in one step.
          </p>
        </header>

        <ForgeRulesEditor />
      </div>
    </main>
  )
}
