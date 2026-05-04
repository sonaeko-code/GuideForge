import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { loadNetworkBuilderContext } from "@/lib/guideforge/supabase-networks"

export default async function NetworkSettingsPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const { networkId } = await params

  try {
    const ctx = await loadNetworkBuilderContext(networkId)
    const network = ctx.network

    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="rounded-lg border border-border bg-secondary/20 p-8">
            <h1 className="text-2xl font-bold tracking-tight mb-4">Network Settings</h1>
            
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-foreground mb-2">Current Network</h2>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Name: </span>
                    <span className="font-mono text-sm">{network.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Slug: </span>
                    <span className="font-mono text-sm">{network.slug}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Description: </span>
                    <span className="font-mono text-sm">{network.description || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h2 className="font-semibold text-foreground mb-3">Phase 2 & Beyond</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Edit network name and slug</li>
                  <li>• Update network description</li>
                  <li>• Change theme and colors</li>
                  <li>• Manage hubs and collections</li>
                  <li>• Configure permissions and access</li>
                  <li>• Delete network</li>
                </ul>
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-xs text-muted-foreground">
                  Phase 1 Foundation: Settings page placeholder. Full editing will be implemented in Phase 2.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  } catch (error) {
    return (
      <main className="min-h-screen bg-background">
        <SiteHeader hideCta />
        <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link href="/builder/networks">
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to Networks
            </Link>
          </Button>

          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-700 dark:text-red-300">
              Failed to load network settings. Please try again.
            </p>
          </div>
        </div>
      </main>
    )
  }
}
