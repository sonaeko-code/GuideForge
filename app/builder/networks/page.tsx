import Link from "next/link"
import { Plus, Folder, Wand2, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworksClientList } from "@/components/guideforge/builder/networks-client-list"
import { getAllNetworks, getNetworksForCurrentUser, getHubsByNetworkId, getCollectionsByHubId } from "@/lib/guideforge/supabase-networks"

// Disable caching for this page so it always fetches fresh network data from Supabase
export const dynamic = "force-dynamic"

export default async function NetworksDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>
}) {
  const params = await searchParams
  const scope = params.scope || 'all'
  
  // Load networks based on scope parameter
  let networks = scope === 'mine' 
    ? await getNetworksForCurrentUser()
    : await getAllNetworks()
  


  // If no real networks exist, show empty state
  if (networks.length === 0) {
    return (
      <main className="min-h-screen surface-parchment">
        <SiteHeader hideCta />
        
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="mb-8 flex justify-between items-center gap-4 flex-wrap">
            <Button asChild variant="ghost" size="sm">
              <Link href="/builder">
                ← Back to Workspace
              </Link>
            </Button>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Builder &middot; {scope === 'mine' ? 'My Networks' : 'All Networks'}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/builder/assets">
                <FileText className="mr-2 size-4" aria-hidden="true" />
                My Assets
              </Link>
            </Button>
          </div>

          <div className="card-foundry relative overflow-hidden rounded-xl p-12 text-center">
            <div className="absolute inset-0 bg-constellation opacity-25 pointer-events-none" aria-hidden="true" />
            <div className="relative">
              <div className="forge-seal mx-auto mb-4 flex size-14 items-center justify-center rounded-full text-[oklch(0.18_0.02_50)]">
                <Folder className="size-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2 text-balance">No networks yet</h2>
              <p className="text-muted-foreground mb-6 text-pretty text-sm">
                Create your first network or generate a single structured asset draft.
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:justify-center md:gap-4">
                <Button asChild variant="outline">
                  <Link href="/builder/generate-asset">
                    <Wand2 className="mr-2 size-4" aria-hidden="true" />
                    Generate Asset
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/builder/network/new">
                    <Plus className="mr-2 size-4" aria-hidden="true" />
                    Create Network
                  </Link>
                </Button>
              </div>
            </div>
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
        
        if (hubs && hubs.length > 0) {
          try {
            const collectionArrays = await Promise.all(
              hubs.map(hub => getCollectionsByHubId(hub.id).catch(() => []))
            )
            collectionCount = collectionArrays.reduce((sum, arr) => sum + (arr?.length || 0), 0)
          } catch (collErr) {
            console.warn("[v0] Network count error (collections for", network.id, "):", collErr)
            collectionCount = 0
          }
        }
      } catch (err) {
        console.warn("[v0] Network count error (hubs for", network.id, "):", err)
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
    <main className="min-h-screen surface-parchment">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="mb-8 flex justify-between items-center gap-4 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link href="/builder">
              ← Back to Workspace
            </Link>
          </Button>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Builder &middot; My Networks
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/builder/assets">
              <FileText className="mr-2 size-4" aria-hidden="true" />
              My Assets
            </Link>
          </Button>
        </div>

        {/* Networks masthead */}
        <div className="surface-masthead relative mb-8 overflow-hidden rounded-xl p-7 md:p-9 shadow-forge">
          <div className="absolute inset-0 bg-constellation opacity-25 pointer-events-none" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass-700)]">
                Workspace &middot; Knowledge Networks
              </p>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {scope === 'mine' ? 'My Networks' : 'All Networks'}
              </h1>
              <p className="mt-2 text-pretty text-base text-muted-foreground">
                {networks.length} {networks.length === 1 ? 'network' : 'networks'} {scope === 'mine' ? 'you own or manage' : 'visible'}
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              {/* Scope toggle */}
              <div className="flex gap-2">
                <Button 
                  asChild
                  variant={scope === 'mine' ? 'default' : 'outline'}
                  size="sm"
                >
                  <Link href="/builder/networks?scope=mine">
                    My Networks
                  </Link>
                </Button>
                <Button 
                  asChild
                  variant={scope === 'all' || !scope ? 'default' : 'outline'}
                  size="sm"
                >
                  <Link href="/builder/networks?scope=all">
                    All Networks
                  </Link>
                </Button>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/builder/network/scaffold">
                    <Plus className="mr-2 size-4" aria-hidden="true" />
                    From Template
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/builder/generate-asset">
                    <Wand2 className="mr-2 size-4" aria-hidden="true" />
                    Generate Asset
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/builder/network/new">
                    <Plus className="mr-2 size-4" aria-hidden="true" />
                    Create Network
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Client component handles relationship sorting, badges, and New Hub gating */}
        <NetworksClientList networks={networksWithCounts} />
      </div>
    </main>
  )
}
