"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Flame, ChevronRight, Copy, Check, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  GenerationRequest,
  GenerationResponse,
  GenerationSession,
} from "@/lib/guideforge/generation-schemas"
import { generateMockResponse } from "@/lib/guideforge/mock-generator"
import { createAndSaveGuideDraft } from "@/lib/guideforge/create-and-save-guide-draft"
import type { GuideType, DifficultyLevel } from "@/lib/guideforge/types"
import type {
  NormalizedHub,
  NormalizedCollection,
} from "@/lib/guideforge/supabase-networks"

interface GeneratorClientProps {
  networkId: string
  networkName: string
  hubs: NormalizedHub[]
  collectionsByHub: Record<string, NormalizedCollection[]>
}

/**
 * Sanitize a query param. Treats "undefined", "null", and empty strings as missing.
 */
function sanitizeParam(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return ""
  return trimmed
}

export function GeneratorClient({
  networkId,
  networkName,
  hubs,
  collectionsByHub,
}: GeneratorClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const hubParamRaw = searchParams?.get("hub") ?? null
  const collectionParamRaw = searchParams?.get("collection") ?? null
  const hubParam = sanitizeParam(hubParamRaw)
  const collectionParam = sanitizeParam(collectionParamRaw)

  console.log("[v0] Generate query params:", { hubParam, collectionParam })

  // Validate query params against the loaded context
  const validHubFromParam = hubParam && hubs.some((h) => h.id === hubParam) ? hubParam : ""
  const initialHubId =
    validHubFromParam || (hubs.length === 1 ? hubs[0].id : "")

  const initialCollectionId = (() => {
    if (!initialHubId) return ""
    const hubCollections = collectionsByHub[initialHubId] || []
    if (
      collectionParam &&
      hubCollections.some((c) => c.id === collectionParam)
    ) {
      return collectionParam
    }
    if (hubCollections.length === 1) return hubCollections[0].id
    return ""
  })()

  console.log("[v0] Generate valid selected hub:", initialHubId)
  console.log("[v0] Generate valid selected collection:", initialCollectionId)

  const [selectedHubId, setSelectedHubId] = useState<string>(initialHubId)
  const [selectedCollectionId, setSelectedCollectionId] =
    useState<string>(initialCollectionId)
  const [formState, setFormState] = useState<
    Omit<GenerationRequest, "targetHubId">
  >({
    prompt: "",
    guideType: "character-build",
    preferredDifficulty: "intermediate",
  })
  const [session, setSession] = useState<GenerationSession | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const collectionsForHub = useMemo(
    () => (selectedHubId ? collectionsByHub[selectedHubId] || [] : []),
    [selectedHubId, collectionsByHub]
  )

  // Reset collection when hub changes if current selection is invalid
  useEffect(() => {
    if (!selectedHubId) {
      if (selectedCollectionId) setSelectedCollectionId("")
      return
    }
    const stillValid = collectionsForHub.some((c) => c.id === selectedCollectionId)
    if (!stillValid) {
      setSelectedCollectionId(
        collectionsForHub.length === 1 ? collectionsForHub[0].id : ""
      )
    }
  }, [selectedHubId, collectionsForHub, selectedCollectionId])

  const totalCollections = useMemo(
    () => Object.values(collectionsByHub).reduce((acc, list) => acc + list.length, 0),
    [collectionsByHub]
  )

  const prereqDecision = (() => {
    if (hubs.length === 0) return "needs-hub"
    if (totalCollections === 0) return "needs-collection"
    return "ready"
  })()
  console.log("[v0] Generate prerequisite decision:", prereqDecision)

  const handleGenerateMock = async () => {
    if (!formState.prompt.trim()) {
      alert("Please enter a prompt")
      return
    }
    if (!selectedHubId || !selectedCollectionId) {
      setSendError("Please select a hub and collection before generating.")
      return
    }

    const sessionId = `session_${Date.now()}`
    const request: GenerationRequest = {
      ...formState,
      targetHubId: selectedHubId,
    }
    setSession({
      id: sessionId,
      createdAt: new Date().toISOString(),
      request,
      status: "generating",
    })

    await new Promise((resolve) => setTimeout(resolve, 600))
    const response: GenerationResponse = generateMockResponse(request)
    setSession((prev) => (prev ? { ...prev, response, status: "done" } : null))
  }

  const handleSendToEditor = async () => {
    if (!session?.response?.guide) {
      alert("No guide to send")
      return
    }
    if (!selectedHubId || !selectedCollectionId) {
      setSendError("Please select a hub and collection before saving the guide.")
      return
    }

    // Validate collection belongs to selected hub
    const valid = collectionsForHub.some((c) => c.id === selectedCollectionId)
    if (!valid) {
      console.error(
        "[v0] Collection does not belong to selected hub:",
        selectedCollectionId
      )
      setSendError(
        "Selected collection does not belong to the chosen hub. Please reselect."
      )
      return
    }

    // Validate selectedCollectionId is a UUID before attempting save
    const isValidCollectionUuid = selectedCollectionId && selectedCollectionId.includes("-") && selectedCollectionId.length === 36
    if (!isValidCollectionUuid) {
      console.error(
        "[v0] handleSendToEditor: selectedCollectionId is not a valid UUID:",
        selectedCollectionId,
        "length:",
        selectedCollectionId?.length
      )
      setSendError(
        `Invalid collection ID format: "${selectedCollectionId}". Expected a UUID. This may indicate a data loading issue.`
      )
      return
    }

    setIsSending(true)
    setSendError(null)
    try {
      if (!session?.response?.guide) {
        throw new Error("No generated guide available")
      }

      const generatedGuide = session.response.guide
      
      // Defensive: ensure required fields have defaults
      const guideTypeToUse = formState.guideType || "reference"
      const difficultyToUse = generatedGuide.difficulty || "Beginner"
      const summaryToUse = generatedGuide.summary || generatedGuide.title?.substring(0, 100) || "AI-generated guide"
      
      console.log("[v0] Generated guide save target:", {
        networkId,
        hubId: selectedHubId,
        collectionId: selectedCollectionId,
        collectionIdLength: selectedCollectionId.length,
        guideType: guideTypeToUse,
        difficulty: difficultyToUse,
        sectionsCount: generatedGuide.sections?.length,
      })

      const result = await createAndSaveGuideDraft({
        title: generatedGuide.title || "Untitled Guide",
        summary: summaryToUse,
        guideType: guideTypeToUse,
        difficulty: difficultyToUse,
        networkId,
        hubId: selectedHubId,
        collectionId: selectedCollectionId,
        requirements: generatedGuide.requirements,
        warnings: generatedGuide.warnings,
        steps: generatedGuide.sections?.map((section) => ({
          title: section.title || "Untitled Section",
          body: section.body || "",
          kind: section.kind || "custom",
        })),
      })

      const { id, verified, error } = result

      console.log("[v0] handleSendToEditor: createAndSaveGuideDraft returned:", {
        id,
        verified,
        error,
      })

      if (!verified) {
        console.error("[v0] handleSendToEditor: Verification failed:", error)
        setSendError(
          error || "Guide save verification failed. Please try again."
        )
        return
      }

      // Additional safety check: ensure guide ID exists and is valid
      if (!id || id === "error" || id.startsWith("error")) {
        console.error("[v0] handleSendToEditor: Invalid guide ID returned:", id)
        setSendError("Guide ID is invalid. Please try generating again.")
        return
      }

      // Triple-check: ID must be a valid UUID (non-empty, has dashes, proper length)
      const isValidUuid = id && id.includes("-") && id.length === 36
      if (!isValidUuid) {
        console.error("[v0] handleSendToEditor: Guide ID is not a valid UUID:", id, "length:", id?.length)
        setSendError("Generated guide ID is malformed. Please try generating again.")
        return
      }

      console.log("[v0] handleSendToEditor: redirecting to editor id:", id)
      console.log("[v0] handleSendToEditor: target route: /builder/network/%s/guide/%s/edit", networkId, id)
      router.push(`/builder/network/${networkId}/guide/${id}/edit`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Error in handleSendToEditor:", err)
      setSendError(`Could not save guide before opening editor: ${msg}`)
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyJson = () => {
    if (!session?.response?.guide) return
    const json = JSON.stringify(session.response.guide, null, 2)
    navigator.clipboard.writeText(json)
    setCopiedId("json")
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Pre-check banner: only one prerequisite message at a time, never both.
  const preCheck =
    prereqDecision === "needs-hub" ? (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/5 p-5">
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
          <strong>Create a hub first.</strong> Guides belong to collections,
          which belong to hubs.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/builder/network/${networkId}/hub/new`}>
            Create First Hub
          </Link>
        </Button>
      </Card>
    ) : prereqDecision === "needs-collection" ? (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/5 p-5">
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
          <strong>Create a collection first.</strong> Collections organize
          guides within your hubs.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={`/builder/network/${networkId}/collection/new`}>
            Create First Collection
          </Link>
        </Button>
      </Card>
    ) : null

  return (
    <div>
      {/* Breadcrumb */}
      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-sm"
        aria-label="Breadcrumb"
      >
        <Button asChild variant="ghost" size="sm">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Network Dashboard
          </Link>
        </Button>
        <span className="text-muted-foreground">·</span>
        <Link
          href="/builder/networks"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          All Networks
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">{networkName}</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-foreground font-semibold">Generate Guide</span>
      </nav>

      {preCheck}

      {prereqDecision === "ready" && (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Generate a Guide</h1>
              <p className="mt-2 text-muted-foreground">
                Use AI to create structured guide data. Preview the JSON, then
                send to the editor for customization.
              </p>
            </div>

            <Card className="border-border/50 p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Guide Type
                </label>
                <Select
                  value={formState.guideType}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      guideType: value as GuideType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="character-build">
                      Character Build
                    </SelectItem>
                    <SelectItem value="boss-guide">Boss Guide</SelectItem>
                    <SelectItem value="beginner-guide">
                      Beginner Guide
                    </SelectItem>
                    <SelectItem value="walkthrough">Walkthrough</SelectItem>
                    <SelectItem value="patch-notes">Patch Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Difficulty
                </label>
                <Select
                  value={formState.preferredDifficulty || "intermediate"}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      preferredDifficulty: value as DifficultyLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block">Hub</label>
                <Select value={selectedHubId} onValueChange={setSelectedHubId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedHubId && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Collection
                  </label>
                  {collectionsForHub.length === 0 ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                      <p className="mb-2">
                        <strong>No collections in this hub.</strong> Create a
                        collection first.
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/builder/network/${networkId}/collection/new?hub=${selectedHubId}`}
                        >
                          Create Collection
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedCollectionId}
                      onValueChange={setSelectedCollectionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        {collectionsForHub.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Prompt
                </label>
                <Textarea
                  placeholder="Describe the guide you want to generate. E.g., 'Create a beginner-friendly Fire Warden build guide that focuses on survivability and crowd control.'"
                  value={formState.prompt}
                  onChange={(e) =>
                    setFormState({ ...formState, prompt: e.target.value })
                  }
                  className="min-h-32"
                />
              </div>

              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Forge Rules:</strong> The network&apos;s forge rules
                  will be applied as context to the generator.
                </p>
              </div>

              <Button
                onClick={handleGenerateMock}
                disabled={
                  session?.status === "generating" ||
                  !selectedHubId ||
                  !selectedCollectionId
                }
                className="w-full"
              >
                {session?.status === "generating" ? (
                  <>
                    <Flame className="mr-2 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Flame className="mr-2 size-4" />
                    Generate Mock Structured Guide
                  </>
                )}
              </Button>

              {(!selectedHubId || !selectedCollectionId) && (
                <p className="text-xs text-muted-foreground">
                  Select a hub and collection above to enable generation.
                </p>
              )}
            </Card>
          </div>

          {/* Right: preview */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">Generated JSON Preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the generated guide structure before sending to editor.
              </p>
            </div>

            {session ? (
              <>
                {session.status === "generating" && (
                  <Card className="border-border/50 p-8 text-center">
                    <Flame className="mx-auto mb-3 size-8 text-primary animate-spin" />
                    <p className="text-muted-foreground">Generating guide...</p>
                  </Card>
                )}

                {session.status === "done" && session.response ? (
                  <Card className="border-border/50 p-6 space-y-4">
                    {session.response.success ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              Generated Guide JSON
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCopyJson}
                            >
                              {copiedId === "json" ? (
                                <Check className="size-4" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </div>
                          <div className="bg-muted/30 rounded border border-border/50 p-3 overflow-x-auto max-h-96 overflow-y-auto font-mono text-xs text-foreground">
                            <pre>
                              {JSON.stringify(session.response.guide, null, 2)}
                            </pre>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded p-3">
                          <p className="text-sm font-semibold mb-1">
                            {session.response.guide.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.response.guide.sections.length} sections ·{" "}
                            {session.response.guide.estimatedMinutes} min read ·{" "}
                            {session.response.guide.difficulty}
                          </p>
                        </div>

                        <Button
                          onClick={handleSendToEditor}
                          disabled={!session?.response?.guide || isSending}
                          size="lg"
                        >
                          {isSending ? (
                            <>
                              <Loader2
                                className="mr-2 size-4 animate-spin"
                                aria-hidden="true"
                              />
                              Saving...
                            </>
                          ) : (
                            "Send to Editor"
                          )}
                        </Button>

                        {sendError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-4">
                            <p className="text-sm text-red-700 dark:text-red-400">
                              {sendError}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-red-600 text-sm mb-2">
                          Generation failed
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {session.response.error}
                        </p>
                      </div>
                    )}
                  </Card>
                ) : null}
              </>
            ) : (
              <Card className="border-border/50 p-8 text-center">
                <p className="text-muted-foreground">
                  Fill out the form and click &quot;Generate Mock Structured
                  Guide&quot; to preview the output.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
