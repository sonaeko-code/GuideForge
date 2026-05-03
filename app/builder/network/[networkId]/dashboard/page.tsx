import Link from "next/link"
import { Plus, ArrowLeft, AlertCircle } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworkDashboardTabs } from "@/components/guideforge/builder/network-dashboard-tabs"
import {
  loadNetworkBuilderContext,
  getGuidesForNetworkCollections,
  checkGuidesTableReadability,
  getGuidesByCollectionIds,
  type NormalizedHub,
  type NormalizedCollection,
} from "@/lib/guideforge/supabase-networks"

export default async function NetworkDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ tab?: string; collection?: string }>
}) {
  const { networkId } = await params
  const { tab, collection: filterCollectionId } = await searchParams

  try {
    // Load unified builder context (network + hubs + collections)
    const ctx = await loadNetworkBuilderContext(networkId)
    const network = ctx.network
    const hubs: NormalizedHub[] = ctx.hubs
    const collections: NormalizedCollection[] = ctx.collections

    if (!network) {
      return (
        <main className="min-h-screen bg-background">
          <SiteHeader hideCta />
          <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="size-8 text-red-600 dark:text-red-400" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-semibold text-foreground mb-2">Network Not Found</h1>
                <p className="text-muted-foreground">
                  Could not find network with ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{networkId}</code>
                </p>
              </div>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/builder/networks">
                  <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                  All Networks
                </Link>
              </Button>
            </div>
          </div>
        </main>
      )
    }

    // Load guides using canonical helper that works with collection_id filtering
    let guides: Guide[] = []
    let published: Guide[] = []
    let drafts: Guide[] = []

    try {
      // Use canonical helper for ALL networks (not just non-QuestLine)
      // This uses the proven working collection_id-based query
      guides = await getGuidesForNetworkCollections(collections)
      
      if (guides && guides.length > 0) {
        published = guides.filter((g: Guide) => g.status === "published")
        drafts = guides.filter((g: Guide) => g.status === "draft" || g.status === "in-review")
        console.log("[v0] Dashboard loaded guides using canonical helper:", {
          total: guides.length,
          published: published.length,
          drafts: drafts.length,
        })
      }
    } catch (err) {
      console.warn("[v0] Dashboard guide loading error:", err)
      guides = []
      published = []
      drafts = []
    }

    // Safe defaults
    const safeHubs = Array.isArray(hubs) ? hubs : []
    const safeCollections = Array.isArray(collections) ? collections : []
    
    // Guides are already normalized by canonical helper
    const safeGuides = Array.isArray(guides) ? guides : []
    const safeDrafts = Array.isArray(drafts) ? drafts : []
    const safePublished = Array.isArray(published) ? published : []
    
    // DIAGNOSTICS: Capture what's actually loaded
    const diagnostics = {
      networkId: network.id,
      networkName: network.name,
      hubCount: safeHubs.length,
      collectionCount: safeCollections.length,
      primaryLoadedGuidesCount: safeGuides.length,
      publishedCount: safePublished.length,
      draftCount: safeDrafts.length,
      guideSample: safeGuides.slice(0, 2).map(g => ({ id: g.id, title: g.title, collectionId: g.collectionId, status: g.status })),
    }
    
    // RLS diagnostics
    const tableReadability = await checkGuidesTableReadability()
    const collectionGuides = safeCollections.length > 0 
      ? await getGuidesByCollectionIds(safeCollections.map(c => c.id))
      : { guides: [] }
    
    const rlsDiagnostics = {
      guidesTableReadable: tableReadability.canRead,
      guidesTableRowCount: tableReadability.rowCount,
      directCollectionQueryCount: collectionGuides.guides?.length || 0,
      primaryLoadedCount: safeGuides.length,
      countsMatch: safeGuides.length === (collectionGuides.guides?.length || 0),
      suspectedRLS: !tableReadability.canRead || (tableReadability.canRead === false && collectionGuides.error !== null),
    }
    
    console.log("[v0] Dashboard primary guide count:", safeGuides.length)
    console.log("[v0] Dashboard direct collection query count:", collectionGuides.guides?.length || 0)
    console.log("[v0] Dashboard RLS diagnostics:", rlsDiagnostics)

    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{network.name}</h1>
                  <p className="mt-1 text-muted-foreground">{network.description}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid gap-4 md:grid-cols-4 mt-6">
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Hubs</p>
                  <p className="text-3xl font-bold text-foreground">{safeHubs.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Collections</p>
                  <p className="text-3xl font-bold text-foreground">{safeCollections.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Published Guides</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{safePublished.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{safeDrafts.length}</p>
                </div>
              </div>

              {/* CTA */}
              {safeHubs.length > 0 && safeCollections.length > 0 ? (
                <div className="flex gap-3 mt-6">
                  <Button asChild>
                    <Link href={`/builder/network/${networkId}/generate`}>
                      <Plus className="size-4 mr-2" aria-hidden="true" />
                      Generate Guide
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/new`}>
                      <Plus className="size-4 mr-2" aria-hidden="true" />
                      Create Manual Guide
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 mt-6">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {safeHubs.length === 0
                      ? "Create a hub and collection to start generating guides."
                      : "Create a collection to start generating guides."}
                  </p>
                </div>
              )}
            </div>

            {/* Tabs Section - Handled by Client Component */}
            <div className="rounded-lg border border-orange-400/50 bg-orange-500/5 p-4 mb-6">
              <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-3">DEBUG: Guide Diagnostics</h3>
              <div className="space-y-2 text-sm font-mono text-orange-600 dark:text-orange-400 overflow-auto max-h-64 bg-black/20 p-2 rounded">
                <div>Network: {diagnostics.networkName} ({diagnostics.networkId})</div>
                <div>Hubs: {diagnostics.hubCount} | Collections: {diagnostics.collectionCount}</div>
                <div className="border-t border-orange-400/30 pt-2 mt-2 text-orange-700 dark:text-orange-300 font-semibold">Guide Counts:</div>
                <div>Primary loader: {diagnostics.primaryLoadedGuidesCount} guides</div>
                <div>Direct collection query: {rlsDiagnostics.directCollectionQueryCount} guides</div>
                <div className={rlsDiagnostics.countsMatch ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                  {rlsDiagnostics.countsMatch ? "✓ Counts match" : "⚠ Counts differ"}
                </div>
                <div>Published: {diagnostics.publishedCount} | Drafts: {diagnostics.draftCount}</div>
                {diagnostics.guideSample.length > 0 && (
                  <div className="border-t border-orange-400/30 pt-2 mt-2">
                    Sample guides: {diagnostics.guideSample.map((g: any) => `${g.title} (${g.status})`).join(", ")}
                  </div>
                )}
                <div className="border-t border-orange-400/30 pt-2 mt-2 text-orange-700 dark:text-orange-300 font-semibold">RLS Status:</div>
                <div>Guides table readable: {rlsDiagnostics.guidesTableReadable ? "YES" : "NO"}</div>
                <div>Table total rows: {rlsDiagnostics.guidesTableRowCount}</div>
                {!rlsDiagnostics.suspectedRLS && rlsDiagnostics.directCollectionQueryCount > 0 && (
                  <div className="border-t border-green-400/30 pt-2 mt-2 text-green-600 dark:text-green-400">
                    ✓ Guide rows are readable. Primary loader working correctly.
                  </div>
                )}
                {rlsDiagnostics.suspectedRLS && (
                  <div className="border-t border-red-400/30 pt-2 mt-2 text-red-600 dark:text-red-400">
                    ⚠ RLS issue detected - guides table not readable
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Section - Handled by Client Component */}
            <NetworkDashboardTabs
              networkId={network.id}
              initialTab={tab}
              initialCollectionId={filterCollectionId}
              hubs={safeHubs}
              collections={safeCollections}
              guides={safeGuides}
              drafts={safeDrafts}
              published={safePublished}
            />
          </div>
        </div>
      </main>
    )
  } catch (error) {
    console.error("[v0] dashboard error:", error)
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-red-600 dark:text-red-400" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-semibold text-foreground mb-2">Dashboard Error</h1>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred while loading the dashboard."}
              </p>
            </div>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/builder/networks">
                <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                Back to Networks
              </Link>
            </Button>
          </div>
        </div>
      </main>
    )
  }
}
