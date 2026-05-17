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
import { Checkbox } from "@/components/ui/checkbox"
import type { SingleGuideIntakeRequest, GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"
import type { GenerationProvider } from "@/lib/guideforge/ai-generation-types"
import { generateGuideForgeDraft } from "@/lib/guideforge/ai-builder-core"
import { readIntakeSession, clearIntakeSession } from "@/lib/guideforge/intake-session"
import { parseRoughIdea } from "@/lib/guideforge/intake-field-parser"
import { StructuredAssetProposal } from "./structured-asset-proposal"
import { AIIntakeLadder } from "./ai-intake-ladder"
import type { DifficultyLevel, GuideType } from "@/lib/guideforge/types"

/**
 * Single Guide Asset Builder — fully on AI Builder Core:
 *   prompt (purpose field) → AIIntakeLadder Quick/Smart Fill → form fields
 *   → generateGuideForgeDraft({ kind: "single_guide_asset", mode, formData })
 *   → StructuredAssetProposal → saveStructuredAssetToWorkspace()
 * The purpose field is the prompt. Quick Fill fills title/audience/goal from it; purpose stays editable.
 */
export function GenerateSingleGuideClient() {
  const [formState, setFormState] = useState<SingleGuideIntakeRequest>({
    title: "",
    audience: "",
    purpose: "",
    goal: "",
    useCase: "",
    tone: "helpful",
    difficulty: "intermediate",
    guideType: "guide",
    numberOfSteps: 5,
    hasWarnings: false,
    hasPrerequisites: false,
    optionalContext: "",
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [proposal, setProposal] = useState<GeneratedSingleGuide | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null)
  const [importedIdea, setImportedIdea] = useState<string>("")
  const [prompt, setPrompt] = useState("")
  const [quickFillFeedback, setQuickFillFeedback] = useState<string | null>(null)
  const [provider, setProvider] = useState<GenerationProvider>("ai")

  // On mount, check for intake session from welcome intake panel
  useEffect(() => {
    const intakeSession = readIntakeSession()
    if (intakeSession.idea) {
      console.log('[v0] GenerateSingleGuideClient: Hydrating from welcome intake')
      
      // Store the original idea for AIIntakeLadder to display
      setImportedIdea(intakeSession.idea)
      
      // Parse the rough idea to extract structured fields
      const parsed = parseRoughIdea(intakeSession.idea)
      
      // Prefill form fields with both parsed data and router suggestions
      setFormState((prev) => {
        const updated = { ...prev }
        
        // Only prefill empty fields to not overwrite user edits
        if (!prev.title) {
          updated.title = intakeSession.routerResult?.suggestedTitle || parsed.title || ""
        }
        if (!prev.useCase) {
          updated.useCase = intakeSession.idea
        }
        if (!prev.purpose && parsed.purpose) {
          updated.purpose = parsed.purpose
        } else if (!prev.purpose && intakeSession.routerResult?.detectedIntent) {
          updated.purpose = intakeSession.routerResult.detectedIntent
        }
        if (!prev.audience && parsed.audience) {
          updated.audience = parsed.audience
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
        if (!prev.difficulty && parsed.difficulty) {
          updated.difficulty = parsed.difficulty as DifficultyLevel
        }
        if (!prev.guideType && parsed.guideType) {
          updated.guideType = parsed.guideType as GuideType
        }
        if (parsed.numberOfSteps && parsed.numberOfSteps > 0) {
          updated.numberOfSteps = Math.max(1, Math.min(20, parsed.numberOfSteps))
        }
        if (parsed.hasWarnings) {
          updated.hasWarnings = true
        }
        if (parsed.hasPrerequisites) {
          updated.hasPrerequisites = true
        }
        
        return updated
      })
      
      setRestoredMessage('Imported from your welcome prompt.')
      
      // Clear intake session after hydration
      clearIntakeSession()
    }
  }, [])

  const handleFieldChange = (field: keyof SingleGuideIntakeRequest, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleApplyIntakeLadderFields = (fields: Partial<SingleGuideIntakeRequest>) => {
    setFormState((prev) => ({ ...prev, ...fields }))
    setQuickFillFeedback("Fields filled from your prompt")
    setTimeout(() => setQuickFillFeedback(null), 5000)
    // Scroll to form for visual feedback
    setTimeout(() => {
      const formElement = document.querySelector("form")
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 100)
  }

  const handleGenerate = async () => {
    setError(null)

    if (!formState.title.trim()) {
      setError("Please enter a guide title")
      return
    }
    if (!formState.audience.trim()) {
      setError("Please specify the intended audience")
      return
    }
    if (!formState.purpose.trim()) {
      setError("Please describe the guide purpose")
      return
    }

    setIsGenerating(true)
    try {
      const result = await generateGuideForgeDraft({
        kind: "single_guide_asset",
        mode: provider === "mock" ? "mock" : "ai",
        prompt: prompt || formState.useCase || formState.goal || "",
        formData: formState,
      })

      if (!result.success || !result.structuredPayload) {
        throw new Error(result.error || "Generation failed")
      }

      setProposal(result.structuredPayload as GeneratedSingleGuide)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(`Generation failed: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }

  if (proposal) {
    return <StructuredAssetProposal asset={proposal} onBack={() => setProposal(null)} />
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
        <h1 className="text-3xl font-bold tracking-tight">Generate Single Guide</h1>
        <p className="text-base text-muted-foreground">
          Describe the guide you want to create, and we'll generate a structured draft.
        </p>
        <Card className="p-3 border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This creates a structured draft guide. Nothing is published automatically.
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
      <AIIntakeLadder assetType="single_guide" onApplyFields={handleApplyIntakeLadderFields} initialIdea={prompt || importedIdea} />

      {quickFillFeedback && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            {quickFillFeedback}
          </p>
        </Card>
      )}

      {/* Main Prompt — Always visible */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="prompt" className="font-semibold">Describe Your Guide</Label>
          <p className="text-xs text-muted-foreground mt-1">This is your source of truth. Quick Fill and Smart Fill will read this to fill form fields.</p>
        </div>
        <Textarea
          id="prompt"
          placeholder="Example: Create a comprehensive guide for deploying Next.js applications to Vercel. Should help beginner developers understand the entire process including env setup, domain config, and troubleshooting."
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
          <p className="text-xs text-muted-foreground">Choose how you'd like your guide generated:</p>

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
                AI generation may take 10&ndash;25 seconds. If generation fails, switch to Mock Preview or simplify your guide details.
              </p>
            </Card>
          )}
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Basic Information</h2>

          <div className="space-y-2">
            <Label htmlFor="title">Guide Title</Label>
            <Input
              id="title"
              placeholder="e.g., How to Deploy Next.js to Vercel"
              value={formState.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Intended Audience</Label>
            <Input
              id="audience"
              placeholder="e.g., Beginner developers, DevOps engineers"
              value={formState.audience}
              onChange={(e) => handleFieldChange("audience", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Guide Purpose</Label>
            <Textarea
              id="purpose"
              placeholder="What problem does this guide solve?"
              value={formState.purpose}
              onChange={(e) => handleFieldChange("purpose", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Guide Goal (Optional)</Label>
            <Input
              id="goal"
              placeholder="e.g., Help beginners understand the deployment process"
              value={formState.goal || ""}
              onChange={(e) => handleFieldChange("goal", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="useCase">Use Case / Context (Optional)</Label>
            <Input
              id="useCase"
              placeholder="e.g., First-time deployments, troubleshooting, team onboarding"
              value={formState.useCase || ""}
              onChange={(e) => handleFieldChange("useCase", e.target.value)}
            />
          </div>
        </div>

        {/* Style & Structure */}
        <div className="space-y-4 pb-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Style & Structure</h2>

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
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={formState.difficulty} onValueChange={(v) => handleFieldChange("difficulty", v as DifficultyLevel)}>
                <SelectTrigger id="difficulty">
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

            <div className="space-y-2">
              <Label htmlFor="guide-type">Guide Type</Label>
              <Select value={formState.guideType} onValueChange={(v) => handleFieldChange("guideType", v as GuideType)}>
                <SelectTrigger id="guide-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guide">Guide (how-to)</SelectItem>
                  <SelectItem value="tutorial">Tutorial (step-by-step)</SelectItem>
                  <SelectItem value="reference">Reference (lookup)</SelectItem>
                  <SelectItem value="explanation">Explanation (why & how)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">Number of Steps</Label>
              <Input
                id="steps"
                type="number"
                min="2"
                max="20"
                value={formState.numberOfSteps}
                onChange={(e) => handleFieldChange("numberOfSteps", parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="warnings"
                checked={formState.hasWarnings}
                onCheckedChange={(checked) => handleFieldChange("hasWarnings", checked)}
              />
              <Label htmlFor="warnings" className="font-normal cursor-pointer">
                Include safety warnings or cautions
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="prerequisites"
                checked={formState.hasPrerequisites}
                onCheckedChange={(checked) => handleFieldChange("hasPrerequisites", checked)}
              />
              <Label htmlFor="prerequisites" className="font-normal cursor-pointer">
                Include prerequisites or requirements
              </Label>
            </div>
          </div>
        </div>

        {/* Optional Context */}
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea
            id="context"
            placeholder="Any domain-specific terminology, constraints, or edge cases we should know?"
            value={formState.optionalContext}
            onChange={(e) => handleFieldChange("optionalContext", e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button size="lg" disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {provider === "mock" ? "Generating Mock Guide..." : "Generating with AI..."}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              {provider === "mock" ? "Generate Mock Guide" : "Generate AI Guide"}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
