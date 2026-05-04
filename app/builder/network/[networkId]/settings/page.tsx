import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { NetworkSettingsForm } from "@/components/guideforge/builder/network-settings-form"
import { NetworkStructureManager } from "@/components/guideforge/builder/network-structure-manager"
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

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{network.name} Settings</h1>
            <p className="text-muted-foreground mt-2">Edit network information and structure</p>
          </div>

          <div className="space-y-8">
            <NetworkSettingsForm network={network} networkId={networkId} />
            <NetworkStructureManager network={network} networkId={networkId} />
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

