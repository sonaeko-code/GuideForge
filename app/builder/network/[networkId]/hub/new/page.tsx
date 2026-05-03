import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { CreateHubForm } from "@/components/guideforge/builder/create-hub-form"

export default async function CreateHubPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const { networkId } = await params

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
          <span className="text-foreground font-semibold">Create Hub</span>
        </nav>

        <div className="mb-10 space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Create a Hub
          </h1>
          <p className="text-lg text-muted-foreground">
            A hub holds collections of guides. For gaming networks, hubs are
            games. For repair networks, product lines.
          </p>
        </div>

        <CreateHubForm networkId={networkId} />
      </div>
    </main>
  )
}
