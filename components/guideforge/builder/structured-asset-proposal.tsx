"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { GeneratedStructuredAsset, GeneratedSingleGuide, GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { saveStructuredAssetToWorkspace } from "@/lib/guideforge/save-structured-asset"
import { SingleGuideProposal } from "./single-guide-proposal"
import { ChecklistEditor } from "./checklist-editor"
import { AssetTypeBadge } from "./asset-type-badge"

interface StructuredAssetProposalProps {
  asset: GeneratedStructuredAsset
  onBack: () => void
}

export function StructuredAssetProposal({ asset, onBack }: StructuredAssetProposalProps) {
  const pathname = usePathname()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [refinementNotes, setRefinementNotes] = useState("")
  const [refinementApplied, setRefinementApplied] = useState(false)
  const [editTitle, setEditTitle] = useState(asset.title)
  const [editSummary, setEditSummary] = useState(asset.summary)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingSummary, setIsEditingSummary] = useState(false)
  const [checklistDraft, setChecklistDraft] = useState<GeneratedChecklist | null>(
    asset.assetType === "checklist" ? (asset as GeneratedChecklist) : null
  )

  // Store pending proposal in sessionStorage when signed out and trying to save
  const storePendingProposal = () => {
    try {
      const pendingProposal = {
        asset,
        assetType: asset.assetType,
        createdAt: new Date().toISOString(),
        returnRoute: pathname,
      }
      sessionStorage.setItem('guideforge.pendingAssetProposal', JSON.stringify(pendingProposal))
      console.log('[v0] StructuredAssetProposal: Stored pending proposal to sessionStorage', {
        key: 'guideforge.pendingAssetProposal',
        assetType: asset.assetType,
        returnRoute: pathname,
        createdAt: pendingProposal.createdAt,
      })
    } catch (err) {
      console.warn('[v0] StructuredAssetProposal: Failed to store pending proposal:', err instanceof Error ? err.message : String(err))
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      // Create updated asset with edited title/summary
      const updatedAsset = {
        ...asset,
        title: editTitle,
        summary: editSummary,
      }

      const result = await saveStructuredAssetToWorkspace(updatedAsset)

      if (!result.success) {
        setSaveError(result.error || "Failed to save asset draft")
        if (result.requiresAuth) {
          // Auth error - store proposal and redirect to login
          storePendingProposal()
          const returnTo = pathname || '/builder/generate-asset/checklist'
          window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
        }
        return
      }

      // Clear pending proposal from sessionStorage on successful save
      try {
        sessionStorage.removeItem('guideforge.pendingAssetProposal')
        console.log('[v0] StructuredAssetProposal: Cleared pending proposal from sessionStorage after successful save')
      } catch (err) {
        console.warn('[v0] StructuredAssetProposal: Failed to clear pending proposal:', err instanceof Error ? err.message : String(err))
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

  const handleApplyRefinement = () => {
    // Simple mock refinement: update the summary to acknowledge the note
    if (refinementNotes.trim()) {
      setRefinementApplied(true)
      // Could update asset content here, but for MVP just acknowledge the note
    }
  }

  // Checklist uses shared ChecklistEditor component
  if (asset.assetType === "checklist" && checklistDraft) {
    const handleChecklistSave = async () => {
      setSaveError(null)
      setIsSaving(true)
      try {
        const result = await saveStructuredAssetToWorkspace(checklistDraft)
        if (!result.success) {
          setSaveError(result.error || "Failed to save asset draft")
          if (result.requiresAuth) {
            storePendingProposal()
            const returnTo = pathname || "/builder/generate-asset/checklist"
            window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
          }
          return
        }
        try {
          sessionStorage.removeItem("guideforge.pendingAssetProposal")
        } catch {}
        window.location.href = `/builder/assets/${result.assetId}`
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        setSaveError(`Failed to save: ${msg}`)
      } finally {
        setIsSaving(false)
      }
    }

    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back
        </Button>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <AssetTypeBadge assetType="checklist" variant="small" />
            {asset.generatedBy && (
              <Badge variant="secondary" className="text-xs">
                {asset.generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">Generated — Not Saved Yet</span>
          </div>
        </div>

        {/* Mock Preview Clarification Notice */}
        {asset.generatedBy === "mock" && (
          <Card className="p-3 border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <span className="font-semibold">Mock Preview:</span> This uses deterministic sample content for testing. Click <strong>AI Generate</strong> to create real contextual content.
            </p>
          </Card>
        )}

        {/* ChecklistEditor — starts in preview so user reviews before editing */}
        <ChecklistEditor
          value={checklistDraft}
          onChange={setChecklistDraft}
          initialMode="preview"
          editTabLabel="Edit Draft"
        />

        {/* Error State */}
        {saveError && !saveError.includes("signed in") && (
          <Card className="p-4 border-red-500/30 bg-red-500/5">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Unable to save</p>
            <p className="text-sm text-red-800 dark:text-red-200">{saveError}</p>
          </Card>
        )}

        {/* Auth Error State */}
        {saveError?.includes("signed in") && (
          <Card className="p-4 border-blue-500/20 bg-blue-500/5">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Sign in to save this draft</p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
              Sign in to your GuideForge account to save drafts to your workspace. We&apos;ll bring you back here afterward. Keep this tab open so your unsaved proposal can be restored.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="default" size="sm">
                <a href={`/auth/login?returnTo=${encodeURIComponent(pathname || '/builder/generate-asset/checklist')}`}>Sign In & Continue</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={`/auth/signup?returnTo=${encodeURIComponent(pathname || '/builder/generate-asset/checklist')}`}>Create Account & Continue</a>
              </Button>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleChecklistSave} disabled={isSaving} className="flex-1">
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

  // Single Guide uses its own dedicated proposal component with Edit/Preview tabs
  if (asset.assetType === "single_guide") {
    return (
      <SingleGuideProposal
        asset={asset as GeneratedSingleGuide}
        isSaving={isSaving}
        saveError={saveError}
        onBack={onBack}
        onSave={async (edited) => {
          setSaveError(null)
          setIsSaving(true)
          try {
            const result = await saveStructuredAssetToWorkspace(edited)
            if (!result.success) {
              setSaveError(result.error || "Failed to save asset draft")
              if (result.requiresAuth) {
                storePendingProposal()
                const returnTo = pathname || "/builder/generate-asset/single_guide"
                window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
              }
              return
            }
            try {
              sessionStorage.removeItem("guideforge.pendingAssetProposal")
            } catch {}
            window.location.href = `/builder/assets/${result.assetId}`
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error"
            setSaveError(`Failed to save: ${msg}`)
          } finally {
            setIsSaving(false)
          }
        }}
      />
    )
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
        <div className="flex items-center gap-2 flex-wrap">
          <AssetTypeBadge assetType={asset.assetType} variant="small" />
          {asset.generatedBy && (
            <Badge variant="secondary" className="text-xs">
              {asset.generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">Generated Asset — Not Saved Yet</span>
        </div>
        
        {/* Editable Title */}
        <div>
          {isEditingTitle ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground text-3xl font-bold"
                placeholder="Asset title..."
              />
              <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <h1 className="text-3xl font-bold tracking-tight">{editTitle}</h1>
            </div>
          )}
        </div>

        {/* Mock Preview Clarification Notice */}
        {asset.generatedBy === "mock" && (
          <Card className="p-3 border-amber-500/20 bg-amber-500/5">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <span className="font-semibold">Mock Preview:</span> This uses deterministic sample content for testing. Click <strong>AI Generate</strong> to create real contextual content.
            </p>
          </Card>
        )}

        {/* Editable Summary */}
        <div>
          {isEditingSummary ? (
            <div className="flex gap-2 items-start">
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground text-base"
                placeholder="Asset summary..."
              />
              <Button size="sm" variant="ghost" onClick={() => setIsEditingSummary(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingSummary(true)}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <p className="text-base text-muted-foreground">{editSummary}</p>
            </div>
          )}
        </div>
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

      {/* Asset-Specific Content Preview (BEFORE refinement) */}
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
            <li>• 1 {asset.assetType === "single_guide" ? "Guide" : asset.assetType === "recipe" ? "Recipe" : asset.assetType === "sop" ? "SOP / Procedure" : asset.assetType === "troubleshooting_flow" ? "Troubleshooting Flow" : "Checklist"}: {asset.title}</li>
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
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Sign in to save this draft</p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
            Sign in to your GuideForge account to save drafts to your workspace. We&apos;ll bring you back here afterward. Keep this tab open so your unsaved proposal can be restored.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="default" size="sm">
              <a href={`/auth/login?returnTo=${encodeURIComponent(pathname || '/builder/generate-asset/checklist')}`}>Sign In & Continue</a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/auth/signup?returnTo=${encodeURIComponent(pathname || '/builder/generate-asset/checklist')}`}>Create Account & Continue</a>
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

      {/* Refinement Section (AFTER preview) */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Improve this Draft</p>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
              Tell GuideForge what to adjust after reviewing the preview above.
            </p>
          </div>

          <textarea
            value={refinementNotes}
            onChange={(e) => setRefinementNotes(e.target.value)}
            placeholder="Example: Make it safer, more beginner-friendly, add specific examples, or clarify assumptions..."
            rows={3}
            className="w-full px-3 py-2 border border-blue-500/30 rounded-md bg-background text-foreground text-sm"
            disabled={refinementApplied}
          />

          {refinementApplied && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-700 dark:text-green-300">
              ✓ Refinement notes added. These will be saved with your draft.
            </div>
          )}

          <Button
            onClick={handleApplyRefinement}
            size="sm"
            variant="outline"
            disabled={!refinementNotes.trim() || refinementApplied}
            className="w-full"
          >
            {refinementApplied ? "Refinement Applied" : "Apply Refinement"}
          </Button>
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
