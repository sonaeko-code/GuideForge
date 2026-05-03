"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Flame, ChevronRight, Copy, Check, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SiteHeader } from "@/components/guideforge/site-header"
import type {
  GenerationRequest,
  GenerationResponse,
  GenerationSession,
} from "@/lib/guideforge/generation-schemas"
import { generateMockResponse } from "@/lib/guideforge/mock-generator"
import { createAndSaveGuideDraft } from "@/lib/guideforge/create-and-save-guide-draft"
import type { GuideType, DifficultyLevel } from "@/lib/guideforge/types"
import {
  getNetworkById,
  getHubsByNetwork,
  getCollectionsByHub,
} from "@/lib/guideforge/mock-data"

export default function GeneratorPage({
  params,
}: {
  params: Promise<{ networkId: string }>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedHubFromQuery = searchParams?.get("hub") ?? ""
  const preselectedCollectionFromQuery = searchParams?.get("collection") ?? ""

  const [networkId, setNetworkId] = useState<string>("")
  const [session, setSession] = useState<GenerationSession | null>(null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    preselectedCollectionFromQuery
  )
  const [formState, setFormState] = useState<GenerationRequest>({
    prompt: "",
    guideType: "character-build",
    preferredDifficulty: "intermediate",
    targetHubId: preselectedHubFromQuery || undefined,
  })
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Load network on mount
  useEffect(() => {
    const loadNetwork = async () => {
      const params_resolved = await params
      setNetworkId(params_resolved.networkId)
    }
    loadNetwork()
  }, [params])

  const network = networkId ? getNetworkById(networkId) : null
  const hubs = network ? getHubsByNetwork(network.id) : []
  
  // Get all collections from all hubs for pre-check
  const allCollections = hubs.flatMap((hub) => getCollectionsByHub(hub.id))

  // Get collections scoped to selected hub
  const collectionsForHub = formState.targetHubId
    ? getCollectionsByHub(formState.targetHubId)
    : []

  // Auto-preselect hub if there's only one
  useEffect(() => {
    if (hubs.length === 1 && !formState.targetHubId) {
      console.log("[v0] Auto-preselecting single hub:", hubs[0].id)
      setFormState((prev) => ({ ...prev, targetHubId: hubs[0].id }))
    }
  }, [hubs, formState.targetHubId])

  // Auto-preselect collection if there's only one in the selected hub
  useEffect(() => {
    if (collectionsForHub.length === 1 && !selectedCollectionId) {
      console.log("[v0] Auto-preselecting single collection:", collectionsForHub[0].id)
      setSelectedCollectionId(collectionsForHub[0].id)
    }
  }, [collectionsForHub, selectedCollectionId])

  // Reset collection selection when hub changes
  useEffect(() => {
    if (formState.targetHubId && collectionsForHub.length > 0) {
      const stillValid = collectionsForHub.some((c) => c.id === selectedCollectionId)
      if (!stillValid) {
        setSelectedCollectionId(collectionsForHub.length === 1 ? collectionsForHub[0].id : "")
      }
    }
  }, [formState.targetHubId, collectionsForHub, selectedCollectionId])

  const handleGenerateMock = async () => {
    if (!formState.prompt.trim()) {
      alert("Please enter a prompt")
      return
    }

    // Create session
    const sessionId = `session_${Date.now()}`
    setSession({
      id: sessionId,
      createdAt: new Date().toISOString(),
      request: formState,
      status: "generating",
    })

    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Generate mock response
    const response = generateMockResponse(formState)

    // Update session
    setSession((prev) =>
      prev ? { ...prev, response, status: "done" } : null
    )
  }

  const handleSendToEditor = async () => {
    if (!session?.response?.guide) {
      alert("No guide to send")
      return
    }

    if (!formState.targetHubId) {
      setSendError("Please select a hub before saving the guide.")
      return
    }

    if (!selectedCollectionId) {
      setSendError("Please select a collection before saving the guide.")
      return
    }

    // Validate collection belongs to selected hub (and therefore to the current network)
    const validCollection = collectionsForHub.some((c) => c.id === selectedCollectionId)
    if (!validCollection) {
      console.error("[v0] Collection does not belong to selected hub:", selectedCollectionId)
      setSendError("Selected collection does not belong to the chosen hub. Please reselect.")
      return
    }

    setIsSending(true)
    setSendError(null)
    try {
      console.log("[v0] handleSendToEditor started")
      const generatedGuide = session.response.guide

      console.log("[v0] Generated guide save target:", {
        networkId,
        hubId: formState.targetHubId,
        collectionId: selectedCollectionId,
      })

      const { id, verified, error } = await createAndSaveGuideDraft({
        title: generatedGuide.title,
        summary: generatedGuide.summary,
        guideType: formState.guideType,
        difficulty: generatedGuide.difficulty,
        networkId: networkId,
        hubId: formState.targetHubId,
        collectionId: selectedCollectionId,
        requirements: generatedGuide.requirements,
        warnings: generatedGuide.warnings,
        steps: generatedGuide.sections?.map((section) => ({
          title: section.title,
          body: section.body,
          kind: section.kind,
        })),
      })

      if (!verified) {
        console.error("[v0] handleSendToEditor: Verification failed:", error)
        setSendError(error || "Guide save verification failed. Please try again.")
        return
      }

      console.log("[v0] handleSendToEditor: Verification succeeded, redirecting to editor id:", id)

      // Redirect to guide editor using the current network from the route
      router.push(`/builder/network/${networkId}/guide/${id}/edit`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] Error in handleSendToEditor:", error)
      setSendError(`Could not save guide before opening editor: ${errorMsg}`)
    } finally {
      setIsSending(false)
    }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const handleCopyJson = () => {
    if (!session?.response?.guide) return
    const json = JSON.stringify(session.response.guide, null, 2)
    navigator.clipboard.writeText(json)
    setCopiedId("json")
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader hideCta />

      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        {/* Breadcrumb / Back navigation */}
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
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
          <span className="text-muted-foreground">{network?.name || "Network"}</span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-foreground font-semibold">Generate Guide</span>
        </nav>

        {/* Pre-check: Require hubs and collections */}
        {(hubs.length === 0 || allCollections.length === 0) && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5 p-5">
            {hubs.length === 0 ? (
              <>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  <strong>No hubs yet.</strong> You need at least one hub with collections before creating guides.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/builder/network/${networkId}/dashboard?tab=hubs`}>
                    Create Hub
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  <strong>No collections yet.</strong> Create at least one collection before generating guides.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/builder/network/${networkId}/dashboard?tab=collections`}>
                    Create Collection
                  </Link>
                </Button>
              </>
            )}
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Input Form */}
          {hubs.length > 0 && allCollections.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Generate a Guide</h1>
              <p className="mt-2 text-muted-foreground">
                Use AI to create structured guide data. Preview the JSON, then
                send to the editor for customization.
              </p>
            </div>

            {/* Form */}
            <Card className="border-border/50 p-6 space-y-4">
              {/* Guide Type */}
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Guide Type
                </label>
                <Select
                  value={formState.guideType}
                  onValueChange={(value) =>
                    setFormState({ ...formState, guideType: value as GuideType })
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
              {hubs.length > 0 && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Hub (Game)
                  </label>
                  <Select
                    value={formState.targetHubId || ""}
                    onValueChange={(value) =>
                      setFormState({
                        ...formState,
                        targetHubId: value || undefined,
                      })
                    }
                  >
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
              )}

              {/* Collection */}
              {formState.targetHubId && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Collection
                  </label>
                  {collectionsForHub.length === 0 ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                      <p className="mb-2">
                        <strong>No collections in this hub.</strong> Create a collection first.
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/builder/network/${networkId}/collection/new?hub=${formState.targetHubId}`}
                        >
                          Create Collection
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={selectedCollectionId}
                      onValueChange={(value) => setSelectedCollectionId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            collectionsForHub.length === 1
                              ? collectionsForHub[0].name
                              : "Select a collection"
                          }
                        />
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

              {/* Prompt */}
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

              {/* Forge Rules Context */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Forge Rules:</strong> The network's forge rules will
                  be applied as context to the generator.
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateMock}
                disabled={
                  session?.status === "generating" ||
                  !formState.targetHubId ||
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
              {(!formState.targetHubId || !selectedCollectionId) && (
                <p className="text-xs text-muted-foreground">
                  Select a hub and collection above to enable generation.
                </p>
              )}
            </Card>
          </div>
          ) : null}

          {/* Right: Preview Panel */}
          {hubs.length > 0 && (
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
                        {/* JSON Preview */}
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
                                <>
                                  <Check className="size-4" />
                                </>
                              ) : (
                                <>
                                  <Copy className="size-4" />
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="bg-muted/30 rounded border border-border/50 p-3 overflow-x-auto max-h-96 overflow-y-auto font-mono text-xs text-foreground">
                            <pre>
                              {JSON.stringify(
                                session.response.guide,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-primary/5 border border-primary/20 rounded p-3">
                          <p className="text-sm font-semibold mb-1">
                            {session.response.guide.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.response.guide.sections.length} sections •{" "}
                            {session.response.guide.estimatedMinutes} min read •{" "}
                            {session.response.guide.difficulty}
                          </p>
                        </div>

                        {/* Send to Editor */}
            <Button
              onClick={handleSendToEditor}
              disabled={!session?.response?.guide || isSending}
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Saving...
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
                  Fill out the form and click "Generate Mock Structured Guide"
                  to preview the output.
                </p>
              </Card>
            )}
          </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-12 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            <strong>TODO:</strong> This page uses mock generation. In production,
            it will call the OpenAI API (with your custom system prompt and forge
            rules), then persist the GeneratedGuide to Supabase before rendering
            the editor.
          </p>
        </div>
      </div>
    </main>
  )
}


