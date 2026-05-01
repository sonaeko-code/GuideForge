"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MoreVertical, Trash2, Eye } from "lucide-react"
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
} from "@/lib/guideforge/guide-drafts-storage"
import type { Guide } from "@/lib/guideforge/types"
import { BookMarked } from "lucide-react"

interface DraftListProps {
  networkId: string
}

export function DraftList({ networkId }: DraftListProps) {
  const [drafts, setDrafts] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDrafts = async () => {
      const localDrafts = await getDraftsByNetwork(networkId)
      setDrafts(localDrafts)
      setIsLoading(false)
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
    return <p className="text-muted-foreground">Loading drafts...</p>
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
        <BookMarked className="mx-auto size-12 text-muted-foreground/50 mb-3" aria-hidden="true" />
        <p className="font-semibold text-foreground">No draft guides</p>
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

  return (
    <div className="space-y-2">
      {drafts.map((draft) => (
        <Card
          key={draft.id}
          className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="flex items-center gap-2 font-semibold text-foreground truncate">
                <BookMarked className="size-4 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{draft.title || "Untitled"}</span>
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={draft.status} />
                {draft.difficulty && <DifficultyBadge difficulty={draft.difficulty} />}
                {draft.updatedAt && (
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(draft.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="flex-shrink-0">
                  <MoreVertical className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/builder/network/${networkId}/guide/${draft.id}/edit`}>
                    <span>Edit</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/builder/network/${networkId}/guide/${draft.id}/preview`}>
                    <Eye className="size-3.5 mr-2" aria-hidden="true" />
                    <span>Preview</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(draft.id)}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5 mr-2" aria-hidden="true" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  )
}
