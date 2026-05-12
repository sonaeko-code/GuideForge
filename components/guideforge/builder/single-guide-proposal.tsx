"use client"

import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"
import { SingleGuideEditor } from "./single-guide-editor"
import { AssetTypeBadge } from "./asset-type-badge"

interface SingleGuideProposalProps {
  asset: GeneratedSingleGuide
  isSaving: boolean
  saveError: string | null
  onBack: () => void
  onSave: (edited: GeneratedSingleGuide) => void
}

export function SingleGuideProposal({
  asset,
  isSaving,
  saveError,
  onBack,
  onSave,
}: SingleGuideProposalProps) {
  // Local draft state — initialised from the generated asset once
  const [draft, setDraft] = useState<GeneratedSingleGuide>(() => ({
    ...asset,
    requirements: asset.requirements ?? [],
    warnings: asset.warnings ?? [],
    assumptions: asset.assumptions ?? [],
    steps: (asset.steps ?? []).map((s) => ({
      title: s.title,
      body: s.body,
      tip: s.tip ?? null,
      warning: s.warning ?? null,
      successCondition: s.successCondition ?? null,
    })),
  }))

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
        Back
      </Button>

      {/* Page header */}
      <div className="flex items-center gap-2 flex-wrap">
        <AssetTypeBadge assetType="single_guide" variant="small" />
        <span className="text-sm text-muted-foreground">Generated — Not Saved Yet</span>
      </div>

      {/* Shared editor (owns its own tab toggle) */}
      <SingleGuideEditor
        value={draft}
        onChange={setDraft}
        editTabLabel="Edit Draft"
      />

      {/* Save footer */}
      <div className="space-y-3 pt-4 border-t border-border">
        {saveError && (
          <Card className="p-3 border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
          </Card>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)} disabled={isSaving} className="flex-1">
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
    </div>
  )
}
