"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit2, Trash2, Sparkles, FileText, Lock, Plus, Database, HardDrive } from "lucide-react"
import type { Guide } from "@/lib/guideforge/types"
import { getDraftsByNetwork, deleteDraft } from "@/lib/guideforge/guide-drafts-storage"
import { formatDistanceToNow } from "date-fns"
import { MOCK_HUBS, MOCK_COLLECTIONS } from "@/lib/guideforge/mock-data"

interface DraftWorkspaceProps {
  networkId: string
}

// Resolve hub name from either slug or ID (supports both formats)
function getHubName(hubId: string): string {
  if (!hubId) return "Unknown Hub"
  // Try by id first (e.g. "hub_emberfall"), then by slug (e.g. "emberfall")
  const byId = MOCK_HUBS.find((h) => h.id === hubId)
  if (byId) return byId.name
  const bySlug = MOCK_HUBS.find((h) => h.slug === hubId)
  if (bySlug) return bySlug.name
  // Known seeded slugs fallback
  const seededNames: Record<string, string> = {
    emberfall: "Emberfall",
    "starfall-outriders": "StarFall Outriders",
    hollowspire: "HollowSpire",
    mechbound: "MechBound",
  }
  return seededNames[hubId] ?? hubId
}

// Resolve collection name from either slug or ID
function getCollectionName(collectionId: string): string {
  if (!collectionId) return ""
  const byId = MOCK_COLLECTIONS.find((c) => c.id === collectionId)
  if (byId) return byId.name
  const bySlug = MOCK_COLLECTIONS.find((c) => c.slug === collectionId)
  if (bySlug) return bySlug.name
  const seededNames: Record<string, string> = {
    "character-builds": "Character Builds",
    "boss-battles": "Boss Battles",
    quests: "Quests",
    "beginner-guides": "Beginner Guides",
    "patch-notes": "Patch Notes",
  }
  return seededNames[collectionId] ?? ""
}

const isSupabaseConfigured =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function DraftWorkspace({ networkId }: DraftWorkspaceProps) {
  const [drafts, setDrafts] = useState<Guide[]>([])
  const [draftSource, setDraftSource] = useState<"supabase" | "localStorage" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDrafts = async () => {
      const networkDrafts = await getDraftsByNetwork(networkId)
      setDrafts(networkDrafts)
      // Infer source: if Supabase configured, the adapter tried Supabase first
      setDraftSource(isSupabaseConfigured ? "supabase" : "localStorage")
      console.log("[v0] Dashboard loaded draft source:", isSupabaseConfigured ? "supabase" : "localStorage", "| count:", networkDrafts.length)
      setIsLoading(false)
    }
    loadDrafts()
  }, [networkId])

  const handleDelete = async (draftId: string) => {
    if (confirm("Delete this draft? This cannot be undone.")) {
      await deleteDraft(draftId)
      setDrafts(drafts.filter((d) => d.id !== draftId))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="size-6" aria-hidden="true" />
            Draft Workspace
          </h2>
          <p className="text-sm text-muted-foreground">
            Edit, preview, and manage your work-in-progress guides.
          </p>
        </div>
        {draftSource && (
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 text-xs flex-shrink-0"
          >
            {draftSource === "supabase" ? (
              <>
                <Database className="size-3" aria-hidden="true" />
                Supabase
              </>
            ) : (
              <>
                <HardDrive className="size-3" aria-hidden="true" />
                Local
              </>
            )}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p className="text-sm text-muted-foreground">Loading drafts...</p>
        </div>
      ) : drafts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            No drafts yet.{" "}
            {draftSource === "localStorage" && !isSupabaseConfigured
              ? "Guides will be saved locally in your browser."
              : "Create or generate a guide to get started."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/builder/network/${networkId}/guide/new`}>
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Create Guide
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/builder/network/${networkId}/generate`}>
                <Sparkles className="mr-2 size-4" aria-hidden="true" />
                Generate Guide
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const hubName = getHubName(draft.hubId)
            const collectionName = getCollectionName(draft.collectionId)
            const stepCount = draft.steps?.length ?? 0

            return (
              <Card key={draft.id} className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate flex-1">
                      {draft.title}
                    </h3>
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
                    {hubName && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {hubName}
                      </Badge>
                    )}
                    {collectionName && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {collectionName}
                      </Badge>
                    )}
                    {draft.difficulty && (
                      <Badge variant="outline" className="text-xs font-normal capitalize">
                        {draft.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Dev debug badge */}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-dashed">
                      {draftSource === "supabase" ? (
                        <><Database className="size-2.5 mr-1" />Supabase</>
                      ) : (
                        <><HardDrive className="size-2.5 mr-1" />Local</>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-dashed">
                      {stepCount} {stepCount === 1 ? "step" : "steps"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-dashed">
                      Hub: {hubName}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Updated{" "}
                    {draft.updatedAt
                      ? formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })
                      : "recently"}
                  </p>

                  {draft.status === "ready" && !isSupabaseConfigured && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="size-3" aria-hidden="true" />
                      Publish requires Supabase
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/${draft.id}/edit`}>
                      <Edit2 className="mr-1 size-4" aria-hidden="true" />
                      Edit
                    </Link>
                  </Button>

                  <Button asChild size="sm" variant="outline">
                    <Link href={`/builder/network/${networkId}/guide/${draft.id}/preview`}>
                      <Eye className="mr-1 size-4" aria-hidden="true" />
                      Preview
                    </Link>
                  </Button>

                  <Button size="sm" variant="ghost" onClick={() => handleDelete(draft.id)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
