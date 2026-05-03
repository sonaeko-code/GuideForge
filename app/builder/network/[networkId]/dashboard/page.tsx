import Link from "next/link"
import { Plus, ArrowLeft, AlertCircle } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworkDashboardTabs } from "@/components/guideforge/builder/network-dashboard-tabs"
import { getGuidesByCollection } from "@/lib/guideforge/mock-data"
import {
  loadNetworkBuilderContext,
  getGuidesByNetworkId,
  getDraftGuidesByNetworkId,
  getPublishedGuidesByNetworkId,
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

    // Load guides
    let guides: any[] = []
    let published: any[] = []
    let drafts: any[] = []

    try {
      const isQuestLineRoute = network.id === "network_questline" || network.slug === "questline"
      
      if (!isQuestLineRoute) {
        // Real networks: load from Supabase
        try {
          guides = await getGuidesByNetworkId(network.id)
          if (!guides) guides = []
          console.log("[v0] Dashboard guide loading collection IDs:", {
            totalGuides: guides.length,
            collectionIdValues: guides.slice(0, 3).map(g => ({ id: g.id, collection_id: g.collection_id, collectionId: g.collectionId })),
          })
        } catch (e) {
          guides = []
        }
        try {
          drafts = await getDraftGuidesByNetworkId(network.id)
          if (!drafts) drafts = []
        } catch (e) {
          drafts = []
        }
        try {
          published = await getPublishedGuidesByNetworkId(network.id)
          if (!published) published = []
        } catch (e) {
          published = []
        }
      } else {
        // QuestLine demo route: use mock data
        guides = collections.flatMap((c: NormalizedCollection) => getGuidesByCollection(c.id))
        if (!guides) guides = []
        published = guides.filter((g: any) => g.status === "published")
        if (!published) published = []
        drafts = guides.filter((g: any) => g.status === "draft" || g.status === "in-review")
        if (!drafts) drafts = []
      }
    } catch (err) {
      guides = []
      published = []
      drafts = []
    }

    // Safe defaults
    const safeHubs = Array.isArray(hubs) ? hubs : []
    const safeCollections = Array.isArray(collections) ? collections : []
    
    // Normalize guides from Supabase snake_case to camelCase
    const safeGuides = Array.isArray(guides) ? guides.map((g: any) => ({
      ...g,
      collectionId: g.collection_id || g.collectionId,
      createdAt: g.created_at || g.createdAt,
      updatedAt: g.updated_at || g.updatedAt,
      publishedAt: g.published_at || g.publishedAt,
      authorId: g.author_id || g.authorId,
      reviewerId: g.reviewer_id || g.reviewerId,
      verificationStatus: g.verification_status || g.verificationStatus,
    })) : []
    
    const safeDrafts = Array.isArray(drafts) ? drafts : []
    const safePublished = Array.isArray(published) ? published : []
    
    // DIAGNOSTICS: Capture what's actually loaded
    const diagnostics = {
      networkId: network.id,
      networkName: network.name,
      hubCount: safeHubs.length,
      hubIds: safeHubs.map(h => h.id),
      collectionCount: safeCollections.length,
      collectionIds: safeCollections.map(c => c.id),
      rawGuideCount: guides.length,
      normalizedGuideCount: safeGuides.length,
      guideIds: safeGuides.map((g: any) => g.id),
      guideTitles: safeGuides.map((g: any) => ({ id: g.id, title: g.title, slug: g.slug, collection_id: g.collection_id, collectionId: g.collectionId, status: g.status })),
      publishedCount: safePublished.length,
      draftCount: safeDrafts.length,
      isQuestLineRoute: network.id === "network_questline" || network.slug === "questline",
    }
    
    // RLS diagnostics
    const tableReadability = await checkGuidesTableReadability()
    const collectionGuides = safeCollections.length > 0 
      ? await getGuidesByCollectionIds(safeCollections.map(c => c.id))
      : { guides: [] }
    
    const rlsDiagnostics = {
      guidesTableReadable: tableReadability.canRead,
      guidesTableRowCount: tableReadability.rowCount,
      guidesTableError: tableReadability.error || null,
      collectionGuidesCount: collectionGuides.guides?.length || 0,
      collectionGuidesError: collectionGuides.error || null,
      suspectedRLS: !tableReadability.canRead || (safeCollections.length > 0 && guides.length === 0 && collectionGuides.guides && collectionGuides.guides.length > 0),
    }
    
    console.log("[v0] Dashboard RLS diagnostics:", rlsDiagnostics)
    console.log("[v0] Dashboard diagnostics:", diagnostics)

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
                <div>Network ID: {network.id}</div>
                <div>Network Name: {network.name}</div>
                <div>Is QuestLine: {diagnostics.isQuestLineRoute ? "YES" : "NO"}</div>
                <div>Hubs: {diagnostics.hubCount} [{diagnostics.hubIds.join(", ")}]</div>
                <div>Collections: {diagnostics.collectionCount} [{diagnostics.collectionIds.join(", ")}]</div>
                <div className="border-t border-orange-400/30 pt-2 mt-2">Raw guides from Supabase: {diagnostics.rawGuideCount}</div>
                <div>Normalized guides: {diagnostics.normalizedGuideCount}</div>
                <div>Guide IDs: {diagnostics.guideIds.length === 0 ? "(empty)" : diagnostics.guideIds.join(", ")}</div>
                {diagnostics.guideTitles.length > 0 && (
                  <div className="border-t border-orange-400/30 pt-2 mt-2">
                    {diagnostics.guideTitles.map((g: any, i: number) => (
                      <div key={i} className="mb-1">
                        [{i+1}] {g.title} (slug: {g.slug}, coll_id: {g.collection_id}, collId: {g.collectionId}, status: {g.status})
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-orange-400/30 pt-2 mt-2">Published: {diagnostics.publishedCount} | Drafts: {diagnostics.draftCount}</div>
                
                <div className="border-t border-orange-400/30 pt-2 mt-2 text-orange-700 dark:text-orange-300 font-semibold">RLS Diagnostics:</div>
                <div>Guides table readable: {rlsDiagnostics.guidesTableReadable ? "YES" : "NO"}</div>
                {rlsDiagnostics.guidesTableError && <div className="text-red-600 dark:text-red-400">Table error: {rlsDiagnostics.guidesTableError}</div>}
                <div>Guides table total rows (any user): {rlsDiagnostics.guidesTableRowCount}</div>
                <div>Guides in selected collections: {rlsDiagnostics.collectionGuidesCount}</div>
                {rlsDiagnostics.collectionGuidesError && <div className="text-red-600 dark:text-red-400">Collection error: {rlsDiagnostics.collectionGuidesError}</div>}
                {rlsDiagnostics.suspectedRLS && (
                  <div className="border-t border-red-400/30 pt-2 mt-2 text-red-600 dark:text-red-400">
                    ⚠ SUSPECTED RLS ISSUE: Supabase is likely blocking SELECT on draft guides.
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
