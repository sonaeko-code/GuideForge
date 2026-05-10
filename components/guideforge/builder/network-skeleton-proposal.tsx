"use client"

import { useState } from "react"
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react"
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
  const [removedHubs, setRemovedHubs] = useState<Set<string>>(new Set())
  const [removedCollections, setRemovedCollections] = useState<Set<string>>(new Set())
  const [removedGuideIdeas, setRemovedGuideIdeas] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Validate proposal shape to catch malformed generated output
  if (!proposal || !proposal.network) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back
        </Button>
        <Card className="border-red-500/30 bg-red-500/5 p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-red-600 shrink-0" aria-hidden="true" />
              <h2 className="font-semibold text-red-700">Generated proposal was incomplete.</h2>
            </div>
            <p className="text-sm text-red-600">Please try again.</p>
          </div>
        </Card>
      </div>
    )
  }

  // Ensure all required arrays exist and are arrays
  const hubs = Array.isArray(proposal.hubs) ? proposal.hubs : []
  const forgeRules = proposal.forgeRulesSuggestions || { global: [], networkSpecific: [] }
  const forgeRulesGlobal = Array.isArray(forgeRules.global) ? forgeRules.global : []
  const forgeRulesNetwork = Array.isArray(forgeRules.networkSpecific) ? forgeRules.networkSpecific : []
  const guideDNA = proposal.guideDNASuggestions || { tone: "", layoutStyle: "", contentPriorities: [], badgeLanguage: "" }
  const guideDNAPriorities = Array.isArray(guideDNA.contentPriorities) ? guideDNA.contentPriorities : []
  const assumptions = Array.isArray(proposal.assumptions) ? proposal.assumptions : []
  const missingInfo = Array.isArray(proposal.missingInfo) ? proposal.missingInfo : []

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

  // Removal handlers
  const removeHub = (hubSlug: string) => {
    setRemovedHubs((prev) => {
      const next = new Set(prev)
      if (next.has(hubSlug)) next.delete(hubSlug)
      else next.add(hubSlug)
      return next
    })
  }

  const removeCollection = (collSlug: string) => {
    setRemovedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collSlug)) next.delete(collSlug)
      else next.add(collSlug)
      return next
    })
  }

  const removeGuideIdea = (guideSlug: string) => {
    setRemovedGuideIdeas((prev) => {
      const next = new Set(prev)
      if (next.has(guideSlug)) next.delete(guideSlug)
      else next.add(guideSlug)
      return next
    })
  }

  // Build filtered proposal for save (excluding removed items)
  const filteredHubs = hubs
    .filter((hub) => !removedHubs.has(hub.slug))
    .map((hub) => ({
      ...hub,
      collections: (Array.isArray(hub.collections) ? hub.collections : [])
        .filter((coll) => !removedCollections.has(coll.slug))
        .map((coll) => ({
          ...coll,
          guideIdeas: (Array.isArray(coll.guideIdeas) ? coll.guideIdeas : [])
            .filter((guide) => !removedGuideIdeas.has(guide.slug)),
        })),
    }))

  const filteredProposal = {
    ...proposal,
    hubs: filteredHubs,
  }

  // Calculate live counts
  const totalHubsFiltered = filteredHubs.length
  const totalCollectionsFiltered = filteredHubs.reduce(
    (sum, h) => sum + (Array.isArray(h.collections) ? h.collections.length : 0),
    0
  )
  const totalGuidesFiltered = filteredHubs.reduce(
    (sum, hub) => {
      const hubCollections = Array.isArray(hub.collections) ? hub.collections : []
      return (
        sum +
        hubCollections.reduce((cSum, coll) => {
          const guideIdeas = Array.isArray(coll.guideIdeas) ? coll.guideIdeas : []
          return cSum + guideIdeas.length
        }, 0)
      )
    },
    0
  )

  const handleSave = async () => {
    setSaveError(null)

    // Validation: must have at least one hub
    if (totalHubsFiltered === 0) {
      setSaveError("Please keep at least one hub before saving. You can remove it after creation.")
      return
    }

    setIsSaving(true)

    try {
      // Save the filtered network skeleton
      const result = await saveNetworkSkeleton(filteredProposal)

      if (!result.success) {
        // Check if this was a partial creation (network created but hubs/collections failed)
        if (result.partiallyCreated && result.networkId) {
          setSaveError(
            result.error ||
            `Partial save: Network "${proposal.network.name}" (${result.networkId}) was created with ${result.hubsCreated} hub(s) and ${result.collectionsCreated} collection(s), but generation stopped at ${result.failedAt}. You can continue editing manually or delete and try again.`
          )
        } else {
          setSaveError(result.error || "Save failed for unknown reason")
        }
        return
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

  const totalGuideIdeas = hubs.reduce(
    (sum, hub) => {
      const hubCollections = Array.isArray(hub.collections) ? hub.collections : []
      return sum + hubCollections.reduce((cSum, coll) => {
        const guideIdeas = Array.isArray(coll.guideIdeas) ? coll.guideIdeas : []
        return cSum + guideIdeas.length
      }, 0)
    },
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

      {/* Error Display */}
      {saveError && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Error saving network
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
              {saveError}
            </p>
          </div>
        </Card>
      )}

      {/* Status Badge */}
      {!saveError && (
        <Card className="border-blue-500/30 bg-blue-500/5 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Generated Proposal — Not Saved Yet</strong> • Review and customize before creating your network.
          </p>
        </Card>
      )}

      {/* Network Overview */}
      <Card className="p-6">
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">{proposal.network.name}</h2>
          <p className="text-sm text-muted-foreground">{proposal.network.description}</p>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4 border-t border-border">
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Hubs</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{totalHubsFiltered}</dd>
              {removedHubs.size > 0 && <dd className="text-xs text-amber-600 dark:text-amber-400 mt-1">-{removedHubs.size}</dd>}
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Collections</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{totalCollectionsFiltered}</dd>
              {removedCollections.size > 0 && <dd className="text-xs text-amber-600 dark:text-amber-400 mt-1">-{removedCollections.size}</dd>}
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Guide Ideas</dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">{totalGuidesFiltered}</dd>
              {removedGuideIdeas.size > 0 && <dd className="text-xs text-amber-600 dark:text-amber-400 mt-1">-{removedGuideIdeas.size}</dd>}
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
          {filteredHubs.map((hub, hubIdx) => {
            const isExpanded = expandedHubs.has(hub.slug)
            const isRemoved = removedHubs.has(hub.slug)
            return (
              <Card key={hub.slug} className={`p-4 ${isRemoved ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleHubExpanded(hub.slug)}
                    className="flex-1 text-left flex items-center justify-between gap-3 hover:opacity-70 transition-opacity"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{hub.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{hub.description}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {(Array.isArray(hub.collections) ? hub.collections : []).length} collections
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-5 text-muted-foreground shrink-0" aria-hidden="true" />
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHub(hub.slug)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                {/* Expanded: Collections */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-border">
                    {(Array.isArray(hub.collections) ? hub.collections : []).map((collection) => {
                      const isCollExpanded = expandedCollections.has(collection.slug)
                      const isCollRemoved = removedCollections.has(collection.slug)
                      return (
                        <div key={collection.slug} className={`rounded-lg border border-border bg-muted/50 p-3 ${isCollRemoved ? "opacity-50" : ""}`}>
                          <div className="flex items-center justify-between gap-3">
                            <button
                              onClick={() => toggleCollectionExpanded(collection.slug)}
                              className="flex-1 text-left flex items-center justify-between gap-3 hover:opacity-70 transition-opacity"
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground">{collection.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{collection.description}</p>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {(Array.isArray(collection.guideIdeas) ? collection.guideIdeas.filter(g => !removedGuideIdeas.has(g.slug)) : []).length} guides
                              </Badge>
                              <div className="shrink-0">
                                {isCollExpanded ? (
                                  <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
                                ) : (
                                  <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                                )}
                              </div>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCollection(collection.slug)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>

                          {/* Guide Ideas */}
                          {isCollExpanded && (
                            <div className="mt-3 space-y-2 pt-3 border-t border-border">
                              {(Array.isArray(collection.guideIdeas) ? collection.guideIdeas : []).map((guide) => {
                                const isGuideRemoved = removedGuideIdeas.has(guide.slug)
                                return (
                                  <div key={guide.slug} className={`flex items-start justify-between gap-3 rounded-lg bg-background p-2 ${isGuideRemoved ? "opacity-50" : ""}`}>
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
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeGuideIdea(guide.slug)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                    >
                                      <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                  </div>
                                )
                              })}
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
              {forgeRulesGlobal.map((rule, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">• {rule}</li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Network-Specific</h3>
            <ul className="space-y-1">
              {forgeRulesNetwork.map((rule, idx) => (
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
            <dd className="text-sm text-muted-foreground">{guideDNA.tone || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Layout Style</dt>
            <dd className="text-sm text-muted-foreground">{guideDNA.layoutStyle || "Not specified"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-foreground">Content Priorities</dt>
            <dd className="space-y-1">
              {guideDNAPriorities.length > 0 ? (
                guideDNAPriorities.map((priority, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">• {priority}</div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic">No priorities specified</div>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Assumptions & Missing Info */}
      {(assumptions.length > 0 || missingInfo.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {assumptions.length > 0 && (
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-3">Assumptions</h2>
              <ul className="space-y-1">
                {assumptions.map((assumption, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {assumption}</li>
                ))}
              </ul>
            </Card>
          )}

          {missingInfo.length > 0 && (
            <Card className="p-6 border-amber-500/30 bg-amber-500/5">
              <h2 className="font-semibold text-foreground mb-3">Missing Information</h2>
              <ul className="space-y-1">
                {missingInfo.map((info, idx) => (
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

      {/* Save Summary */}
      {totalHubsFiltered > 0 && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Ready to create:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• 1 network: {proposal.network.name}</li>
              <li>• {totalHubsFiltered} {totalHubsFiltered === 1 ? "hub" : "hubs"}</li>
              <li>• {totalCollectionsFiltered} {totalCollectionsFiltered === 1 ? "collection" : "collections"}</li>
              <li>• {totalGuidesFiltered} draft {totalGuidesFiltered === 1 ? "guide" : "guides"}</li>
            </ul>
            <p className="text-xs text-muted-foreground italic pt-2">Nothing will be published automatically. All guides will remain as drafts.</p>
          </div>
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
