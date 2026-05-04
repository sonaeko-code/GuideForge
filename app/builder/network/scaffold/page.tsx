import Link from "next/link"
import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import { getAllScaffoldTemplates } from "@/lib/guideforge/starter-scaffolds"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

// Map scaffold template IDs to network type query parameters
const TEMPLATE_TYPE_MAP: Record<string, string> = {
  "gaming": "gaming",
  "repair": "repair",
  "sop": "sop",
}

export default async function ScaffoldPage() {
  const templates = getAllScaffoldTemplates()

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
            Choose a template
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Select a template to quickly set up your network with pre-configured hubs and collections.
            You can customize everything after creation.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const networkType = TEMPLATE_TYPE_MAP[template.id]
            if (!networkType) return null

            return (
              <Card key={template.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full h-full justify-start flex-col items-start p-6 text-left"
                >
                  <Link href={`/builder/network/new?type=${networkType}`} className="flex flex-col gap-4 h-full">
                    <div className="text-3xl">{template.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.hubs.length} hubs, {template.hubs.reduce((sum, h) => sum + h.collections.length, 0)} collections
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mt-auto pt-4">
                      Choose template
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </div>
                  </Link>
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
