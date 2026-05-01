"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit2, Trash2, Sparkles, FileText, Lock, Plus } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { getDraftsByNetwork, deleteDraft } from "@/lib/guideforge/guide-drafts-storage"
import { formatDistanceToNow } from "date-fns"
import { MOCK_HUBS } from "@/lib/guideforge/mock-data"

interface DraftWorkspaceProps {
  networkId: string
}

export function DraftWorkspace({ networkId }: DraftWorkspaceProps) {
  const [drafts, setDrafts] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDrafts = async () => {
      // Load drafts from Supabase first, fall back to localStorage
      const networkDrafts = await getDraftsByNetwork(networkId)
      setDrafts(networkDrafts)
      setIsLoading(false)
    }
    loadDrafts()
  }, [networkId])

  const handleDelete = async (draftId: string) => {
    if (confirm("Delete this draft? This cannot be undone.")) {
      await deleteDraft(draftId)
      setDrafts(drafts.filter(d => d.id !== draftId))
    }
  }

  const getHubName = (hubId: string) => {
    return MOCK_HUBS.find(h => h.id === hubId)?.name || "Unknown Hub"
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <FileText className="size-6" aria-hidden="true" />
          Draft Workflow
        </h2>
        <p className="text-sm text-muted-foreground">
          Local browser drafts. Edit, preview, and manage your work-in-progress guides.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="mb-4 text-muted-foreground">No local drafts yet. Generate a guide to create one.</p>
          <Button asChild>
            <Link href={`/builder/network/${networkId}/generate`}>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              Generate Guide
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Card key={draft.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate flex-1">{draft.title}</h3>
                  <Badge 
                    variant={draft.status === "ready" ? "default" : "secondary"} 
                    className="flex-shrink-0 capitalize"
                  >
                    {draft.status}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs font-normal capitalize">
                    {draft.type}
                  </Badge>
                  {draft.hubId && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {getHubName(draft.hubId)}
                    </Badge>
                  )}
                  {draft.difficulty && (
                    <Badge variant="outline" className="text-xs font-normal capitalize">
                      {draft.difficulty}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Updated {draft.updatedAt ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true }) : "recently"}
                </p>
                {draft.status === "ready" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="size-3" aria-hidden="true" />
                    Publish requires Supabase
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                >
                  <Link href={`/builder/network/${networkId}/guide/${draft.id}/edit`}>
                    <Edit2 className="mr-1 size-4" aria-hidden="true" />
                    Edit
                  </Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                >
                  <Link href={`/builder/network/${networkId}/guide/${draft.id}/preview`}>
                    <Eye className="mr-1 size-4" aria-hidden="true" />
                    Preview
                  </Link>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(draft.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
