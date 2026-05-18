"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
  GeneratedGuide,
} from "@/lib/guideforge/generation-schemas"
import { generateGuideForgeDraft, toNetworkGuideBuilderRequest } from "@/lib/guideforge/ai-builder-core"
import { createAndSaveGuideDraft } from "@/lib/guideforge/create-and-save-guide-draft"
import type { GuideType, DifficultyLevel } from "@/lib/guideforge/types"
import type {
  NormalizedHub,
  NormalizedCollection,
} from "@/lib/guideforge/supabase-networks"
import { classifyNetworkGuidePrompt } from "@/lib/guideforge/network-guide-classifier"
import {
  readStarterGuideHandoff,
  clearStarterGuideHandoff,
  type StarterGuideIdeaHandoff,
} from "@/lib/guideforge/intake-session"
import { resolveGuideGenerationProfile } from "@/lib/guideforge/guide-generation-profiles"

interface GeneratorClientProps {
  networkId: string
  networkName: string
  /** Network's stored DB type ("gaming" / "repair" / "sop" / "creator" / etc.).
   *  Used to resolve the domain generation profile for both Mock Preview and AI Generate. */
  networkType?: string
  hubs: NormalizedHub[]
  collectionsByHub: Record<string, NormalizedCollection[]>
}

// ─── Generation source tracking ──────────────────────────────────────────────

type GenerationSource =
  | "manual_prompt"
  | "starter_guide_idea"
  | "launch_plan_priority_guide"

/**
 * Build a unified GuideForgeBuilderRequest for network guide generation.
 * Wraps toNetworkGuideBuilderRequest() and merges source metadata into formData
 * without overwriting any fields the adapter may have set.
 */
function buildNetworkGuideGenerationRequest(opts: {
  mode: "mock" | "ai"
  prompt: string
  guideType: string
  difficulty: string
  networkId: string
  networkName: string
  networkType?: string
  hubId: string
  hubName?: string
  collectionId: string
  collectionName?: string
  source?: GenerationSource
}) {
  const base = toNetworkGuideBuilderRequest({
    prompt: opts.prompt,
    mode: opts.mode,
    networkId: opts.networkId,
    networkName: opts.networkName,
    networkType: opts.networkType,
    hubId: opts.hubId,
    hubName: opts.hubName,
    collectionId: opts.collectionId,
    collectionName: opts.collectionName,
    guideType: opts.guideType,
    difficulty: opts.difficulty,
  })
  return {
    ...base,
    formData: {
      ...(base.formData ?? {}),
      _source: opts.source ?? "manual_prompt",
    },
  }
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

const VALID_GENERATOR_GUIDE_TYPES = new Set([
  "character-build", "boss-guide", "beginner-guide", "walkthrough",
  "patch-notes", "tutorial", "reference", "news", "repair-procedure", "sop",
])

const GUIDE_TYPE_FALLBACKS: Record<string, string> = {
  "guide": "tutorial",
  "tier-list": "reference",
  "troubleshooting": "repair-procedure",
}

function sanitizeHandoffGuideType(type: string): string {
  if (VALID_GENERATOR_GUIDE_TYPES.has(type)) return type
  return GUIDE_TYPE_FALLBACKS[type] ?? "tutorial"
}

/**
 * Network Guide Generator — uses the shared AI Builder Core contract.
 *   prompt → Suggest Structure (classifyNetworkGuidePrompt) → hub/collection selection
 *   → generateGuideForgeDraft({ kind: "network_guide", mode }) via buildNetworkGuideGenerationRequest()
 *   → human-readable preview → Send to Editor (createAndSaveGuideDraft → redirect)
 *
 * The prompt is never mutated — Suggest Structure and handoff apply structure only.
 * Source tracking: handoffSource distinguishes manual_prompt from starter_guide_idea handoffs.
 */
export function GeneratorClient({
  networkId,
  networkName,
  networkType,
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
  const [handoffBanner, setHandoffBanner] = useState<string | null>(null)
  const [handoffSource, setHandoffSource] = useState<GenerationSource>("manual_prompt")
  /** Full handoff payload kept around so the generator can render a rich
   *  "Creating from Launch Plan" context card. Cleared from sessionStorage on
   *  read, but mirrored here for the lifetime of this page so the card stays
   *  visible while the user reviews placement before generating. */
  const [handoffContext, setHandoffContext] = useState<StarterGuideIdeaHandoff | null>(null)

  // Apply starter guide idea handoff once on mount (written by the dashboard panel)
  const didApplyHandoffRef = useRef(false)
  useEffect(() => {
    if (didApplyHandoffRef.current) return
    didApplyHandoffRef.current = true

    const handoff = readStarterGuideHandoff(networkId)
    if (!handoff) return

    clearStarterGuideHandoff(networkId)

    // Source field is now reliable: starter idea panel sends "starter_guide_idea",
    // launch plan priority cards send "launch_plan_priority_guide". Both flow
    // through to AI Builder Core via `_source` in formData.
    setHandoffSource(handoff.source)
    setHandoffContext(handoff)

    setFormState((prev) => ({
      ...prev,
      prompt: handoff.prompt,
      guideType: sanitizeHandoffGuideType(handoff.guideType) as GuideType,
      preferredDifficulty: (
        ["beginner", "intermediate", "advanced", "expert"].includes(handoff.difficulty)
          ? handoff.difficulty
          : prev.preferredDifficulty
      ) as DifficultyLevel,
    }))

    // Match hub and collection by name (case-insensitive)
    const matchedHub = hubs.find(
      (h) => h.name.toLowerCase() === handoff.hubName.toLowerCase()
    )
    let hubMatched = false
    let colMatched = false

    if (matchedHub) {
      setSelectedHubId(matchedHub.id)
      hubMatched = true
      const hubCollections = collectionsByHub[matchedHub.id] || []
      const matchedCol = hubCollections.find(
        (c) => c.name.toLowerCase() === handoff.collectionName.toLowerCase()
      )
      if (matchedCol) {
        setSelectedCollectionId(matchedCol.id)
        colMatched = true
      }
    }

    if (hubMatched && colMatched) {
      setHandoffBanner("Loaded starter guide idea. Review placement before generating.")
    } else {
      setHandoffBanner(
        "We loaded the idea, but could not match its hub or collection. Please choose placement before generating."
      )
    }
  }, [networkId, hubs, collectionsByHub])

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

  const handleGenerate = async () => {
    if (!formState.prompt.trim()) {
      alert("Please enter a prompt")
      return
    }
    if (!selectedHubId || !selectedCollectionId) {
      setSendError("Please select a hub and collection before generating.")
      return
    }

    const sessionId = `session_${generationMode}_${Date.now()}`
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

    // Brief delay for mock mode so the generating spinner is visible
    if (generationMode === "mock") {
      await new Promise((r) => setTimeout(r, 400))
    }

    const selectedHubName = hubs.find((h) => h.id === selectedHubId)?.name
    const selectedCollectionName = collectionsForHub.find(
      (c) => c.id === selectedCollectionId
    )?.name

    const builderRequest = buildNetworkGuideGenerationRequest({
      mode: generationMode,
      prompt: formState.prompt,
      guideType: formState.guideType,
      difficulty: formState.preferredDifficulty ?? "intermediate",
      networkId,
      networkName,
      networkType,
      hubId: selectedHubId,
      hubName: selectedHubName,
      collectionId: selectedCollectionId,
      collectionName: selectedCollectionName,
      source: handoffSource,
    })

    const result = await generateGuideForgeDraft(builderRequest)

    if (!result.success) {
      setSendError(result.error || "Generation failed. Please try again.")
      setSession((prev) => (prev ? { ...prev, status: "error" } : null))
      return
    }

    const guide = result.structuredPayload as GeneratedGuide
    if (!guide) {
      setSendError("Generation returned no guide data. Please try again.")
      setSession((prev) => (prev ? { ...prev, status: "error" } : null))
      return
    }

    setSession((prev) =>
      prev ? { ...prev, response: { success: true, guide }, status: "done" } : null
    )
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
      <Card className="mb-5 border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Create a hub first.</strong> Guides belong to collections, which belong to hubs.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 self-start sm:self-auto">
            <Link href={`/builder/network/${networkId}/hub/new`}>
              Create First Hub
            </Link>
          </Button>
        </div>
      </Card>
    ) : prereqDecision === "needs-collection" ? (
      <Card className="mb-5 border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Create a collection first.</strong> Collections organize guides within your hubs.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0 self-start sm:self-auto">
            <Link href={`/builder/network/${networkId}/collection/new`}>
              Create First Collection
            </Link>
          </Button>
        </div>
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
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Generate a Guide</h1>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">
                Describe the guide you want to create, and we&apos;ll generate structured content. Use Mock Preview for testing or AI Generate for real context.
              </p>
            </div>

            <Card className="border-border/50 p-4 md:p-6 space-y-4">
              {handoffContext && (() => {
                const profile = resolveGuideGenerationProfile({
                  networkType: handoffContext.networkType ?? networkType,
                  guideType: handoffContext.guideType,
                  prompt: handoffContext.prompt,
                  hubName: handoffContext.hubName,
                  collectionName: handoffContext.collectionName,
                })
                return (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                      <p className="text-xs font-semibold text-foreground">
                        {handoffContext.source === "launch_plan_priority_guide"
                          ? "Creating from Launch Plan"
                          : "Creating from Starter Guide Idea"}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {handoffContext.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {handoffContext.hubName} › {handoffContext.collectionName}
                      {handoffContext.guideType ? ` · ${handoffContext.guideType}` : ""}
                      {handoffContext.difficulty ? ` · ${handoffContext.difficulty}` : ""}
                    </p>
                    {profile.id !== "general" && (
                      <p className="text-[11px] text-muted-foreground/80">
                        Generation profile: {profile.label}
                      </p>
                    )}
                    {handoffContext.reason && (
                      <p className="text-xs text-muted-foreground/80 italic leading-snug">
                        {handoffContext.reason}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 pt-1 border-t border-primary/15">
                      Review before generating. Nothing is saved until you send to editor.
                    </p>
                  </div>
                )
              })()}
              {handoffBanner && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {handoffBanner}
                </div>
              )}
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
                  Your prompt is the source of truth — it is never changed. Suggest Structure fills in guide type, difficulty, hub, and collection from your prompt.
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
                    Suggest Structure
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

              {/* Generation mode selector */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Generation Mode
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <Button
                      variant={generationMode === "mock" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGenerationMode("mock")}
                      className="shrink-0"
                    >
                      Mock Preview
                    </Button>
                    <p className="text-xs text-muted-foreground pt-1">Local generation — instant, no API key needed.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Button
                      variant={generationMode === "ai" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGenerationMode("ai")}
                      className="shrink-0"
                    >
                      AI Generate
                    </Button>
                    <p className="text-xs text-muted-foreground pt-1">Calls OpenAI — requires <code className="font-mono">OPENAI_API_KEY</code> on the server.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
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
                  {!selectedHubId && !selectedCollectionId
                    ? "Select a hub and collection above to enable generation."
                    : !selectedHubId
                      ? "Select a hub above to enable generation."
                      : "Select a collection above to enable generation."}
                </p>
              )}
            </Card>
          </div>

          {/* Right: preview */}
          <div className="space-y-5">
            <div>
              <h2 className="text-lg md:text-xl font-bold">Generated Draft Preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the generated guide structure before sending to editor.
              </p>
            </div>

            {session ? (
              <>
                {session.status === "generating" && (
                  <Card className="border-border/50 p-6 text-center">
                    <Flame className="mx-auto mb-3 size-8 text-primary animate-spin" />
                    <p className="text-muted-foreground">Generating guide...</p>
                  </Card>
                )}

                {session.status === "done" && session.response ? (
                  <div className="space-y-4">
                    {session.response.success ? (
                      <>
                        {/* Guide summary card */}
                        <Card className="border-border/50 p-4 md:p-5 space-y-3">
                          <div>
                            <p className="font-semibold text-foreground leading-snug">
                              {session.response.guide.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {session.response.guide.sections?.length ?? 0} sections ·{" "}
                              {session.response.guide.estimatedMinutes ?? "—"} min ·{" "}
                              <span className="capitalize">{session.response.guide.difficulty}</span>
                            </p>
                          </div>
                          {session.response.guide.summary && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {session.response.guide.summary}
                            </p>
                          )}
                          {/* Section list */}
                          {(session.response.guide.sections ?? []).length > 0 && (
                            <ol className="space-y-2">
                              {session.response.guide.sections.map((sec: any, i: number) => (
                                <li key={i} className="flex gap-3 items-start">
                                  <span className="text-xs font-bold text-muted-foreground/50 tabular-nums shrink-0 mt-0.5 w-5 text-right">
                                    {i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground leading-snug">{sec.title}</p>
                                    {sec.body && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sec.body}</p>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          )}
                        </Card>

                        <Button
                          onClick={handleSendToEditor}
                          disabled={!session?.response?.guide || isSending}
                          className="w-full"
                          size="lg"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                              Saving to Editor...
                            </>
                          ) : (
                            "Send to Editor"
                          )}
                        </Button>

                        {sendError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-4">
                            <p className="text-sm text-red-700 dark:text-red-400">{sendError}</p>
                          </div>
                        )}

                        {/* Raw JSON for devs — collapsed by default */}
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 select-none">
                            <Copy className="size-3" aria-hidden="true" />
                            View raw JSON
                          </summary>
                          <div className="mt-2 flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Guide JSON</span>
                            <Button size="sm" variant="ghost" onClick={handleCopyJson} className="h-6 px-2 text-xs gap-1">
                              {copiedId === "json" ? <Check className="size-3" /> : <Copy className="size-3" />}
                              {copiedId === "json" ? "Copied" : "Copy"}
                            </Button>
                          </div>
                          <div className="bg-muted/30 rounded border border-border/50 p-3 overflow-x-auto max-h-64 overflow-y-auto font-mono text-xs text-foreground">
                            <pre>{JSON.stringify(session.response.guide, null, 2)}</pre>
                          </div>
                        </details>
                      </>
                    ) : (
                      <Card className="border-red-200/50 bg-red-500/5 p-6">
                        <div className="text-center">
                          <p className="text-red-600 dark:text-red-400 font-semibold mb-1">Generation failed</p>
                          <p className="text-muted-foreground text-xs">{session.response.error}</p>
                        </div>
                      </Card>
                    )}
                  </div>
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
                <p className="text-sm text-muted-foreground">
                  Describe your guide above and click{" "}
                  <strong>{generationMode === "mock" ? "Generate Mock Guide" : "Generate AI Guide"}</strong>{" "}
                  to preview the structure.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
