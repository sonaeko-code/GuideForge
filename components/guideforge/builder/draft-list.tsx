"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MoreVertical, Trash2, Eye, Edit2, Database, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DifficultyBadge, StatusBadge } from "@/components/guideforge/shared"
import {
  getDraftsByNetwork,
  deleteDraft,
  getPersistenceSource,
} from "@/lib/guideforge/guide-drafts-storage"
import type { Guide } from "@/lib/guideforge/types"
import { BookMarked } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DraftListProps {
  networkId: string
}

const isSupabaseConfigured =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function DraftList({ networkId }: DraftListProps) {
  const [drafts, setDrafts] = useState<Guide[]>([])
  const [draftSource, setDraftSource] = useState<"supabase" | "localStorage">(getPersistenceSource())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const networkDrafts = await getDraftsByNetwork(networkId)
        setDrafts(networkDrafts)
        // Use getPersistenceSource to get the actual source
        setDraftSource(getPersistenceSource())
        console.log("[v0] DraftList loaded from", getPersistenceSource(), "| count:", networkDrafts.length)
        setLoadError(null)
      } catch (error) {
        console.error("[v0] DraftList error loading drafts:", error)
        setLoadError("Failed to load drafts")
      } finally {
        setIsLoading(false)
      }
    }
    loadDrafts()
  }, [networkId])

  const handleDelete = async (guideId: string) => {
    if (confirm("Delete this draft? This cannot be undone.")) {
      await deleteDraft(guideId)
      setDrafts(drafts.filter((d) => d.id !== guideId))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      </div>
    )
  }

  if (loadError && drafts.length === 0) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6">
        <p className="text-sm text-destructive">{loadError}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {draftSource === "supabase" 
            ? "Could not load from Supabase. Showing local drafts instead."
            : "Check your internet connection and try again."}
        </p>
      </Card>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
        <BookMarked className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
        <p className="font-semibold text-foreground">No guides</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start by creating or generating your first guide.
        </p>
        <Button size="sm" asChild className="mt-4">
          <Link href={`/builder/network/${networkId}/generate`}>
            Generate First Guide
          </Link>
        </Button>
      </div>
    )
  }

  // Separate drafts and ready guides
  const draftGuides = drafts.filter(g => g.status === "draft")
  const readyGuides = drafts.filter(g => g.status === "ready")

  return (
    <div className="space-y-6">
      {/* Draft Guides Section */}
      {draftGuides.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Drafts ({draftGuides.length})</h3>
          <div className="space-y-2">
            {draftGuides.map((draft) => (
              <GuideCard key={draft.id} draft={draft} networkId={networkId} draftSource={draftSource} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Ready Guides Section */}
      {readyGuides.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ready to publish ({readyGuides.length})</h3>
          <div className="space-y-2">
            {readyGuides.map((draft) => (
              <GuideCard key={draft.id} draft={draft} networkId={networkId} draftSource={draftSource} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GuideCard({ draft, networkId, draftSource, onDelete }: any) {
  const stepCount = draft.steps?.length ?? 0

  return (
    <Card
      key={draft.id}
      className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="flex items-center gap-2 font-semibold text-foreground truncate">
              <BookMarked className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{draft.title || "Untitled"}</span>
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-dashed flex-shrink-0">
              {draftSource === "supabase" ? (
                <><Database className="size-2.5 mr-1" />Supabase</>
              ) : (
                <><HardDrive className="size-2.5 mr-1" />Local</>
              )}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={draft.status} />
            {draft.difficulty && <DifficultyBadge difficulty={draft.difficulty} />}
            {draft.type && (
              <Badge variant="outline" className="text-xs font-normal capitalize">
                {draft.type}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-dashed">
              {stepCount} {stepCount === 1 ? "step" : "steps"}
            </Badge>
            {draft.updatedAt && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild size="sm" variant="outline">
            <Link href={`/builder/network/${networkId}/guide/${draft.id}/edit`}>
              <Edit2 className="size-3.5 mr-1.5" aria-hidden="true" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/builder/network/${networkId}/guide/${draft.id}/preview`}>
              <Eye className="size-3.5 mr-1.5" aria-hidden="true" />
              <span>Preview</span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9">
                <MoreVertical className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onDelete(draft.id)}
                className="text-destructive"
              >
                <Trash2 className="size-3.5 mr-2" aria-hidden="true" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  )
}
