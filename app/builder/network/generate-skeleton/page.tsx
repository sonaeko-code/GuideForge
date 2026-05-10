import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/guideforge/site-header"
import { GenerateNetworkSkeletonClient } from "@/components/guideforge/builder/generate-network-skeleton-client"

export default function GenerateNetworkSkeletonPage() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />
      
      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm">
            <Link href="/builder/networks">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              All Networks
            </Link>
          </Button>
        </div>

        <GenerateNetworkSkeletonClient />
      </div>
    </main>
  )
}
