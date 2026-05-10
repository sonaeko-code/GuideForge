import { SiteHeader } from "@/components/guideforge/site-header"
import { GenerateChecklistClient } from "@/components/guideforge/builder/generate-checklist-client"

export const metadata = {
  title: "Generate Checklist",
  description: "Create a structured checklist with AI assistance.",
}

export default function GenerateChecklistPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      <div className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6 md:py-16">
        <GenerateChecklistClient />
      </div>
    </main>
  )
}
