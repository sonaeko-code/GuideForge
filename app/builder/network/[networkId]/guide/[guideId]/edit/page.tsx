import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SiteHeader } from "@/components/guideforge/site-header"
import { GuideEditorLoader } from "@/components/guideforge/builder/guide-editor-loader"
import { FIRE_WARDEN_GUIDE } from "@/lib/guideforge/mock-data"

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
        {/* Back to Builder Home link */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/builder">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Builder Home
            </Link>
          </Button>
        </div>

        <GuideEditorLoader
          networkId={networkId}
          guideId={guideId}
          fallback={FIRE_WARDEN_GUIDE}
        />
      </div>
    </main>
  )
}
