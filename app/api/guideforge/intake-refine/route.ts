/**
 * Intake Refine - Server API Route
 *
 * POST /api/guideforge/intake-refine
 *
 * Accepts a rough idea from the user and uses OpenAI to return
 * structured intake fields for a single_guide or checklist.
 *
 * Uses the proven server-side OpenAI pattern from generate-checklist/route.ts:
 *   - OPENAI_API_KEY read server-side only
 *   - model: gpt-4o-mini
 *   - temperature: 0.3
 *   - response_format: { type: "json_object" }
 *   - one OpenAI call, no repair loop (MVP)
 *   - timeout protection at both the OpenAI and route level
 *   - structured JSON errors on all exit paths
 */

import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_CHECKLIST_MODEL, GENERATION_TEMPERATURE } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

/** Hard ceiling for the OpenAI call. Must be well under maxDuration. */
const OPENAI_TIMEOUT_MS = 20000

/** Hard ceiling for the entire route. Ensures we return JSON before Vercel 504. */
const ROUTE_TIMEOUT_MS = 26000

// ---------- Types ----------

export interface IntakeRefineRequest {
  assetType: "single_guide" | "checklist"
  roughIdea: string
  currentFields?: Record<string, unknown>
}

export interface SingleGuideIntakeFields {
  title: string
  audience: string
  purpose: string
  goal: string
  useCase: string
  tone: "practical" | "helpful" | "beginner-friendly" | "technical" | "detailed" | "minimal"
  difficulty: "beginner" | "intermediate" | "advanced" | "expert"
  guideType: "guide" | "tutorial" | "reference" | "explanation"
  numberOfSteps: number
  hasWarnings: boolean
  hasPrerequisites: boolean
  optionalContext: string
}

export interface ChecklistIntakeFields {
  title: string
  audience: string
  purpose: string
  goal: string
  useCase: string
  tone: "practical" | "helpful" | "beginner-friendly" | "technical" | "detailed" | "minimal"
  numberOfSections: number
  itemsPerSection: number
  optionalContext: string
}

export interface IntakeRefineResponse {
  success: true
  fields: SingleGuideIntakeFields | ChecklistIntakeFields
  assumptions: string[]
  missingInfo: string[]
  couldBeBetterWith: string[]
}

export interface IntakeRefineErrorResponse {
  success: false
  error: string
  stage?: string
}

// ---------- Prompts ----------

function buildSingleGuideIntakePrompt(roughIdea: string, currentFields?: Record<string, unknown>): string {
  const currentFieldsBlock = currentFields && Object.keys(currentFields).length > 0
    ? `\nThe user has already filled in some fields:\n${JSON.stringify(currentFields, null, 2)}\nUse these as context but improve or complete them as needed.`
    : ""

  return `You are a guide intake assistant for GuideForge. A user has described a rough idea for a guide.

Your job is to extract and infer structured intake fields from their description. Fill every useful field. Do not leave title blank. Do not leave goal blank if the idea has any outcome.

Rules:
- title: A clear, concise title for the guide. Title-case it. Do not use generic titles like "Beginner Guide".
- audience: Who this guide is for. Be specific, not generic (e.g. "Solo gaming content creators" not "Beginners").
- purpose: One sentence describing what the guide helps the user accomplish. Be specific to the topic.
- goal: The specific outcome the reader should achieve. Extract this from any outcome language in the idea.
- useCase: The specific situation or context when this guide is used (e.g. "Publishing a YouTube gameplay video").
- tone: Must be exactly one of: "practical", "helpful", "beginner-friendly", "technical", "detailed", "minimal". Infer from language like "beginner-friendly", "technical", "quick", "thorough".
- difficulty: Must be exactly one of: "beginner", "intermediate", "advanced", "expert". Infer from audience language.
- guideType: Must be exactly one of: "guide", "tutorial", "reference", "explanation". "tutorial" for step-by-step walkthroughs, "guide" for broader coverage, "reference" for lookup, "explanation" for understanding why.
- numberOfSteps: An integer from 3 to 12. Infer from complexity. Beginner topics: 4-6. Advanced: 7-10.
- hasWarnings: true if the topic involves risks, irreversible actions, security, production deployments, dangerous steps, health, legal, or financial consequences. false otherwise.
- hasPrerequisites: true if the reader needs tools, accounts, installed software, credentials, materials, access, or baseline knowledge before starting. false otherwise.
- optionalContext: A comma-separated list of specific topics, items, or subtopics the guide should cover. Extract from any "include", "prepare", "cover", or list language in the rough idea. Leave empty string if none found.
- assumptions: Array of strings. What you assumed that wasn't stated explicitly.
- missingInfo: Array of strings. What specific information would improve the guide if provided.
- couldBeBetterWith: Array of strings. Short suggestions for making the guide more useful.${currentFieldsBlock}

Rough idea from user:
"""
${roughIdea}
"""

Return a JSON object with exactly this shape:
{
  "title": "string",
  "audience": "string",
  "purpose": "string",
  "goal": "string",
  "useCase": "string",
  "tone": "practical" | "helpful" | "beginner-friendly" | "technical" | "detailed" | "minimal",
  "difficulty": "beginner" | "intermediate" | "advanced" | "expert",
  "guideType": "guide" | "tutorial" | "reference" | "explanation",
  "numberOfSteps": number,
  "hasWarnings": boolean,
  "hasPrerequisites": boolean,
  "optionalContext": "string",
  "assumptions": ["string"],
  "missingInfo": ["string"],
  "couldBeBetterWith": ["string"]
}`
}

function buildChecklistIntakePrompt(roughIdea: string, currentFields?: Record<string, unknown>): string {
  const currentFieldsBlock = currentFields && Object.keys(currentFields).length > 0
    ? `\nThe user has already filled in some fields:\n${JSON.stringify(currentFields, null, 2)}\nUse these as context but improve or complete them as needed.`
    : ""

  return `You are a checklist intake assistant for GuideForge. A user has described a rough idea for a checklist.

Your job is to extract and infer structured intake fields from their description.

Rules:
- title: A clear, concise title for the checklist. Title-case it.
- audience: Who this checklist is for. Be specific.
- purpose: One sentence describing what the checklist helps accomplish.
- goal: The specific outcome the reader achieves by completing the checklist.
- useCase: The specific situation when this checklist is used.
- tone: Must be exactly one of: "practical", "helpful", "beginner-friendly", "technical", "detailed", "minimal".
- numberOfSections: IMPORTANT — Default to 4. Use 5 only for genuinely complex workflows with 5 or more clearly distinct phases. Never choose 6 or more unless the user's rough idea explicitly says "6 sections" or "8 sections". Do not infer 6+ sections from a long topic list alone.
- itemsPerSection: IMPORTANT — Default to 5. Use 4 for simpler topics. Use 6 only for highly detailed topics. Never exceed 6 unless the user explicitly requests more items. Keep output generation-friendly.
- optionalContext: Comma-separated list of specific items or topics the checklist should cover. Extract from any "include", "confirm", "prepare", or list language in the rough idea.
- assumptions: Array of strings.
- missingInfo: Array of strings.
- couldBeBetterWith: Array of strings.${currentFieldsBlock}

Rough idea from user:
"""
${roughIdea}
"""

Return a JSON object with exactly this shape:
{
  "title": "string",
  "audience": "string",
  "purpose": "string",
  "goal": "string",
  "useCase": "string",
  "tone": "practical" | "helpful" | "beginner-friendly" | "technical" | "detailed" | "minimal",
  "numberOfSections": number,
  "itemsPerSection": number,
  "optionalContext": "string",
  "assumptions": ["string"],
  "missingInfo": ["string"],
  "couldBeBetterWith": ["string"]
}`
}

// ---------- OpenAI Call ----------

async function callOpenAI(
  apiKey: string,
  prompt: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_CHECKLIST_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a structured intake assistant for GuideForge. Return valid JSON only. Do not include markdown, code fences, or explanations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: GENERATION_TEMPERATURE,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    signal,
  })

  if (!response.ok) {
    let errorDetail = "Unknown error"
    try {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        errorDetail = errorJson.error?.message || errorText
      } catch {
        errorDetail = errorText.substring(0, 200)
      }
    } catch {
      // ignore read errors
    }

    if (response.status === 401 || errorDetail.includes("authentication") || errorDetail.includes("invalid_api_key")) {
      throw new Error("AUTH_ERROR")
    }
    if (response.status === 429 || errorDetail.includes("rate") || errorDetail.includes("quota")) {
      throw new Error("QUOTA_ERROR")
    }
    throw new Error(`OPENAI_ERROR: ${errorDetail}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("EMPTY_RESPONSE")
  }

  return content
}

// ---------- POST Handler ----------

export async function POST(request: NextRequest) {
  const routeAbortController = new AbortController()
  const routeTimeoutHandle = setTimeout(() => {
    routeAbortController.abort()
  }, ROUTE_TIMEOUT_MS)

  try {
    // Read API key server-side only
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    if (!apiKey) {
      clearTimeout(routeTimeoutHandle)
      return NextResponse.json(
        { success: false, error: "AI Smart Fill is not configured. Please set OPENAI_API_KEY." },
        { status: 400 }
      )
    }

    // Parse request body
    let body: IntakeRefineRequest
    try {
      body = await request.json()
    } catch {
      clearTimeout(routeTimeoutHandle)
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 }
      )
    }

    const { assetType, roughIdea, currentFields } = body

    // Validate inputs
    if (!roughIdea?.trim()) {
      clearTimeout(routeTimeoutHandle)
      return NextResponse.json(
        { success: false, error: "roughIdea is required." },
        { status: 400 }
      )
    }

    if (assetType !== "single_guide" && assetType !== "checklist") {
      clearTimeout(routeTimeoutHandle)
      return NextResponse.json(
        { success: false, error: "assetType must be 'single_guide' or 'checklist'." },
        { status: 400 }
      )
    }

    // Build prompt
    const prompt =
      assetType === "single_guide"
        ? buildSingleGuideIntakePrompt(roughIdea.trim(), currentFields)
        : buildChecklistIntakePrompt(roughIdea.trim(), currentFields)

    // Call OpenAI with timeout
    let content: string
    const openaiAbortController = new AbortController()
    const openaiTimeoutHandle = setTimeout(() => {
      openaiAbortController.abort()
    }, OPENAI_TIMEOUT_MS)

    try {
      content = await callOpenAI(apiKey, prompt, openaiAbortController.signal)
    } catch (err) {
      clearTimeout(openaiTimeoutHandle)
      clearTimeout(routeTimeoutHandle)

      const isAbort =
        openaiAbortController.signal.aborted ||
        (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort")))

      if (isAbort) {
        return NextResponse.json(
          { success: false, error: "Smart Fill is taking too long. Please try again.", stage: "openai_timeout" },
          { status: 500 }
        )
      }

      const errorMsg = err instanceof Error ? err.message : "Unknown error"

      if (errorMsg === "AUTH_ERROR") {
        return NextResponse.json(
          { success: false, error: "Smart Fill authentication failed. Check OPENAI_API_KEY." },
          { status: 401 }
        )
      }
      if (errorMsg === "QUOTA_ERROR") {
        return NextResponse.json(
          { success: false, error: "Smart Fill is temporarily unavailable. Check API usage or billing." },
          { status: 429 }
        )
      }
      if (errorMsg === "EMPTY_RESPONSE") {
        return NextResponse.json(
          { success: false, error: "AI returned an empty response. Please try again." },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: false, error: "Smart Fill failed. Please try again or use Quick Fill." },
        { status: 500 }
      )
    } finally {
      clearTimeout(openaiTimeoutHandle)
    }

    // Parse JSON response
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(content)
    } catch {
      clearTimeout(routeTimeoutHandle)
      return NextResponse.json(
        { success: false, error: "AI returned invalid JSON. Please try again or use Quick Fill." },
        { status: 500 }
      )
    }

    // Extract meta fields from parsed before building fields
    const assumptions = Array.isArray(parsed.assumptions) ? (parsed.assumptions as string[]) : []
    const missingInfo = Array.isArray(parsed.missingInfo) ? (parsed.missingInfo as string[]) : []
    const couldBeBetterWith = Array.isArray(parsed.couldBeBetterWith) ? (parsed.couldBeBetterWith as string[]) : []

    // Build typed fields — only include intake-relevant keys
    if (assetType === "single_guide") {
      const fields: SingleGuideIntakeFields = {
        title: typeof parsed.title === "string" ? parsed.title : "",
        audience: typeof parsed.audience === "string" ? parsed.audience : "",
        purpose: typeof parsed.purpose === "string" ? parsed.purpose : "",
        goal: typeof parsed.goal === "string" ? parsed.goal : "",
        useCase: typeof parsed.useCase === "string" ? parsed.useCase : "",
        tone: isValidTone(parsed.tone) ? parsed.tone : "helpful",
        difficulty: isValidDifficulty(parsed.difficulty) ? parsed.difficulty : "intermediate",
        guideType: isValidGuideType(parsed.guideType) ? parsed.guideType : "guide",
        numberOfSteps: typeof parsed.numberOfSteps === "number" ? Math.max(3, Math.min(12, parsed.numberOfSteps)) : 5,
        hasWarnings: typeof parsed.hasWarnings === "boolean" ? parsed.hasWarnings : false,
        hasPrerequisites: typeof parsed.hasPrerequisites === "boolean" ? parsed.hasPrerequisites : false,
        optionalContext: typeof parsed.optionalContext === "string" ? parsed.optionalContext : "",
      }

      clearTimeout(routeTimeoutHandle)
      return NextResponse.json({
        success: true,
        fields,
        assumptions,
        missingInfo,
        couldBeBetterWith,
      } satisfies IntakeRefineResponse)
    }

    // checklist — clamp to safe generation defaults (max 5 sections, max 5 items)
    // This prevents AI from casually choosing 6+ which causes generation timeouts.
    const fields: ChecklistIntakeFields = {
      title: typeof parsed.title === "string" ? parsed.title : "",
      audience: typeof parsed.audience === "string" ? parsed.audience : "",
      purpose: typeof parsed.purpose === "string" ? parsed.purpose : "",
      goal: typeof parsed.goal === "string" ? parsed.goal : "",
      useCase: typeof parsed.useCase === "string" ? parsed.useCase : "",
      tone: isValidTone(parsed.tone) ? parsed.tone : "practical",
      numberOfSections: typeof parsed.numberOfSections === "number" ? Math.max(2, Math.min(5, parsed.numberOfSections)) : 4,
      itemsPerSection: typeof parsed.itemsPerSection === "number" ? Math.max(3, Math.min(5, parsed.itemsPerSection)) : 5,
      optionalContext: typeof parsed.optionalContext === "string" ? parsed.optionalContext : "",
    }

    clearTimeout(routeTimeoutHandle)
    return NextResponse.json({
      success: true,
      fields,
      assumptions,
      missingInfo,
      couldBeBetterWith,
    } satisfies IntakeRefineResponse)
  } catch (err) {
    clearTimeout(routeTimeoutHandle)
    const isAbort =
      routeAbortController.signal.aborted ||
      (err instanceof Error && (err.name === "AbortError" || err.message.includes("abort")))

    if (isAbort) {
      return NextResponse.json(
        { success: false, error: "Smart Fill took too long. Please try again.", stage: "route_timeout" },
        { status: 500 }
      )
    }

    const errorMsg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] intake-refine: Unexpected error:", errorMsg)
    return NextResponse.json(
      { success: false, error: "Smart Fill encountered an unexpected error. Please try again." },
      { status: 500 }
    )
  }
}

// ---------- Validators ----------

const VALID_TONES = ["practical", "helpful", "beginner-friendly", "technical", "detailed", "minimal"] as const
type ValidTone = typeof VALID_TONES[number]

function isValidTone(value: unknown): value is ValidTone {
  return typeof value === "string" && (VALID_TONES as readonly string[]).includes(value)
}

const VALID_DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as const
type ValidDifficulty = typeof VALID_DIFFICULTIES[number]

function isValidDifficulty(value: unknown): value is ValidDifficulty {
  return typeof value === "string" && (VALID_DIFFICULTIES as readonly string[]).includes(value)
}

const VALID_GUIDE_TYPES = ["guide", "tutorial", "reference", "explanation"] as const
type ValidGuideType = typeof VALID_GUIDE_TYPES[number]

function isValidGuideType(value: unknown): value is ValidGuideType {
  return typeof value === "string" && (VALID_GUIDE_TYPES as readonly string[]).includes(value)
}
