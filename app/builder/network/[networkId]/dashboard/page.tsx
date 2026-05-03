import Link from "next/link"
import {
  Plus,
  MoreVertical,
  Clock,
  Eye,
  EyeOff,
  Gamepad2,
  FolderOpen,
  BookMarked,
  Flame,
  ArrowLeft,
  AlertCircle,
} from "lucide-react"
import type { Network, Hub, Collection, Guide } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SiteHeader } from "@/components/guideforge/site-header"
import { StatusBadge, DifficultyBadge } from "@/components/guideforge/shared"
import { DraftList } from "@/components/guideforge/builder/draft-list"
import {
  getNetworkById as getMockNetworkById,
  getHubsByNetwork,
  getCollectionsByHub,
  getGuidesByCollection,
} from "@/lib/guideforge/mock-data"
import {
  getHubsByNetworkId,
  getCollectionsByHubId,
  resolveNetworkParam,
  getGuidesByNetworkId,
  getDraftGuidesByNetworkId,
  getPublishedGuidesByNetworkId,
} from "@/lib/guideforge/supabase-networks"
import { cn } from "@/lib/utils"

export default async function NetworkDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  console.log("[v0] DASHBOARD PAGE START")
  
  const { networkId } = await params
  const { tab } = await searchParams
  
  console.log("[v0] dashboard resolving network", { networkId })

  // Wrap entire component in try/catch to prevent crashes
  try {
    // Step 1: Resolve network
    let network: Network | null = null
    try {
      network = await resolveNetworkParam(networkId)
      console.log("[v0] dashboard network result (Supabase):", network?.id, network?.name)
    } catch (err) {
      console.error("[v0] dashboard network load error:", err)
      // Try mock fallback for QuestLine
      const isQuestLineRoute = networkId === "questline" || networkId === "network_questline"
      if (isQuestLineRoute) {
        network = getMockNetworkById("network_questline")
        console.log("[v0] dashboard network result (mock fallback):", network?.id, network?.name)
      }
    }

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
                <Link href="/builder">
                  <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                  Back to Builder
                </Link>
              </Button>
            </div>
          </div>
        </main>
      )
    }

    // Step 2: Load hubs
    let hubs: Hub[] = []
    let hubLoadError = ""
    try {
      console.log("[v0] dashboard loading hubs")
      hubs = await getHubsByNetworkId(network.id)
      console.log("[v0] dashboard hubs result (Supabase):", hubs?.length || 0)
      
      if (!hubs || hubs.length === 0) {
        hubs = getHubsByNetwork(network.id)
        console.log("[v0] dashboard hubs result (fallback mock):", hubs?.length || 0)
      }
      if (!hubs) hubs = []
    } catch (err) {
      console.error("[v0] dashboard loading hubs error:", err)
      hubLoadError = err instanceof Error ? err.message : String(err)
      hubs = getHubsByNetwork(network.id) || []
    }

    // Step 3: Load collections
    let collections: Collection[] = []
    let collectionLoadError = ""
    try {
      console.log("[v0] dashboard loading collections")
      for (const hub of hubs) {
        try {
          const hubCollections = await getCollectionsByHubId(hub.id)
          if (hubCollections && hubCollections.length > 0) {
            collections = collections.concat(hubCollections)
          } else {
            const mockColls = getCollectionsByHub(hub.id)
            if (mockColls && mockColls.length > 0) {
              collections = collections.concat(mockColls)
            }
          }
        } catch (hubErr) {
          console.error("[v0] dashboard loading collections for hub error:", hubErr)
          const mockColls = getCollectionsByHub(hub.id)
          if (mockColls && mockColls.length > 0) {
            collections = collections.concat(mockColls)
          }
        }
      }
      console.log("[v0] dashboard collections result:", collections?.length || 0)
      if (!collections) collections = []
    } catch (err) {
      console.error("[v0] dashboard loading collections error:", err)
      collectionLoadError = err instanceof Error ? err.message : String(err)
      collections = []
    }

    // Step 4: Load guides
    let guides: any[] = []
    let published: any[] = []
    let drafts: any[] = []
    let guideLoadError = ""
    try {
      console.log("[v0] dashboard loading guides")
      const isQuestLineRoute = network.id === "network_questline" || network.slug === "questline"
      
      if (!isQuestLineRoute) {
        // Real networks: load from Supabase only
        try {
          guides = await getGuidesByNetworkId(network.id)
          if (!guides) guides = []
        } catch (e) {
          console.error("[v0] dashboard loading guides error:", e)
          guides = []
        }
        try {
          drafts = await getDraftGuidesByNetworkId(network.id)
          if (!drafts) drafts = []
        } catch (e) {
          console.error("[v0] dashboard loading drafts error:", e)
          drafts = []
        }
        try {
          published = await getPublishedGuidesByNetworkId(network.id)
          if (!published) published = []
        } catch (e) {
          console.error("[v0] dashboard loading published error:", e)
          published = []
        }
      } else {
        // QuestLine demo route: use mock data for demo content
        guides = collections.flatMap((c: Collection) => getGuidesByCollection(c.id))
        if (!guides) guides = []
        published = guides.filter((g: any) => g.status === "published")
        if (!published) published = []
        drafts = guides.filter((g: any) => g.status === "draft" || g.status === "in-review")
        if (!drafts) drafts = []
      }
      
      console.log("[v0] dashboard guides result:", guides?.length || 0, "| published:", published?.length || 0, "| drafts:", drafts?.length || 0)
    } catch (err) {
      console.error("[v0] dashboard loading guides error:", err)
      guideLoadError = err instanceof Error ? err.message : String(err)
      guides = []
      published = []
      drafts = []
    }

    // Step 5: Render dashboard
    console.log("[v0] dashboard render start")

    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />

        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          {/* Error display if data loading failed */}
          {(hubLoadError || collectionLoadError || guideLoadError) && (
            <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">Some data failed to load</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    {hubLoadError && <li key="hubs">• Hubs: {hubLoadError}</li>}
                    {collectionLoadError && <li key="collections">• Collections: {collectionLoadError}</li>}
                    {guideLoadError && <li key="guides">• Guides: {guideLoadError}</li>}
                  </ul>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Empty states will be shown below. Some features may be limited.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Back to Builder Home link */}
          <div className="mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link href="/builder">
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to Builder Home
              </Link>
            </Button>
          </div>

          {/* Network Header */}
          <div className="mb-10 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {network.name}
                </h1>
                <p className="mt-2 text-pretty text-lg text-muted-foreground">
                  {network.description}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Network settings"
                  >
                    <MoreVertical className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="#">Edit network</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/n/${network.slug || "questline"}`}>View public page</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                  <Link href="#">Settings</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="border-primary/30 bg-primary/5 px-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hubs</p>
                <p className="text-3xl font-bold text-foreground">{hubs.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </Card>
            <Card className="border-border/50 px-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</p>
                <p className="text-3xl font-bold text-foreground">{collections.length}</p>
                <p className="text-xs text-muted-foreground">Groups</p>
              </div>
            </Card>
            <Card className="border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Published</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{published.length}</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Live</p>
              </div>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5 px-4 py-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Drafts</p>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">{drafts.length}</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70">In progress</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue={tab || "drafts"} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="hubs">Hubs</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="guides">Guides</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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

          {/* Hubs tab */}
          <TabsContent value="hubs" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Hubs ({hubs.length})
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Games, products, departments — the main categories in your network.
                </p>
              </div>
              <Button size="sm" asChild>
                <Link href={`/builder/network/${networkId}/hub/new`}>
                  <Plus className="size-4" aria-hidden="true" />
                  Create Hub
                </Link>
              </Button>
            </div>

            {hubs.length === 0 ? (
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
              <div className="space-y-2">
                {hubs.map((hub: Hub) => (
                  <Card key={hub.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                          <Gamepad2 className="size-4 text-primary" aria-hidden="true" />
                          {hub.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {hub.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {hub.collectionIds.length} collection
                          {hub.collectionIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Collections tab */}
          <TabsContent value="collections" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Collections ({collections.length})
              </h2>
              <Button size="sm" asChild>
                <Link href={`/builder/network/${networkId}/collection/new`}>
                  <Plus className="size-4 mr-1" aria-hidden="true" />
                  Create Collection
                </Link>
              </Button>
            </div>

            {collections.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
                <FolderOpen className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="font-semibold text-foreground">No collections yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create collections to organize guides within hubs.
                </p>
                <Button size="sm" asChild className="mt-4">
                  <Link href={`/builder/network/${networkId}/collection/new`}>
                    Create First Collection
                  </Link>
                </Button>
              </div>
            ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {collections.map((col: Collection) => (
                <Card key={col.id} className="border-border/50 px-4 py-4">
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                      <FolderOpen className="size-4 text-primary" aria-hidden="true" />
                      {col.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {col.description}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {col.guideIds.length} guide
                      {col.guideIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            )}
          </TabsContent>

          {/* Guides tab */}
          <TabsContent value="guides" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Guides ({guides.length})
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {published.length} published, {drafts.length} draft
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/builder/network/${networkId}/generate`}>
                    <Flame className="size-4 mr-1" aria-hidden="true" />
                    Generate Guide
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/builder/network/${networkId}/generate`}>
                    <Plus className="size-4" aria-hidden="true" />
                    Create Guide
                  </Link>
                </Button>
              </div>
            </div>

            {guides.length === 0 ? (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
                <BookMarked className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
                <p className="font-semibold text-foreground">No guides yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first guide to populate your network.
                </p>
                <Button size="sm" asChild className="mt-4">
                  <Link href={`/builder/network/${networkId}/generate`}>
                    Create First Guide
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {guides.map((guide: Guide) => (
                  <Card key={guide.id} className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                          <BookMarked className="size-4 text-primary" aria-hidden="true" />
                          {guide.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <StatusBadge status={guide.status} />
                          <DifficultyBadge difficulty={guide.difficulty} />
                          {guide.verification && (
                            <Badge variant="secondary" className="text-xs">
                              {guide.verification === "forge-verified"
                                ? "Forge Verified"
                                : guide.verification}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreVertical
                              className="size-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/builder/network/${networkId}/guide/${guide.id}/edit`}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            {/* Guide preview link - use guide's hub slug if available */}
                            <Link href={`/n/${network.slug || "questline"}/${guide.hubId || "emberfall"}/${guide.slug}`}>
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>Publish</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-border/50 p-6">
              <h3 className="font-semibold text-foreground">Forge Rules</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Every guide in this network must follow these standards.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="#">View and customize rules</Link>
              </Button>
            </Card>

            <Card className="border-border/50 p-6">
              <h3 className="font-semibold text-foreground">Network Settings</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage visibility, domain, branding, and more.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="#">Edit settings</Link>
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent activity */}
        <div className="mt-12 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
          <Card className="border-border/50 p-6">
            <div className="space-y-3 text-center">
              <Clock className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No recent activity. Create your first hub or guide to get started.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  )
  } catch (fatalErr) {
    console.error("[v0] dashboard fatal error:", fatalErr)
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle className="size-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="font-semibold text-red-900 dark:text-red-100 mb-2">Dashboard failed to load</h2>
                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                  {fatalErr instanceof Error ? fatalErr.message : String(fatalErr)}
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/builder">
                    <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                    Back to Builder
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }
}
