"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Flame, ChevronRight, Copy, Check, ArrowLeft, Loader2, Sparkles } from "lucide-react"
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
import { classifyNetworkGuidePrompt } from "@/lib/guideforge/network-guide-classifier"

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

  // Validate query params against the loaded context
  const validHubFromParam = hubParam && hubs.some((h) => h.id === hubParam) ? hubParam : ""
  const initialHubId =
    validHubFromParam || (hubs.length === 1 ? hubs[0].id : "")

  // Validate collection param if hub is valid
  let validCollectionFromParam = ""
  let initialCollectionId = ""
  if (initialHubId) {
    const collectionsForInitialHub = collectionsByHub[initialHubId] || []
    validCollectionFromParam =
      collectionParam && collectionsForInitialHub.some((c) => c.id === collectionParam)
        ? collectionParam
        : ""
    initialCollectionId =
      validCollectionFromParam || (collectionsForInitialHub.length === 1 ? collectionsForInitialHub[0].id : "")
  }

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
  const [generationMode, setGenerationMode] = useState<"mock" | "ai">("mock")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [suggestionBanner, setSuggestionBanner] = useState<{
    confidence: "high" | "medium" | "low"
    note: string | null
  } | null>(null)

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

  const handleSuggestStructure = () => {
    if (formState.prompt.trim().length < 20) return

    const result = classifyNetworkGuidePrompt(formState.prompt, hubs, collectionsByHub)

    // Apply suggestions — never touch the prompt itself
    if (result.guideType) {
      setFormState((prev) => ({ ...prev, guideType: result.guideType! }))
    }
    if (result.difficulty) {
      setFormState((prev) => ({ ...prev, preferredDifficulty: result.difficulty! }))
    }
    if (result.hubId) {
      setSelectedHubId(result.hubId)
    }
    if (result.collectionId) {
      setSelectedCollectionId(result.collectionId)
    }

    setSuggestionBanner({ confidence: result.confidence, note: result.confidenceNote })
  }

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

  const handleGenerateAI = async () => {
    if (!formState.prompt.trim()) {
      alert("Please enter a prompt")
      return
    }
    if (!selectedHubId || !selectedCollectionId) {
      setSendError("Please select a hub and collection before generating.")
      return
    }

    const sessionId = `session_ai_${Date.now()}`
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
    setSendError(null)

    try {
      // Call AI generation API — enrich with network/collection context
      const response = await fetch("/api/guideforge/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...request,
          networkId,
          networkName,
          targetCollectionId: selectedCollectionId,
        }),
      })

      let responseText: string
      try {
        responseText = await response.text()
      } catch (readErr) {
        setSendError("AI generation failed. Please try again.")
        setSession((prev) => (prev ? { ...prev, status: "error" } : null))
        return
      }

      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (parseErr) {
        setSendError(
          "AI generation failed. The server returned a non-JSON response. Try Mock Preview, or use the Single Guide asset builder."
        )
        setSession((prev) => (prev ? { ...prev, status: "error" } : null))
        return
      }

      if (!response.ok || !data.success) {
        // Provide specific error messages
        let errorMsg = data.error || "AI generation failed"
        if (!response.ok && response.status === 500) {
          errorMsg = "AI service temporarily unavailable. Try Mock Preview or simplify your prompt."
        } else if (!response.ok && response.status === 429) {
          errorMsg = "Rate limit reached. Please wait a moment and try again."
        } else if (errorMsg.includes("timeout") || errorMsg.includes("took too long")) {
          errorMsg = "Generation took too long. Try a shorter prompt or use Mock Preview."
        }
        setSendError(errorMsg)
        setSession((prev) => (prev ? { ...prev, status: "error" } : null))
        return
      }

      // Success - update session with response
      setSession((prev) => (prev ? { ...prev, response: data, status: "done" } : null))
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setSendError(`Generation error: ${msg}`)
      setSession((prev) => (prev ? { ...prev, status: "error" } : null))
    }
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
      const difficultyToUse = generatedGuide.difficulty || "intermediate"
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
                Describe the guide you want to create, and we'll generate structured content. Use Mock Preview for testing or AI Generate for real context.
              </p>
            </div>

            <Card className="border-border/50 p-6 space-y-4">
              {/* PROMPT FIRST */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Describe Your Guide
                </label>
                <Textarea
                  placeholder="Example: Create a beginner-friendly Fire Warden build guide that focuses on survivability and crowd control. Include gear recommendations and stat priorities."
                  value={formState.prompt}
                  onChange={(e) =>
                    setFormState({ ...formState, prompt: e.target.value })
                  }
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This is your source of truth. AI can help infer guide type, difficulty, and placement.
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestStructure}
                    disabled={formState.prompt.trim().length < 20}
                  >
                    <Sparkles className="mr-1.5 size-3.5" aria-hidden="true" />
                    Suggest structure
                  </Button>
                </div>
                {suggestionBanner && (
                  <div
                    className={
                      suggestionBanner.confidence === "low"
                        ? "mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
                        : "mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                    }
                  >
                    {suggestionBanner.note ?? "Structure suggested — review and adjust before generating."}
                  </div>
                )}
              </div>

              {/* Guide Type */}
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
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="repair-procedure">Repair Procedure</SelectItem>
                    <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
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

              {/* Hub */}
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

              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Forge Rules:</strong>{" "}
                  The network&apos;s forge rules will be applied as context to the generator.
                </p>
              </div>

              {/* Generation mode selector */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Generation Mode
                </label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={generationMode === "mock" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGenerationMode("mock")}
                  >
                    Mock Preview
                  </Button>
                  <Button
                    variant={generationMode === "ai" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGenerationMode("ai")}
                  >
                    AI Generate
                  </Button>
                </div>
              </div>

              <Button
                onClick={generationMode === "mock" ? handleGenerateMock : handleGenerateAI}
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
                    {generationMode === "mock" ? "Generate Mock Guide" : "Generate AI Guide"}
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
              <h2 className="text-xl font-bold">Generated Draft Preview</h2>
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
                ) : session.status === "error" ? (
                  <Card className="border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-6">
                    <div className="text-center">
                      <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                        Generation failed
                      </p>
                      <p className="text-muted-foreground text-sm mb-4">
                        {sendError || "An error occurred during generation"}
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setSession(null)}>
                        Try again
                      </Button>
                    </div>
                  </Card>
                ) : null}
              </>
            ) : (
              <Card className="border-border/50 p-8 text-center">
                <p className="text-muted-foreground">
                  Fill out the form and click{" "}
                  &quot;{generationMode === "mock" ? "Generate Mock Guide" : "Generate AI Guide"}&quot;{" "}
                  to preview the output.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
