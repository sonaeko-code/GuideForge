import Link from "next/link"
import { SiteHeader } from "@/components/guideforge/site-header"
import { BuilderWorkspace } from "@/components/guideforge/builder/builder-workspace"

export default async function BuilderPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-12 md:px-6 md:py-16">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            GuideForge Builder
          </h1>
          <p className="text-lg text-muted-foreground">
            Prototype workspace for creating networks, hubs, guides, drafts, and previews.
          </p>
          <p className="text-sm text-muted-foreground italic">
            This is a temporary local prototype workspace until Supabase auth is connected.
          </p>
        </div>

        <BuilderWorkspace />
      </div>
    </main>
  )
}
