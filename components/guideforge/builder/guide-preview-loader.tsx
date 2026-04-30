"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { loadGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import { normalizeGeneratedGuide } from "@/lib/guideforge/normalize-generated-guide"
import type { Guide } from "@/lib/guideforge/types"

interface GuidePreviewLoaderProps {
  networkId: string
  guideId: string
  fallback: Guide
}

/**
 * Client-side preview loader for builder drafts.
 * Shows a read-only view of the guide as it would appear when published.
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
