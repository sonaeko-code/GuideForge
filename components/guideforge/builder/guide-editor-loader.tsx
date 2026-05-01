"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const loadGuide = async () => {
      try {
        console.log("[v0] EditorLoader: Loading draft for guideId:", guideId)

        // Try to load from Supabase/localStorage (async)
        const draft = await loadGuideDraft(guideId)
        
        if (draft) {
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
          console.log("[v0] EditorLoader: Using fallback guide")
          setGuide(fallback)
          setNotFound(false)
        } else {
          // Draft not found
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
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Failed to load guide.</p>
      </div>
    )
  }

  return <GuideEditor guide={guide} networkId={networkId} />
}

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
            We couldn&apos;t find this guide draft. It may have been deleted or
            the link is incorrect.
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
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Failed to load guide.</p>
      </div>
    )
  }

  return <GuideEditor guide={guide} networkId={networkId} />
}
