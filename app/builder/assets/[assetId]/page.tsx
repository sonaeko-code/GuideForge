import { redirect } from "next/navigation"
import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import { supabase } from "@/lib/guideforge/supabase-client"

// Dynamic page - requires auth
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Asset Draft | GuideForge Builder",
  description: "Review and edit your asset draft",
}

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { assetId } = await params

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Fetch asset (RLS will ensure user owns it)
  const asset = await getAssetDraft(assetId)

  if (!asset) {
    redirect("/builder/assets?error=not-found")
  }

  const getAssetTypeName = (): string => {
    const names: Record<string, string> = {
      single_guide: "Guide",
      recipe: "Recipe",
      checklist: "Checklist",
      sop: "SOP / Procedure",
      troubleshooting_flow: "Troubleshooting Flow",
    }
    return names[asset.assetType] || asset.assetType
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Assets
          </Link>
        </Button>
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
