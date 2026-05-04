import Link from "next/link"
import { Plus, Folder, ArrowRight, AlertCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SiteHeader } from "@/components/guideforge/site-header"
import { getAllNetworks, getHubsByNetworkId, getCollectionsByHubId } from "@/lib/guideforge/supabase-networks"
import { getHubsByNetwork, getCollectionsByHub } from "@/lib/guideforge/mock-data"

export default async function NetworksDirectoryPage() {
  // Load all networks from Supabase
  let networks = await getAllNetworks()
  
  console.log("[v0] Networks directory loaded networks:", networks.length)

  // If no real networks exist, show empty state
  if (networks.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="mb-8">
            <Button asChild variant="ghost" size="sm">
              <Link href="/builder">
                ← Back to Builder
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Folder className="mx-auto size-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No networks yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first network to get started.
            </p>
            <Button asChild>
              <Link href="/builder/network/scaffold">
                <Plus className="mr-2 size-4" aria-hidden="true" />
                From Template
              </Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Load hub and collection counts for each network safely
  const networksWithCounts = await Promise.all(
    networks.map(async (network) => {
      let hubCount = 0
      let collectionCount = 0
      
      try {
        const hubs = await getHubsByNetworkId(network.id)
        hubCount = hubs?.length || 0
        console.log("[v0] Network card counts:", network.id, "hubs:", hubCount)
        
        if (hubs && hubs.length > 0) {
          try {
            const collectionArrays = await Promise.all(
              hubs.map(hub => getCollectionsByHubId(hub.id).catch(() => []))
            )
            collectionCount = collectionArrays.reduce((sum, arr) => sum + (arr?.length || 0), 0)
            console.log("[v0] Network card counts:", network.id, "collections:", collectionCount)
          } catch (collErr) {
            console.warn("[v0] Network count error (collections for", network.id, "):", collErr)
            // Return zero collections if query fails, don't let it break the whole card
            collectionCount = 0
          }
        }
      } catch (err) {
        console.warn("[v0] Network count error (hubs for", network.id, "):", err)
        // Return zeroes if counts fail to load, but still render the card
        hubCount = 0
        collectionCount = 0
      }

      return {
        ...network,
        hubCount,
        collectionCount,
      }
    })
  )

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm">
            <Link href="/builder">
              ← Back to Builder
            </Link>
          </Button>
        </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                All Networks
              </h1>
              <p className="mt-2 text-pretty text-lg text-muted-foreground">
                {networks.length} {networks.length === 1 ? 'network' : 'networks'} created
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:gap-3">
              <Button asChild variant="outline">
                <Link href="/builder/network/scaffold">
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  From Template
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/builder/network/new">
                  <Plus className="mr-2 size-4" aria-hidden="true" />
                  Create Network
                </Link>
              </Button>
            </div>
          </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {networksWithCounts.map((network) => (
            <Card
              key={network.id}
              className="flex flex-col gap-4 p-5 hover:border-primary/50 transition-colors"
            >
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {network.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  /{network.slug}
                </p>
              </div>

              {network.description && (
                <p className="text-sm text-muted-foreground flex-1">
                  {network.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground py-2 border-t border-border/50">
                <div>
                  <span className="font-semibold text-foreground">{network.hubCount}</span> {network.hubCount === 1 ? 'hub' : 'hubs'}
                </div>
                <div>
                  <span className="font-semibold text-foreground">{network.collectionCount}</span> {network.collectionCount === 1 ? 'collection' : 'collections'}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/builder/network/${network.id}/dashboard`}>
                    Dashboard
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/builder/network/${network.id}/settings`}>
                    <Settings className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Settings</span>
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={`/builder/network/${network.id}/hub/new`}>
                    New Hub
                  </Link>
                </Button>
              </div>

              {network.slug === 'questline' && (
                <Button asChild size="sm" variant="ghost" className="w-full gap-2">
                  <Link href="/n/questline">
                    View Site
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
