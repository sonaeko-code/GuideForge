"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Trash2, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { NetworkSkeletonGenerationResponse } from "@/lib/guideforge/generation-schemas"
import { saveNetworkSkeleton } from "@/lib/guideforge/save-network-skeleton"

interface NetworkSkeletonProposalProps {
  proposal: NetworkSkeletonGenerationResponse
  onBack: () => void
}

export function NetworkSkeletonProposal({ proposal, onBack }: NetworkSkeletonProposalProps) {
  const [expandedHubs, setExpandedHubs] = useState<Set<string>>(new Set())
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const toggleHubExpanded = (hubSlug: string) => {
    setExpandedHubs((prev) => {
      const next = new Set(prev)
      if (next.has(hubSlug)) next.delete(hubSlug)
      else next.add(hubSlug)
      return next
    })
  }

  const toggleCollectionExpanded = (collSlug: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collSlug)) next.delete(collSlug)
      else next.add(collSlug)
      return next
    })
  }

  const handleSave = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      // Save the network skeleton
      const result = await saveNetworkSkeleton(proposal)

      if (!result.success) {
        throw new Error(result.error || "Save failed")
      }

      console.log("[v0] Network skeleton saved successfully:", result.networkId)

      // Redirect to network dashboard
      window.location.href = `/builder/network/${result.networkId}/dashboard`
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Save network skeleton error:", err)
      setSaveError(`Failed to save: ${msg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const totalGuideIdeas = proposal.hubs.reduce(
    (sum, hub) => sum + hub.collections.reduce((cSum, coll) => cSum + coll.guideIdeas.length, 0),
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Generated Proposal</h1>
        <p className="text-base text-muted-foreground">
          Review the proposed network structure. You can edit items before saving.
        </p>
      </div>

      {/* Status Badge */}
      <Card className="border-blue-500/30 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Generated Proposal — Not Saved Yet</strong> • Review and customize before creating your network.
        </p>
      </Card>

      {/* Network Overview */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">{proposal.network.name}</h2>
          <p className="text-sm text-muted-foreground">{proposal.network.description}</p>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4 border-t border-border">
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Hubs</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{proposal.hubs.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Collections</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">
                {proposal.hubs.reduce((sum, h) => sum + h.collections.length, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guide Ideas</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{totalGuideIdeas}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Audience</dt>
              <dd className="mt-1 text-sm font-medium text-foreground line-clamp-1">{proposal.network.audience}</dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Hubs List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg text-foreground">Hubs</h2>
        <div className="space-y-3">
          {proposal.hubs.map((hub, hubIdx) => {
            const isExpanded = expandedHubs.has(hub.slug)
            return (
              <Card key={hub.slug} className="p-4">
                <button
                  onClick={() => toggleHubExpanded(hub.slug)}
                  className="w-full text-left flex items-center justify-between gap-3 hover:opacity-70 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{hub.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{hub.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {hub.collections.length} collections
                  </Badge>
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="size-5 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {/* Expanded: Collections */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-border">
                    {hub.collections.map((collection) => {
                      const isCollExpanded = expandedCollections.has(collection.slug)
                      return (
                        <div key={collection.slug} className="rounded-lg border border-border bg-muted/50 p-3">
                          <button
                            onClick={() => toggleCollectionExpanded(collection.slug)}
                            className="w-full text-left flex items-center justify-between gap-3 hover:opacity-70 transition-opacity"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground">{collection.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{collection.description}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {collection.guideIdeas.length} guides
                            </Badge>
                            <div className="shrink-0">
                              {isCollExpanded ? (
                                <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                              )}
                            </div>
                          </button>

                          {/* Guide Ideas */}
                          {isCollExpanded && (
                            <div className="mt-3 space-y-2 pt-3 border-t border-border">
                              {collection.guideIdeas.map((guide) => (
                                <div key={guide.slug} className="flex items-start justify-between gap-3 rounded-lg bg-background p-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-clamp-1">{guide.title}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {guide.difficulty}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {guide.guideType}
                                      </Badge>
                                    </div>
                                  </div>
                                  <button
                                    aria-label="Delete guide"
                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Forge Rules */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg text-foreground mb-4">Suggested Forge Rules</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Global Rules</h3>
            <ul className="space-y-1">
              {proposal.forgeRulesSuggestions.global.map((rule, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">• {rule}</li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Network-Specific</h3>
            <ul className="space-y-1">
              {proposal.forgeRulesSuggestions.networkSpecific.map((rule, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">• {rule}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Guide DNA */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg text-foreground mb-4">Suggested Guide DNA</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-foreground">Tone</dt>
            <dd className="text-sm text-muted-foreground">{proposal.guideDNASuggestions.tone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Layout Style</dt>
            <dd className="text-sm text-muted-foreground">{proposal.guideDNASuggestions.layoutStyle}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Content Priorities</dt>
            <dd className="space-y-1">
              {proposal.guideDNASuggestions.contentPriorities.map((priority, idx) => (
                <div key={idx} className="text-sm text-muted-foreground">• {priority}</div>
              ))}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Assumptions & Missing Info */}
      {(proposal.assumptions.length > 0 || proposal.missingInfo.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {proposal.assumptions.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-3">Assumptions</h2>
              <ul className="space-y-1">
                {proposal.assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {assumption}</li>
                ))}
              </ul>
            </Card>
          )}

          {proposal.missingInfo.length > 0 && (
            <Card className="p-6 border-amber-500/30 bg-amber-500/5">
              <h2 className="font-semibold text-foreground mb-3">Missing Information</h2>
              <ul className="space-y-1">
                {proposal.missingInfo.map((info, idx) => (
                  <li key={idx} className="text-sm text-amber-700 dark:text-amber-300">• {info}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button onClick={handleSave} disabled={isSaving} size="lg" className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save & Create Network"
          )}
        </Button>
      </div>
    </div>
  )
}
