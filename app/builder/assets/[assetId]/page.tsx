"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/guideforge/auth-context"
import { getAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [asset, setAsset] = useState<AssetDraft | null>(null)
  const [assetId, setAssetId] = useState<string>("")
  const [notFound, setNotFound] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  // Extract assetId from params
  useEffect(() => {
    params.then(({ assetId }) => {
      setAssetId(assetId)
    })
  }, [params])

  // Fetch asset once authenticated and assetId is set
  useEffect(() => {
    if (!isAuthenticated || isLoading || !assetId) {
      return
    }

    const fetchAsset = async () => {
      setIsFetching(true)
      try {
        const data = await getAssetDraft(assetId)
        if (!data) {
          setNotFound(true)
        } else {
          setAsset(data)
        }
      } catch (err) {
        console.error("[v0] Asset fetch error:", err)
        setNotFound(true)
      } finally {
        setIsFetching(false)
      }
    }

    fetchAsset()
  }, [isAuthenticated, isLoading, assetId])

  const getAssetTypeName = (): string => {
    if (!asset) return ""
    const names: Record<string, string> = {
      single_guide: "Guide",
      recipe: "Recipe",
      checklist: "Checklist",
      sop: "SOP / Procedure",
      troubleshooting_flow: "Troubleshooting Flow",
    }
    return names[asset.assetType] || asset.assetType
  }

  // Show sign-in required state
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="space-y-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Assets
          </Link>
        </Button>
        <Card className="p-6 border-border/50">
          <div className="space-y-4 text-center">
            <p className="font-semibold text-foreground">Sign in to view your assets</p>
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

  // Show loading state
  if (isLoading || isFetching) {
    return (
      <div className="space-y-8">
        <Button variant="ghost" size="sm" disabled>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to Assets
        </Button>
        <Card className="p-12 text-center">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">Loading asset...</p>
          </div>
        </Card>
      </div>
    )
  }

  // Show not found state
  if (notFound || !asset) {
    return (
      <div className="space-y-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Assets
          </Link>
        </Button>
        <Card className="p-6 border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Asset not found</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                The asset you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
              </p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/builder/assets">Back to Assets</Link>
              </Button>
            </div>
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
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to My Assets
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Builder / My Assets / Asset Detail
        </div>
      </div>

      {/* Title and Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{getAssetTypeName()}</Badge>
          <span className="text-sm text-muted-foreground">Workspace Draft</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{asset.title}</h1>
        {asset.summary && (
          <p className="text-base text-muted-foreground">{asset.summary}</p>
        )}
      </div>

      {/* Metadata Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Created
          </p>
          <p className="text-sm font-medium">{new Date(asset.createdAt).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Last Updated
          </p>
          <p className="text-sm font-medium">{new Date(asset.updatedAt).toLocaleString()}</p>
        </Card>
      </div>

      {/* Asset Content Preview */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Asset Content</h2>

          {asset.assetType === "single_guide" && (
            <div className="space-y-4">
              {asset.payload.requirements && asset.payload.requirements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Requirements</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {asset.payload.requirements.map((req, idx) => (
                      <li key={idx}>• {req}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Steps ({asset.payload.steps.length})
                </h3>
                <ol className="space-y-3">
                  {asset.payload.steps.slice(0, 5).map((step, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{idx + 1}. {step.title}</strong>
                      {step.body && (
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{step.body}</p>
                      )}
                      {step.tip && (
                        <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">💡 {step.tip}</p>
                      )}
                      {step.warning && (
                        <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">⚠️ {step.warning}</p>
                      )}
                    </li>
                  ))}
                </ol>
                {asset.payload.steps.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    ... and {asset.payload.steps.length - 5} more step{asset.payload.steps.length - 5 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {asset.assetType === "recipe" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Ingredients ({asset.payload.ingredients.length})
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {asset.payload.ingredients.slice(0, 10).map((ing, idx) => (
                    <li key={idx}>
                      • {ing.name}
                      {ing.amount && ` (${ing.amount})`}
                      {ing.notes && ` - ${ing.notes}`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {asset.assetType === "checklist" && (
            <div className="space-y-4">
              {asset.payload.sections.slice(0, 3).map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{section.title}</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {section.items.map((item, iIdx) => (
                      <li key={iIdx}>
                        ☐ {item.label}
                        {item.required && ' (Required)'}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Future Actions */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Coming soon:</strong> You'll be able to attach this asset to a network, convert it to a full guide, or publish it separately.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/builder/assets">Back to Assets</Link>
        </Button>
        <Button variant="destructive" className="ml-auto">
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Delete Draft
        </Button>
      </div>
    </div>
  )
}
