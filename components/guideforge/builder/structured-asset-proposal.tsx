"use client"

import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { GeneratedStructuredAsset } from "@/lib/guideforge/generation-schemas"
import { saveStructuredAssetToWorkspace } from "@/lib/guideforge/save-structured-asset"

interface StructuredAssetProposalProps {
  asset: GeneratedStructuredAsset
  onBack: () => void
}

export function StructuredAssetProposal({ asset, onBack }: StructuredAssetProposalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      const result = await saveStructuredAssetToWorkspace(asset)

      if (!result.success) {
        setSaveError(result.error || "Failed to save asset draft")
        if (result.requiresAuth) {
          // Auth error - handled below with sign in prompt
        }
        return
      }

      // Route to asset workspace page
      window.location.href = `/builder/assets/${result.assetId}`
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Save asset error:", err)
      setSaveError(`Failed to save: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getAssetTypeName = (): string => {
    const names: Record<GeneratedStructuredAsset["assetType"], string> = {
      single_guide: "Guide",
      recipe: "Recipe",
      checklist: "Checklist",
      sop: "SOP / Procedure",
      troubleshooting_flow: "Troubleshooting Flow",
    }
    return names[asset.assetType]
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
        Back
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{getAssetTypeName()}</Badge>
          <span className="text-sm text-muted-foreground">Generated Asset — Not Saved Yet</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{asset.title}</h1>
        <p className="text-base text-muted-foreground">{asset.summary}</p>
      </div>

      {/* Assumptions & Missing Info */}
      {(asset.assumptions?.length > 0 || asset.missingInfo?.length > 0) && (
        <div className="space-y-4">
          {asset.assumptions?.length > 0 && (
            <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Assumptions</p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {asset.assumptions.map((assumption, idx) => (
                  <li key={idx}>• {assumption}</li>
                ))}
              </ul>
            </Card>
          )}

          {asset.missingInfo?.length > 0 && (
            <Card className="p-4 border-amber-500/20 bg-amber-500/5">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Could Be Better With</p>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                {asset.missingInfo.map((info, idx) => (
                  <li key={idx}>• {info}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Asset-Specific Content Preview */}
      <Card className="p-6 space-y-4">
        {asset.assetType === "single_guide" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Steps ({asset.steps.length})</p>
              <ol className="space-y-2">
                {asset.steps.slice(0, 3).map((step, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    <strong>{idx + 1}. {step.title}</strong>
                  </li>
                ))}
              </ol>
              {asset.steps.length > 3 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ... and {asset.steps.length - 3} more step{asset.steps.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {asset.assetType === "recipe" && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ingredients ({asset.ingredients.length})</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {asset.ingredients.slice(0, 3).map((ing, idx) => (
                  <li key={idx}>• {ing.name}</li>
                ))}
              </ul>
              {asset.ingredients.length > 3 && (
                <p className="text-xs text-muted-foreground">... and {asset.ingredients.length - 3} more</p>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Steps ({asset.steps.length})</p>
            </div>
          </div>
        )}

        {asset.assetType === "checklist" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Sections ({asset.sections.length})</p>
            <ul className="space-y-1">
              {asset.sections.slice(0, 3).map((section, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  • {section.title} ({section.items.length} items)
                </li>
              ))}
            </ul>
            {asset.sections.length > 3 && (
              <p className="text-xs text-muted-foreground">
                ... and {asset.sections.length - 3} more section{asset.sections.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {asset.assetType === "sop" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Purpose</p>
            <p className="text-sm text-muted-foreground">{asset.purpose}</p>
          </div>
        )}

        {asset.assetType === "troubleshooting_flow" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Symptom</p>
            <p className="text-sm text-muted-foreground">{asset.symptom}</p>
          </div>
        )}
      </Card>

      {/* Save Summary */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Ready to save to your workspace:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• 1 {getAssetTypeName()}: {asset.title}</li>
            <li>• Saved as a draft to your personal workspace</li>
            <li>• You can edit, attach to a network, or delete it later</li>
          </ul>
          <p className="text-xs text-muted-foreground italic pt-2">
            This asset will not be published or visible to anyone else automatically.
          </p>
        </div>
      </Card>

      {/* Auth Error State */}
      {saveError?.includes("signed in") && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">Sign in to save</p>
          <p className="text-sm text-red-800 dark:text-red-200 mb-4">
            You need to be signed in to your GuideForge account to save drafts to your workspace.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/auth/login">Sign In</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/auth/signup">Create Account</a>
            </Button>
          </div>
        </Card>
      )}

      {/* Generic Error State */}
      {saveError && !saveError.includes("signed in") && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Unable to save</p>
          <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Saving to Workspace...
            </>
          ) : (
            "Save to Workspace"
          )}
        </Button>
      </div>
    </div>
  )
}
