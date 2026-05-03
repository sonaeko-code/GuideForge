"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GuideEditor } from "./guide-editor"
import { loadGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import type { Guide } from "@/lib/guideforge/types"

interface GuideEditorLoaderProps {
  networkId: string
  guideId: string
  /** @deprecated No longer used. GuideEditorLoader no longer accepts a mock fallback guide. */
  fallback?: Guide
}

/**
 * Client-side wrapper that loads guide drafts from Supabase/localStorage.
 * Properly awaits async load and handles all data preservation.
 * Shows a clear "Draft Not Found" state instead of silently showing a mock guide.
 */
export function GuideEditorLoader({
  networkId,
  guideId,
}: GuideEditorLoaderProps) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadGuide = async () => {
      try {
        console.log("[v0] Editor loader requested id:", guideId)

        const draft = await loadGuideDraft(guideId)

        if (draft) {
          console.log("[v0] Editor loader found guide: true")
          console.log("[v0] EditorLoader: Draft loaded:", {
            id: draft.id,
            title: draft.title,
            stepsCount: draft.steps.length,
            hubId: draft.hubId,
            collectionId: draft.collectionId,
            networkId: draft.networkId,
          })
          setGuide(draft)
          setNotFound(false)
        } else {
          console.log("[v0] Editor loader found guide: false")
          console.warn("[v0] EditorLoader: Draft not found:", guideId)
          setNotFound(true)
          setGuide(null)
        }
      } catch (error) {
        console.error("[v0] EditorLoader: Error loading draft:", error)
        setNotFound(true)
        setGuide(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadGuide()
  }, [guideId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading guide...</p>
      </div>
    )
  }

  if (notFound || !guide) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-3">
          Guide Not Found
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          This guide draft could not be found. It may have been deleted, or the
          link is incorrect. Guides must be saved to Supabase to persist across
          sessions.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild variant="outline">
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/builder/network/${networkId}/guide/new`}>
              <Plus className="size-4 mr-2" aria-hidden="true" />
              Create New Guide
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/builder/network/${networkId}/generate`}>
              <Sparkles className="size-4 mr-2" aria-hidden="true" />
              Generate Guide
            </Link>
          </Button>
        </div>
      </Card>
    )
  }

  return <GuideEditor guide={guide} networkId={networkId} />
}
