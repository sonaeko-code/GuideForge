import Link from "next/link"
import { Plus, ArrowLeft, AlertCircle } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"

export default async function NetworkDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ tab?: string; collection?: string }>
}) {
  const { networkId } = await params
  const { tab, collection: filterCollectionId } = await searchParams

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Dashboard Route Alive</h1>
          <div className="space-y-2 text-muted-foreground">
            <p>networkId: <code className="bg-muted px-2 py-1 rounded">{networkId}</code></p>
            <p>tab: <code className="bg-muted px-2 py-1 rounded">{tab || "drafts"}</code></p>
            <p>collection: <code className="bg-muted px-2 py-1 rounded">{filterCollectionId || "none"}</code></p>
          </div>
          <p className="text-green-600 font-semibold">✓ Minimal route is working</p>
          <p className="text-sm text-muted-foreground">Adding full dashboard imports next...</p>
        </div>
      </div>
    </main>
  )
}

    // Load guides using canonical helper that works with collection_id filtering
    let guides: Guide[] = []
    let published: Guide[] = []
    let drafts: Guide[] = []
    let ready: Guide[] = []

    try {
      // Use canonical helper for ALL networks (not just non-QuestLine)
      // This uses the proven working collection_id-based query
      guides = await getGuidesForNetworkCollections(collections)
      
      if (guides && guides.length > 0) {
        published = guides.filter((g: Guide) => g.status === "published")
        drafts = guides.filter((g: Guide) => g.status === "draft")
        ready = guides.filter((g: Guide) => g.status === "ready")
        console.log("[v0] Dashboard loaded guides using canonical helper:", {
          total: guides.length,
          published: published.length,
          drafts: drafts.length,
          ready: ready.length,
        })
      }
    } catch (err) {
      console.warn("[v0] Dashboard guide loading error:", err)
      guides = []
      published = []
      drafts = []
      ready = []
    }

    // Safe defaults
    const safeHubs = Array.isArray(hubs) ? hubs : []
    const safeCollections = Array.isArray(collections) ? collections : []
    
    // Guides are already normalized by canonical helper
    const safeGuides = Array.isArray(guides) ? guides : []
    const safeDrafts = Array.isArray(drafts) ? drafts : []
    const safeReady = Array.isArray(ready) ? ready : []
    const safePublished = Array.isArray(published) ? published : []

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
              <div className="grid gap-4 md:grid-cols-5 mt-6">
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Hubs</p>
                  <p className="text-3xl font-bold text-foreground">{safeHubs.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Collections</p>
                  <p className="text-3xl font-bold text-foreground">{safeCollections.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{safeDrafts.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Ready</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{safeReady.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-muted-foreground">Published</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{safePublished.length}</p>
                </div>
              </div>

              {/* No top-level CTA — CTA buttons are in the tabs empty states */}
              {safeHubs.length === 0 || safeCollections.length === 0 ? (
                <div className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 mt-6">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {safeHubs.length === 0
                      ? "Create a hub and collection to start generating guides."
                      : "Create a collection to start generating guides."}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Tabs Section - Wrapped in Error Boundary */}
            <DashboardErrorBoundary networkId={network.id}>
              <NetworkDashboardTabs
                networkId={network.id}
                initialTab={tab}
                initialCollectionId={filterCollectionId}
                hubs={safeHubs}
                collections={safeCollections}
                guides={safeGuides}
              />
            </DashboardErrorBoundary>
          </div>
        </div>
      </main>
    )
  } catch (error) {
    console.error("[v0] Dashboard page error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    const errorStack = error instanceof Error ? error.stack : ""
    
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-red-600 dark:text-red-400" aria-hidden="true" />
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-xl font-semibold text-foreground">Network Dashboard Failed to Load</h1>
              <p className="text-muted-foreground">Network ID: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{networkId}</code></p>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                <p className="text-sm font-mono text-red-900 dark:text-red-100 break-all">
                  <strong>Error:</strong> {errorMessage}
                </p>
                {errorStack && (
                  <p className="text-xs font-mono text-red-800 dark:text-red-200 mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
                    {errorStack}
                  </p>
                )}
              </div>
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
