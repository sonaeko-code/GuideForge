import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateGuideForm } from "@/components/guideforge/builder/create-guide-form"
import { getHubsByNetworkId, getCollectionsByHubId } from "@/lib/guideforge/supabase-networks"
import { getHubsByNetwork, getCollectionsByHub } from "@/lib/guideforge/mock-data"

export default async function CreateGuidePage({
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

  // Load collections for each hub, preferring Supabase
  const collectionsMap: { [hubId: string]: any[] } = {}
  for (const hub of hubs) {
    const hubCollections = await getCollectionsByHubId(hub.id)
    if (hubCollections.length === 0) {
      collectionsMap[hub.id] = getCollectionsByHub(hub.id)
    } else {
      collectionsMap[hub.id] = hubCollections
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Start with a guide template. Forge Rules are applied automatically
            based on type.
          </p>
        </div>

        <CreateGuideForm networkId={networkId} hubs={hubs} collectionsMap={collectionsMap} />
      </div>
    </main>
  )
}
