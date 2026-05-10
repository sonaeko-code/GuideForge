import { SiteHeader } from "@/components/guideforge/site-header"
import { AssetTypeSelector } from "@/components/guideforge/builder/asset-type-selector"

export const metadata = {
  title: "Generate Structured Asset",
  description: "Create guides, recipes, checklists, SOPs, and troubleshooting flows with AI assistance.",
}

export default function GenerateAssetPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      <div className="mx-auto w-full max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <AssetTypeSelector />
      </div>
    </main>
  )
}
