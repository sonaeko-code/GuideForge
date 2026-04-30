import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import { CreateNetworkForm } from "@/components/guideforge/builder/create-network-form"
import {
  BUILDER_WIZARD_STEPS,
  getWizardIndex,
} from "@/lib/guideforge/wizard"
import type { NetworkType } from "@/lib/guideforge/types"

const VALID_TYPES: NetworkType[] = [
  "gaming",
  "repair",
  "sop",
  "creator",
  "training",
  "community",
]

interface CreateNetworkPageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function CreateNetworkPage({
  searchParams,
}: CreateNetworkPageProps) {
  const { type } = await searchParams
  const initialType: NetworkType =
    type && (VALID_TYPES as string[]).includes(type)
      ? (type as NetworkType)
      : "gaming"

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10">
          <WizardProgress
            steps={BUILDER_WIZARD_STEPS}
            currentStepIndex={getWizardIndex("network")}
          />
        </div>

        <header className="mb-8 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Step 2 — Create network
          </span>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Set up your network
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Defaults are pre-filled for the {initialType === "gaming" ? "QuestLine demo" : "selected direction"}.
            You can edit anything before continuing.
          </p>
        </header>

        <CreateNetworkForm initialType={initialType} />
      </div>
    </main>
  )
}
