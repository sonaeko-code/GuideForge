"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, AlertCircle, Loader2, Trash2, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/guideforge/auth-context"
import { listMyAssetDrafts, deleteAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"

export default function AssetsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [assets, setAssets] = useState<AssetDraft[]>([])
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteAsset = async (assetId: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteAssetDraft(assetId)
      if (result.success) {
        setAssets(assets.filter(a => a.id !== assetId))
        setDeleteConfirm(null)
      }
    } catch (err) {
      console.error("[v0] Delete error:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Show sign-in required state if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8 md:py-16">
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
        </div>
      </main>
    )
  }

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8 md:py-16">
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
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-8 md:py-16">
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
            <div key={asset.id}>
              {deleteConfirm === asset.id ? (
                <Card className="p-4 border-red-500/30 bg-red-500/5 h-full flex flex-col">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100">Delete "{asset.title}"?</p>
                        <p className="text-xs text-red-800 dark:text-red-200 mt-1">This cannot be undone.</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-red-500/20">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeleteConfirm(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeleteAsset(asset.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-4 border-border/50 hover:border-primary/50 transition-colors flex flex-col h-full">
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{getAssetTypeName(asset.assetType)}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(asset.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-semibold text-foreground line-clamp-2">{asset.title}</h3>
                    </div>
                    {asset.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{asset.summary}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/builder/assets/${asset.id}`}>
                        <Eye className="mr-2 size-4" aria-hidden="true" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/builder/assets/${asset.id}?edit=true`}>
                        <Edit className="mr-2 size-4" aria-hidden="true" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirm(asset.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              )}
            </div>
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
        </div>
      </div>
    </main>
  )
}
