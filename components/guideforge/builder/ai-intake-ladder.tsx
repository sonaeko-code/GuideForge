"use client"

import { useState } from "react"
import { Loader2, Wand2, AlertCircle, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { SingleGuideIntakeRequest, ChecklistIntakeRequest } from "@/lib/guideforge/generation-schemas"

interface AIIntakeLadderProps {
  assetType: "single_guide" | "checklist"
  onApplyFields: (fields: Partial<SingleGuideIntakeRequest> | Partial<ChecklistIntakeRequest>) => void
}

/**
 * Local heuristic parser for filling structured intake fields from rough ideas.
 * Uses simple keyword matching and text analysis instead of calling OpenAI.
 */
function parseRoughIdea(text: string): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {}
  const lowerText = text.toLowerCase()

  // Detect audience keywords
  if (lowerText.includes("beginner")) result.audienceLevel = "beginner"
  if (lowerText.includes("expert") || lowerText.includes("professional")) result.audienceLevel = "expert"
  if (lowerText.includes("advanced")) result.audienceLevel = "advanced"
  if (lowerText.includes("youtube") || lowerText.includes("video")) result.audience = "Video creator, content producer"
  if (lowerText.includes("developer") || lowerText.includes("engineer")) result.audience = "Developers, engineers"
  if (lowerText.includes("designer")) result.audience = "Designers, UX professionals"
  if (lowerText.includes("manager") || lowerText.includes("team lead")) result.audience = "Managers, team leads"
  if (lowerText.includes("student")) result.audience = "Students, learners"

  // Detect tone keywords - map to normalized shared tone set
  if (lowerText.includes("funny") || lowerText.includes("humor")) result.tone = "helpful"
  if (lowerText.includes("technical") || lowerText.includes("precise")) result.tone = "technical"
  if (lowerText.includes("story") || lowerText.includes("narrative")) result.tone = "helpful"
  if (lowerText.includes("quick") || lowerText.includes("minimal")) result.tone = "minimal"
  if (lowerText.includes("beginner") && !result.tone) result.tone = "beginner-friendly"
  if (lowerText.includes("practical") || lowerText.includes("straightforward")) result.tone = "practical"
  if (lowerText.includes("detail") || lowerText.includes("thorough")) result.tone = "detailed"

  // Detect guide type keywords
  if (lowerText.includes("how to") || lowerText.includes("how-to")) result.guideType = "guide"
  if (lowerText.includes("tutorial") || lowerText.includes("step")) result.guideType = "tutorial"
  if (lowerText.includes("reference") || lowerText.includes("lookup")) result.guideType = "reference"
  if (lowerText.includes("why") || lowerText.includes("explain")) result.guideType = "explanation"

  // Detect difficulty
  if (result.audienceLevel === "beginner") result.difficulty = "beginner"
  if (result.audienceLevel === "advanced") result.difficulty = "advanced"
  if (result.audienceLevel === "expert") result.difficulty = "expert"

  // Detect warnings/prerequisites
  if (lowerText.includes("danger") || lowerText.includes("warning") || lowerText.includes("careful")) result.hasWarnings = true
  if (lowerText.includes("require") || lowerText.includes("prerequisite") || lowerText.includes("before")) result.hasPrerequisites = true

  // Extract goal (for both single_guide and checklist)
  if (lowerText.includes("goal")) {
    const goalMatch = text.match(/goal[^.!?]*[.!?]/i)
    if (goalMatch) result.goal = goalMatch[0].replace(/goal[:\s]+/i, "").trim()
  }

  // Extract use case
  if (lowerText.includes("use case") || lowerText.includes("when")) {
    const useCaseMatch = text.match(/(use case|when)[^.!?]*[.!?]/i)
    if (useCaseMatch) result.useCase = useCaseMatch[0].replace(/(use case|when)[:\s]+/i, "").trim()
  }

  // Detect checklist specifics
  if (lowerText.includes("section")) result.numberOfSections = 4
  if (lowerText.includes("item")) result.itemsPerSection = 5

  // Extract title from first line (if it looks like a title)
  const firstLine = text.split("\n")[0].trim()
  if (firstLine.length > 5 && firstLine.length < 100 && !firstLine.match(/[.,:;]/)) {
    result.title = firstLine
  }

  return result
}

export function AIIntakeLadder({ assetType, onApplyFields }: AIIntakeLadderProps) {
  const [roughIdea, setRoughIdea] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<Record<string, string | number | boolean> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFillInFields = async () => {
    if (!roughIdea.trim()) {
      setError("Please describe your idea first")
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      // Simulate a small processing delay for UX feedback
      await new Promise((resolve) => setTimeout(resolve, 300))

      const parsed = parseRoughIdea(roughIdea)

      if (Object.keys(parsed).length === 0) {
        setError("No patterns detected. Try mentioning audience, difficulty, or guide type.")
        setIsProcessing(false)
        return
      }

      setResult(parsed)

      // Build structured fields based on asset type
      const fieldsToApply = buildFieldsFromParsed(parsed, assetType)
      onApplyFields(fieldsToApply)

      // Clear the textarea after successful application
      setRoughIdea("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process idea")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setRoughIdea("")
    setResult(null)
    setError(null)
  }

  return (
    <Card className="p-6 border-blue-500/20 bg-blue-500/5 mb-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Lightbulb className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-foreground">Start with a rough idea</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Describe what you want to build in plain language. We&apos;ll help fill in the structured fields.
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <Label htmlFor="rough-idea" className="text-sm">
            Your Idea
          </Label>
          <Textarea
            id="rough-idea"
            placeholder="E.g., 'A beginner-friendly tutorial on how to deploy a Next.js app to Vercel, with warnings about common mistakes...'"
            value={roughIdea}
            onChange={(e) => {
              setRoughIdea(e.target.value)
              setError(null)
            }}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
              Fields detected from your idea:
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              {Object.entries(result).map(([key, value]) => (
                <li key={key} className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                  <span>
                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}:</span> {String(value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2">
          {result && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Try Another Idea
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleFillInFields}
            disabled={isProcessing || !roughIdea.trim()}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Organizing your idea...
              </>
            ) : (
              <>
                <Wand2 className="size-4" aria-hidden="true" />
                Fill in fields
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}

/**
 * Convert parsed heuristic data into structured intake fields
 */
function buildFieldsFromParsed(
  parsed: Record<string, string | number | boolean>,
  assetType: "single_guide" | "checklist"
): Partial<SingleGuideIntakeRequest> | Partial<ChecklistIntakeRequest> {
  const fields: Record<string, any> = {}

  // Common fields
  if (parsed.title) fields.title = parsed.title
  if (parsed.audience) fields.audience = parsed.audience
  if (parsed.tone) fields.tone = parsed.tone
  if (parsed.difficulty) fields.difficulty = parsed.difficulty

  if (assetType === "single_guide") {
    // Single guide specific
    if (parsed.guideType) fields.guideType = parsed.guideType
    if (parsed.hasWarnings !== undefined) fields.hasWarnings = parsed.hasWarnings
    if (parsed.hasPrerequisites !== undefined) fields.hasPrerequisites = parsed.hasPrerequisites

    // Default/fallback values for guide
    if (!fields.purpose) fields.purpose = "Provide structured, step-by-step guidance"
    if (!fields.numberOfSteps) fields.numberOfSteps = 5
    if (!fields.guideType) fields.guideType = "guide"
    if (fields.difficulty === "beginner") fields.numberOfSteps = 4
    if (fields.difficulty === "advanced") fields.numberOfSteps = 8

    return fields as Partial<SingleGuideIntakeRequest>
  }

  if (assetType === "checklist") {
    // Checklist specific
    if (parsed.goal) fields.goal = parsed.goal
    if (parsed.numberOfSections) fields.numberOfSections = parsed.numberOfSections
    if (parsed.itemsPerSection) fields.itemsPerSection = parsed.itemsPerSection

    // Default/fallback values for checklist
    if (!fields.purpose) fields.purpose = "Provide a structured, actionable checklist"
    if (!fields.numberOfSections) fields.numberOfSections = 4
    if (!fields.itemsPerSection) fields.itemsPerSection = 5

    return fields as Partial<ChecklistIntakeRequest>
  }

  return fields
}
