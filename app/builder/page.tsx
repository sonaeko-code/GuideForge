import Link from "next/link"
import { SiteHeader } from "@/components/guideforge/site-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Folder, Plus, FileText } from "lucide-react"
import { LegacyDraftsSection } from "@/components/guideforge/builder/legacy-drafts-section"

export default async function BuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 md:px-6 md:py-16">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            GuideForge Control Center
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your networks. Guides live inside networks.
          </p>
          <p className="text-sm text-muted-foreground italic">
            This is a temporary local prototype workspace until Supabase auth is connected.
          </p>
        </div>

        {/* Primary Actions Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Folder className="size-4" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">All Networks</h3>
              <p className="text-sm text-muted-foreground">
                Open and manage created networks. Each network owns its own hubs, collections, and guides.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/builder/networks">View Networks</Link>
            </Button>
          </Card>

          <Card className="flex flex-col gap-4 p-5 border-border/50 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="size-4" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Create Network</h3>
              <p className="text-sm text-muted-foreground">
                Start building a new guide network from scratch.
              </p>
            </div>
            <Button asChild size="sm" className="w-full">
              <Link href="/builder/network/new">Create Network</Link>
            </Button>
          </Card>
        </div>

        {/* Legacy / Unassigned Drafts - only shows if any exist */}
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <FileText className="size-6" aria-hidden="true" />
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
