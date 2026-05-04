import Link from "next/link"
import { Plus, ArrowLeft, AlertCircle } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworkDashboardTabs } from "@/components/guideforge/builder/network-dashboard-tabs"
import { DashboardErrorBoundary } from "@/components/guideforge/builder/dashboard-error-boundary"
import { DashboardDiagnostics } from "@/components/guideforge/builder/dashboard-diagnostics"
import {
  loadNetworkBuilderContext,
  getGuidesForNetworkCollectionsWithDiagnostics,
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

    // Load guides for the network's collections with diagnostics
    const { guides, error: guidesError } = await getGuidesForNetworkCollectionsWithDiagnostics(collections)

    // Ensure arrays are safe
    const safeHubs = Array.isArray(hubs) ? hubs : []
    const safeCollections = Array.isArray(collections) ? collections : []
    const safeGuides = Array.isArray(guides) ? guides : []

    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{network.name} Dashboard</h1>
            <Button asChild>
              <Link href={`/builder/network/${networkId}/generate`}>
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Generate Guide
              </Link>
            </Button>
          </div>

          {/* Diagnostics Panel - Temporary Debug UI */}
          <DashboardDiagnostics
            networkId={network.id}
            networkLoaded={!!network}
            hubs={safeHubs}
            collections={safeCollections}
            guides={safeGuides}
            supabaseError={guidesError}
          />

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
