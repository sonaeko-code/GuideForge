"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { SingleGuideIntakeRequest, GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"
import { generateSingleGuideMock } from "@/lib/guideforge/mock-asset-generator"
import { readIntakeSession, clearIntakeSession } from "@/lib/guideforge/intake-session"
import { parseRoughIdea } from "@/lib/guideforge/intake-field-parser"
import { StructuredAssetProposal } from "./structured-asset-proposal"
import { AIIntakeLadder } from "./ai-intake-ladder"
import type { DifficultyLevel, GuideType } from "@/lib/guideforge/types"

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
      // Attempt AI generation first
      const aiResponse = await fetch("/api/guideforge/generate-single-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      })

      const aiData = await aiResponse.json()

      if (aiData.success && aiData.asset) {
        setProposal(aiData.asset as GeneratedSingleGuide)
        return
      }

      // AI route returned an error — fall back to mock generator
      console.warn("[GuideForge] AI generation failed, falling back to mock:", aiData.error)

      const mockResponse = await generateSingleGuideMock(formState)
      if (!mockResponse.success) {
        throw new Error(mockResponse.error || "Generation failed")
      }
      setProposal(mockResponse.asset as GeneratedSingleGuide)
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
      <AIIntakeLadder assetType="single_guide" onApplyFields={handleApplyIntakeLadderFields} initialIdea={importedIdea} />

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
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              Generate Guide
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
