"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2 } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { getAllDraftObjectsSync, deleteDraft } from "@/lib/guideforge/guide-drafts-storage"
import { formatDistanceToNow } from "date-fns"

/**
 * Shows ONLY drafts without a networkId (truly unassigned/legacy).
 * Network-scoped drafts are NOT shown here - they belong to their network dashboards.
 */
export function LegacyDraftsSection() {
  const [drafts, setDrafts] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Read all local drafts and filter to ONLY those without a networkId
    try {
      const allLocal = getAllDraftObjectsSync() as Guide[]
      const unassigned = allLocal.filter((g) => !g.networkId || g.networkId === "")
      console.log("[v0] LegacyDraftsSection loaded unassigned drafts:", unassigned.length, "of total:", allLocal.length)
      setDrafts(unassigned)
    } catch (err) {
      console.error("[v0] LegacyDraftsSection error:", err)
      setDrafts([])
    }
    setIsLoading(false)
  }, [])

  const handleDelete = async (draftId: string) => {
    if (confirm("Delete this draft? This cannot be undone.")) {
      await deleteDraft(draftId)
      setDrafts(drafts.filter((d) => d.id !== draftId))
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading drafts...</p>
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <Card className="p-6 border-dashed">
        <p className="text-sm text-muted-foreground">
          No unassigned drafts. New guides will be created inside a network.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <Card key={draft.id} className="flex items-start justify-between gap-4 p-4">
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate flex-1">
                {draft.title || "Untitled"}
              </h3>
              <Badge variant="secondary" className="flex-shrink-0 capitalize">
                {draft.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {draft.type && (
                <Badge variant="outline" className="text-xs font-normal capitalize">
                  {draft.type}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-xs font-normal text-amber-700 dark:text-amber-400 border-amber-500/30"
              >
                Unassigned
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Updated{" "}
              {draft.updatedAt
                ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })
                : "recently"}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild size="sm" variant="outline">
              <Link href={`/builder/guide/${draft.id}/edit`}>
                <Edit2 className="mr-1 size-4" aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleDelete(draft.id)}>
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
