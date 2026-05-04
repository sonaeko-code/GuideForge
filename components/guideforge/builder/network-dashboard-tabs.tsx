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
import { DraftList } from "@/components/guideforge/builder/draft-list"
import { getGuidesByCollection } from "@/lib/guideforge/mock-data"
import type { NormalizedHub, NormalizedCollection } from "@/lib/guideforge/supabase-networks"

interface NetworkDashboardTabsProps {
  networkId: string
  initialTab?: string
  initialCollectionId?: string
  hubs: NormalizedHub[]
  collections: NormalizedCollection[]
  guides: Guide[]
  drafts: any[]
  ready: any[]
  published: any[]
}

export function NetworkDashboardTabs({
  networkId,
  initialTab = "drafts",
  initialCollectionId,
  hubs,
  collections,
  guides,
  drafts,
  ready,
  published,
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
  const safeDrafts = Array.isArray(drafts) ? drafts : []
  const safeReady = Array.isArray(ready) ? ready : []
  const safePublished = Array.isArray(published) ? published : []

  // Guides tab filtering
  const filteredCollection = initialCollectionId
    ? safeCollections.find((c: NormalizedCollection) => c.id === initialCollectionId)
    : null
  const filteredGuides = initialCollectionId
    ? safeGuides.filter((g: Guide) => g.collectionId === initialCollectionId)
    : safeGuides
  
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
          Ready
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
            {safeGuides.length}
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
              Work in progress guides stored in your browser.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/builder/network/${networkId}/generate`}>
              <Plus className="size-4 mr-1" aria-hidden="true" />
              New Draft
            </Link>
          </Button>
        </div>

        <DraftList networkId={networkId} scopedDrafts={drafts} scopedPublished={published} />
      </TabsContent>

      {/* Ready tab */}
      <TabsContent value="ready" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Ready to Publish</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Guides validated and ready for publishing.
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {safeReady.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col">
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <StatusBadge status={guide.status} />
                  {guide.type && <Badge variant="outline" className="text-xs capitalize">{guide.type.replace("-", " ")}</Badge>}
                  {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                  <Button size="sm" asChild variant="ghost" className="ml-auto">
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

        {safePublished.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Eye className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No published guides yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish a draft guide to see it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {safePublished.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col">
                <div className="space-y-2 flex-1">
                  <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                  <StatusBadge status={guide.status} />
                  {guide.type && <Badge variant="outline" className="text-xs capitalize">{guide.type.replace("-", " ")}</Badge>}
                  {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                  <Button size="sm" asChild variant="ghost" className="ml-auto">
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
                  <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      <StatusBadge status={guide.status} />
                      {guide.type && <Badge variant="outline" className="text-xs capitalize">{guide.type.replace("-", " ")}</Badge>}
                      {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                      <Button size="sm" asChild variant="ghost" className="ml-auto">
                        <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
                      <Button size="sm" asChild variant="ghost" className="ml-auto">
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
                Guides ({safeGuides.length})
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

            {safeGuides.length === 0 ? (
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
                {safeGuides.map((guide: Guide) => (
                  <Card key={guide.id} className="border-border/50 px-4 py-3 flex flex-col">
                    <div className="space-y-2 flex-1">
                      <h4 className="font-semibold text-foreground line-clamp-2">{guide.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                      <StatusBadge status={guide.status} />
                      {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                      <Button size="sm" asChild variant="ghost" className="ml-auto">
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
                <Card key={hub.id} className="border-border/50 px-4 py-3 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Gamepad2 className="size-4 text-primary" aria-hidden="true" />
                        {hub.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">{hub.description}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {hubCollectionCount} collection{hubCollectionCount !== 1 ? "s" : ""}
                  </p>
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
                          <Card key={col.id} className="border-border/50 px-4 py-4 flex flex-col">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="flex items-center gap-2 font-semibold text-foreground">
                                  <FolderOpen className="size-4 text-primary" aria-hidden="true" />
                                  {col.name}
                                </h4>
                                <Badge variant="secondary" className="shrink-0 text-xs">
                                  Hub: {col.hubName || hub.name}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{col.description}</p>
                              <p className="text-xs font-medium text-muted-foreground">
                                {collectionGuideCount} guide{collectionGuideCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                              <Button size="sm" asChild variant="ghost" onClick={() => {
                                setActiveTab("guides")
                                router.push(`/builder/network/${networkId}/dashboard?tab=guides&collection=${col.id}`)
                              }}>
                                Manage Guides
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
