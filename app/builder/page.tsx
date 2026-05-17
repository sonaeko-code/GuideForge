import Link from "next/link"
import { SiteHeader } from "@/components/guideforge/site-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, Plus, FileText, Wand2, ArrowRight, Zap } from "lucide-react"
import { LegacyDraftsSection } from "@/components/guideforge/builder/legacy-drafts-section"

export default async function BuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 md:px-6 md:py-14">
        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Creator Workspace
          </h1>
          <p className="text-base text-muted-foreground">
            Your home for networks, assets, and everything you&apos;re building.
          </p>
        </div>

        {/* Primary Workspace — My Networks + My Assets, full-weight cards */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your Workspace
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* My Networks */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Folder className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">My Networks</h3>
                <p className="text-sm text-muted-foreground">
                  Guide networks you own or manage — hubs, collections, and published guides.
                </p>
              </div>
              <Button asChild size="sm" className="w-full mt-auto justify-center">
                <Link href="/builder/networks?scope=mine">
                  Open My Networks
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </Card>

            {/* My Assets */}
            <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <FileText className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">My Assets</h3>
                <p className="text-sm text-muted-foreground">
                  Private guide and checklist drafts — refine, then attach to a network.
                </p>
              </div>
              <Button asChild size="sm" className="w-full mt-auto justify-center">
                <Link href="/builder/assets">
                  Open My Assets
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* Quick Actions — secondary, button row */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4 text-left">
              <Link href="/builder/network/new">
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Plus className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col items-start min-w-0">
                  <span className="font-semibold text-foreground">Create Network</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Start a new knowledge network
                  </span>
                </span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4 text-left">
              <Link href="/builder/generate-asset">
                <span className="flex size-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                  <Wand2 className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col items-start min-w-0">
                  <span className="font-semibold text-foreground">Generate Asset</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Create a single guide or checklist
                  </span>
                </span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Continue Recent Work — local unassigned drafts, only shows if any exist */}
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Zap className="size-4" aria-hidden="true" />
                Continue Recent Work
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Unassigned local drafts. Most new guides should live inside a network or as a workspace asset.
              </p>
            </div>
          </div>
          <LegacyDraftsSection />
        </section>
      </div>
    </main>
  )
}
