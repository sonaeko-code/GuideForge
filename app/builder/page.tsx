import Link from "next/link"
import { SiteHeader } from "@/components/guideforge/site-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, Plus, FileText, Wand2, Zap } from "lucide-react"
import { LegacyDraftsSection } from "@/components/guideforge/builder/legacy-drafts-section"

export default async function BuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 md:px-6 md:py-16">
        {/* Hero Section */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Creator Workspace
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your guide networks and personal asset drafts.
          </p>
        </div>

        {/* Primary Actions: Workspace Access (2x2 grid) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Your Workspace</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* My Networks */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Folder className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">My Networks</h3>
                <p className="text-sm text-muted-foreground">
                  Guide networks with hubs, collections, and reviews.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full mt-auto">
                <Link href="/builder/networks">Open Networks</Link>
              </Button>
            </Card>

            {/* My Assets */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <FileText className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">My Assets</h3>
                <p className="text-sm text-muted-foreground">
                  Private structured asset drafts in your workspace.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full mt-auto">
                <Link href="/builder/assets">Open Assets</Link>
              </Button>
            </Card>

            {/* Generate Network */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Plus className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Generate Network</h3>
                <p className="text-sm text-muted-foreground">
                  Create a full network skeleton with structure.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full mt-auto">
                <Link href="/builder/network/new">Create Network</Link>
              </Button>
            </Card>

            {/* Generate Asset */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <Wand2 className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Generate Asset</h3>
                <p className="text-sm text-muted-foreground">
                  Create a single structured asset draft.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full mt-auto">
                <Link href="/builder/generate-asset">Generate Asset</Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* Legacy / Unassigned Drafts - only shows if any exist */}
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <Zap className="size-6" aria-hidden="true" />
                Legacy / Unassigned Drafts
              </h2>
              <p className="text-sm text-muted-foreground">
                These drafts are not attached to a network yet. Most guides should live inside a network.
              </p>
            </div>
          </div>
          <LegacyDraftsSection />
        </section>
      </div>
    </main>
  )
}
