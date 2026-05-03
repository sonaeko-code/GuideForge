import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { GuideEditorLoader } from "@/components/guideforge/builder/guide-editor-loader"

export default async function GuideEditorPage({
  params,
}: {
  params: Promise<{ networkId: string; guideId: string }>
}) {
  const { networkId, guideId } = await params

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
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
          <span className="text-foreground font-semibold">Edit Guide</span>
        </nav>

        {/* GuideEditorLoader handles Supabase load → localStorage fallback → not-found state.
            No mock/fallback guide is injected here: if a guide isn't found, the loader shows
            a clear "Draft Not Found" UI with links to create a new guide. */}
        <GuideEditorLoader
          networkId={networkId}
          guideId={guideId}
        />
      </div>
    </main>
  )
}
