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
  Edit2,
  Trash2,
  Package,
  Send,
  CheckCircle2,
  ArrowLeft,
  Info,
} from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge, DifficultyBadge } from "@/components/guideforge/shared"
import { normalizeGuideStatus, filterGuidesByStatus, filterOutArchived } from "@/lib/guideforge/utils"
import { DraftList } from "@/components/guideforge/builder/draft-list"
import { deleteHub, deleteCollection, updateHub, updateCollection } from "@/lib/guideforge/supabase-networks"
import type { NormalizedHub, NormalizedCollection } from "@/lib/guideforge/supabase-networks"
import {
  submitAssetDraftForReview,
  returnAssetDraftToDraft,
  publishAssetDraft,
  getAssetDraftStatusLabel,
} from "@/lib/guideforge/asset-draft-reviews"

interface NetworkDashboardTabsProps {
  networkId: string
  initialTab?: string
  initialCollectionId?: string
  hubs: NormalizedHub[]
  collections: NormalizedCollection[]
  guides: Guide[]
  attachedAssetsMap?: Record<string, AssetDraft[]>
}

export function NetworkDashboardTabs({
  networkId,
  initialTab = "drafts",
  initialCollectionId,
  hubs,
  collections,
  guides,
  attachedAssetsMap = {},
}: NetworkDashboardTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState<string>(initialTab)
  
  // Hub/collection management state
  const [editingHubId, setEditingHubId] = useState<string | null>(null)
  const [editHubName, setEditHubName] = useState("")
  const [editHubDescription, setEditHubDescription] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editCollectionName, setEditCollectionName] = useState("")
  const [editCollectionDescription, setEditCollectionDescription] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lane 2B: Asset review action state
  const [assetActionLoading, setAssetActionLoading] = useState<string | null>(null)
  const [assetActionError, setAssetActionError] = useState<Record<string, string>>({})
  const [assetActionSuccess, setAssetActionSuccess] = useState<Record<string, boolean>>({})
  
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

  // Hub management handlers
  const startEditHub = (hub: NormalizedHub) => {
    setEditingHubId(hub.id)
    setEditHubName(hub.name)
    setEditHubDescription(hub.description || "")
    setError(null)
  }

  const cancelEditHub = () => {
    setEditingHubId(null)
    setEditHubName("")
    setEditHubDescription("")
    setError(null)
  }

  const saveEditHub = async () => {
    if (!editingHubId || !editHubName.trim()) return
    setIsLoading(true)
    setError(null)

    const result = await updateHub(editingHubId, {
      name: editHubName.trim(),
      description: editHubDescription.trim(),
    })

    if (result.error) {
      setError(result.error)
    } else {
      setEditingHubId(null)
      router.refresh()
    }
    setIsLoading(false)
  }

  const confirmDeleteHub = async () => {
    if (!deletingId) return
    setIsLoading(true)
    setError(null)

    const result = await deleteHub(deletingId)
    if (result.error) {
      setError(result.error)
    } else {
      setDeletingId(null)
      router.refresh()
    }
    setIsLoading(false)
  }

  // Collection management handlers
  const startEditCollection = (col: NormalizedCollection) => {
    setEditingCollectionId(col.id)
    setEditCollectionName(col.name)
    setEditCollectionDescription(col.description || "")
    setError(null)
  }

  const cancelEditCollection = () => {
    setEditingCollectionId(null)
    setEditCollectionName("")
    setEditCollectionDescription("")
    setError(null)
  }

  const saveEditCollection = async () => {
    if (!editingCollectionId || !editCollectionName.trim()) return
    setIsLoading(true)
    setError(null)

    const result = await updateCollection(editingCollectionId, {
      name: editCollectionName.trim(),
      description: editCollectionDescription.trim(),
    })

    if (result.error) {
      setError(result.error)
    } else {
      setEditingCollectionId(null)
      router.refresh()
    }
    setIsLoading(false)
  }

  const confirmDeleteCollection = async () => {
    if (!deletingId) return
    setIsLoading(true)
    setError(null)

    const result = await deleteCollection(deletingId)
    if (result.error) {
      setError(result.error)
    } else {
      setDeletingId(null)
      router.refresh()
    }
    setIsLoading(false)
  }

  // Lane 2B: Asset draft action handlers
  const handleSubmitAssetForReview = async (assetId: string) => {
    setAssetActionLoading(assetId)
    setAssetActionError((prev) => ({ ...prev, [assetId]: "" }))

    const result = await submitAssetDraftForReview(assetId)

    if (!result.success) {
      setAssetActionError((prev) => ({ ...prev, [assetId]: result.error || "Failed to submit" }))
    } else {
      setAssetActionSuccess((prev) => ({ ...prev, [assetId]: true }))
      setTimeout(() => {
        setAssetActionSuccess((prev) => ({ ...prev, [assetId]: false }))
        router.refresh()
      }, 1500)
    }

    setAssetActionLoading(null)
  }

  const handleReturnAssetToDraft = async (assetId: string) => {
    setAssetActionLoading(assetId)
    setAssetActionError((prev) => ({ ...prev, [assetId]: "" }))

    const result = await returnAssetDraftToDraft(assetId)

    if (!result.success) {
      setAssetActionError((prev) => ({ ...prev, [assetId]: result.error || "Failed to return to draft" }))
    } else {
      setAssetActionSuccess((prev) => ({ ...prev, [assetId]: true }))
      setTimeout(() => {
        setAssetActionSuccess((prev) => ({ ...prev, [assetId]: false }))
        router.refresh()
      }, 1500)
    }

    setAssetActionLoading(null)
  }

  const handlePublishAsset = async (assetId: string) => {
    setAssetActionLoading(assetId)
    setAssetActionError((prev) => ({ ...prev, [assetId]: "" }))

    const result = await publishAssetDraft(assetId)

    if (!result.success) {
      setAssetActionError((prev) => ({ ...prev, [assetId]: result.error || "Failed to publish" }))
    } else {
      setAssetActionSuccess((prev) => ({ ...prev, [assetId]: true }))
      setTimeout(() => {
        setAssetActionSuccess((prev) => ({ ...prev, [assetId]: false }))
        router.refresh()
      }, 1500)
    }

    setAssetActionLoading(null)
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

  // Lane 2B: Filter attached assets by status
  const allAttachedAssets = Object.values(attachedAssetsMap || {}).flat() as AssetDraft[]
  const draftAssets = allAttachedAssets.filter((a) => a.status === "draft")
  const pendingReviewAssets = allAttachedAssets.filter((a) => a.status === "pending_review")
  const publishedAssets = allAttachedAssets.filter((a) => a.status === "published")

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-6 h-auto p-1 gap-1 shadow-forge" style={{backgroundImage: 'linear-gradient(180deg, color-mix(in oklch, var(--brass-50) 70%, var(--card)) 0%, var(--card) 100%)', border: '1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border))'}}>
        <TabsTrigger value="drafts">
          Drafts
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brass-100 dark:bg-[oklch(0.30_0.05_55)] px-2 py-0.5 text-xs font-semibold text-brass-700 dark:text-brass-300">
            {safeDrafts.length + draftAssets.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="ready">
          Pending Review
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[oklch(0.94_0.015_225)] dark:bg-[oklch(0.24_0.04_225)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.34_0.055_225)] dark:text-[oklch(0.78_0.065_225)]">
            {safeReady.length + pendingReviewAssets.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="published">
          Published
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[oklch(0.93_0.03_185)] dark:bg-[oklch(0.24_0.05_185)] px-2 py-0.5 text-xs font-semibold text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)]">
            {safePublished.length + publishedAssets.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="guides">
          Guides
          <span className="ml-2 inline-flex items-center justify-center rounded-full px-1.5 py-px font-mono text-[10px]" style={{ background: "color-mix(in oklch, var(--brass-100) 60%, var(--card))", color: "var(--fg-3)", border: "1px solid color-mix(in oklch, var(--brass-500) 20%, var(--border))" }}>
            {filteredGuides.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="hubs">
          Hubs
          <span className="ml-2 inline-flex items-center justify-center rounded-full px-1.5 py-px font-mono text-[10px]" style={{ background: "color-mix(in oklch, var(--brass-100) 60%, var(--card))", color: "var(--fg-3)", border: "1px solid color-mix(in oklch, var(--brass-500) 20%, var(--border))" }}>
            {safeHubs.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="collections">
          Collections
          <span className="ml-2 inline-flex items-center justify-center rounded-full px-1.5 py-px font-mono text-[10px]" style={{ background: "color-mix(in oklch, var(--brass-100) 60%, var(--card))", color: "var(--fg-3)", border: "1px solid color-mix(in oklch, var(--brass-500) 20%, var(--border))" }}>
            {safeCollections.length}
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Drafts tab */}
      <TabsContent value="drafts" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">
              Draft Guides
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Work in progress guides awaiting review. Drafts are private — only published guides appear on the public network page.
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
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

        {/* Lane 2B: Attached Draft Assets with Submit for Review */}
        {draftAssets.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Attached Assets &middot; Private Drafts
            </h3>
            <p className="text-xs text-muted-foreground">
              Attached assets are private drafts until they&apos;re submitted, reviewed, and published. Use Submit to move them to Pending Review; once published, single guides and checklists appear on the public network page.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {draftAssets.map((asset: AssetDraft) => (
                <Card key={asset.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-2">
                      <Package className="size-4 text-[oklch(0.50_0.065_225)] dark:text-[oklch(0.72_0.06_225)] flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground line-clamp-2">{asset.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {asset.summary ? asset.summary.slice(0, 100) + (asset.summary.length > 100 ? "..." : "") : "No summary yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                    <Badge variant="outline" className="text-xs font-normal capitalize">
                      {asset.assetType.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal text-brass-700 dark:text-brass-300 border-brass-300 dark:border-brass-700">
                      Draft
                    </Badge>
                    {assetActionSuccess[asset.id] && (
                      <Badge variant="outline" className="text-xs font-normal text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)] border-[oklch(0.55_0.09_185)]/40 ml-auto">
                        <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                        Success
                      </Badge>
                    )}
                    {assetActionError[asset.id] && (
                      <div className="text-xs text-red-600 dark:text-red-400 ml-auto">
                        {assetActionError[asset.id]}
                      </div>
                    )}
                    <div className="ml-auto flex gap-2 items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSubmitAssetForReview(asset.id)}
                        disabled={assetActionLoading === asset.id || assetActionSuccess[asset.id]}
                        className="whitespace-nowrap"
                      >
                        <Send className="size-3 mr-1" aria-hidden="true" />
                        {assetActionLoading === asset.id ? "Submitting..." : "Submit"}
                      </Button>
                      <Button size="sm" asChild variant="outline">
                        <Link href={`/builder/assets/${asset.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

  {/* Ready tab */}
  <TabsContent value="ready" className="space-y-4">
  <div className="flex items-center justify-between">
  <div>
  <h2 className="text-lg font-semibold text-foreground">Pending Review</h2>
  <p className="mt-1 text-sm text-muted-foreground">
  Guides and assets submitted for review and awaiting publication.
  </p>
          </div>
        </div>

        {safeReady.length === 0 && pendingReviewAssets.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Clock className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No items pending review yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a draft guide or asset for review to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Guide items */}
            {safeReady.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="font-semibold text-foreground truncate">{guide.title}</h4>
                    {/* Phase 10C: Revision badge on card */}
                    {guide.revisionOf && (
                      <Badge variant="outline" className="text-[10px] border-[oklch(0.45_0.10_330)]/50 text-[oklch(0.28_0.12_330)] dark:border-[oklch(0.55_0.10_330)]/50 dark:text-[oklch(0.78_0.10_330)] flex-shrink-0">
                        Rev #{guide.revisionNumber || 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {guide.summary ? guide.summary.slice(0, 100) + (guide.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                  {/* Phase 10C: Revision context helper text */}
                  {guide.revisionOf && (
                    <p className="text-xs text-[oklch(0.28_0.12_330)] dark:text-[oklch(0.78_0.10_330)] italic mb-2">Revision of another guide</p>
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
            
            {/* Lane 2B: Asset items pending review */}
            {pendingReviewAssets.map((asset: AssetDraft) => (
              <Card key={asset.id} className="border-border/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Package className="size-4 text-[oklch(0.50_0.065_225)] dark:text-[oklch(0.72_0.06_225)] flex-shrink-0" aria-hidden="true" />
                    <h4 className="font-semibold text-foreground truncate">{asset.title}</h4>
                    <Badge variant="outline" className="text-[10px] font-normal capitalize">
                      {asset.assetType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {asset.summary ? asset.summary.slice(0, 100) + (asset.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs font-normal text-[oklch(0.34_0.055_225)] dark:text-[oklch(0.78_0.065_225)] border-[oklch(0.37_0.05_225)]/40">
                      {getAssetDraftStatusLabel(asset.status).displayName}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {assetActionSuccess[asset.id] && (
                    <Badge variant="outline" className="text-xs font-normal text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)] border-[oklch(0.55_0.09_185)]/40">
                      <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                      Success
                    </Badge>
                  )}
                  {assetActionError[asset.id] && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {assetActionError[asset.id]}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublishAsset(asset.id)}
                    disabled={assetActionLoading === asset.id || assetActionSuccess[asset.id]}
                    className="whitespace-nowrap"
                  >
                    <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                    {assetActionLoading === asset.id ? "Publishing..." : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReturnAssetToDraft(asset.id)}
                    disabled={assetActionLoading === asset.id || assetActionSuccess[asset.id]}
                  >
                    <ArrowLeft className="size-3 mr-1" aria-hidden="true" />
                    Return
                  </Button>
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/assets/${asset.id}`}>
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
            Published ({safePublished.length + publishedAssets.length})
          </h2>
        </div>

        {/* Lane 2D: Published assets are now visible on public network */}
        {publishedAssets.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-[oklch(0.55_0.09_185)]/30 bg-[oklch(0.55_0.09_185)]/5 p-3">
            <Info className="mt-0.5 size-4 flex-shrink-0 text-[oklch(0.50_0.09_185)] dark:text-[oklch(0.72_0.08_185)]" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-foreground">Published Assets — Now Public</p>
              <p className="mt-1 text-muted-foreground">
                Checklists and single guides are automatically visible on your public network page. 
                Other asset types (recipes, SOPs) will be added in future phases.
              </p>
            </div>
          </div>
        )}

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

        {safePublished.length === 0 && publishedAssets.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
            <Eye className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">No published guides or assets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Publish draft guides and assets to see them here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Guide items */}
            {safePublished.map((guide: Guide) => (
              <Card key={guide.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="font-semibold text-foreground truncate">{guide.title}</h4>
                    {/* Phase 10D/10E: Badge for published guides */}
                    {!guide.revisionOf ? (
                      <Badge variant="outline" className="text-[10px] border-[oklch(0.55_0.09_185)]/40 text-[oklch(0.40_0.09_185)] dark:border-[oklch(0.55_0.09_185)]/55 dark:text-[oklch(0.82_0.07_185)] flex-shrink-0">
                        Original
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-[oklch(0.45_0.10_330)]/50 text-[oklch(0.28_0.12_330)] dark:border-[oklch(0.55_0.10_330)]/50 dark:text-[oklch(0.78_0.10_330)] flex-shrink-0">
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
                  {/* Revision context */}
                  {guide.revisionOf && (
                    <p className="text-xs text-[oklch(0.28_0.12_330)] dark:text-[oklch(0.78_0.10_330)] italic mb-2">Revision of another guide</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={guide.status} />
                    {guide.type && <Badge variant="outline" className="text-xs font-normal capitalize">{guide.type.replace("-", " ")}</Badge>}
                    {guide.difficulty && <DifficultyBadge difficulty={guide.difficulty} />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/n/published/${guide.id}`}
                    className="text-brand-steel-blue hover:text-[oklch(0.32_0.055_225)] dark:text-[oklch(0.78_0.065_225)] dark:hover:text-[oklch(0.88_0.05_225)] text-xs"
                  >
                    View
                  </Link>
                </div>
              </Card>
            ))}

            {/* Lane 2B: Published assets */}
            {publishedAssets.map((asset: AssetDraft) => (
              <Card key={asset.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0 mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Package className="size-4 text-[oklch(0.50_0.09_185)] dark:text-[oklch(0.72_0.08_185)] flex-shrink-0" aria-hidden="true" />
                    <h4 className="font-semibold text-foreground truncate">{asset.title}</h4>
                    <Badge variant="outline" className="text-[10px] font-normal capitalize">
                      {asset.assetType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {asset.summary ? asset.summary.slice(0, 100) + (asset.summary.length > 100 ? "..." : "") : "No summary yet"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs font-normal text-[oklch(0.40_0.09_185)] dark:text-[oklch(0.82_0.07_185)] border-[oklch(0.55_0.09_185)]/40">
                      {getAssetDraftStatusLabel(asset.status).displayName}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button size="sm" asChild variant="outline">
                    <Link href={`/builder/assets/${asset.id}`}>
                      Edit
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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
                      <Badge variant="outline" className="text-[10px] border-[oklch(0.55_0.09_185)]/40 text-[oklch(0.40_0.09_185)] dark:border-[oklch(0.55_0.09_185)]/55 dark:text-[oklch(0.82_0.07_185)] flex-shrink-0">
                        Original
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-[oklch(0.45_0.10_330)]/50 text-[oklch(0.28_0.12_330)] dark:border-[oklch(0.55_0.10_330)]/50 dark:text-[oklch(0.78_0.10_330)] flex-shrink-0">
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
                            <Badge variant="outline" className="text-[10px] border-brass-300 dark:border-brass-700 text-brass-700 dark:text-brass-300 flex-shrink-0">
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
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Hubs ({safeHubs.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Hubs contain collections. Collections hold guides and attached draft assets.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href={`/builder/network/${networkId}/hub/new`}>
              <Plus className="size-4 mr-1" aria-hidden="true" />
              Create Hub
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-900 dark:text-red-100">
            {error}
          </div>
        )}

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
              const isEditing = editingHubId === hub.id
              const isDeleting = deletingId === hub.id

              return (
                <Card key={hub.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editHubName}
                        onChange={(e) => setEditHubName(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                        placeholder="Hub name"
                      />
                      <textarea
                        value={editHubDescription}
                        onChange={(e) => setEditHubDescription(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none"
                        rows={2}
                        placeholder="Description"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={cancelEditHub} disabled={isLoading}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEditHub} disabled={isLoading}>
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Delete this hub?</p>
                      <p className="text-xs text-muted-foreground">
                        This action cannot be undone. Make sure all collections are removed first.
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} disabled={isLoading}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={confirmDeleteHub} disabled={isLoading}>
                          {isLoading ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/builder/network/${networkId}/dashboard?tab=collections`}>
                              <FolderOpen className="size-3.5 mr-1" aria-hidden="true" />
                              View Collections
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEditHub(hub)}>
                            <Edit2 className="size-3.5 mr-1" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeletingId(hub.id)}>
                            <Trash2 className="size-3.5 mr-1" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </TabsContent>

      {/* Collections tab */}
      <TabsContent value="collections" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Collections ({safeCollections.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Collections hold guides and attached draft assets. Click &ldquo;View Content&rdquo; to see guides in a collection.
            </p>
          </div>
          {safeHubs.length > 0 && (
            <Button size="sm" asChild>
              <Link href={`/builder/network/${networkId}/collection/new`}>
                <Plus className="size-4 mr-1" aria-hidden="true" />
                Create Collection
              </Link>
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-900 dark:text-red-100">
            {error}
          </div>
        )}

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
                      const isEditingCol = editingCollectionId === col.id
                      const isDeletingCol = deletingId === col.id
                      
                      // Calculate guide count for this collection from loaded guides
                      const collectionGuideCount = safeGuides.filter((g: Guide) => g.collectionId === col.id).length
                      // Calculate attached asset count
                      const collectionAssetCount = (attachedAssetsMap?.[col.id] || []).length
                      
                      if (hubIdValid && colIdValid) {
                        return (
                          <Card key={col.id} className="border-border/50 px-4 py-3 flex flex-col hover:bg-muted/50 transition-colors">
                            {isEditingCol ? (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={editCollectionName}
                                  onChange={(e) => setEditCollectionName(e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                                  placeholder="Collection name"
                                />
                                <textarea
                                  value={editCollectionDescription}
                                  onChange={(e) => setEditCollectionDescription(e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background resize-none"
                                  rows={2}
                                  placeholder="Description"
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={cancelEditCollection} disabled={isLoading}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={saveEditCollection} disabled={isLoading}>
                                    {isLoading ? "Saving..." : "Save Changes"}
                                  </Button>
                                </div>
                              </div>
                            ) : isDeletingCol ? (
                              <div className="space-y-3">
                                <p className="text-sm font-semibold text-foreground">Delete this collection?</p>
                                <p className="text-xs text-muted-foreground">
                                  This action cannot be undone. Make sure all guides are removed first.
                                </p>
                                <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} disabled={isLoading}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={confirmDeleteCollection} disabled={isLoading}>
                                    {isLoading ? "Deleting..." : "Delete"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
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
                                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <span>{collectionGuideCount} {collectionGuideCount === 1 ? "guide" : "guides"}</span>
                                    {collectionAssetCount > 0 && (
                                      <>
                                        <span className="text-border/50">·</span>
                                        <span className="flex items-center gap-1">
                                          <Package className="size-3" aria-hidden="true" />
                                          {collectionAssetCount} {collectionAssetCount === 1 ? "asset" : "assets"}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" asChild>
                                      <Link href={`/builder/network/${networkId}/dashboard?tab=guides&collection=${col.id}`}>
                                        <BookMarked className="size-3.5 mr-1" aria-hidden="true" />
                                        View Content
                                      </Link>
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => startEditCollection(col)}>
                                      <Edit2 className="size-3.5 mr-1" aria-hidden="true" />
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeletingId(col.id)}>
                                      <Trash2 className="size-3.5 mr-1" aria-hidden="true" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
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
