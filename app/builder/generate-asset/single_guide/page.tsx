import { SiteHeader } from "@/components/guideforge/site-header"
import { GenerateSingleGuideClient } from "@/components/guideforge/builder/generate-single-guide-client"

export const metadata = {
  title: "Generate Single Guide",
  description: "Create a structured guide with AI assistance.",
}

export default function GenerateSingleGuidePage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
        <GenerateSingleGuideClient />
      </div>
    </main>
  )
}
