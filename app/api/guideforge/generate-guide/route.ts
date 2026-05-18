/**
 * Generate Network Guide - Server API Route
 *
 * POST /api/guideforge/generate-guide
 *
 * Server-side endpoint for AI-powered network guide generation.
 * Used by the Network Guide Generator at builder/network/[id]/generate.
 * Returns { success: true, guide: GeneratedGuide } on success.
 * Mirrors the structure of generate-single-guide/route.ts.
 */

import { NextRequest, NextResponse } from "next/server"
import type { GeneratedGuide } from "@/lib/guideforge/generation-schemas"
import { buildNetworkGuidePrompt } from "@/lib/guideforge/ai-prompts"
import {
  DEFAULT_NETWORK_GUIDE_MODEL,
  GENERATION_TEMPERATURE,
  MAX_GENERATION_TOKENS,
} from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

const OPENAI_TIMEOUT_MS = 22000
const ROUTE_TIMEOUT_MS = 27000

const VALID_SECTION_KINDS = new Set([
  "overview",
  "strengths",
  "weaknesses",
  "gear",
  "skill-priority",
  "rotation",
  "leveling",
  "mistakes",
  "patch-notes",
  "final-tips",
  "requirements",
  "warning",
  "custom",
])

const VALID_GUIDE_TYPES = new Set([
  "character-build",
  "walkthrough",
  "boss-guide",
  "beginner-guide",
  "patch-notes",
  "news",
  "repair-procedure",
  "sop",
  "tutorial",
  "reference",
])

const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced", "expert"])

// ─── OpenAI helper ───────────────────────────────────────────────────────────

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
      model: DEFAULT_NETWORK_GUIDE_MODEL,
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

    const isAuth =
      response.status === 401 ||
      errorDetail.includes("authentication") ||
      errorDetail.includes("invalid_api_key")
    const isQuota =
      response.status === 429 ||
      errorDetail.includes("rate") ||
      errorDetail.includes("quota")

    if (isAuth) throw new Error("AUTH_ERROR")
    if (isQuota) throw new Error("QUOTA_ERROR")
    throw new Error(`OPENAI_ERROR: ${errorDetail}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateNetworkGuide(raw: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Response is not an object"] }
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj.title !== "string" || obj.title.trim().length < 3) {
    errors.push("title must be at least 3 characters")
  }
  if (typeof obj.summary !== "string" || obj.summary.trim().length < 10) {
    errors.push("summary must be at least 10 characters")
  }
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) {
    errors.push("sections must be a non-empty array")
  } else {
    ;(obj.sections as unknown[]).forEach((section, i) => {
      if (!section || typeof section !== "object") {
        errors.push(`sections[${i}] must be an object`)
        return
      }
      const s = section as Record<string, unknown>
      if (typeof s.title !== "string" || s.title.trim().length < 3) {
        errors.push(`sections[${i}].title must be at least 3 characters`)
      }
      if (typeof s.body !== "string" || s.body.trim().length < 20) {
        errors.push(`sections[${i}].body must be at least 20 characters`)
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

// ─── Slug generator ──────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60)
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    let intake: {
      prompt?: string
      guideType?: string
      preferredDifficulty?: string
      targetHubId?: string
      networkId?: string
      networkName?: string
      targetCollectionId?: string
      forgeRuleContext?: string
    }
    try {
      intake = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body", stage: "parse" },
        { status: 400 }
      )
    }

    // ── Validate required fields ────────────────────────────────────────────
    if (!intake.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "prompt is required", stage: "validation" },
        { status: 400 }
      )
    }
    if (!intake.guideType?.trim()) {
      return NextResponse.json(
        { success: false, error: "guideType is required", stage: "validation" },
        { status: 400 }
      )
    }
    if (!intake.preferredDifficulty?.trim()) {
      return NextResponse.json(
        { success: false, error: "preferredDifficulty is required", stage: "validation" },
        { status: 400 }
      )
    }
    if (!intake.targetHubId?.trim()) {
      return NextResponse.json(
        { success: false, error: "targetHubId is required", stage: "validation" },
        { status: 400 }
      )
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
    const systemPrompt = buildNetworkGuidePrompt({
      prompt: intake.prompt,
      guideType: intake.guideType,
      preferredDifficulty: intake.preferredDifficulty,
      networkName: intake.networkName,
      targetHubId: intake.targetHubId,
      forgeRuleContext: intake.forgeRuleContext,
    })

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
    // Provider: openai — resolved by resolveGuideForgeProviderRoute({ mode: "ai", task: "network_guide" })
    // To add Claude: implement an Anthropic route handler and update the resolver.
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
          { success: false, error: "OpenAI call timed out. Try a shorter prompt.", stage: "openai_timeout" },
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
        {
          success: false,
          error: "OpenAI returned invalid JSON.",
          stage: "json_parse",
          raw: rawContent.substring(0, 300),
        },
        { status: 502 }
      )
    }

    // ── Validate structure ──────────────────────────────────────────────────
    const { valid, errors } = validateNetworkGuide(parsed)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Generated guide failed validation.", stage: "validation", errors },
        { status: 502 }
      )
    }

    // ── Normalize and assemble ──────────────────────────────────────────────
    const raw = parsed as Record<string, any>
    const now = new Date().toISOString()

    const sections = (raw.sections as any[]).map((s: any) => ({
      title: String(s.title ?? "").trim(),
      kind: VALID_SECTION_KINDS.has(s.kind) ? s.kind : "custom",
      body: String(s.body ?? "").trim(),
      ...(s.callout ? { callout: String(s.callout) } : {}),
    }))

    const guideType = VALID_GUIDE_TYPES.has(raw.type) ? raw.type : intake.guideType
    const difficulty = VALID_DIFFICULTIES.has(raw.difficulty)
      ? raw.difficulty
      : intake.preferredDifficulty
    const title = String(raw.title ?? "").trim() || "AI-Generated Guide"

    const guide: GeneratedGuide = {
      title,
      slug: slugify(title),
      summary: String(raw.summary ?? "").trim(),
      type: guideType,
      difficulty,
      estimatedMinutes:
        typeof raw.estimatedMinutes === "number"
          ? Math.min(Math.max(Math.round(raw.estimatedMinutes), 1), 300)
          : undefined,
      sections,
      requirements: Array.isArray(raw.requirements)
        ? (raw.requirements as any[]).filter((r) => typeof r === "string")
        : [],
      warnings: Array.isArray(raw.warnings)
        ? (raw.warnings as any[]).filter((w) => typeof w === "string")
        : [],
      version: typeof raw.version === "string" && raw.version ? raw.version : undefined,
      author: {
        displayName: "AI Generated",
        handle: "ai.generated",
      },
      generatedAt: now,
      generatedBy: "openai",
      generationPrompt: intake.prompt,
      generationModelUsed: DEFAULT_NETWORK_GUIDE_MODEL,
      tags: Array.isArray(raw.tags)
        ? (raw.tags as any[]).filter((t) => typeof t === "string")
        : [],
      targetNetworkId: intake.networkId,
      targetHubId: intake.targetHubId,
      targetCollectionId: intake.targetCollectionId,
    }

    return NextResponse.json({ success: true, guide })
  })()

  return Promise.race([routeTimeoutPromise, handlerPromise])
}
