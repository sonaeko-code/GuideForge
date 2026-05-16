"use client"

import { useState, useEffect } from "react"
import { Loader2, Wand2, AlertCircle, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { SingleGuideIntakeRequest, ChecklistIntakeRequest } from "@/lib/guideforge/generation-schemas"
import { parseRoughIdea } from "@/lib/guideforge/intake-field-parser"

interface AIIntakeLadderProps {
  assetType: "single_guide" | "checklist"
  onApplyFields: (fields: Partial<SingleGuideIntakeRequest> | Partial<ChecklistIntakeRequest>) => void
  initialIdea?: string
}

/**
 * Title-case a string while preserving common acronyms and brand names
 */
function titleCaseGuideTitle(text: string): string {
  // Common acronyms and brand names that should preserve their casing
  const preserveCasing: Record<string, string> = {
    youtube: "YouTube",
    "youtube channel": "YouTube Channel",
    api: "API",
    ai: "AI",
    seo: "SEO",
    "ci/cd": "CI/CD",
    next: "Next.js",
    nextjs: "Next.js",
    vercel: "Vercel",
    steam: "Steam",
    discord: "Discord",
  }

  // Check for whole word matches first
  for (const [lower, proper] of Object.entries(preserveCasing)) {
    const regex = new RegExp(`\\b${lower}\\b`, "gi")
    text = text.replace(regex, proper)
  }

  // Title-case remaining words
  return text
    .split(" ")
    .map((word) => {
      // Skip if already title-cased (contains uppercase letters)
      if (/[A-Z]/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

/**
 * Local heuristic parser for filling structured intake fields from rough ideas.
 * Uses parseRoughIdea from shared parser to extract all fields uniformly.
 */
function parseRoughIdeaLocal(text: string): Record<string, string | number | boolean> {
  // Simply delegate to the shared parser
  return parseRoughIdea(text)
}

/**
 * Extract a clean title from rough idea, stripping common prefixes
 * Falls back to useCase if no direct title found
 */
function extractTitle(text: string, useCase?: string | null): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)

  // Try first line as potential title
  const firstLine = lines[0]
  if (!firstLine) return null

  // Pattern for "A [adjective] guide/checklist for [audience] on [topic]" or similar
  // Extract just the [topic] part and title-case it
  const guideOnMatch = firstLine.match(/(?:guide|tutorial|checklist)\s+(?:for\s+[^o]+\s+)?on\s+([^.!?]+)/i)
  if (guideOnMatch) {
    let topic = guideOnMatch[1].trim()
    return titleCaseGuideTitle(topic)
  }

  // Pattern for "A checklist for [topic]" — capture the topic after "for"
  const checklistForMatch = firstLine.match(/^a\s+(?:\w+\s+)?checklist\s+for\s+([^.!?,]+)/i)
  if (checklistForMatch) {
    const topic = checklistForMatch[1].trim()
    if (topic.length > 3 && topic.length < 100) {
      return titleCaseGuideTitle(topic) + " Checklist"
    }
  }

  // Fallback: strip common guide/tutorial/checklist prefixes
  let cleanedTitle = firstLine
    .replace(/^a\s+(?:beginner-?friendly\s+)?(?:technical\s+)?(?:practical\s+)?(?:guide|checklist)\s+(?:for|on|to)\s+/i, "")
    .replace(/^a\s+tutorial\s+(?:on|for|to)\s+/i, "")
    .replace(/^how\s+to\s+/i, "")
    .replace(/^tutorial\s+on\s+/i, "")
    .replace(/^step-?by-?step\s+(?:guide\s+)?(?:on|for)\s+/i, "")
    .trim()

  // Remove trailing period if it exists
  cleanedTitle = cleanedTitle.replace(/\.$/, "").trim()

  // Only use if it's a reasonable title length
  if (cleanedTitle.length > 3 && cleanedTitle.length < 120) {
    return titleCaseGuideTitle(cleanedTitle)
  }

  // Final fallback: if useCase exists, derive title from it
  if (useCase && useCase.length > 3 && useCase.length < 120) {
    return titleCaseGuideTitle(useCase)
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
  // Look for "prepare the [list]" or "prepare [list]" pattern
  // This captures comma-separated lists after "prepare"
  const prepareMatch = text.match(
    /(?:should\s+)?(?:help\s+them\s+)?prepare\s+(?:the\s+)?([^.!?]+?)(?:\.|!|\?|$)/i
  )
  if (prepareMatch) {
    let items = prepareMatch[1].trim()
    // Clean up: remove trailing phrases like "for release", "and post-release analytics"
    items = items
      .replace(/\s+(?:and\s+)?(?:for\s+)?(?:release|to\s+release)\s*$/i, "")
      .replace(/\s+(?:and\s+)?(?:post-?release|analytics|etc\.)\s*$/i, "")
      .trim()
    
    if (items.length > 5) {
      // Title-case the list items
      const listItems = items
        .split(/,\s*/)
        .map((item) => titleCaseGuideTitle(item.trim()))
        .join(", ")
      return listItems
    }
  }

  // Look for "include/including/cover/with [list]" pattern
  const includeMatch = text.match(
    /(?:should\s+)?(?:include|including|cover|covering|with)\s+([^.!?]+?)(?:\.|!|\?|$)/i
  )
  if (includeMatch) {
    let items = includeMatch[1].trim()
    // Filter out common ending phrases
    items = items
      .replace(/\s+(?:and\s+)?(?:post-?release|analytics|etc\.)\s*$/i, "")
      .trim()
    
    if (items.length > 5) {
      const listItems = items
        .split(/,\s*/)
        .map((item) => titleCaseGuideTitle(item.trim()))
        .join(", ")
      return listItems
    }
  }

  // Look for "such as" pattern - capture comma-separated list
  const listMatch = text.match(/such\s+as\s+([^.!?]+)[.!?]/i)
  if (listMatch) {
    let items = listMatch[1].trim()
    const listItems = items
      .split(/,\s*/)
      .map((item) => titleCaseGuideTitle(item.trim()))
      .join(", ")
    return listItems
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
 * Infer number of checklist sections from explicit counts or topic list length.
 * Defaults conservatively: topic-list inference caps at 5.
 * Only an explicit user-stated count of 6+ is allowed to exceed 5.
 */
function inferNumberOfSections(lowerText: string): number | null {
  // Explicit section count stated by the user (e.g. "6 sections", "8 sections")
  const explicitMatch = lowerText.match(/(\d+)\s*sections?/i)
  if (explicitMatch) {
    const n = parseInt(explicitMatch[1])
    // Honour explicit requests for 6+ but keep a hard ceiling
    return Math.max(2, Math.min(8, n))
  }

  // Count comma-separated topics in "confirm/include/cover/help them" lists.
  // Cap at 5 regardless of how many topics are listed — a long topic list is
  // not a signal the user wants more than 5 sections; topics become items, not
  // sections.
  const topicListMatch = lowerText.match(
    /(?:confirm|include|cover|sections?:?|covering|help\s+them)\s+([^.!?]{10,200})/i
  )
  if (topicListMatch) {
    const topics = topicListMatch[1].split(/,|and\s+/).filter((t) => t.trim().length > 2)
    if (topics.length >= 3) {
      return Math.max(2, Math.min(5, Math.ceil(topics.length / 1.5)))
    }
  }

  return null
}

/**
 * Infer items per section from explicit counts or detail density keywords.
 * Caps at 5 for density keywords to stay generation-safe.
 */
function inferItemsPerSection(lowerText: string): number | null {
  const explicitMatch = lowerText.match(/(\d+)\s*items?\s*(?:per|each)/i)
  if (explicitMatch) {
    const n = parseInt(explicitMatch[1])
    // Honour explicit requests but keep a safe ceiling
    return Math.max(3, Math.min(8, n))
  }

  if (lowerText.includes("detailed") || lowerText.includes("thorough") || lowerText.includes("comprehensive")) return 5
  if (lowerText.includes("quick") || lowerText.includes("minimal") || lowerText.includes("concise")) return 3

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

interface SmartFillResult {
  fields: Record<string, string | number | boolean>
  assumptions: string[]
  missingInfo: string[]
  couldBeBetterWith: string[]
  source: "smart" | "quick"
}

export function AIIntakeLadder({ assetType, onApplyFields, initialIdea }: AIIntakeLadderProps) {
  const [roughIdea, setRoughIdea] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSmartFilling, setIsSmartFilling] = useState(false)
  const [result, setResult] = useState<SmartFillResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize roughIdea from initialIdea prop (e.g., from welcome intake hydration)
  useEffect(() => {
    if (initialIdea && initialIdea.trim() && !roughIdea) {
      setRoughIdea(initialIdea.trim())
    }
  }, [initialIdea])

  /** Quick Fill: local heuristic parser, no network call */
  const handleQuickFill = async () => {
    if (!roughIdea.trim()) {
      setError("Please describe your idea first.")
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const parsed = parseRoughIdea(roughIdea)

      if (Object.keys(parsed).length === 0) {
        setError("No patterns detected. Try mentioning audience, difficulty, or guide type.")
        return
      }

      const fieldsToApply = buildFieldsFromParsed(parsed, assetType)

      setResult({
        fields: fieldsToApply as Record<string, string | number | boolean>,
        assumptions: [],
        missingInfo: [],
        couldBeBetterWith: [],
        source: "quick",
      })

      onApplyFields(fieldsToApply)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick Fill failed.")
    } finally {
      setIsProcessing(false)
    }
  }

  /** Smart Fill: server-side OpenAI call via /api/guideforge/intake-refine */
  const handleSmartFill = async () => {
    if (!roughIdea.trim()) {
      setError("Please describe your idea first.")
      return
    }

    setError(null)
    setIsSmartFilling(true)

    try {
      const response = await fetch("/api/guideforge/intake-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetType,
          roughIdea: roughIdea.trim(),
        }),
      })

      const data = await response.json()

      if (!data.success) {
        // Graceful fallback to Quick Fill if Smart Fill fails
        console.warn("[AIIntakeLadder] Smart Fill failed, falling back to Quick Fill:", data.error)
        setError(`Smart Fill unavailable: ${data.error} — falling back to Quick Fill.`)
        setIsSmartFilling(false)
        // Run Quick Fill as fallback
        await handleQuickFill()
        return
      }

      const fields = data.fields as Record<string, string | number | boolean>

      setResult({
        fields,
        assumptions: data.assumptions ?? [],
        missingInfo: data.missingInfo ?? [],
        couldBeBetterWith: data.couldBeBetterWith ?? [],
        source: "smart",
      })

      onApplyFields(fields)
    } catch (err) {
      // Network error — fall back to Quick Fill
      console.warn("[AIIntakeLadder] Smart Fill network error, falling back to Quick Fill:", err)
      setError("Smart Fill could not connect. Falling back to Quick Fill.")
      setIsSmartFilling(false)
      await handleQuickFill()
      return
    } finally {
      setIsSmartFilling(false)
    }
  }

  const handleReset = () => {
    setRoughIdea("")
    setResult(null)
    setError(null)
  }

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
    numberOfSections: "Number of Sections",
    itemsPerSection: "Items Per Section",
  }

  const isBusy = isProcessing || isSmartFilling

  return (
    <Card className="p-6 border-blue-500/20 bg-blue-500/5 mb-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Lightbulb className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-foreground">Start with a rough idea</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Describe what you want to build in plain language and we&apos;ll fill in the structured fields.
              Use <strong>Smart Fill</strong> for AI-powered extraction, or <strong>Quick Fill</strong> for instant local parsing.
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
            disabled={isBusy}
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
          <div className="space-y-3">
            {/* Fields panel */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                  Fields filled from your idea
                  {result.source === "smart" && (
                    <span className="ml-2 text-xs font-normal text-green-700 dark:text-green-300 bg-green-500/15 px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  )}
                </h3>
              </div>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                {Object.entries(result.fields).map(([key, value]) => {
                  const label = fieldLabels[key] || key.replace(/([A-Z])/g, " $1").toLowerCase()
                  return (
                    <li key={key} className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" aria-hidden="true">&#10003;</span>
                      <span>
                        <span className="font-medium">{label}:</span> {String(value)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Assumptions */}
            {result.assumptions.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/15 space-y-1">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">Assumptions made</p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                  {result.assumptions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5" aria-hidden="true">&#8226;</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing info */}
            {result.missingInfo.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/15 space-y-1">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">Would help to know</p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                  {result.missingInfo.map((m, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5" aria-hidden="true">&#8226;</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Could be better with */}
            {result.couldBeBetterWith.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Could be better with</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {result.couldBeBetterWith.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5" aria-hidden="true">&#8226;</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end pt-2">
          {result && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isBusy}>
              Try Another Idea
            </Button>
          )}

          {/* Quick Fill button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleQuickFill}
            disabled={isBusy || !roughIdea.trim()}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Filling...
              </>
            ) : (
              <>
                <Wand2 className="size-4" aria-hidden="true" />
                Quick Fill
              </>
            )}
          </Button>

          {/* Smart Fill button */}
          <Button
            size="sm"
            onClick={handleSmartFill}
            disabled={isBusy || !roughIdea.trim()}
            className="gap-2"
          >
            {isSmartFilling ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Refining your idea...
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden="true" />
                Smart Fill
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
