import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import { StarterPagesEditor } from "@/components/guideforge/builder/starter-pages-editor"

export default function StarterPagesPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10">
          <WizardProgress
            steps={BUILDER_WIZARD_STEPS}
            currentStepIndex={getWizardIndex("starter-pages")}
          />
        </div>

        <header className="mb-8 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step 3 — Starter pages
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Edit your hubs and collections
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            These are the starter pages for your network. Rename, reorder, add, or remove
            anything below before continuing. Your edits are saved in this setup draft and
            won&apos;t be lost if you navigate back &mdash; the network is created after the next step.
          </p>
        </header>

        <StarterPagesEditor />
      </div>
    </main>
  )
}
