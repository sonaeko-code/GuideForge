import { SiteHeader } from "@/components/guideforge/site-header"
import { GuideEditor } from "@/components/guideforge/builder/guide-editor"
import { FIRE_WARDEN_GUIDE } from "@/lib/guideforge/mock-data"

export default async function GuideEditorPage({
  params,
}: {
  params: Promise<{ networkId: string; guideId: string }>
}) {
  const { networkId, guideId } = await params

  // TODO: Fetch guide by ID from Supabase
  // For now, use the mock Fire Warden guide
  const guide = FIRE_WARDEN_GUIDE

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <GuideEditor guide={guide} networkId={networkId} />
      </div>
    </main>
  )
}
