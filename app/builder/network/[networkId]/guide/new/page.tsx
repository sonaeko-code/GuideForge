import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ChevronRight, AlertCircle } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateGuideForm } from "@/components/guideforge/builder/create-guide-form"
import { loadNetworkBuilderContext } from "@/lib/guideforge/supabase-networks"

export default async function CreateGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ hub?: string; collection?: string }>
}) {
  const { networkId } = await params
  const { hub: hubParamRaw, collection: collectionParamRaw } = await searchParams

  console.log("[v0] Manual guide page route networkId:", networkId)
  console.log("[v0] Manual guide page query params:", {
    hub: hubParamRaw,
    collection: collectionParamRaw,
  })

  const ctx = await loadNetworkBuilderContext(networkId)
  console.log("[v0] Manual guide page context summary:", {
    networkId: ctx.networkId,
    networkName: ctx.network?.name,
    hubs: ctx.hubs.length,
    collections: ctx.collections.length,
    source: ctx.source,
    errors: ctx.errors,
  })

  const sanitize = (v?: string) => {
    if (!v) return undefined
    const t = String(v).trim()
    if (!t || t === "undefined" || t === "null") return undefined
    return t
  }
  const hubParam = sanitize(hubParamRaw)
  const collectionParam = sanitize(collectionParamRaw)

  // Validate hub/collection params against the loaded context
  const validHub =
    hubParam && ctx.hubs.some((h) => h.id === hubParam) ? hubParam : undefined
  const validCollection = (() => {
    if (!collectionParam) return undefined
    if (validHub) {
      const list = ctx.collectionsByHub[validHub] || []
      return list.some((c) => c.id === collectionParam)
        ? collectionParam
        : undefined
    }
    return ctx.collections.some((c) => c.id === collectionParam)
      ? collectionParam
      : undefined
  })()

  const breadcrumb = (
    <nav
      className="mb-6 flex flex-wrap items-center gap-2 text-sm"
      aria-label="Breadcrumb"
    >
      <Button asChild variant="ghost" size="sm">
        <Link href={`/builder/network/${ctx.networkId}/dashboard`}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to Network Dashboard
        </Link>
      </Button>
      <span className="text-muted-foreground">·</span>
      <Link
        href="/builder/networks"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        All Networks
      </Link>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-foreground font-semibold">Create Guide</span>
    </nav>
  )

  if (!ctx.network) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          {breadcrumb}
          <Card className="border-red-500/30 bg-red-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">
                  Network not found
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Could not resolve a network for{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {networkId}
                  </code>
                  .
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  // Pre-check: at least one hub
  if (ctx.hubs.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          {breadcrumb}
          <Card className="border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Create a hub first.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Guides live inside collections, which live inside hubs. You
                    need at least one hub before creating a guide in this
                    network.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link
                    href={`/builder/network/${ctx.networkId}/hub/new`}
                  >
                    Create Hub
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  // Pre-check: at least one collection across hubs
  if (ctx.collections.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          {breadcrumb}
          <Card className="border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Create a collection first.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have hubs in this network, but no collections yet.
                    Guides need a collection to live in.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link
                    href={`/builder/network/${ctx.networkId}/collection/new${
                      validHub ? `?hub=${validHub}` : ""
                    }`}
                  >
                    Create Collection
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        {breadcrumb}

        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Manual Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Start with a guide template. Forge Rules are applied automatically
            based on type.
          </p>
        </div>

        <CreateGuideForm
          networkId={ctx.networkId}
          hubs={ctx.hubs}
          collectionsMap={ctx.collectionsByHub}
          preselectedHubId={validHub}
          preselectedCollectionId={validCollection}
        />
      </div>
    </main>
  )
}
