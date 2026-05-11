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

  // 1. EXTRACT TITLE - strip common prefix phrases and extract meaningful title
  const title = extractTitle(text)
  if (title) result.title = title

  // 4. EXTRACT AUDIENCE - from "for X" phrases or audience keywords (needed for purpose)
  const audience = extractAudience(text)
  if (audience) result.audience = audience

  // 5. EXTRACT USE CASE / CONTEXT - from "when", "for publishing", etc. (needed for purpose)
  const useCase = extractUseCase(text)
  if (useCase) result.useCase = useCase

  // 2. EXTRACT PURPOSE - general intent/problem (now with audience and useCase)
  const purpose = extractPurpose(text, title, audience, useCase)
  if (purpose) result.purpose = purpose

  // 3. EXTRACT GOAL - specific outcomes or what they should achieve
  const goal = extractGoal(text)
  if (goal) result.goal = goal

  // 6. EXTRACT ADDITIONAL CONTEXT - topics covered, what's included
  const additionalContext = extractAdditionalContext(text)
  if (additionalContext) result.optionalContext = additionalContext

  // 7. DETECT TONE from keywords
  const tone = detectTone(lowerText)
  if (tone) result.tone = tone

  // 8. DETECT DIFFICULTY/AUDIENCE LEVEL
  const difficulty = detectDifficulty(lowerText)
  if (difficulty) result.difficulty = difficulty

  // 9. DETECT GUIDE TYPE/FORMAT
  const guideType = detectGuideType(lowerText)
  if (guideType) result.guideType = guideType

  // 10. DETECT WARNINGS AND PREREQUISITES
  if (
    lowerText.includes("warning") ||
    lowerText.includes("caution") ||
    lowerText.includes("safety") ||
    lowerText.includes("dangerous") ||
    lowerText.includes("avoid mistakes") ||
    lowerText.includes("risk")
  ) {
    result.hasWarnings = true
  }

  if (
    lowerText.includes("prerequisite") ||
    lowerText.includes("requirement") ||
    lowerText.includes("before you start") ||
    lowerText.includes("need to have") ||
    lowerText.includes("setup required")
  ) {
    result.hasPrerequisites = true
  }

  // 11. DETERMINE NUMBER OF STEPS
  const numberOfSteps = determineNumberOfSteps(lowerText, result.difficulty as string)
  if (numberOfSteps) result.numberOfSteps = numberOfSteps

  return result
}

/**
 * Extract a clean title from rough idea, stripping common prefixes
 */
function extractTitle(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)

  // Try first line as potential title
  const firstLine = lines[0]
  if (!firstLine) return null

  // Pattern for "A [adjective] guide for [audience] on [topic]" or similar
  // Extract just the [topic] part and title-case it
  const guideOnMatch = firstLine.match(/(?:guide|tutorial)\s+(?:for\s+[^o]+\s+)?on\s+([^.!?]+)/i)
  if (guideOnMatch) {
    let topic = guideOnMatch[1].trim()
    // Title-case the topic
    return topic
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  // Fallback: strip common guide/tutorial prefixes
  let cleanedTitle = firstLine
    .replace(/^a\s+(?:beginner-?friendly\s+)?(?:technical\s+)?guide\s+(?:for|on|to)\s+/i, "")
    .replace(/^a\s+tutorial\s+(?:on|for|to)\s+/i, "")
    .replace(/^how\s+to\s+/i, "")
    .replace(/^tutorial\s+on\s+/i, "")
    .replace(/^step-?by-?step\s+(?:guide\s+)?(?:on|for)\s+/i, "")
    .trim()

  // Remove trailing period if it exists
  cleanedTitle = cleanedTitle.replace(/\.$/, "").trim()

  // Only use if it's a reasonable title length
  if (cleanedTitle.length > 3 && cleanedTitle.length < 120) {
    // Title-case the result
    return cleanedTitle
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  return null
}

/**
 * Extract the general purpose/problem the guide solves
 */
function extractPurpose(text: string, title: string | null, audience?: string, useCase?: string): string | null {
  // If we have audience and useCase, build a personalized purpose
  if (audience && useCase) {
    // Extract key terms from the text for richer purpose
    // Look for action verbs: prepare, help, teach, guide, etc.
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes("prepare")) {
      return `Help ${audience.toLowerCase()} prepare for ${useCase.toLowerCase()}.`
    }
    if (lowerText.includes("teach") || lowerText.includes("learn")) {
      return `Teach ${audience.toLowerCase()} how to ${useCase.toLowerCase()}.`
    }
    if (lowerText.includes("guide")) {
      return `Guide ${audience.toLowerCase()} through ${useCase.toLowerCase()}.`
    }
    
    // Default personalized purpose
    return `Help ${audience.toLowerCase()} ${useCase.toLowerCase()}.`
  }

  // Fallback: use title if available
  if (title) {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes("help them prepare") || lowerText.includes("help them")) {
      return `Help readers prepare for ${title.toLowerCase()}.`
    }
    if (lowerText.includes("help")) {
      return `Help readers understand and accomplish ${title.toLowerCase()}.`
    }
    if (lowerText.includes("learn") || lowerText.includes("teach")) {
      return `Teach how to ${title.toLowerCase()}.`
    }
    if (lowerText.includes("prepare")) {
      return `Prepare readers for ${title.toLowerCase()}.`
    }
    if (lowerText.includes("guide")) {
      return `Guide readers through ${title.toLowerCase()}.`
    }
    
    return `Provide comprehensive guidance on ${title.toLowerCase()}.`
  }

  // Look for explicit purpose phrases
  const purposeMatch = text.match(
    /(?:purpose is|purpose:|aim is|goal is to help|help readers?|designed to|intended to)[^.!?]+[.!?]/i
  )
  if (purposeMatch) {
    const extracted = purposeMatch[0].replace(/(?:purpose is|purpose:|aim is|goal is to help|help readers?|designed to|intended to)\s*/i, "").trim()
    return extracted
  }

  return null
}

/**
 * Extract the specific goal or outcome
 */
function extractGoal(text: string): string | null {
  // Look for "The goal is to" or "goal is to" or "goal:"
  const goalMatch = text.match(/(?:the\s+)?goal\s+(?:is\s+)?to\s+([^.!?]+)[.!?]/i)
  if (goalMatch) {
    let goal = goalMatch[1].trim()
    // Capitalize the first letter
    goal = goal.charAt(0).toUpperCase() + goal.slice(1)
    return goal
  }

  // Look for just "goal:" pattern
  const goalColonMatch = text.match(/goal:\s*([^.!?]+)[.!?]/i)
  if (goalColonMatch) {
    let goal = goalColonMatch[1].trim()
    goal = goal.charAt(0).toUpperCase() + goal.slice(1)
    return goal
  }

  // Look for "The goal is..." without "to"
  const goalIsMatch = text.match(/(?:the\s+)?goal\s+is\s+([^.!?]+)[.!?]/i)
  if (goalIsMatch) {
    let goal = goalIsMatch[1].trim()
    goal = goal.charAt(0).toUpperCase() + goal.slice(1)
    return goal
  }

  // Look for "so they can" or "so users can"
  const soTheyMatch = text.match(/so\s+(?:they|users?|readers?)\s+can\s+([^.!?]+)[.!?]/i)
  if (soTheyMatch) {
    let goal = soTheyMatch[1].trim()
    goal = goal.charAt(0).toUpperCase() + goal.slice(1)
    return goal
  }

  // Look for "to avoid..." pattern
  const avoidMatch = text.match(/to\s+avoid\s+([^.!?]+)[.!?]/i)
  if (avoidMatch) {
    let goal = "Avoid " + avoidMatch[1].trim()
    return goal
  }

  // Look for just "avoid..." pattern
  const avoidDirectMatch = text.match(/avoid\s+(?:missing|having|making)?\s*([^.!?]+)[.!?]/i)
  if (avoidDirectMatch) {
    let goal = "Avoid missing " + avoidDirectMatch[1].trim()
    return goal
  }

  return null
}

/**
 * Extract intended audience from "for X" or audience keywords
 */
function extractAudience(text: string): string | null {
  // Look for "for [audience] on" pattern (greedy capture up to " on ")
  const forOnMatch = text.match(/for\s+([a-z\s]+?)\s+on\s+/i)
  if (forOnMatch) {
    const candidate = forOnMatch[1].trim()
    // Make sure it's not accidentally capturing other keywords
    if (candidate.length < 100 && candidate.length > 2) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1)
    }
  }

  // Look for "for [audience]" pattern (general case, up to punctuation or end)
  const forMatch = text.match(/for\s+([a-z\s]+?)(?:\s*[,.]|$)/i)
  if (forMatch) {
    const candidate = forMatch[1].trim()
    // Make sure it's not accidentally capturing other keywords
    if (candidate.length < 100 && candidate.length > 2 && !candidate.includes("the") && !candidate.includes("a guide")) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1)
    }
  }

  // Fallback to keyword detection
  if (text.match(/youtube|video\s+creator|streamer/i)) return "Video creators and streamers"
  if (text.match(/developer|engineer|programmer/i)) return "Developers and engineers"
  if (text.match(/designer|design\s+professional/i)) return "Designers and UX professionals"
  if (text.match(/manager|team\s+lead|leadership/i)) return "Managers and team leads"
  if (text.match(/student|learner|beginner/i)) return "Students and learners"
  if (text.match(/indie\s+game|game\s+developer/i)) return "Game developers"
  if (text.match(/content\s+creator|creator|solo\s+creator/i)) return "Content creators"

  return null
}

/**
 * Extract use case or context from "when", "publishing", etc.
 */
function extractUseCase(text: string): string | null {
  // Look for "on [usecase]" pattern (e.g., "on publishing a YouTube video")
  const onMatch = text.match(/\s+on\s+([^.!?]+?)(?:\.|,|$)/i)
  if (onMatch) {
    const candidate = onMatch[1].trim()
    if (candidate.length > 3 && candidate.length < 100) {
      return candidate
    }
  }

  // Look for "when" patterns
  const whenMatch = text.match(/when\s+([^.!?]+)[.!?]/i)
  if (whenMatch) {
    return whenMatch[1].trim()
  }

  // Look for "useful when" patterns
  const usefulMatch = text.match(/useful\s+when\s+([^.!?]+)[.!?]/i)
  if (usefulMatch) {
    return usefulMatch[1].trim()
  }

  // Look for "in the context of"
  const contextMatch = text.match(/(?:in the context of|for)\s+([a-z]+(?:\s+[a-z]+)*?)\s+(?:process|workflow|experience)/i)
  if (contextMatch) {
    return contextMatch[1].trim()
  }

  // Look for action keywords: publishing, launching, deploying, onboarding, etc.
  const actionMatch = text.match(/(publishing|deploying|launching|launching|onboarding|setting\s+up|installing)\s+([a-z\s]+?)(?:\.|,|!|\?|$)/i)
  if (actionMatch) {
    return `${actionMatch[1]} ${actionMatch[2]}`.trim()
  }

  return null
}

/**
 * Extract topics covered and other details
 */
function extractAdditionalContext(text: string): string | null {
  // Look for "including" pattern - capture everything until end of sentence
  const includeMatch = text.match(
    /(?:should\s+)?(?:include|including|cover|covering|with)\s+([^.!?]+?)(?:\.|!|\?|$)/i
  )
  if (includeMatch) {
    const items = includeMatch[1].trim()
    // Filter out common ending phrases
    const cleaned = items.replace(/\s+(?:and\s+)?(?:post-?release|analytics|etc\.)?\s*$/i, "").trim()
    if (cleaned.length > 5) {
      return cleaned
    }
  }

  // Look for "such as" pattern - capture comma-separated list
  const listMatch = text.match(/such\s+as\s+([^.!?]+)[.!?]/i)
  if (listMatch) {
    return listMatch[1].trim()
  }

  return null
}

/**
 * Detect tone from keywords
 */
function detectTone(lowerText: string): string | null {
  if (lowerText.includes("technical") || lowerText.includes("precision")) return "technical"
  if (lowerText.includes("beginner-friendly") || lowerText.includes("beginner friendly")) return "beginner-friendly"
  if (lowerText.includes("practical") || lowerText.includes("straightforward")) return "practical"
  if (lowerText.includes("detailed") || lowerText.includes("thorough") || lowerText.includes("comprehensive")) return "detailed"
  if (lowerText.includes("quick") || lowerText.includes("minimal") || lowerText.includes("concise")) return "minimal"
  if (lowerText.includes("friendly") || lowerText.includes("helpful")) return "helpful"

  // If mentions "beginner" level, use beginner-friendly tone
  if (lowerText.includes("beginner")) return "beginner-friendly"

  return null
}

/**
 * Detect difficulty level
 */
function detectDifficulty(lowerText: string): string | null {
  if (lowerText.includes("beginner")) return "beginner"
  if (lowerText.includes("expert") || lowerText.includes("professional")) return "expert"
  if (lowerText.includes("advanced")) return "advanced"

  return null
}

/**
 * Detect guide type/format
 */
function detectGuideType(lowerText: string): string | null {
  if (lowerText.includes("how to") || lowerText.includes("how-to")) return "guide"
  if (lowerText.includes("tutorial") || lowerText.includes("step-by-step")) return "tutorial"
  if (lowerText.includes("reference")) return "reference"
  if (lowerText.includes("troubleshoot") || lowerText.includes("why")) return "explanation"

  return null
}

/**
 * Determine appropriate number of steps based on difficulty
 */
function determineNumberOfSteps(lowerText: string, difficulty: string | undefined): number | null {
  // If explicit step mention, use that
  if (lowerText.includes("5 step") || lowerText.includes("five step")) return 5
  if (lowerText.includes("6 step") || lowerText.includes("six step")) return 6
  if (lowerText.includes("7 step") || lowerText.includes("seven step")) return 7
  if (lowerText.includes("8 step") || lowerText.includes("eight step")) return 8

  // Otherwise, base on difficulty
  if (difficulty === "beginner") return 5
  if (difficulty === "advanced") return 8
  if (difficulty === "expert") return 10

  return null
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

      // Build structured fields based on asset type
      const fieldsToApply = buildFieldsFromParsed(parsed, assetType)
      
      // Debug log for development
      console.log("[GuideForge Intake Ladder] fieldsToApply", fieldsToApply)
      
      // Display the actual fields that will be applied (not just parsed)
      setResult(fieldsToApply as Record<string, string | number | boolean>)
      
      // Apply fields to form
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
              {Object.entries(result).map(([key, value]) => {
                // Format field names for display
                const fieldLabels: Record<string, string> = {
                  title: "Guide Title",
                  purpose: "Guide Purpose",
                  audience: "Intended Audience",
                  goal: "Guide Goal",
                  useCase: "Use Case / Context",
                  optionalContext: "Additional Context",
                  tone: "Tone",
                  difficulty: "Difficulty Level",
                  guideType: "Guide Type",
                  numberOfSteps: "Number of Steps",
                  hasWarnings: "Include Safety Warnings",
                  hasPrerequisites: "Include Prerequisites",
                }
                const label = fieldLabels[key] || key.replace(/([A-Z])/g, " $1").toLowerCase()
                return (
                  <li key={key} className="flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                    <span>
                      <span className="font-medium">{label}:</span> {String(value)}
                    </span>
                  </li>
                )
              })}
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

  // Common fields - always apply if detected
  if (parsed.title) fields.title = parsed.title
  if (parsed.purpose) fields.purpose = parsed.purpose
  if (parsed.audience) fields.audience = parsed.audience
  if (parsed.goal) fields.goal = parsed.goal
  if (parsed.useCase) fields.useCase = parsed.useCase
  if (parsed.optionalContext) fields.optionalContext = parsed.optionalContext
  if (parsed.tone) fields.tone = parsed.tone
  if (parsed.difficulty) fields.difficulty = parsed.difficulty

  if (assetType === "single_guide") {
    // Single guide specific
    if (parsed.guideType) fields.guideType = parsed.guideType
    if (parsed.hasWarnings !== undefined) fields.hasWarnings = parsed.hasWarnings
    if (parsed.hasPrerequisites !== undefined) fields.hasPrerequisites = parsed.hasPrerequisites
    if (parsed.numberOfSteps) fields.numberOfSteps = parsed.numberOfSteps

    // Set defaults only if not already set by parser
    if (!fields.purpose) fields.purpose = "Provide structured, step-by-step guidance"
    if (!fields.numberOfSteps) {
      fields.numberOfSteps = fields.difficulty === "beginner" ? 4 : fields.difficulty === "advanced" ? 8 : 5
    }
    if (!fields.guideType) fields.guideType = "guide"

    return fields as Partial<SingleGuideIntakeRequest>
  }

  if (assetType === "checklist") {
    // Checklist specific
    if (parsed.numberOfSections) fields.numberOfSections = parsed.numberOfSections
    if (parsed.itemsPerSection) fields.itemsPerSection = parsed.itemsPerSection

    // Set defaults only if not already set
    if (!fields.purpose) fields.purpose = "Provide a structured, actionable checklist"
    if (!fields.numberOfSections) fields.numberOfSections = 4
    if (!fields.itemsPerSection) fields.itemsPerSection = 5

    return fields as Partial<ChecklistIntakeRequest>
  }

  return fields
}
