import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateCollectionForm } from "@/components/guideforge/builder/create-collection-form"
import { loadNetworkBuilderContext } from "@/lib/guideforge/supabase-networks"

export default async function CreateCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ networkId: string }>
  searchParams: Promise<{ hub?: string }>
}) {
  const { networkId } = await params
  const { hub: preselectedHubId } = await searchParams

  console.log("[v0] Collection page networkId:", networkId)
  console.log("[v0] Collection page preselected hub:", preselectedHubId)

  // Use the shared loader — same as dashboard, generate, and guide/new pages.
  // This correctly resolves UUIDs, slugs, and mock IDs and never falls back
  // to mock hub data for real Supabase networks.
  const ctx = await loadNetworkBuilderContext(networkId)
  const hubs = ctx.hubs

  console.log("[v0] Collection page hubs loaded:", hubs.length, "source:", ctx.source)

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        {/* Breadcrumb / Back navigation */}
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/builder/network/${networkId}/dashboard`}>
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
          <span className="text-foreground font-semibold">Create Collection</span>
        </nav>

        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Collection
          </h1>
          <p className="text-lg text-muted-foreground">
            Collections organize guides within a hub.
          </p>
        </div>

        <CreateCollectionForm
          networkId={networkId}
          hubs={hubs}
          preselectedHubId={preselectedHubId}
        />
      </div>
    </main>
  )
}
