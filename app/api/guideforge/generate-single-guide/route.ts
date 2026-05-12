/**
 * Generate Single Guide - Server API Route
 *
 * POST /api/guideforge/generate-single-guide
 *
 * Server-side endpoint for AI-powered single guide generation.
 * Uses OPENAI_API_KEY (server-only).
 * Mirrors the structure of generate-checklist/route.ts.
 * MVP approach: one OpenAI call, no repair loops.
 * All paths have timeout protection to ensure JSON responses.
 */

import { NextRequest, NextResponse } from "next/server"
import type { SingleGuideGenerationRequest } from "@/lib/guideforge/ai-generation-types"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"
import { buildSingleGuidePrompt } from "@/lib/guideforge/ai-prompts"
import { DEFAULT_SINGLE_GUIDE_MODEL, GENERATION_TEMPERATURE, MAX_GENERATION_TOKENS } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

/** Hard ceiling for the OpenAI call. Must be well under maxDuration. */
const OPENAI_TIMEOUT_MS = 22000

/** Hard ceiling for the entire route. Returns error JSON if exceeded. */
const ROUTE_TIMEOUT_MS = 27000

// ─── OpenAI helper ─────────────────────────────────────────────────────────

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  signal?: AbortSignal
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_SINGLE_GUIDE_MODEL,
      messages,
      temperature: GENERATION_TEMPERATURE,
      max_tokens: MAX_GENERATION_TOKENS,
      response_format: { type: "json_object" },
    }),
    signal,
  })

  if (!response.ok) {
    let errorDetail = "Unknown error"
    try {
      const text = await response.text()
      try {
        const json = JSON.parse(text)
        errorDetail = json.error?.message || JSON.stringify(json)
      } catch {
        errorDetail = text.substring(0, 200)
      }
    } catch {
      // body read failed
    }

    const isAuth = response.status === 401 || errorDetail.includes("authentication") || errorDetail.includes("invalid_api_key")
    const isQuota = response.status === 429 || errorDetail.includes("rate") || errorDetail.includes("quota")

    if (isAuth) throw new Error("AUTH_ERROR")
    if (isQuota) throw new Error("QUOTA_ERROR")
    throw new Error(`OPENAI_ERROR: ${errorDetail}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ─── Validation ─────────────────────────────────────────────────────────────

function validateSingleGuide(raw: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Response is not an object"] }
  }

  const obj = raw as Record<string, unknown>

  if (obj.assetType !== "single_guide") errors.push(`assetType must be "single_guide", got "${obj.assetType}"`)
  if (typeof obj.title !== "string" || obj.title.trim().length < 3) errors.push("title must be a non-empty string")
  if (typeof obj.summary !== "string" || obj.summary.trim().length < 10) errors.push("summary must be at least 10 characters")
  if (typeof obj.audience !== "string" || obj.audience.trim().length < 2) errors.push("audience must be a non-empty string")
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    errors.push("steps must be a non-empty array")
  } else {
    obj.steps.forEach((step: unknown, i: number) => {
      if (!step || typeof step !== "object") {
        errors.push(`steps[${i}] must be an object`)
        return
      }
      const s = step as Record<string, unknown>
      if (typeof s.title !== "string" || s.title.trim().length < 3) {
        errors.push(`steps[${i}].title must be at least 3 characters`)
      }
      if (typeof s.body !== "string" || s.body.trim().length < 20) {
        errors.push(`steps[${i}].body must be at least 20 characters`)
      }
    })
  }
  if (!Array.isArray(obj.requirements)) errors.push("requirements must be an array")
  if (!Array.isArray(obj.warnings)) errors.push("warnings must be an array")
  if (!Array.isArray(obj.tags)) errors.push("tags must be an array")

  return { valid: errors.length === 0, errors }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Route-level timeout: always return JSON before Vercel 504
  const routeTimeoutPromise = new Promise<NextResponse>((resolve) =>
    setTimeout(
      () =>
        resolve(
          NextResponse.json(
            { success: false, error: "Route timed out. Please try again.", stage: "route_timeout" },
            { status: 504 }
          )
        ),
      ROUTE_TIMEOUT_MS
    )
  )

  const handlerPromise = (async (): Promise<NextResponse> => {
    // ── Parse request body ──────────────────────────────────────────────────
    let intake: SingleGuideGenerationRequest
    try {
      intake = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body", stage: "parse" }, { status: 400 })
    }

    // ── Basic validation ────────────────────────────────────────────────────
    if (!intake.title?.trim()) {
      return NextResponse.json({ success: false, error: "title is required", stage: "validation" }, { status: 400 })
    }
    if (!intake.audience?.trim()) {
      return NextResponse.json({ success: false, error: "audience is required", stage: "validation" }, { status: 400 })
    }
    if (!intake.purpose?.trim()) {
      return NextResponse.json({ success: false, error: "purpose is required", stage: "validation" }, { status: 400 })
    }

    // ── Check API key ───────────────────────────────────────────────────────
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY is not configured on this server.", stage: "config" },
        { status: 503 }
      )
    }

    // ── Build prompt ────────────────────────────────────────────────────────
    const systemPrompt = buildSingleGuidePrompt(intake)
    const messages = [
      {
        role: "system",
        content:
          "You are GuideForge, a structured guide generator. You output only valid JSON matching the schema provided. Never output markdown, explanations, or text outside the JSON object.",
      },
      {
        role: "user",
        content: systemPrompt,
      },
    ]

    // ── Call OpenAI with timeout ────────────────────────────────────────────
    let rawContent: string | null = null
    const openaiAbort = new AbortController()
    const openaiTimeout = setTimeout(() => openaiAbort.abort(), OPENAI_TIMEOUT_MS)

    try {
      rawContent = await callOpenAI(apiKey, messages, openaiAbort.signal)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === "AUTH_ERROR") {
        return NextResponse.json(
          { success: false, error: "OpenAI API key is invalid or expired.", stage: "openai_auth" },
          { status: 401 }
        )
      }
      if (msg === "QUOTA_ERROR") {
        return NextResponse.json(
          { success: false, error: "OpenAI quota exceeded. Try again later.", stage: "openai_quota" },
          { status: 429 }
        )
      }
      if (openaiAbort.signal.aborted) {
        return NextResponse.json(
          { success: false, error: "OpenAI call timed out. Try a shorter guide or fewer steps.", stage: "openai_timeout" },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { success: false, error: `OpenAI error: ${msg}`, stage: "openai_call" },
        { status: 502 }
      )
    } finally {
      clearTimeout(openaiTimeout)
    }

    if (!rawContent) {
      return NextResponse.json(
        { success: false, error: "OpenAI returned an empty response.", stage: "openai_empty" },
        { status: 502 }
      )
    }

    // ── Parse JSON response ─────────────────────────────────────────────────
    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      return NextResponse.json(
        { success: false, error: "OpenAI returned invalid JSON.", stage: "json_parse", raw: rawContent.substring(0, 300) },
        { status: 502 }
      )
    }

    // ── Validate structure ──────────────────────────────────────────────────
    const { valid, errors } = validateSingleGuide(parsed)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Generated guide failed validation.", stage: "validation", errors },
        { status: 502 }
      )
    }

    // ── Return success ──────────────────────────────────────────────────────
    const asset = parsed as GeneratedSingleGuide

    // Ensure arrays exist (defensive defaults)
    if (!Array.isArray(asset.requirements)) asset.requirements = []
    if (!Array.isArray(asset.warnings)) asset.warnings = []
    if (!Array.isArray(asset.tags)) asset.tags = []
    if (!Array.isArray(asset.assumptions)) asset.assumptions = []
    if (!Array.isArray(asset.missingInfo)) asset.missingInfo = []

    return NextResponse.json({ success: true, asset })
  })()

  return Promise.race([routeTimeoutPromise, handlerPromise])
}
