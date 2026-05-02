import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateCollectionForm } from "@/components/guideforge/builder/create-collection-form"
import { getHubsByNetworkId } from "@/lib/guideforge/supabase-networks"
import { getHubsByNetwork } from "@/lib/guideforge/mock-data"

export default async function CreateCollectionPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const { networkId } = await params

  // Load hubs from Supabase, fallback to mock data
  let hubs = await getHubsByNetworkId(networkId)
  if (hubs.length === 0) {
    hubs = getHubsByNetwork(networkId)
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Collection
          </h1>
          <p className="text-lg text-muted-foreground">
            Collections organize guides within a hub.
          </p>
        </div>

        <CreateCollectionForm networkId={networkId} hubs={hubs} />
      </div>
    </main>
  )
}
