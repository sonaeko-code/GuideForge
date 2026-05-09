"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { GeneratedStructuredAsset } from "@/lib/guideforge/generation-schemas"
import { saveStructuredAssetAsDraft } from "@/lib/guideforge/save-structured-asset"

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
      const result = await saveStructuredAssetAsDraft(asset)

      if (!result.success) {
        setSaveError(
          result.error ||
          `Save failed. ${result.requiresSelection ? `Please ${result.requiresSelection}.` : ""}`
        )
        return
      }

      // Route to the guide editor
      window.location.href = `/builder/network/${result.networkId}/hub/${result.hubId}/collection/${result.collectionId}/guide/${result.guideId}/edit`
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Save structured asset error:", err)
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
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back
        </Button>
      </div>

      {/* Status */}
      {!saveError && (
        <Card className="border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Generated {getAssetTypeName()} — Not Saved Yet</strong> • Review and customize before saving.
          </p>
        </Card>
      )}

      {/* Error */}
      {saveError && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
        </Card>
      )}

      {/* Asset Details */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{asset.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{asset.summary}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {getAssetTypeName()}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Asset-Specific Content */}
      {asset.assetType === "single_guide" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Audience</h3>
                <p className="text-foreground mt-1">{asset.audience}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Difficulty</h3>
                <p className="text-foreground mt-1 capitalize">{asset.difficulty}</p>
              </div>
            </div>

            {asset.requirements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Requirements</h3>
                <ul className="space-y-1">
                  {asset.requirements.map((req, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {asset.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
                  Warnings
                </h3>
                <ul className="space-y-1">
                  {asset.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-amber-600 dark:text-amber-400">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Steps</h3>
              <div className="space-y-2">
                {asset.steps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-medium text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
                    {step.tip && <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">💡 {step.tip}</p>}
                    {step.warning && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠️ {step.warning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recipe-specific content */}
      {asset.assetType === "recipe" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Servings</h3>
                <p className="text-foreground mt-1">{asset.servings}</p>
              </div>
              {asset.prepTime && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Prep Time</h3>
                  <p className="text-foreground mt-1">{asset.prepTime}</p>
                </div>
              )}
              {asset.cookTime && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Cook Time</h3>
                  <p className="text-foreground mt-1">{asset.cookTime}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Ingredients</h3>
              <ul className="space-y-1">
                {asset.ingredients.map((ing, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    • {ing.name} {ing.amount ? `(${ing.amount})` : ""} {ing.notes ? `- ${ing.notes}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Steps</h3>
              <ol className="space-y-2">
                {asset.steps.map((step, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="font-medium text-foreground">{idx + 1}. {step.title}</span>
                    <p className="text-muted-foreground mt-1">{step.body}</p>
                    {step.tip && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">💡 {step.tip}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      )}

      {/* Checklist-specific content */}
      {asset.assetType === "checklist" && (
        <Card className="p-6">
          <div className="space-y-4">
            {asset.sections.map((section, sIdx) => (
              <div key={sIdx}>
                <h3 className="font-semibold text-foreground mb-2">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, iIdx) => (
                    <li key={iIdx} className="flex gap-3">
                      <input type="checkbox" className="mt-0.5" disabled />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {item.required && <Badge className="shrink-0">Required</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SOP-specific content */}
      {asset.assetType === "sop" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Purpose</h3>
              <p className="text-foreground mt-1">{asset.purpose}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Scope</h3>
              <p className="text-foreground mt-1">{asset.scope}</p>
            </div>
            {asset.owner && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Process Owner</h3>
                <p className="text-foreground mt-1">{asset.owner}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Procedure Steps</h3>
              <div className="space-y-3">
                {asset.procedureSteps.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-medium text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
                    {step.responsibleRole && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Responsible:</strong> {step.responsibleRole}
                      </p>
                    )}
                    {step.warning && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠️ {step.warning}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Troubleshooting Flow specific content */}
      {asset.assetType === "troubleshooting_flow" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Symptom</h3>
              <p className="text-foreground mt-1">{asset.symptom}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Checks</h3>
              <div className="space-y-2">
                {asset.checks.map((check, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="font-medium text-foreground">{check.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{check.question}</p>
                  </div>
                ))}
              </div>
            </div>
            {asset.fixSteps.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Fix Steps</h3>
                <div className="space-y-2">
                  {asset.fixSteps.map((fix, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="font-medium text-foreground">{fix.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{fix.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-4">
        <div className="space-y-3">
          {asset.assumptions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase">Assumptions</h3>
              <ul className="mt-2 space-y-1">
                {asset.assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    • {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {asset.missingInfo.length > 0 && (
            <div className="pt-2 border-t border-border">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase">
                Missing Information
              </h3>
              <ul className="mt-2 space-y-1">
                {asset.missingInfo.map((info, idx) => (
                  <li key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                    • {info}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Save Summary */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Ready to save:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• 1 {getAssetTypeName()}: {asset.title}</li>
          </ul>
          <p className="text-xs text-muted-foreground italic pt-2">
            Nothing will be published automatically. This will be saved as a draft.
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save as Draft"
          )}
        </Button>
      </div>
    </div>
  )
}
