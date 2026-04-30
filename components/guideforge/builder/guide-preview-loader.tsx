"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import { normalizeGeneratedGuide } from "@/lib/guideforge/normalize-generated-guide"
import type { Guide } from "@/lib/guideforge/types"
import { GuideViewer } from "@/components/guideforge/viewer/guide-viewer"

interface GuidePreviewLoaderProps {
  networkId: string
  guideId: string
  fallback: Guide
}

/**
 * Client-side preview loader for builder drafts.
 * Loads from localStorage and displays read-only viewer.
 */
export function GuidePreviewLoader({
  networkId,
  guideId,
  fallback,
}: GuidePreviewLoaderProps) {
  const [guide, setGuide] = useState<Guide>(fallback)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const draft = loadGuideDraft(guideId)
    if (draft) {
      const normalized = normalizeGeneratedGuide(draft, guideId)
      setGuide(normalized)
    }
    setIsLoading(false)
  }, [guideId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/builder/network/${networkId}/guide/${guideId}/edit`}>
            <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
            Back to editor
          </Link>
        </Button>
      </div>

      {/* Preview viewer */}
      <div className="rounded-lg border border-border bg-muted/50 p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          This is how your guide will appear when published. (Builder preview only)
        </p>
        <GuideViewer guide={guide} />
      </div>
    </div>
  )
}
