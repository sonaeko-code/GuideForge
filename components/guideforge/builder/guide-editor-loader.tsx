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
  fallback: Guide
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
        console.log("[v0] Guide editor loaded guide identity:", {
          guideId,
          collectionId: fallback?.collectionId,
          slug: fallback?.slug,
          title: fallback?.title,
          status: fallback?.status,
          source: "loader-start",
          isUuid: guideId?.includes("-") && guideId?.length === 36,
        })

        // Try to load from Supabase/localStorage (async)
        const draft = await loadGuideDraft(guideId)
        
        if (draft) {
          console.log("[v0] Editor loader found guide: true")
          console.log("[v0] Editor loader source:", "supabase/localStorage")
          console.log("[v0] EditorLoader: Draft loaded from storage:", {
            id: draft.id,
            title: draft.title,
            stepsCount: draft.steps.length,
            hubId: draft.hubId,
            collectionId: draft.collectionId,
            networkId: draft.networkId,
          })
          setGuide(draft)
          setNotFound(false)
        } else if (fallback && fallback.id === guideId) {
          // Check if it's a known static/mock guide
          console.log("[v0] Editor loader found guide: true (fallback)")
          console.log("[v0] Editor loader source: fallback")
          console.log("[v0] EditorLoader: Using fallback guide")
          setGuide(fallback)
          setNotFound(false)
        } else {
          // Draft not found
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
  }, [guideId, fallback])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading guide...</p>
      </div>
    )
  }

  if (notFound) {
    // Determine if this is a UUID format issue
    const isValidUuidFormat = guideId && guideId.includes("-") && guideId.length === 36
    
    return (
      <div className="space-y-8 py-12">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">
            Draft Not Found
          </h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            We couldn&apos;t find this guide draft. It may have been deleted or
            the link is incorrect.
          </p>

          <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-300 font-mono max-h-24 overflow-auto">
            <p className="mb-1">
              <strong>Guide ID:</strong> {guideId}
            </p>
            <p className="mb-1">
              <strong>Network ID:</strong> {networkId}
            </p>
            <p>
              <strong>ID format valid:</strong> {isValidUuidFormat ? "yes" : "NO - not a proper UUID"}
            </p>
          </div>

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
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="space-y-8 py-12">
        <Card className="border-red-500/30 bg-red-500/5 p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Editor Failed to Load</h2>
          <p className="text-sm text-red-700 mb-4">
            The guide editor encountered an error while initializing.
          </p>
          <div className="mb-4 p-3 bg-red-50 rounded text-xs font-mono text-red-900 max-h-20 overflow-auto">
            <p>guideId: {guideId}</p>
            <p>networkId: {networkId}</p>
            <p>fallback available: {fallback ? "yes" : "no"}</p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/builder/network/${networkId}/dashboard`}>
                <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
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
        <Card className="border-red-500/30 bg-red-500/5 p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Guide Data Error</h2>
          <p className="text-sm text-red-700 mb-4">
            The guide data could not be prepared for editing.
          </p>
          <div className="mb-4 p-3 bg-red-50 rounded text-xs font-mono text-red-900 max-h-20 overflow-auto">
            <p>guideId: {guideId}</p>
            <p>networkId: {networkId}</p>
            <p>status: data-sanitization-failed</p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/builder/network/${networkId}/dashboard`}>
                <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return <GuideEditor guide={safeGuide} networkId={networkId} />
}
