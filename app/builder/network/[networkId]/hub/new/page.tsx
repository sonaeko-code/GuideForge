import { SiteHeader } from "@/components/guideforge/site-header"
import { WizardProgress } from "@/components/guideforge/shared"
import { CreateHubForm } from "@/components/guideforge/builder/create-hub-form"

export default async function CreateHubPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const { networkId } = await params

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Hub
          </h1>
          <p className="text-lg text-muted-foreground">
            A hub holds collections of guides. For gaming networks, hubs are
            games. For repair networks, product lines.
          </p>
        </div>

        <CreateHubForm networkId={networkId} />
      </div>
    </main>
  )
}
