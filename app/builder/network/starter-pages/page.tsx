import Link from "next/link"
import {
  Home,
  Compass,
  Gamepad2,
  Zap,
  Newspaper,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import { StarterPagePicker } from "@/components/guideforge/builder/starter-page-picker"

export default async function StarterPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams

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
            {name ? `${name} — choose your pages` : "Pick your starter pages"}
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            These page templates ship with every gaming guide network. You can
            customize or remove them later.
          </p>
        </header>

        <StarterPagePicker networkName={name} />
      </div>
    </main>
  )
}
