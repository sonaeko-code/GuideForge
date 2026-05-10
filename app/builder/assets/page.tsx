import { redirect } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { listMyAssetDrafts } from "@/lib/guideforge/asset-draft-helpers"
import { supabase } from "@/lib/guideforge/supabase-client"

// Dynamic page - requires auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "My Assets | GuideForge Builder",
  description: "Your personal asset drafts and workspace",
}

export default async function AssetsPage() {
  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Fetch user's assets
  const assets = await listMyAssetDrafts()

  const getAssetTypeName = (type: string): string => {
    const names: Record<string, string> = {
      single_guide: "Guide",
      recipe: "Recipe",
      checklist: "Checklist",
      sop: "SOP / Procedure",
      troubleshooting_flow: "Troubleshooting Flow",
    }
    return names[type] || type
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/networks">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Networks
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
        <p className="text-base text-muted-foreground">
          Your personal asset drafts saved to your workspace. These are private and only visible to you.
        </p>
      </div>

      {/* Action Button */}
      <div>
        <Button asChild>
          <Link href="/builder/generate-asset">
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Generate New Asset
          </Link>
        </Button>
      </div>

      {/* Assets Grid */}
      {assets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Button
              key={asset.id}
              asChild
              variant="outline"
              className="h-auto justify-start p-4 text-left hover:bg-accent"
            >
              <Link href={`/builder/assets/${asset.id}`}>
                <div className="w-full space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2">{asset.title}</h3>
                    </div>
                  </div>
                  {asset.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{asset.summary}</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">{getAssetTypeName(asset.assetType)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground">No assets yet</p>
            <p className="text-muted-foreground">
              Create your first structured asset draft by generating one.
            </p>
            <Button asChild>
              <Link href="/builder/generate-asset">
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Generate Asset
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
