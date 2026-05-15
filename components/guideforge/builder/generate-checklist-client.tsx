"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Bug, CheckCircle2, Loader2, Sparkles, XCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { ChecklistIntakeRequest, GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import type { GenerationProvider } from "@/lib/guideforge/ai-generation-types"
import { getCurrentUserProfile } from "@/lib/guideforge/supabase-profiles"
import { canUseDebugTools } from "@/lib/guideforge/role-capabilities"
import { readIntakeSession, clearIntakeSession } from "@/lib/guideforge/intake-session"
import { parseRoughIdea } from "@/lib/guideforge/intake-field-parser"
import { generateGuideForgeDraft } from "@/lib/guideforge/ai-builder-core"
import { StructuredAssetProposal } from "./structured-asset-proposal"
import { AIIntakeLadder } from "./ai-intake-ladder"

/**
 * Checklist client component with pending proposal restore support.
 * On mount, checks sessionStorage for guideforge.pendingAssetProposal and restores if valid.
 */
export function GenerateChecklistClient() {
  const [formState, setFormState] = useState<ChecklistIntakeRequest>({
    title: "",
    audience: "",
    purpose: "",
    tone: "practical",
    goal: "",
    numberOfSections: 3,
    itemsPerSection: 5,
    useCase: "",
    optionalContext: "",
  })

  const [prompt, setPrompt] = useState("")
  const [quickFillFeedback, setQuickFillFeedback] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [proposal, setProposal] = useState<GeneratedChecklist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<GenerationProvider>("mock")
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const [debugResult, setDebugResult] = useState<Record<string, any> | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)
  const [canSeeDebugTools, setCanSeeDebugTools] = useState(false)
  const [importedIdea, setImportedIdea] = useState<string>("")

  // On mount, check for pending proposal AND intake session from welcome
  useEffect(() => {
    // First, try to restore pending proposal from auth/sign-in
    try {
      const pending = sessionStorage.getItem('guideforge.pendingAssetProposal')
      if (pending) {
        const parsed = JSON.parse(pending)
        
        // Validate the pending proposal
        const isValid =
          parsed &&
          parsed.asset &&
          parsed.assetType === 'checklist' &&
          parsed.createdAt &&
          parsed.returnRoute
        
        if (!isValid) {
          console.warn('[v0] GenerateChecklistClient: Pending proposal failed validation', parsed)
          sessionStorage.removeItem('guideforge.pendingAssetProposal')
        } else {
          // Check if proposal is recent (max 2 hours old)
          const createdAt = new Date(parsed.createdAt)
          const now = new Date()
          const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
          
          if (ageMinutes <= 120) {
            console.log('[v0] GenerateChecklistClient: Restoring pending proposal')
            setProposal(parsed.asset as GeneratedChecklist)
            setRestoredMessage('We restored your unsaved proposal after sign-in.')
            return
          } else {
            sessionStorage.removeItem('guideforge.pendingAssetProposal')
          }
        }
      }
    } catch (err) {
      console.warn('[v0] GenerateChecklistClient: Failed to restore pending proposal:', err instanceof Error ? err.message : String(err))
    }

    // Second, check for intake session from welcome intake panel
    const intakeSession = readIntakeSession()
    if (intakeSession.idea) {
      console.log('[v0] GenerateChecklistClient: Hydrating from welcome intake')
      
      // Store the original idea for AIIntakeLadder to display
      setImportedIdea(intakeSession.idea)
      
      // Parse the rough idea to extract structured fields
      const parsed = parseRoughIdea(intakeSession.idea)
      
      // Prefill form fields with both parsed data and router suggestions
      setFormState((prev) => {
        const updated = { ...prev }
        
        // Only prefill empty fields
        if (!prev.title) {
          updated.title = intakeSession.routerResult?.suggestedTitle || parsed.title || ""
        }
        if (!prev.useCase) {
          updated.useCase = intakeSession.idea
        }
        if (!prev.audience && parsed.audience) {
          updated.audience = parsed.audience
        }
        if (!prev.purpose && parsed.purpose) {
          updated.purpose = parsed.purpose
        } else if (!prev.purpose && intakeSession.routerResult?.detectedIntent) {
          updated.purpose = intakeSession.routerResult.detectedIntent
        }
        if (!prev.goal && parsed.goal) {
          updated.goal = parsed.goal
        }
        if (!prev.optionalContext && parsed.optionalContext) {
          updated.optionalContext = parsed.optionalContext
        }
        if (!prev.tone && parsed.tone) {
          updated.tone = parsed.tone
        }
        if (parsed.numberOfSections && parsed.numberOfSections > 0) {
          updated.numberOfSections = Math.max(1, Math.min(5, parsed.numberOfSections))
        }
        if (parsed.itemsPerSection && parsed.itemsPerSection > 0) {
          updated.itemsPerSection = Math.max(1, Math.min(10, parsed.itemsPerSection))
        }
        
        return updated
      })
      
      setRestoredMessage('Imported from your welcome prompt.')
      
      // Clear intake session after hydration
      clearIntakeSession()
    }
  }, [])

  // Check user profile role to determine if debug tools should be visible
  useEffect(() => {
    const checkDebugAccess = async () => {
      try {
        const profile = await getCurrentUserProfile()
        const hasAccess = canUseDebugTools(profile?.role)
        setCanSeeDebugTools(hasAccess)
      } catch (err) {
        console.log('[v0] GenerateChecklistClient: Could not check debug access:', err instanceof Error ? err.message : String(err))
        setCanSeeDebugTools(false)
      }
    }

    checkDebugAccess()
  }, [])

  const handleFieldChange = (field: keyof ChecklistIntakeRequest, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  /**
   * Called by AIIntakeLadder (Quick Fill or Smart Fill) to merge detected
   * fields into the checklist form state. Numeric fields are clamped to the
   * form's own validation limits so the generate button never receives
   * out-of-range values.
   * 
   * IMPORTANT: Never erase the original prompt when filling fields.
   */
  const handleApplyIntakeLadderFields = (fields: Partial<ChecklistIntakeRequest>) => {
    setFormState((prev) => ({
      ...prev,
      ...fields,
      // Clamp to safe generation defaults (max 5 sections, max 5 items per section).
      // The user can still manually increase these in the form after filling.
      numberOfSections:
        fields.numberOfSections !== undefined
          ? Math.max(1, Math.min(5, Number(fields.numberOfSections)))
          : prev.numberOfSections,
      itemsPerSection:
        fields.itemsPerSection !== undefined
          ? Math.max(1, Math.min(5, Number(fields.itemsPerSection)))
          : prev.itemsPerSection,
    }))
    // Show feedback that fields were filled from the prompt
    setQuickFillFeedback("Fields filled from your prompt")
    // Clear feedback after 5 seconds
    setTimeout(() => setQuickFillFeedback(null), 5000)
    setError(null)
  }

  const handleGenerate = async () => {
    setError(null)

    if (!formState.title.trim()) {
      setError("Please enter a checklist title")
      return
    }
    if (!formState.audience.trim()) {
      setError("Please specify the intended audience")
      return
    }
    if (!formState.goal.trim()) {
      setError("Please describe the checklist goal")
      return
    }
    if (!formState.purpose.trim()) {
      setError("Please describe the checklist purpose")
      return
    }

    setIsGenerating(true)
    try {
      // Call shared AI Builder Core with the prompt
      const result = await generateGuideForgeDraft({
        kind: "checklist_asset",
        mode: provider === "mock" ? "mock" : "ai",
        prompt: prompt || formState.useCase || formState.goal,
        formData: formState,
      })

      if (!result.success) {
        throw new Error(result.error || "Generation failed")
      }

      // Extract checklist from result
      const checklist = result.structuredPayload as any
      setProposal(checklist)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Checklist generation error:", err)
      
      // Clean up technical error messages for display
      let displayError = msg
      if (msg.includes("Generation error:")) {
        displayError = msg.replace("Generation error: ", "")
      }
      if (msg.includes("Unexpected token")) {
        displayError = "AI generation failed. The server returned an invalid response."
      }
      if (msg.includes("timeout") || msg.includes("took too long") || msg.includes("AbortError")) {
        displayError = "AI generation took too long. Try again, switch to Mock Preview, or reduce the checklist size."
      }
      
      setError(displayError)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Debug Full Generation
   *
   * Calls POST /api/guideforge/generate-checklist?debug=true with the same
   * form payload as normal AI generation. The server walks through each
   * generation stage (body_parse -> input_clamp -> prompt_build ->
   * message_build -> api_key_check -> openai_call -> parse ->
   * schema_validation -> quality_validation) and returns a structured
   * diagnostic object instead of throwing on the first failure.
   *
   * The server route declares all debug tracking variables BEFORE its
   * try/catch block, so this path is immune to the
   * "Cannot access 'i' before initialization" TDZ error that occurred
   * in the previous minified build.
   */
  const handleDebugFullGeneration = async () => {
    setDebugError(null)
    setDebugResult(null)

    if (!formState.title.trim() || !formState.audience.trim() || !formState.goal.trim() || !formState.purpose.trim()) {
      setDebugError("Please fill in title, audience, goal, and purpose before running debug.")
      return
    }

    setIsDebugging(true)
    try {
      const clampedRequest = {
        ...formState,
        numberOfSections: Math.max(1, Math.min(8, formState.numberOfSections)),
        itemsPerSection: Math.max(1, Math.min(12, formState.itemsPerSection)),
      }

      console.log("[v0] Debug Full Generation: POST /api/guideforge/generate-checklist?debug=true")

      const response = await fetch("/api/guideforge/generate-checklist?debug=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clampedRequest),
      })

      const responseText = await response.text()
      let data: Record<string, any>
      try {
        data = JSON.parse(responseText)
      } catch (parseErr) {
        console.error("[v0] Debug: Failed to parse response as JSON:", parseErr)
        setDebugError(`Server returned non-JSON response (status ${response.status}). First 200 chars: ${responseText.substring(0, 200)}`)
        return
      }

      console.log("[v0] Debug result:", data)
      setDebugResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Debug request error:", err)
      setDebugError(`Debug request failed: ${msg}`)
    } finally {
      setIsDebugging(false)
    }
  }

  if (proposal) {
    return <StructuredAssetProposal asset={proposal} onBack={() => {
      setProposal(null)
      setRestoredMessage(null)
    }} />
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/builder/generate-asset">
          <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
          Back to Asset Types
        </Link>
      </Button>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Generate Checklist</h1>
        <p className="text-base text-muted-foreground">
          Describe the checklist you want to create, and we'll generate a structured draft.
        </p>
        <Card className="p-3 border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This creates a structured draft checklist. Nothing is published automatically.
          </p>
        </Card>

        {restoredMessage && (
          <Card className="p-3 border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {restoredMessage}
            </p>
          </Card>
        )}
      </div>

      {/* AI Intake Ladder — Smart Fill / Quick Fill */}
      <AIIntakeLadder
        assetType="checklist"
        onApplyFields={(fields) =>
          handleApplyIntakeLadderFields(fields as Partial<ChecklistIntakeRequest>)
        }
        initialIdea={prompt || importedIdea}
      />

      {quickFillFeedback && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {quickFillFeedback}
          </p>
        </Card>
      )}

      {/* Main Prompt — Always visible, never erased by Quick Fill */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="prompt" className="font-semibold">Describe Your Checklist</Label>
          <p className="text-xs text-muted-foreground mt-1">This is your source of truth. Quick Fill and Smart Fill will read this to fill form fields.</p>
        </div>
        <Textarea
          id="prompt"
          placeholder="Example: Create a pre-launch checklist for mobile app releases. Should help the QA team, product managers, and devs prepare the marketing materials, run final tests, coordinate with analytics, and deploy."
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            setError(null)
          }}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleGenerate()
        }}
        className="space-y-6"
      >
        {error && (
          <Card className="border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </Card>
        )}

        {/* Generation Mode Selection */}
        <div className="space-y-3 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <h2 className="font-semibold text-foreground">Generation Mode</h2>
          <p className="text-xs text-muted-foreground">Choose how you'd like your checklist generated:</p>
          
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setProvider("mock")}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                provider === "mock"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                <Sparkles className={`mt-0.5 size-4 shrink-0 ${provider === "mock" ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">Mock Preview</p>
                  <p className="text-xs text-muted-foreground">Fast generation for testing (~1 second)</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProvider("ai")}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                provider === "ai"
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-2">
                <Zap className={`mt-0.5 size-4 shrink-0 ${provider === "ai" ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-sm">AI Generate</p>
                  <p className="text-xs text-muted-foreground">Real AI powered (~10-25 seconds)</p>
                </div>
              </div>
            </button>
          </div>

          {provider === "ai" && (
            <Card className="border-amber-500/30 bg-amber-500/5 p-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                AI generation may take 10&ndash;25 seconds. If generation fails, try a smaller checklist or use Mock Preview.
              </p>
            </Card>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Basic Information</h2>

          <div className="space-y-2">
            <Label htmlFor="title">Checklist Title</Label>
            <Input
              id="title"
              placeholder="e.g., Pre-Launch Deployment Checklist"
              value={formState.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Intended Audience</Label>
            <Input
              id="audience"
              placeholder="e.g., DevOps engineers, Project leads"
              value={formState.audience}
              onChange={(e) => handleFieldChange("audience", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Checklist Purpose</Label>
            <Textarea
              id="purpose"
              placeholder="What is the checklist used for? Why is it needed?"
              value={formState.purpose}
              onChange={(e) => handleFieldChange("purpose", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Checklist Goal</Label>
            <Input
              id="goal"
              placeholder="e.g., Ensure nothing is missed before launching"
              value={formState.goal}
              onChange={(e) => handleFieldChange("goal", e.target.value)}
            />
          </div>
        </div>

        {/* Use Case & Style */}
        <div className="space-y-4 pb-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Use Case & Style</h2>

          <div className="space-y-2">
            <Label htmlFor="useCase">Use Case / Context</Label>
            <Input
              id="useCase"
              placeholder="e.g., Production deployments, Quality assurance, Team onboarding"
              value={formState.useCase}
              onChange={(e) => handleFieldChange("useCase", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={formState.tone} onValueChange={(v) => handleFieldChange("tone", v)}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practical">Practical & straightforward</SelectItem>
                  <SelectItem value="helpful">Helpful & friendly</SelectItem>
                  <SelectItem value="beginner-friendly">Beginner-friendly</SelectItem>
                  <SelectItem value="technical">Technical & precise</SelectItem>
                  <SelectItem value="detailed">Detailed & thorough</SelectItem>
                  <SelectItem value="minimal">Quick & minimal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sections">Number of Sections</Label>
              <Input
                id="sections"
                type="number"
                min="1"
                max="8"
                value={formState.numberOfSections}
                onChange={(e) => handleFieldChange("numberOfSections", Math.min(8, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">Max 8 sections</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="items">Items per Section</Label>
              <Input
                id="items"
                type="number"
                min="1"
                max="12"
                value={formState.itemsPerSection}
                onChange={(e) => handleFieldChange("itemsPerSection", Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">Max 12 items per section</p>
            </div>
          </div>
        </div>

        {/* Optional Context */}
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea
            id="context"
            placeholder="Any domain-specific details, team roles, or constraints we should know?"
            value={formState.optionalContext}
            onChange={(e) => handleFieldChange("optionalContext", e.target.value)}
            rows={3}
          />
        </div>

        {/* Repeatable Checklist Coming Soon */}
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            ✨ <span className="font-semibold">Repeatable Checklists Coming Soon</span>
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Soon you'll be able to mark checklists as repeatable, set recurrence rules (daily, weekly), 
            track completion history, and build habit streaks. Perfect for routines, recurring tasks, and habit tracking.
          </p>
        </Card>

        {/* Helper Copy */}
        {provider === "ai" && (
          <Card className="p-3 border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Larger generations (8+ sections, 12+ items per section) may take longer. Typical generation: 10-25 seconds.
            </p>
          </Card>
        )}

        {/* Submit */}
        <Button size="lg" disabled={isGenerating || isDebugging} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {provider === "mock" ? "Generating Mock Checklist..." : "Generating with AI..."}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              {provider === "mock" ? "Generate Mock Checklist" : "Generate AI Checklist"}
            </>
          )}
        </Button>

        {/* Debug Tools — only visible to dev/admin/founder accounts in AI Generate mode */}
        {provider === "ai" && canSeeDebugTools && (
          <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2">
              <Bug className="size-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">Debug Tools</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Run the AI pipeline with stage-by-stage diagnostics. Calls{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                POST /api/guideforge/generate-checklist?debug=true
              </code>{" "}
              with the same payload as normal generation.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDebugFullGeneration}
              disabled={isGenerating || isDebugging}
              className="w-full"
            >
              {isDebugging ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Running debug pipeline...
                </>
              ) : (
                <>
                  <Bug className="mr-2 size-4" aria-hidden="true" />
                  Debug Full Generation
                </>
              )}
            </Button>

            {debugError && (
              <Card className="border-red-500/30 bg-red-500/5 p-3">
                <p className="text-xs text-red-700 dark:text-red-300">{debugError}</p>
              </Card>
            )}

            {debugResult && (
              <Card
                className={`p-3 ${
                  debugResult.success
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {debugResult.success ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    )}
                    <p
                      className={`text-xs font-semibold ${
                        debugResult.success
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {debugResult.success ? "Debug pipeline succeeded" : "Debug pipeline failed"}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    {typeof debugResult.stage === "string" && (
                      <>
                        <dt className="text-muted-foreground">Stage</dt>
                        <dd className="font-mono text-foreground">{debugResult.stage}</dd>
                      </>
                    )}
                    {typeof debugResult.elapsedMs === "number" && (
                      <>
                        <dt className="text-muted-foreground">Elapsed</dt>
                        <dd className="font-mono text-foreground">{debugResult.elapsedMs} ms</dd>
                      </>
                    )}
                    {typeof debugResult.openaiElapsedMs === "number" && (
                      <>
                        <dt className="text-muted-foreground">OpenAI elapsed</dt>
                        <dd className="font-mono text-foreground">{debugResult.openaiElapsedMs} ms</dd>
                      </>
                    )}
                    {typeof debugResult.model === "string" && (
                      <>
                        <dt className="text-muted-foreground">Model</dt>
                        <dd className="font-mono text-foreground">{debugResult.model}</dd>
                      </>
                    )}
                    {typeof debugResult.promptLength === "number" && (
                      <>
                        <dt className="text-muted-foreground">Prompt length</dt>
                        <dd className="font-mono text-foreground">{debugResult.promptLength}</dd>
                      </>
                    )}
                    {typeof debugResult.contentLength === "number" && (
                      <>
                        <dt className="text-muted-foreground">Response length</dt>
                        <dd className="font-mono text-foreground">{debugResult.contentLength}</dd>
                      </>
                    )}
                    {typeof debugResult.apiKeyPresent === "boolean" && (
                      <>
                        <dt className="text-muted-foreground">API key present</dt>
                        <dd className="font-mono text-foreground">{String(debugResult.apiKeyPresent)}</dd>
                      </>
                    )}
                    {typeof debugResult.apiKeyMasked === "string" && (
                      <>
                        <dt className="text-muted-foreground">API key</dt>
                        <dd className="font-mono text-foreground">{debugResult.apiKeyMasked}</dd>
                      </>
                    )}
                  </dl>

                  {typeof debugResult.error === "string" && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Error:</span> {debugResult.error}
                    </p>
                  )}

                  {Array.isArray(debugResult.schemaValidErrors) && debugResult.schemaValidErrors.length > 0 && (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <p className="font-semibold">Schema errors:</p>
                      <ul className="list-disc pl-4">
                        {debugResult.schemaValidErrors.map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(debugResult.qualityValidErrors) && debugResult.qualityValidErrors.length > 0 && (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      <p className="font-semibold">Quality errors:</p>
                      <ul className="list-disc pl-4">
                        {debugResult.qualityValidErrors.map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
