import { redirect } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react"
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

export default function AssetsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [assets, setAssets] = useState<AssetDraft[]>([])
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      return
    }

    // User is authenticated, fetch assets
    const fetchAssets = async () => {
      setIsFetching(true)
      try {
        const data = await listMyAssetDrafts()
        setAssets(data)
        setSetupError(null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        if (msg.includes("asset_drafts") || msg.includes("PGRST103")) {
          setSetupError("Asset workspace storage is not set up yet. Run supabase/asset_drafts_schema.sql in Supabase SQL Editor.")
        } else {
          setSetupError(msg)
        }
      } finally {
        setIsFetching(false)
      }
    }

    fetchAssets()
  }, [isAuthenticated, isLoading])

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

  // Show sign-in required state if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/builder">
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Workspace
            </Link>
          </Button>
          <div className="text-xs text-muted-foreground">
            Builder / My Assets
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
          <p className="text-base text-muted-foreground">
            Your personal asset drafts saved to your workspace. These are private and only visible to you.
          </p>
        </div>

        <Card className="p-6 border-border/50">
          <div className="space-y-4 text-center">
            <p className="font-semibold text-foreground">Sign in to access your assets</p>
            <p className="text-sm text-muted-foreground">
              Your asset drafts are stored securely and only visible to you when signed in.
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild variant="outline">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Workspace
          </Button>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
        </div>
        <Card className="p-12 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">Loading your workspace...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Navigation */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Workspace
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Builder / My Assets
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/builder/networks">
            View Networks
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Assets</h1>
        <p className="text-base text-muted-foreground">
          Your personal asset drafts saved to your workspace. These are private and only visible to you.
        </p>
      </div>

      {/* Setup Error */}
      {setupError && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">Setup Required</p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">{setupError}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                After running the SQL, refresh this page.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Fetching state */}
      {isFetching && (
        <Card className="p-12 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">Loading your assets...</p>
          </div>
        </Card>
      )}

      {/* Action Button */}
      {!setupError && !isFetching && (
        <div>
          <Button asChild>
            <Link href="/builder/generate-asset">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Generate New Asset
            </Link>
          </Button>
        </div>
      )}

      {/* Assets Grid */}
      {!setupError && !isFetching && assets.length > 0 ? (
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
      ) : !setupError && !isFetching ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground">No asset drafts yet</p>
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
      ) : null}

      {/* Action Button */}
      {!setupError && (
        <div>
          <Button asChild>
            <Link href="/builder/generate-asset">
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Generate New Asset
            </Link>
          </Button>
        </div>
      )}

      {/* Assets Grid */}
      {!setupError && assets.length > 0 ? (
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
      ) : !setupError ? (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-foreground">No asset drafts yet</p>
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
      ) : null}
    </div>
  )
}
