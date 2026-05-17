import Link from "next/link"
import { ArrowLeft, AlertCircle, Settings, Globe, Sparkles, Plus, Layers, FolderTree, BookMarked, Package, Clock } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworkOwnershipBadge } from "@/components/guideforge/builder/network-ownership-badge"
import { GovernanceSummary } from "@/components/guideforge/builder/governance-summary"
import { NetworkDashboardTabs } from "@/components/guideforge/builder/network-dashboard-tabs"
import { DashboardErrorBoundary } from "@/components/guideforge/builder/dashboard-error-boundary"
import {
  loadNetworkBuilderContext,
  getGuidesForNetworkCollections,
  getAttachedAssetsForCollection,
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
  /**
   * GuideForge Data Spine Contract Dashboard
   * 
   * This page loads guides from Supabase filtered by collection IDs.
   * The complete guide persistence contract is documented in:
   * docs/guideforge-data-spine-contract.md
   * 
   * Data flow: networkId → hubs → collections → collection IDs → 
   *            Supabase WHERE collection_id IN (ids)
   * 
   * Do not change this data loading path without explicit approval.
   */
  const { networkId } = await params
  const { tab, collection: filterCollectionId } = await searchParams

  try {
    // Load unified builder context (network + hubs + collections)
    const ctx = await loadNetworkBuilderContext(networkId)
    const network = ctx.network
    const hubs: NormalizedHub[] = ctx.hubs
    const collections: NormalizedCollection[] = ctx.collections

    // Load guides for the network's collections
    const guides = await getGuidesForNetworkCollections(collections)

    // Load attached draft assets for all collections in the network
    const attachedAssetsMap: Record<string, AssetDraft[]> = {}
    for (const collection of collections) {
      attachedAssetsMap[collection.id] = await getAttachedAssetsForCollection(collection.id)
    }

    // Ensure arrays are safe
    const safeHubs = Array.isArray(hubs) ? hubs : []
    const safeCollections = Array.isArray(collections) ? collections : []
    const safeGuides = Array.isArray(guides) ? guides : []

    // Snapshot stats for the dashboard quick-glance panel.
    // We deliberately separate Pending Review (needs action) from generic Drafts
    // and Attached Assets so the snapshot tells the creator what to do next.
    const allAttachedAssets: AssetDraft[] = Object.values(attachedAssetsMap).flat()
    const attachedAssetCount = allAttachedAssets.length
    const attachedDraftAssetCount = allAttachedAssets.filter((a) => a?.status === "draft").length
    const pendingReviewAssetCount = allAttachedAssets.filter((a) => a?.status === "pending_review").length
    const publishedAssetCount = allAttachedAssets.filter(
      (a) => a?.status === "published" && (a?.assetType === "single_guide" || a?.assetType === "checklist")
    ).length

    const publishedCount = safeGuides.filter((g) => g.status === "published").length
    const draftCount = safeGuides.filter((g) => g.status === "draft").length
    const readyGuidesCount = safeGuides.filter((g) => g.status === "ready").length

    // Counts shown in the snapshot panel
    const pendingReviewCount = readyGuidesCount + pendingReviewAssetCount
    const totalPublic = publishedCount + publishedAssetCount

    // Determine the primary "what's next" CTA based on network state
    const generateState: "ready" | "needs-hub" | "needs-collection" =
      safeHubs.length === 0 ? "needs-hub" : safeCollections.length === 0 ? "needs-collection" : "ready"

    return (
      <main className="min-h-screen surface-parchment">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 space-y-6">
          {/* Back link */}
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/builder/networks?scope=mine">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to My Networks
            </Link>
          </Button>

          {/* Network header — compact, single row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-words">{network.name}</h1>
                <NetworkOwnershipBadge ownerUserId={network.ownerUserId} />
              </div>
              {network.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{network.description}</p>
              )}
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                /n/{network.slug}
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 shrink-0 sm:items-end">
              <div className="flex flex-wrap gap-2">
                {network.slug ? (
                  <Button asChild variant="outline" size="sm" title={totalPublic === 0 ? "No published content yet" : `${totalPublic} published`}>
                    <Link href={`/n/${network.slug}`} target="_blank" rel="noopener">
                      <Globe className="size-4 mr-1.5" aria-hidden="true" />
                      Public View
                    </Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/builder/network/${networkId}/settings`}>
                    <Settings className="size-4 mr-1.5" aria-hidden="true" />
                    Settings
                  </Link>
                </Button>
              </div>
              {network.slug && totalPublic === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Public View has nothing published yet.
                </p>
              )}
            </div>
          </div>

          {/* Network Snapshot — quick stats + primary "what's next" CTA.
              The CTA changes based on whether the network has hubs/collections,
              so the user always sees the most useful next step. */}
          <section
            aria-label="Network snapshot"
            className="rounded-xl border border-border/50 bg-card p-4 md:p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Stat row — five cells: Hubs, Collections, Pending Review (needs action),
                  Published (public), Attached (relationship). Counts are accurate (no fudging). */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-none tabular-nums">{safeHubs.length}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                      {safeHubs.length === 1 ? "Hub" : "Hubs"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FolderTree className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-none tabular-nums">{safeCollections.length}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                      {safeCollections.length === 1 ? "Collection" : "Collections"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-none tabular-nums">{pendingReviewCount}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                      Pending Review
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BookMarked className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-none tabular-nums">{totalPublic}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                      Published &middot; {draftCount} draft
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-lg font-bold leading-none tabular-nums">{attachedAssetCount}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                      Attached &middot; {attachedDraftAssetCount} private
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary "what's next" action — adapts to network state */}
              <div className="flex flex-wrap gap-2 lg:shrink-0">
                {generateState === "needs-hub" ? (
                  <Button asChild size="sm">
                    <Link href={`/builder/network/${networkId}/hub/new`}>
                      <Plus className="size-4 mr-1.5" aria-hidden="true" />
                      Create first hub
                    </Link>
                  </Button>
                ) : generateState === "needs-collection" ? (
                  <Button asChild size="sm">
                    <Link href={`/builder/network/${networkId}/collection/new`}>
                      <Plus className="size-4 mr-1.5" aria-hidden="true" />
                      Create first collection
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link href={`/builder/network/${networkId}/generate`}>
                      <Sparkles className="size-4 mr-1.5" aria-hidden="true" />
                      Generate Guide
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {generateState !== "ready" && (
              <p className="mt-3 text-xs text-muted-foreground">
                {generateState === "needs-hub"
                  ? "Hubs organize collections. You need at least one hub before generating guides."
                  : "Collections hold guides. Add a collection to enable guide generation."}
              </p>
            )}
          </section>

          {/* GuideForge Data Spine Contract — see /docs/guideforge-data-spine-contract.md */}

          {/* Governance Summary — collapsible to reduce visual weight on initial load */}
          <details className="group rounded-xl border border-border/50 bg-card">
            <summary className="cursor-pointer list-none flex items-center justify-between p-4 hover:bg-muted/40 transition-colors rounded-xl">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Forge Governance
                </span>
                <span className="text-sm font-semibold text-foreground">Trust &amp; Standards</span>
              </div>
              <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
              <span className="text-xs text-muted-foreground hidden group-open:inline">Hide</span>
            </summary>
            <div className="px-4 pb-4">
              <GovernanceSummary network={network} />
            </div>
          </details>

          {/* Tabs Section — wrapped in Error Boundary */}
          <DashboardErrorBoundary networkId={network.id}>
            <NetworkDashboardTabs
              networkId={network.id}
              networkSlug={network.slug}
              initialTab={tab}
              initialCollectionId={filterCollectionId}
              hubs={safeHubs}
              collections={safeCollections}
              guides={safeGuides}
              attachedAssetsMap={attachedAssetsMap}
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
      <main className="min-h-screen surface-parchment">
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
