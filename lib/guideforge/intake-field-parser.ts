/**
 * Shared intake field parser - safely extracts structured fields from rough idea text.
 * Reusable by all destination builders (checklist, single guide, network).
 * Uses local heuristics only—no API calls.
 */

import type { SingleGuideIntakeRequest, ChecklistIntakeRequest } from "./generation-schemas"
import type { GuideType } from "./types"

/**
 * Extract a clean title from rough idea, stripping common prefixes.
 */
export function extractTitle(text: string): string | null {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
  const firstLine = lines[0]
  if (!firstLine) return null

  // Pattern for "A [adjective] guide/checklist for [topic]"
  const guideOnMatch = firstLine.match(
    /(?:guide|tutorial|checklist)\s+(?:for\s+[^o]+\s+)?on\s+([^.!?]+)/i
  )
  if (guideOnMatch) {
    const topic = guideOnMatch[1].trim()
    return titleCase(topic)
  }

  // Pattern for "A checklist for [topic]"
  const checklistForMatch = firstLine.match(
    /^a\s+(?:\w+\s+)?checklist\s+for\s+([^.!?,]+)/i
  )
  if (checklistForMatch) {
    const topic = checklistForMatch[1].trim()
    if (topic.length > 3 && topic.length < 100) {
      return titleCase(topic) + " Checklist"
    }
  }

  // Strip common prefixes
  let cleaned = firstLine
    .replace(
      /^a\s+(?:beginner-?friendly\s+)?(?:technical\s+)?(?:practical\s+)?(?:guide|checklist)\s+(?:for|on|to)\s+/i,
      ""
    )
    .replace(/^a\s+tutorial\s+(?:on|for|to)\s+/i, "")
    .replace(/^how\s+to\s+/i, "")
    .replace(/^tutorial\s+on\s+/i, "")
    .replace(/^step-?by-?step\s+(?:guide\s+)?(?:on|for)\s+/i, "")
    .replace(/\.$/, "")
    .trim()

  // Only adopt the first line as a title if it's plausibly a concise title.
  // Anything longer than 80 chars is almost certainly the prompt body, not a title;
  // returning null lets the form leave the title empty and keeps the prompt textarea
  // intact for the user to read.
  if (cleaned.length > 3 && cleaned.length <= 80) {
    return titleCase(cleaned)
  }

  return null
}

/**
 * Extract audience from "for X" phrases or audience keywords.
 */
export function extractAudience(text: string): string | null {
  // Exact "for [audience]" pattern
  const match = text.match(
    /for\s+([a-z0-9\s\-&,()]+?)(?:\.|,|and|plus|including|to|to help)/i
  )
  if (match) {
    const audience = match[1].trim()
    if (audience.length > 2 && audience.length < 100) {
      return titleCase(audience)
    }
  }

  // Detect specific audience from keywords (checklist-specific)
  const lowerText = text.toLowerCase()
  
  if (
    lowerText.includes("medication") ||
    lowerText.includes("medication checklist") ||
    lowerText.includes("daily medication")
  ) {
    // For medication checklists, infer audience
    if (lowerText.includes("caregiver")) return "Caregivers and family members"
    if (lowerText.includes("nurse")) return "Healthcare professionals"
    if (lowerText.includes("personal") || lowerText.includes("self")) return "Personal use"
    return "People managing daily medication"
  }

  const audienceKeywords = [
    "beginners",
    "advanced users",
    "professionals",
    "teams",
    "families",
    "parents",
    "developers",
    "creators",
    "youtube creators",
    "video creators",
    "content creators",
  ]
  for (const kw of audienceKeywords) {
    if (lowerText.includes(kw)) {
      return titleCase(kw)
    }
  }

  return null
}

/**
 * Extract use case from "when" or contextual phrases.
 */
export function extractUseCase(text: string): string | null {
  // Match "when X" or "for publishing X" patterns
  const whenMatch = text.match(
    /when\s+([a-z0-9\s\-&,()]+?)(?:\.|,|and|or|to)/i
  )
  if (whenMatch) {
    const useCase = whenMatch[1].trim()
    if (useCase.length > 3 && useCase.length < 100) {
      return useCase
    }
  }

  const forMatch = text.match(
    /for\s+(publishing|creating|building|setting up|making|learning|understanding)\s+([a-z0-9\s\-&,()]+?)(?:\.|,|and|to)/i
  )
  if (forMatch) {
    const useCase = (forMatch[1] + " " + forMatch[2]).trim()
    if (useCase.length > 3 && useCase.length < 100) {
      return useCase
    }
  }

  return null
}

/**
 * Extract the general purpose/problem the guide solves.
 */
export function extractPurpose(
  text: string,
  title?: string | null,
  audience?: string | null,
  useCase?: string | null
): string | null {
  const lowerText = text.toLowerCase()
  
  // Medication-specific purpose detection
  if (lowerText.includes("medication") || lowerText.includes("medicin")) {
    if (audience && audience.toLowerCase().includes("caregiver")) {
      return `Help ${audience.toLowerCase()} track and manage daily medication for their loved ones.`
    }
    if (lowerText.includes("reminder")) {
      return "Help track daily medication tasks with reminders and maintain a completion streak."
    }
    return "Help manage and track daily medication consistently."
  }

  // YouTube/video creator-specific purpose detection
  if (
    lowerText.includes("youtube") ||
    lowerText.includes("publish") ||
    lowerText.includes("uploading") ||
    lowerText.includes("gameplay")
  ) {
    if (audience && (audience.toLowerCase().includes("creator") || audience.toLowerCase().includes("video"))) {
      return `Guide ${audience.toLowerCase()} through publishing and optimizing their content.`
    }
    if (lowerText.includes("gameplay")) {
      return "Guide creators through publishing a YouTube gameplay video with proper setup and metadata."
    }
    if (lowerText.includes("publish") || lowerText.includes("upload")) {
      return `Help ${audience ? audience.toLowerCase() : "creators"} publish video content to YouTube successfully.`
    }
  }

  // If we have audience and useCase, build a personalized purpose
  if (audience && useCase) {
    if (
      lowerText.includes("prepare") ||
      lowerText.includes("get ready")
    ) {
      return `Help ${audience.toLowerCase()} prepare for ${useCase.toLowerCase()}.`
    }
    if (
      lowerText.includes("teach") ||
      lowerText.includes("learn") ||
      lowerText.includes("understand")
    ) {
      return `Teach ${audience.toLowerCase()} how to ${useCase.toLowerCase()}.`
    }
    return `Guide ${audience.toLowerCase()} through ${useCase.toLowerCase()}.`
  }

  // If we have a title, use it as context
  if (title && title.length > 5) {
    return `A comprehensive guide about ${title.toLowerCase()}.`
  }

  return null
}

/**
 * Extract goal/desired outcome from text.
 */
export function extractGoal(text: string): string | null {
  const lowerText = text.toLowerCase()
  
  // Medication-specific goal extraction
  if (lowerText.includes("medication") || lowerText.includes("medicin")) {
    if (lowerText.includes("streak") || lowerText.includes("consistency")) {
      return "Complete daily medication tasks consistently and maintain a completion streak."
    }
    if (lowerText.includes("reminder") || lowerText.includes("remember")) {
      return "Track daily medication with reminders and never miss a dose."
    }
    return "Ensure medications are taken on schedule daily without missing doses."
  }

  // YouTube/video creator goal extraction
  if (lowerText.includes("youtube") || lowerText.includes("gameplay") || lowerText.includes("publish")) {
    if (lowerText.includes("metadata") || lowerText.includes("thumbnail") || lowerText.includes("description")) {
      return "Publish a gameplay video with proper metadata, tags, and optimized description."
    }
    if (lowerText.includes("setup") || lowerText.includes("optimization")) {
      return "Publish a gameplay video with the right setup, metadata, and pre-launch checks."
    }
    return "Successfully publish a gameplay video to YouTube with proper optimization."
  }

  // Pattern-based extraction (fallback)
  const goalMatch = text.match(
    /(?:so that|result in|outcome|achieve|goal|objective)\s+([^.!?]+)/i
  )
  if (goalMatch) {
    const goal = goalMatch[1].trim()
    if (goal.length > 5 && goal.length < 150) {
      return goal
    }
  }

  const shouldMatch = text.match(/should\s+([^.!?]+)/i)
  if (shouldMatch) {
    const goal = shouldMatch[1].trim()
    if (goal.length > 5 && goal.length < 150) {
      return goal
    }
  }

  return null
}

/**
 * Extract additional context from text about topics covered, features included, etc.
 */
export function extractAdditionalContext(text: string): string | null {
  const includeMatch = text.match(/(?:include|cover|contain|topics?|feature|section)\s+([^.!?]+)/i)
  if (includeMatch) {
    const context = includeMatch[1].trim()
    if (context.length > 5 && context.length < 200) {
      return context
    }
  }

  return null
}

/**
 * Detect tone from keywords.
 */
export function detectTone(
  lowerText: string
): "casual" | "professional" | "helpful" | "technical" | "practical" | null {
  // YouTube/video creation → practical tone
  if (lowerText.includes("youtube") || lowerText.includes("gameplay") || lowerText.includes("publish")) {
    return "practical"
  }
  
  // Medication/health context → helpful tone
  if (lowerText.includes("medication") || lowerText.includes("daily") && lowerText.includes("health")) {
    return "helpful"
  }
  
  if (
    lowerText.includes("casual") ||
    lowerText.includes("friendly") ||
    lowerText.includes("conversational")
  ) {
    return "casual"
  }
  if (
    lowerText.includes("professional") ||
    lowerText.includes("formal") ||
    lowerText.includes("corporate")
  ) {
    return "professional"
  }
  if (
    lowerText.includes("helpful") ||
    lowerText.includes("supportive") ||
    lowerText.includes("gentle")
  ) {
    return "helpful"
  }
  if (
    lowerText.includes("technical") ||
    lowerText.includes("detailed") ||
    lowerText.includes("in-depth")
  ) {
    return "technical"
  }
  if (
    lowerText.includes("practical") ||
    lowerText.includes("actionable") ||
    lowerText.includes("direct")
  ) {
    return "practical"
  }

  return null
}

/**
 * Detect difficulty level.
 */
export function detectDifficulty(
  lowerText: string
): "beginner" | "intermediate" | "advanced" | null {
  // YouTube/video publishing is typically beginner-friendly
  if (lowerText.includes("youtube") || lowerText.includes("gameplay") || lowerText.includes("publish")) {
    if (lowerText.includes("advanced") || lowerText.includes("expert")) return "advanced"
    if (lowerText.includes("professional") || lowerText.includes("pro")) return "intermediate"
    return "beginner" // Default for publishing tutorials
  }
  
  // Medication checklists are for general/beginner audience
  if (lowerText.includes("medication")) {
    return "beginner"
  }
  
  if (
    lowerText.includes("beginner") ||
    lowerText.includes("basics") ||
    lowerText.includes("introduction") ||
    lowerText.includes("getting started")
  ) {
    return "beginner"
  }
  if (
    lowerText.includes("intermediate") ||
    lowerText.includes("beyond basics")
  ) {
    return "intermediate"
  }
  if (
    lowerText.includes("advanced") ||
    lowerText.includes("expert") ||
    lowerText.includes("deep dive")
  ) {
    return "advanced"
  }

  return null
}

/**
 * Detect guide type/format.
 */
export function detectGuideType(
  lowerText: string
): GuideType | null {
  // YouTube/video publishing is typically a tutorial
  if (lowerText.includes("youtube") || lowerText.includes("gameplay") || lowerText.includes("publish")) {
    return "tutorial"
  }
  
  if (
    lowerText.includes("tutorial") ||
    lowerText.includes("step-by-step") ||
    lowerText.includes("walkthrough")
  ) {
    return "tutorial"
  }
  if (lowerText.includes("reference") || lowerText.includes("lookup")) {
    return "reference"
  }
  if (
    lowerText.includes("troubleshoot") ||
    lowerText.includes("problem") ||
    lowerText.includes("fix") ||
    lowerText.includes("solve")
  ) {
    return "tutorial"
  }
  if (
    lowerText.includes("guide") ||
    lowerText.includes("how to") ||
    lowerText.includes("explain")
  ) {
    return "tutorial"
  }

  return null
}

/**
 * Determine number of steps from text.
 */
export function determineNumberOfSteps(
  lowerText: string,
  difficulty?: string
): number | null {
  // Look for explicit step counts
  const stepMatch = lowerText.match(/(\d+)\s*(?:steps?|stages?|phases?)/i)
  if (stepMatch) {
    const num = parseInt(stepMatch[1], 10)
    if (num >= 1 && num <= 20) {
      return num
    }
  }

  // Estimate based on difficulty
  if (difficulty === "beginner") return 3
  if (difficulty === "intermediate") return 5
  if (difficulty === "advanced") return 8

  // Default
  return 5
}

/**
 * Infer number of sections for checklists.
 */
export function inferNumberOfSections(lowerText: string): number | null {
  const sectionMatch = lowerText.match(/(\d+)\s*(?:sections?|categories?|parts?)/i)
  if (sectionMatch) {
    const num = parseInt(sectionMatch[1], 10)
    if (num >= 1 && num <= 10) {
      return num
    }
  }

  // Estimate: home/family systems often 4-5 sections
  if (lowerText.includes("home") || lowerText.includes("family")) {
    return 4
  }

  return 3
}

/**
 * Infer items per section for checklists.
 */
export function inferItemsPerSection(lowerText: string): number | null {
  const itemMatch = lowerText.match(/(\d+)\s*(?:items?|tasks?|steps?|checks?)/i)
  if (itemMatch) {
    const num = parseInt(itemMatch[1], 10)
    if (num >= 1 && num <= 20) {
      return num
    }
  }

  return 5
}

/**
 * Title-case a string while preserving common acronyms and lowercasing short
 * connector words (e.g. "a", "the", "for") unless they appear first.
 */
const SMALL_TITLE_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from",
  "if", "in", "into", "nor", "of", "on", "or", "per", "the",
  "to", "vs", "via", "with",
])

function titleCase(text: string): string {
  const preserveCasing: Record<string, string> = {
    youtube: "YouTube",
    api: "API",
    ai: "AI",
    seo: "SEO",
    hvac: "HVAC",
    "ci/cd": "CI/CD",
    next: "Next.js",
    nextjs: "Next.js",
    vercel: "Vercel",
    discord: "Discord",
    steam: "Steam",
    pvp: "PvP",
    pve: "PvE",
    mmo: "MMO",
    rpg: "RPG",
    fps: "FPS",
  }

  let result = text
  for (const [lower, proper] of Object.entries(preserveCasing)) {
    const regex = new RegExp(`\\b${lower}\\b`, "gi")
    result = result.replace(regex, proper)
  }

  return result
    .split(/\s+/)
    .map((word, idx) => {
      if (/[A-Z]/.test(word)) return word
      const lower = word.toLowerCase()
      if (idx > 0 && SMALL_TITLE_WORDS.has(lower)) return lower
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

/**
 * Detect whether idea has warnings (safety concerns).
 */
export function hasWarnings(lowerText: string): boolean {
  return /\b(warning|caution|safety|dangerous|avoid mistakes|risk)\b/i.test(
    lowerText
  )
}

/**
 * Detect whether idea mentions prerequisites.
 */
export function hasPrerequisites(lowerText: string): boolean {
  return /\b(prerequisite|requirement|before you start|need to have|setup required)\b/i.test(
    lowerText
  )
}

/**
 * Parse rough idea and extract all structured fields at once.
 */
export function parseRoughIdea(
  text: string
): Partial<SingleGuideIntakeRequest> & Partial<ChecklistIntakeRequest> {
  const lowerText = text.toLowerCase()
  const result: Partial<SingleGuideIntakeRequest> & Partial<ChecklistIntakeRequest> = {}

  const audience = extractAudience(text)
  if (audience) result.audience = audience

  const useCase = extractUseCase(text)
  if (useCase) result.useCase = useCase

  const title = extractTitle(text)
  if (title) result.title = title

  const purpose = extractPurpose(text, title, audience, useCase)
  if (purpose) result.purpose = purpose

  const goal = extractGoal(text)
  if (goal) result.goal = goal

  const context = extractAdditionalContext(text)
  if (context) result.optionalContext = context

  const tone = detectTone(lowerText)
  if (tone) result.tone = tone

  const difficulty = detectDifficulty(lowerText)
  if (difficulty) result.difficulty = difficulty

  const guideType = detectGuideType(lowerText)
  if (guideType) result.guideType = guideType

  if (hasWarnings(lowerText)) result.hasWarnings = true
  if (hasPrerequisites(lowerText)) result.hasPrerequisites = true

  const numberOfSteps = determineNumberOfSteps(lowerText, difficulty ?? undefined)
  if (numberOfSteps) result.numberOfSteps = numberOfSteps

  const numberOfSections = inferNumberOfSections(lowerText)
  if (numberOfSections) result.numberOfSections = numberOfSections

  const itemsPerSection = inferItemsPerSection(lowerText)
  if (itemsPerSection) result.itemsPerSection = itemsPerSection

  return result
}
