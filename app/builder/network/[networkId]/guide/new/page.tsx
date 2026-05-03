import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ChevronRight, AlertCircle } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateGuideForm } from "@/components/guideforge/builder/create-guide-form"
import { getHubsByNetworkId, getCollectionsByHubId } from "@/lib/guideforge/supabase-networks"
import { getHubsByNetwork, getCollectionsByHub } from "@/lib/guideforge/mock-data"

export default async function CreateGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ hub?: string; collection?: string }>
}) {
  const { networkId } = await params
  const { hub: preselectedHub, collection: preselectedCollection } = await searchParams

  console.log("[v0] Manual guide new page:", {
    networkId,
    preselectedHub,
    preselectedCollection,
  })

  // Load hubs from Supabase, fallback to mock data
  let hubs = await getHubsByNetworkId(networkId)
  if (hubs.length === 0) {
    hubs = getHubsByNetwork(networkId)
  }

  // Load collections for each hub, preferring Supabase
  const collectionsMap: { [hubId: string]: any[] } = {}
  let totalCollections = 0
  for (const hub of hubs) {
    const hubCollections = await getCollectionsByHubId(hub.id)
    if (hubCollections.length === 0) {
      collectionsMap[hub.id] = getCollectionsByHub(hub.id)
    } else {
      collectionsMap[hub.id] = hubCollections
    }
    totalCollections += collectionsMap[hub.id].length
  }

  console.log("[v0] Manual guide page hubs/collections:", {
    hubs: hubs.length,
    totalCollections,
  })

  const breadcrumb = (
    <nav
      className="mb-6 flex flex-wrap items-center gap-2 text-sm"
      aria-label="Breadcrumb"
    >
      <Button asChild variant="ghost" size="sm">
        <Link href={`/builder/network/${networkId}/dashboard`}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to Network Dashboard
        </Link>
      </Button>
      <span className="text-muted-foreground">·</span>
      <Link
        href="/builder/networks"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        All Networks
      </Link>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-foreground font-semibold">Create Guide</span>
    </nav>
  )

  // Prerequisite: at least one hub
  if (hubs.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          {breadcrumb}
          <Card className="border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">Create a hub first.</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Guides live inside collections, which live inside hubs. You need at least one hub before
                    creating a guide in this network.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/builder/network/${networkId}/hub/new`}>Create Hub</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  // Prerequisite: at least one collection across hubs
  if (totalCollections === 0) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          {breadcrumb}
          <Card className="border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">Create a collection first.</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have hubs in this network, but no collections yet. Guides need a collection to live in.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link
                    href={`/builder/network/${networkId}/collection/new${
                      preselectedHub ? `?hub=${preselectedHub}` : ""
                    }`}
                  >
                    Create Collection
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        {breadcrumb}

        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Manual Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Start with a guide template. Forge Rules are applied automatically based on type.
          </p>
        </div>

        <CreateGuideForm
          networkId={networkId}
          hubs={hubs}
          collectionsMap={collectionsMap}
          preselectedHubId={preselectedHub}
          preselectedCollectionId={preselectedCollection}
        />
      </div>
    </main>
  )
}
