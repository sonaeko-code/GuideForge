"use client"

import { useEffect, useState } from "react"
import { GuideEditor } from "./guide-editor"
import { loadGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import { normalizeGeneratedGuide } from "@/lib/guideforge/normalize-generated-guide"
import type { Guide } from "@/lib/guideforge/types"

interface GuideEditorLoaderProps {
  networkId: string
  guideId: string
  fallback: Guide
}

/**
 * Client-side wrapper that loads guide drafts from localStorage.
 * Normalizes generated guides to proper Guide shape.
 * Falls back to mock data if draft not found.
 */
export function GuideEditorLoader({
  networkId,
  guideId,
  fallback,
}: GuideEditorLoaderProps) {
  const [guide, setGuide] = useState<Guide>(fallback)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Try to load from localStorage
    const draft = loadGuideDraft(guideId)
    if (draft) {
      // Normalize the draft to ensure it has all required Guide fields
      const normalized = normalizeGeneratedGuide(draft, guideId)
      setGuide(normalized)
    }
    // Otherwise use fallback (already set in state)
    setIsLoading(false)
  }, [guideId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading guide...</p>
      </div>
    )
  }

  return <GuideEditor guide={guide} networkId={networkId} />
}
