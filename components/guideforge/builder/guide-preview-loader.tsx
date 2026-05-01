"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { loadGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import type { Guide } from "@/lib/guideforge/types"

interface GuidePreviewLoaderProps {
  networkId: string
  guideId: string
  fallback: Guide
}

/**
 * Client-side preview loader for builder drafts.
 * Uses the same async loadGuideDraft path as GuideEditorLoader — both read
 * from the same source of truth so Preview always shows what the Editor has.
 */
export function GuidePreviewLoader({
  networkId,
  guideId,
  fallback,
}: GuidePreviewLoaderProps) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadGuide = async () => {
      try {
        console.log("[v0] PreviewLoader: Loading draft for guideId:", guideId)

        const draft = await loadGuideDraft(guideId)

        if (draft) {
          console.log("[v0] PreviewLoader: Draft loaded from storage:", {
            id: draft.id,
            title: draft.title,
            stepsCount: draft.steps?.length ?? 0,
          })
          setGuide(draft)
          setNotFound(false)
        } else if (fallback && fallback.id === guideId) {
          console.log("[v0] PreviewLoader: Using fallback guide")
          setGuide(fallback)
          setNotFound(false)
        } else {
          console.warn("[v0] PreviewLoader: Draft not found:", guideId)
          setNotFound(true)
          setGuide(null)
        }
      } catch (error) {
        console.error("[v0] PreviewLoader: Error loading draft:", error)
        setNotFound(true)
        setGuide(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadGuide()
  }, [guideId, fallback])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    )
  }

  if (notFound || !guide) {
    return (
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/builder/network/${networkId}/guide/${guideId}/edit`}>
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to editor
            </Link>
          </Button>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Draft not found. Go back to the editor to make sure the guide has been saved.
          </p>
        </Card>
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

      {/* Guide preview */}
      <Card className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{guide.title}</h1>
          <p className="text-lg text-muted-foreground">{guide.summary}</p>
        </div>

        {guide.requirements && guide.requirements.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-foreground">Requirements</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {guide.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {guide.steps && guide.steps.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Guide Sections</h2>
            <div className="space-y-3">
              {guide.steps.map((step, idx) => (
                <div key={step.id} className="border-l-2 border-primary pl-4 py-2">
                  <h3 className="font-medium text-foreground">
                    {idx + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!guide.steps || guide.steps.length === 0) && (
          <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            No sections added yet. Go back to the editor to add content.
          </div>
        )}
      </Card>
    </div>
  )
}
