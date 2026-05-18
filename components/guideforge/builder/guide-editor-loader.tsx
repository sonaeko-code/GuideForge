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
  fallback?: Guide
}

/**
 * Client-side wrapper that loads guide drafts from Supabase/localStorage.
 * Properly awaits async load and handles all data preservation.
 * Shows friendly error if draft not found instead of crashing.
 */
export function GuideEditorLoader({
  networkId,
  guideId,
  fallback,
}: GuideEditorLoaderProps) {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadGuide = async () => {
      try {
        const draft = await loadGuideDraft(guideId)
        if (draft) {
          setGuide(draft)
          setNotFound(false)
        } else if (fallback && fallback.id === guideId) {
          setGuide(fallback)
          setNotFound(false)
        } else {
          setNotFound(true)
          setGuide(null)
        }
      } catch (error) {
        console.error("[guide-editor-loader] Error loading draft:", error)
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
        <p className="text-muted-foreground">Loading guide...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="space-y-8 py-12">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Draft Not Found
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            This guide draft could not be found. It may have been deleted or the link is no longer valid.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/builder/network/${networkId}/dashboard`}>
                <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/builder/network/${networkId}/generate`}>
                <Sparkles className="size-4 mr-2" aria-hidden="true" />
                Generate Guide
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="space-y-8 py-12">
        <Card className="border-red-500/30 bg-red-500/5 p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Editor Failed to Load</h2>
          <p className="text-sm text-red-700 dark:text-red-400 mb-6 max-w-md mx-auto">
            The guide editor encountered an error while initializing. Please return to the dashboard and try again.
          </p>
          <Button asChild variant="outline">
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Task 3: Sanitize guide object to ensure all arrays are safe before rendering
  let safeGuide: Guide | null = null
  if (guide) {
    try {
      safeGuide = JSON.parse(JSON.stringify({
        ...guide,
        steps: Array.isArray(guide.steps) ? guide.steps : [],
        warnings: Array.isArray(guide.warnings) ? guide.warnings : [],
        requirements: Array.isArray(guide.requirements) ? guide.requirements : [],
        audience: Array.isArray(guide.audience) ? guide.audience : [],
        summary: guide.summary ?? "",
        status: guide.status ?? "draft",
        difficulty: guide.difficulty ?? "Beginner",
      })) as Guide
    } catch (sanitizeError) {
      console.error("[v0] Guide sanitization failed:", sanitizeError)
      safeGuide = null
    }
  }

  if (!safeGuide && guide) {
    return (
      <div className="space-y-8 py-12">
        <Card className="border-red-500/30 bg-red-500/5 p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Guide Data Error</h2>
          <p className="text-sm text-red-700 dark:text-red-400 mb-6 max-w-md mx-auto">
            The guide data could not be prepared for editing. Please return to the dashboard and try again.
          </p>
          <Button asChild variant="outline">
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  return <GuideEditor guide={safeGuide!} networkId={networkId} />
}
