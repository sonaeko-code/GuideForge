import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { GeneratorClient } from "@/components/guideforge/builder/generator-client"
import { loadNetworkBuilderContext } from "@/lib/guideforge/supabase-networks"

export default async function GeneratorPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const { networkId } = await params
  console.log("[v0] Generate route networkId:", networkId)

  const ctx = await loadNetworkBuilderContext(networkId)
  console.log("[v0] Generate context summary:", {
    networkId: ctx.networkId,
    networkName: ctx.network?.name,
    hubs: ctx.hubs.length,
    collections: ctx.collections.length,
    source: ctx.source,
    errors: ctx.errors,
  })

  // Network not found at all
  if (!ctx.network) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
            <div className="flex gap-3">
              <AlertCircle
                className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Network not found
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    No network was found for{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {networkId}
                    </code>
                    .
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/builder/networks">
                    <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                    All Networks
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <GeneratorClient
          networkId={ctx.networkId}
          networkName={ctx.network.name}
          hubs={ctx.hubs}
          collectionsByHub={ctx.collectionsByHub}
        />
      </div>
    </main>
  )
}
