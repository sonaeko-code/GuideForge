"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { ChecklistIntakeRequest, GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { generateChecklistMock } from "@/lib/guideforge/mock-asset-generator"
import { StructuredAssetProposal } from "./structured-asset-proposal"

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

  const handleFieldChange = (field: keyof ChecklistIntakeRequest, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
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
      const response = await generateChecklistMock(formState)
      if (!response.success) {
        throw new Error(response.error || "Generation failed")
      }
      setProposal(response.asset as GeneratedChecklist)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Checklist generation error:", err)
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
        <h1 className="text-3xl font-bold tracking-tight">Generate Checklist</h1>
        <p className="text-base text-muted-foreground">
          Describe the checklist you want to create, and we'll generate a structured draft.
        </p>
        <Card className="p-3 border-blue-500/20 bg-blue-500/5">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            This creates a structured draft checklist. Nothing is published automatically.
          </p>
        </Card>
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
                max="10"
                value={formState.numberOfSections}
                onChange={(e) => handleFieldChange("numberOfSections", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="items">Items per Section</Label>
              <Input
                id="items"
                type="number"
                min="1"
                max="20"
                value={formState.itemsPerSection}
                onChange={(e) => handleFieldChange("itemsPerSection", parseInt(e.target.value))}
              />
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
              Generate Checklist
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
