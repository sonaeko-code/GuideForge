import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import { ScaffoldBuilder } from "@/components/guideforge/builder/scaffold-builder"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"

export default async function ScaffoldPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10">
          <WizardProgress
            steps={BUILDER_WIZARD_STEPS}
            currentStepIndex={getWizardIndex("network")}
          />
        </div>

        <header className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step 2 — Create network
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Create from template
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Choose a scaffold template to quickly set up your network with pre-configured hubs and collections.
            You can customize everything after creation.
          </p>
        </header>

        <ScaffoldBuilder />
      </div>
    </main>
  )
}
