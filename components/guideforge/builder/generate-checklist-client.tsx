"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { ChecklistIntakeRequest, GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import type { GenerationProvider } from "@/lib/guideforge/ai-generation-types"
import { generateChecklist } from "@/lib/guideforge/ai-generation-client"
import { StructuredAssetProposal } from "./structured-asset-proposal"

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

  const [isGenerating, setIsGenerating] = useState(false)
  const [proposal, setProposal] = useState<GeneratedChecklist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<GenerationProvider>("mock")
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null)

  // On mount, check for pending proposal in sessionStorage and restore if valid
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('guideforge.pendingAssetProposal')
      if (!pending) {
        console.log('[v0] GenerateChecklistClient: No pending proposal in sessionStorage')
        return
      }

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
        return
      }

      // Check if proposal is recent (max 2 hours old)
      const createdAt = new Date(parsed.createdAt)
      const now = new Date()
      const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
      
      if (ageMinutes > 120) {
        console.log('[v0] GenerateChecklistClient: Pending proposal expired (age:', ageMinutes, 'minutes)')
        sessionStorage.removeItem('guideforge.pendingAssetProposal')
        return
      }

      // Restore the proposal
      console.log('[v0] GenerateChecklistClient: Restoring pending proposal (age:', ageMinutes.toFixed(1), 'minutes)', {
        assetType: parsed.assetType,
        returnRoute: parsed.returnRoute,
      })
      
      setProposal(parsed.asset as GeneratedChecklist)
      setRestoredMessage('We restored your unsaved proposal after sign-in.')
    } catch (err) {
      console.warn('[v0] GenerateChecklistClient: Failed to restore pending proposal:', err instanceof Error ? err.message : String(err))
      try {
        sessionStorage.removeItem('guideforge.pendingAssetProposal')
      } catch (_) {
        // ignore
      }
    }
  }, [])

  const handleFieldChange = (field: keyof ChecklistIntakeRequest, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  /**
   * Check AI route configuration without calling OpenAI.
   * Developer-only diagnostic tool for debugging timeouts.
   */
  const handleCheckAiRouteConfig = async () => {
    setError(null)
    console.log("[v0] Developer: Checking AI route configuration...")
    
    try {
      const response = await fetch("/api/guideforge/generate-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosticOnly: true }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] Diagnostic request failed:", errorData)
        setError("Diagnostic request failed: " + response.statusText)
        return
      }
      
      const data = await response.json()
      console.log("[v0] AI Route Config (diagnostic):", {
        routeVersion: data.routeVersion,
        model: data.model,
        maxTokens: data.maxTokens,
        maxRepairAttempts: data.maxRepairAttempts,
        maxSectionsAiMvp: data.maxSectionsAiMvp,
        maxItemsAiMvp: data.maxItemsAiMvp,
        openaiRequestTimeoutMs: data.openaiRequestTimeoutMs,
        runtime: data.runtime,
        maxDuration: data.maxDuration,
        timestamp: data.timestamp,
      })
      
      setError(null)
      alert(
        `AI Route Config:\n\n` +
        `Version: ${data.routeVersion}\n` +
        `Model: ${data.model}\n` +
        `Max Tokens: ${data.maxTokens}\n` +
        `Repair Attempts: ${data.maxRepairAttempts}\n` +
        `AI MVP Caps: ${data.maxSectionsAiMvp} sections, ${data.maxItemsAiMvp} items\n` +
        `OpenAI Timeout: ${data.openaiRequestTimeoutMs}ms\n` +
        `Max Duration: ${data.maxDuration}s\n` +
        `Timestamp: ${data.timestamp}\n\n` +
        `(See console for full details)`
      )
    } catch (err) {
      console.error("[v0] Error checking AI route config:", err)
      setError(err instanceof Error ? err.message : "Failed to check config")
    }
  }

  /**
   * Run full AI generation in debug mode (no save).
   * Developer tool to debug the complete generation pipeline.
   */
  const handleDebugFullGeneration = async () => {
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
      console.log("[v0] Developer: Starting debug full generation...")
      
      const response = await fetch("/api/guideforge/generate-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          debugGenerateOnly: true,
        }),
      })

      let data: any
      try {
        data = await response.json()
      } catch (parseErr) {
        console.error("[v0] Failed to parse debug response")
        setError("Failed to parse debug response")
        setIsGenerating(false)
        return
      }

      console.log("[v0] Debug full generation response:", {
        success: data.success,
        stage: data.stage,
        elapsedMs: data.elapsedMs,
        openaiElapsedMs: data.openaiElapsedMs,
        model: data.model,
        promptLength: data.promptLength,
        contentLength: data.contentLength,
        parseOk: data.parseOk,
        schemaOk: data.schemaOk,
        qualityOk: data.qualityOk,
        error: data.error,
        detail: data.detail,
      })

      if (data.success) {
        alert(
          `Debug Full Generation - Success!\n\n` +
          `Total Elapsed: ${data.elapsedMs}ms\n` +
          `OpenAI Elapsed: ${data.openaiElapsedMs}ms\n` +
          `Model: ${data.model}\n` +
          `Prompt Length: ${data.promptLength} chars\n` +
          `Content Length: ${data.contentLength} chars\n\n` +
          `(Checks completed: Parse, Schema, Quality)\n` +
          `(Not saved - debug only)`
        )
      } else {
        alert(
          `Debug Full Generation - Failed at ${data.stage}\n\n` +
          `Total Elapsed: ${data.elapsedMs}ms\n` +
          `OpenAI Elapsed: ${data.openaiElapsedMs || "N/A"}ms\n` +
          `Model: ${data.model}\n` +
          `Prompt Length: ${data.promptLength} chars\n` +
          `Content Length: ${data.contentLength || "N/A"} chars\n\n` +
          `Error: ${data.error}\n` +
          `Detail: ${data.detail || "N/A"}\n\n` +
          `(See console for full details)`
        )
      }
    } catch (err) {
      console.error("[v0] Debug full generation error:", err)
      setError(err instanceof Error ? err.message : "Debug failed")
    } finally {
      setIsGenerating(false)
    }
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
      // Clamp values to validation limits before generation
      const clampedRequest = {
        ...formState,
        numberOfSections: Math.max(1, Math.min(8, formState.numberOfSections)),
        itemsPerSection: Math.max(1, Math.min(12, formState.itemsPerSection)),
      }

      // Show message if values were adjusted
      if (
        clampedRequest.numberOfSections !== formState.numberOfSections ||
        clampedRequest.itemsPerSection !== formState.itemsPerSection
      ) {
        console.log("[v0] Clamped generation request sizes:", {
          original: { sections: formState.numberOfSections, items: formState.itemsPerSection },
          clamped: { sections: clampedRequest.numberOfSections, items: clampedRequest.itemsPerSection },
        })
      }

      const response = await generateChecklist(clampedRequest, provider)
      if (!response.success) {
        throw new Error(response.error || "Generation failed")
      }
      setProposal(response.asset as GeneratedChecklist)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Checklist generation error:", err)
      
      // Clean up technical error messages for display
      let displayError = msg
      if (msg.includes("Generation error:")) {
        // Remove "Generation error: " prefix for cleaner display
        displayError = msg.replace("Generation error: ", "")
      }
      if (msg.includes("Unexpected token")) {
        displayError = "AI generation failed. The server returned an invalid response."
      }
      
      setError(displayError)
    } finally {
      setIsGenerating(false)
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
                  <p className="text-xs text-muted-foreground">Real AI powered (~5-10 seconds)</p>
                </div>
              </div>
            </button>
          </div>

          {provider === "ai" && (
            <Card className="border-amber-500/30 bg-amber-500/5 p-2">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Requires OPENAI_API_KEY. If not configured, generation will fail with a clear error.
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
                  <SelectItem value="formal">Formal & compliance-focused</SelectItem>
                  <SelectItem value="casual">Casual & friendly</SelectItem>
                  <SelectItem value="technical">Technical & detailed</SelectItem>
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
              <p className="text-xs text-muted-foreground">Max 8 sections {provider === "ai" ? "(AI capped at 4 for MVP speed)" : ""}</p>
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
              <p className="text-xs text-muted-foreground">Max 12 items per section {provider === "ai" ? "(AI capped at 5 for MVP speed)" : ""}</p>
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

        {/* Helper Copy */}
        {provider === "ai" && (
          <Card className="p-3 border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Larger generations (8+ sections, 12+ items per section) may take longer. Typical generation: 5-10 seconds.
            </p>
          </Card>
        )}

        {/* Submit and Debug */}
        <div className="flex gap-2">
          <Button size="lg" disabled={isGenerating} className="flex-1" onClick={handleGenerate}>
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
          
          {/* Developer diagnostic button (only shown in AI mode) */}
          {provider === "ai" && (
            <>
              <Button 
                size="lg" 
                variant="outline" 
                disabled={isGenerating}
                onClick={handleCheckAiRouteConfig}
                title="Check AI route configuration (no cost)"
              >
                ⚙️
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                disabled={isGenerating}
                onClick={handleDebugFullGeneration}
                title="Debug full generation pipeline (1 OpenAI call, not saved)"
              >
                🐛
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
