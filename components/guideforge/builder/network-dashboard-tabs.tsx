"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Plus,
  Clock,
  Eye,
  EyeOff,
  Gamepad2,
  FolderOpen,
  BookMarked,
  Flame,
  Sparkles,
} from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge, DifficultyBadge } from "@/components/guideforge/shared"
import { normalizeGuideStatus, filterGuidesByStatus, filterOutArchived } from "@/lib/guideforge/utils"
import { DraftList } from "@/components/guideforge/builder/draft-list"
import type { NormalizedHub, NormalizedCollection } from "@/lib/guideforge/supabase-networks"

interface NetworkDashboardTabsProps {
  networkId: string
  initialTab?: string
  initialCollectionId?: string
  hubs: NormalizedHub[]
  collections: NormalizedCollection[]
  guides: Guide[]
}

export function NetworkDashboardTabs({
  networkId,
  initialTab = "drafts",
  initialCollectionId,
  hubs,
  collections,
  guides,
}: NetworkDashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  
  // Sync URL changes to tab state
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "drafts"
    setActiveTab(tabFromUrl)
  }, [searchParams])

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)
    
    // Update URL
    const params = new URLSearchParams()
    params.set("tab", nextTab)
    if (nextTab === "guides" && initialCollectionId) {
      params.set("collection", initialCollectionId)
    }
    router.push(`/builder/network/${networkId}/dashboard?${params.toString()}`)
  }

  // Prepare data
  const safeHubs = Array.isArray(hubs) ? hubs : []
  const safeCollections = Array.isArray(collections) ? collections : []
  const safeGuides = Array.isArray(guides) ? guides : []
  
  // Helper to get hub/collection names for a guide
  const getHierarchyNames = (guide: Guide) => {
    const hub = safeHubs.find(h => h.id === guide.hubId)
    const collection = safeCollections.find(c => c.id === guide.collectionId)
    return {
      hubName: hub?.name || "Unknown Hub",
      collectionName: collection?.name || "Uncategorized"
    }
  }

  // Phase 10E: Debug dashboard data source
  console.log("[v0] Dashboard guide source", {
    source: "supabase (page-level fetch)",
    total: safeGuides.length,
    statuses: safeGuides.map(g => ({
      id: g.id,
      title: g.title,
      status: g.status,
      revisionOf: g.revisionOf,
      revisionNumber: g.revisionNumber,
    })),
  })
  
  // Phase 10G: Exclude archived from active tabs, but count them separately
  const activeGuides = filterOutArchived(safeGuides)
  const archivedGuides = filterGuidesByStatus(safeGuides, "archived")
  
  // Use normalized status filtering for active guides only
  const safeDrafts = filterGuidesByStatus(activeGuides, "draft")
  const safeReady = filterGuidesByStatus(activeGuides, "ready")
  const safePublished = filterGuidesByStatus(activeGuides, "published")
  
  // Phase 10G: Enhanced debug logs with archived count
  console.log("[v0] Dashboard filtered counts", {
    totalLoaded: safeGuides.length,
    drafts: safeDrafts.length,
    ready: safeReady.length,
    published: safePublished.length,
    archived: archivedGuides.length,
    activeVisible: safeDrafts.length + safeReady.length + safePublished.length,
  })

  // Phase 10H: Debug logs showing what's visible in each tab
  console.log("[v0] Dashboard active counts", {
    totalLoaded: safeGuides.length,
    activeVisible: safeDrafts.length + safeReady.length + safePublished.length,
    drafts: safeDrafts.length,
    ready: safeReady.length,
    published: safePublished.length,
    archived: archivedGuides.length,
  })

  // Phase 10G: Guides tab filtering - exclude archived
  const filteredCollection = initialCollectionId
    ? safeCollections.find((c: NormalizedCollection) => c.id === initialCollectionId)
    : null
  const filteredGuides = initialCollectionId
    ? filterOutArchived(safeGuides.filter((g: Guide) => g.collectionId === initialCollectionId))
    : filterOutArchived(safeGuides)
  
  console.log("[v0] Guides tab rendering:", {
    totalGuides: safeGuides.length,
    filteredByCollection: initialCollectionId ? true : false,
    filteredGuideCount: filteredGuides.length,
    collectionMatch: filteredCollection ? filteredCollection.name : "none",
    guideSample: safeGuides.slice(0, 3).map(g => ({ 
      id: g.id, 
      title: g.title, 
      summary: g.summary ? g.summary.substring(0, 50) + "..." : "(no summary)",
      collectionId: g.collectionId,
      collectionName: g.collectionName,
      hubName: g.hubName,
    })),
  })

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-6 mb-6">
        <TabsTrigger value="drafts">
          Drafts
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            {safeDrafts.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="ready">
          Pending Review
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            {safeReady.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="published">
          Published
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {safePublished.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="guides">
          Guides
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {filteredGuides.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="hubs">
          Hubs
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {safeHubs.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="collections">
          Collections
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            {safeCollections.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Drafts tab */}
      <TabsContent value="drafts" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Draft Guides
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Work in progress guides awaiting review.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/builder/network/${networkId}/generate`}>
              <Plus className="size-4 mr-1" aria-hidden="true" />
              New Draft
            </Link>
          </Button>
        </div>

        {/* Phase 10H: Debug log for visible guides in drafts tab */}
        {safeDrafts.length > 0 && (
          console.log("[v0] Dashboard visible guide ids - drafts", {
            tab: "drafts",
            visibleGuideIds: safeDrafts.map(g => ({
              id: g.id,
              title: g.title,
              status: g.status,
              revisionOf: g.revisionOf,
              revisionNumber: g.revisionNumber,
            })),
          })
        )}

        <DraftList networkId={networkId} scopedDrafts={safeDrafts} scopedPublished={safePublished} />
      </TabsContent>

  {/* Ready tab */}
  <TabsContent value="ready" className="space-y-4">
  <div className="flex items-center justify-between">
  <div>
  <h2 className="text-lg font-semibold text-foreground">Pending Review</h2>
  <p className="mt-1 text-sm text-muted-foreground">
  Guides submitted for review and awaiting publication.
  </p>
          </div>
        </div>

        {safeReady.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Clock className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No guides ready yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mark a draft guide as ready to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeReady.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="font-semibold text-foreground truncate">{guide.title}</h4>
                    {/* Phase 10C: Revision badge on card */}
                    {guide.revisionOf && (
                      <Badge variant="outline" className="text-[10px] border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 flex-shrink-0">
                        Rev #{guide.revisionNumber || 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                  {/* Phase 10C: Revision context helper text */}
                  {guide.revisionOf && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 italic mb-2">Revision of another guide</p>
                  )}
                  {/* Hierarchy context */}
                  {!guide.revisionOf && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {getHierarchyNames(guide).hubName} / {getHierarchyNames(guide).collectionName}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={guide.status} />
                    {guide.type && <Badge variant="outline" className="text-xs font-normal capitalize">{guide.type.replace("-", " ")}</Badge>}
                    {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Published tab */}
      <TabsContent value="published" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Published Guides ({safePublished.length})
          </h2>
        </div>

        {/* Phase 10H: Debug log for visible guides in published tab */}
        {safePublished.length > 0 && (
          console.log("[v0] Dashboard visible guide ids - published", {
            tab: "published",
            visibleGuideIds: safePublished.map(g => ({
              id: g.id,
              title: g.title,
              status: g.status,
              revisionOf: g.revisionOf,
              revisionNumber: g.revisionNumber,
            })),
          })
        )}

        {safePublished.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Eye className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No published guides yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish a draft guide to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {safePublished.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="font-semibold text-foreground truncate">{guide.title}</h4>
                    {/* Phase 10D/10E: Badge for published guides */}
                    {!guide.revisionOf ? (
                      <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                        Original
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 flex-shrink-0">
                        Rev #{guide.revisionNumber || 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                  {/* Hierarchy context for original published guides */}
                  {!guide.revisionOf && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {getHierarchyNames(guide).hubName} / {getHierarchyNames(guide).collectionName}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={guide.status} />
                    {guide.type && <Badge variant="outline" className="text-xs font-normal capitalize">{guide.type.replace("-", " ")}</Badge>}
                    {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                      Open
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Guides tab (filtered by collection if provided) */}
      <TabsContent value="guides" className="space-y-4">
        {initialCollectionId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Guides in {filteredCollection?.name || 'Collection'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Hub: {filteredCollection?.hubName || 'Unknown'}
                </p>
              </div>
              <Button
                size="sm"
                asChild
                variant="outline"
              >
                <Link href={`/builder/network/${networkId}/dashboard?tab=guides`}>
                  Show All Guides
                </Link>
              </Button>
            </div>

            {filteredGuides.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
                <BookMarked className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="font-semibold text-foreground">No guides in this collection yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first guide in this collection.
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button size="sm" asChild>
                    <Link href={`/builder/network/${networkId}/generate?hub=${filteredCollection?.hubId}&collection=${filteredCollection?.id}`}>
                      <Sparkles className="size-4 mr-1" aria-hidden="true" />
                      Generate Guide
                    </Link>
                  </Button>
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/new?hub=${filteredCollection?.hubId}&collection=${filteredCollection?.id}`}>
                      <Plus className="size-4 mr-1" aria-hidden="true" />
                      Create Manual Guide
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredGuides.map((guide: Guide) => (
                  <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                      <StatusBadge status={guide.status} />
                      {guide.type && <Badge variant="outline" className="text-xs font-normal capitalize">{guide.type.replace("-", " ")}</Badge>}
                      {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                      <Button size="sm" asChild variant="outline" className="ml-auto">
                        <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                Guides ({activeGuides.length})
              </h2>
              <div className="flex gap-2">
                <Button size="sm" asChild>
                  <Link href={`/builder/network/${networkId}/generate`}>
                    <Sparkles className="size-4 mr-1" aria-hidden="true" />
                    Generate Guide
                  </Link>
                </Button>
                <Button size="sm" asChild variant="outline">
                  <Link href={`/builder/network/${networkId}/guide/new`}>
                    <Plus className="size-4 mr-1" aria-hidden="true" />
                    Create Manual Guide
                  </Link>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {safePublished.length} published, {safeDrafts.length} draft
            </p>

            {activeGuides.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
                <BookMarked className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="font-semibold text-foreground">No guides yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {safeCollections.length === 0
                    ? "Create a collection to start building guides."
                    : "Generate or create your first guide."}
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button size="sm" asChild>
                    <Link href={`/builder/network/${networkId}/generate`}>
                      <Sparkles className="size-4 mr-1" aria-hidden="true" />
                      Generate Guide
                    </Link>
                  </Button>
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/new`}>
                      <Plus className="size-4 mr-1" aria-hidden="true" />
                      Create Manual Guide
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {activeGuides.map((guide: Guide) => (
                  <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                      </p>
                      {/* Hierarchy context */}
                      {!guide.revisionOf && (
                        <p className="text-xs text-muted-foreground">
                          {getHierarchyNames(guide).hubName} / {getHierarchyNames(guide).collectionName}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                      <StatusBadge status={guide.status} />
                      {guide.type && <Badge variant="outline" className="text-xs font-normal capitalize">{guide.type.replace("-", " ")}</Badge>}
                      {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                      <Button size="sm" asChild variant="outline" className="ml-auto">
                        <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Phase 11: Archived Versions section - collapsible disclosure */}
            {archivedGuides.length > 0 && (
              <div className="mt-8 border-t border-border/50 pt-6">
                <details className="group">
                  <summary className="cursor-pointer flex items-center justify-between hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Archived Versions ({archivedGuides.length})
                      <span className="inline-block group-open:rotate-90 transition-transform text-muted-foreground">
                        ▶
                      </span>
                    </h3>
                  </summary>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground px-3 mb-3">
                      Previous versions are preserved for reference. Archived versions are read-only.
                    </p>
                    {archivedGuides.map((guide: Guide) => (
                      <div key={guide.id} className="flex items-center gap-3 px-4 py-2 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-medium text-sm text-foreground truncate">{guide.title}</p>
                            {guide.revisionNumber && (
                              <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
                                Rev #{guide.revisionNumber}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 flex-shrink-0">
                              Archived
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {guide.publishedAt && (
                              <span>Published: {new Date(guide.publishedAt).toLocaleDateString()}</span>
                            )}
                            {guide.updatedAt && guide.publishedAt !== guide.updatedAt && (
                              <span>Updated: {new Date(guide.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" asChild variant="ghost" className="flex-shrink-0">
                          <Link href={`/builder/network/${networkId}/guide/${guide.id}/preview`}>
                            <Eye className="size-4 mr-1" aria-hidden="true" />
                            View
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* Hubs tab */}
      <TabsContent value="hubs" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Hubs ({safeHubs.length})
          </h2>
          <Button size="sm" asChild>
            <Link href={`/builder/network/${networkId}/hub/new`}>
              <Plus className="size-4 mr-1" aria-hidden="true" />
              Create Hub
            </Link>
          </Button>
        </div>

        {safeHubs.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Gamepad2 className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No hubs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first hub to start organizing guides.
            </p>
            <Button size="sm" asChild className="mt-4">
              <Link href={`/builder/network/${networkId}/hub/new`}>
                Create First Hub
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {safeHubs.map((hub: NormalizedHub) => {
              const hubCollectionCount = safeCollections.filter(
                (c: NormalizedCollection) => c.hubId === hub.id
              ).length

              return (
                <Card key={hub.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 flex-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Gamepad2 className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{hub.name}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{hub.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground">
                      {hubCollectionCount} collection{hubCollectionCount !== 1 ? "s" : ""}
                    </p>
                    <Button size="sm" asChild variant="outline">
                      <Link href={`/builder/network/${networkId}/dashboard?tab=collections`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      {/* Collections tab */}
      <TabsContent value="collections" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Collections ({safeCollections.length})
          </h2>
          {safeHubs.length > 0 && (
            <Button size="sm" asChild>
              <Link href={`/builder/network/${networkId}/collection/new`}>
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Create Collection
              </Link>
            </Button>
          )}
        </div>

        {safeCollections.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <FolderOpen className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No collections yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {safeHubs.length === 0
                ? "Create a hub first to add collections."
                : "Create your first collection to organize guides."}
            </p>
            {safeHubs.length > 0 && (
              <Button size="sm" asChild className="mt-4">
                <Link href={`/builder/network/${networkId}/collection/new`}>
                  Create First Collection
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
              {safeHubs.map((hub: NormalizedHub) => {
                const hubCollections = safeCollections.filter((c: NormalizedCollection) => c.hubId === hub.id)

                if (hubCollections.length === 0) return null

                return (
                  <div key={hub.id}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">{hub.name}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {hubCollections.map((col: NormalizedCollection) => {
                        const hubIdValid = col.hubId && col.hubId !== "undefined"
                        const colIdValid = col.id && col.id !== "undefined"
                        
                        // Calculate guide count for this collection from loaded guides
                        const collectionGuideCount = safeGuides.filter((g: Guide) => g.collectionId === col.id).length
                        
                        if (hubIdValid && colIdValid) {
                          return (
                            <Card key={col.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="flex items-center gap-2 font-semibold text-foreground truncate">
                                    <FolderOpen className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
                                    <span className="truncate">{col.name}</span>
                                  </h4>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {col.description || "No description yet"}
                                </p>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {collectionGuideCount} {collectionGuideCount === 1 ? "guide" : "guides"}
                                </p>
                                <Button size="sm" asChild variant="outline">
                                  <Link href={`/builder/network/${networkId}/dashboard?tab=guides&collection=${col.id}`}>
                                    View
                                  </Link>
                                </Button>
                              </div>
                            </Card>
                          )
                        } else {
                          return (
                            <span key={col.id} className="text-xs text-red-600 dark:text-red-400">
                              Missing hub/collection link
                            </span>
                          )
                        }
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
