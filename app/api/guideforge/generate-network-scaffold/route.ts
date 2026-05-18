/**
 * Generate Network Scaffold — Server API Route
 *
 * POST /api/guideforge/generate-network-scaffold
 *
 * Generates an AI-powered network scaffold proposal from a user's rough idea.
 * Returns a structured proposal for user review. No Supabase writes. No guide creation.
 *
 * Provider: openai — resolved by resolveGuideForgeProviderRoute({ mode: "ai", task: "network_scaffold" })
 * To add Claude: implement an Anthropic route handler and update the resolver.
 */

import { NextRequest, NextResponse } from "next/server"
import type { GeneratedNetworkScaffold } from "@/lib/guideforge/generation-schemas"
import { resolveGuideForgeProviderRoute, normalizeGuideForgeAIError } from "@/lib/guideforge/ai-provider-routing"
import { DEFAULT_NETWORK_GUIDE_MODEL, GENERATION_TEMPERATURE } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 45

const OPENAI_TIMEOUT_MS = 35000
const ROUTE_TIMEOUT_MS = 40000
const MAX_SCAFFOLD_TOKENS = 3000

const VALID_REGISTRY_IDS = new Set([
  "gaming", "tech_repair", "creator_workflow", "small_business",
  "wellness_training", "home_systems", "restaurant_training",
  "personal_knowledge", "general",
])

const VALID_THEME_IDS = new Set([
  "ember", "arcane", "industrial", "neutral", "soft", "copper", "parchment",
])

const VALID_GUIDE_TYPES = new Set([
  "tutorial", "guide", "reference", "sop", "boss-guide", "character-build",
  "walkthrough", "beginner-guide", "repair-procedure", "patch-notes", "news",
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
      max_tokens: MAX_SCAFFOLD_TOKENS,
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

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildScaffoldPrompt(idea: string, requestedType?: string): string {
  const typeHint = requestedType && VALID_REGISTRY_IDS.has(requestedType)
    ? `\nThe user expects this to be a "${requestedType}" type network. Prefer that type if appropriate.`
    : ""

  return `Design a network scaffold for the following idea:

"${idea}"
${typeHint}

Return a JSON object with exactly this shape (no extra fields, no markdown, no code blocks):
{
  "name": "2-5 word branded network name — specific to the domain, not generic",
  "description": "1-2 sentences describing the network's purpose",
  "type": "exactly one of: gaming, tech_repair, creator_workflow, small_business, wellness_training, home_systems, restaurant_training, personal_knowledge, general",
  "theme": "exactly one of: ember, arcane, industrial, neutral, soft, copper, parchment",
  "visibility": "private",
  "hubs": [
    {
      "name": "2-4 word hub name — specific to the domain",
      "description": "one sentence describing what this hub covers",
      "collections": [
        {
          "name": "1-4 word collection name",
          "description": "one sentence describing the collection",
          "starterGuideIdeas": [
            {
              "title": "specific actionable guide title",
              "summary": "one sentence summary of what the guide covers",
              "guideType": "exactly one of: tutorial, guide, reference, sop, boss-guide, character-build, walkthrough, beginner-guide, repair-procedure, patch-notes",
              "difficulty": "exactly one of: beginner, intermediate, advanced"
            }
          ]
        }
      ]
    }
  ]
}

Rules — follow these exactly:
- Return 4-6 hubs total. No more, no less.
- Return 2-4 collections per hub.
- Return exactly 1 starter guide idea per collection. Some collections may have 0 if you cannot think of a specific idea.
- Total starter guide ideas across the whole network: 8-10 maximum.
- Hub names must be domain-specific. Avoid generic names like "General", "Resources", "Other", or "Miscellaneous".
- Guide titles must be specific and actionable — not generic like "Getting Started Guide".
- Network name must be professional, specific to the domain, and 2-5 words.
- Type must exactly match one of the valid values.
- Theme must exactly match one of the valid values.
- Visibility must be exactly "private".
- Use the user's domain language, named entities, and specific topics.`
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateNetworkScaffold(raw: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!raw || typeof raw !== "object") {
    return { valid: false, errors: ["Response is not an object"] }
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj.name !== "string" || obj.name.trim().length < 2) {
    errors.push("name must be at least 2 characters")
  }
  if (typeof obj.description !== "string" || obj.description.trim().length < 5) {
    errors.push("description must be at least 5 characters")
  }
  if (!Array.isArray(obj.hubs) || obj.hubs.length === 0) {
    errors.push("hubs must be a non-empty array")
  } else {
    if (obj.hubs.length > 10) {
      errors.push("too many hubs (max 10)")
    }
    ;(obj.hubs as unknown[]).forEach((hub, i) => {
      if (!hub || typeof hub !== "object") {
        errors.push(`hubs[${i}] must be an object`)
        return
      }
      const h = hub as Record<string, unknown>
      if (typeof h.name !== "string" || h.name.trim().length < 1) {
        errors.push(`hubs[${i}].name is required`)
      }
      if (!Array.isArray(h.collections) || h.collections.length === 0) {
        errors.push(`hubs[${i}].collections must be a non-empty array`)
      }
    })
  }

  return { valid: errors.length === 0, errors }
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeNetworkScaffold(raw: any): GeneratedNetworkScaffold {
  const now = new Date().toISOString()

  const normalizedType = VALID_REGISTRY_IDS.has(raw.type) ? raw.type : "general"
  const normalizedTheme = VALID_THEME_IDS.has(raw.theme) ? raw.theme : "parchment"

  const hubs = (Array.isArray(raw.hubs) ? raw.hubs : [])
    .slice(0, 8)
    .map((hub: any) => {
      const collections = (Array.isArray(hub.collections) ? hub.collections : [])
        .slice(0, 4)
        .map((col: any) => {
          const ideas = Array.isArray(col.starterGuideIdeas)
            ? col.starterGuideIdeas
                .slice(0, 2)
                .filter((idea: any) => typeof idea.title === "string" && idea.title.trim())
                .map((idea: any) => ({
                  title: String(idea.title ?? "").trim(),
                  summary: typeof idea.summary === "string" ? idea.summary.trim() : "",
                  guideType: VALID_GUIDE_TYPES.has(idea.guideType) ? idea.guideType : "guide",
                  difficulty: VALID_DIFFICULTIES.has(idea.difficulty) ? idea.difficulty : "beginner",
                }))
            : []

          return {
            name: String(col.name ?? "").trim() || "Untitled Collection",
            description: typeof col.description === "string" ? col.description.trim() : "",
            ...(ideas.length > 0 ? { starterGuideIdeas: ideas } : {}),
          }
        })
        .filter((col: any) => col.name.length > 0)

      return {
        name: String(hub.name ?? "").trim() || "Untitled Hub",
        description: typeof hub.description === "string" ? hub.description.trim() : "",
        collections,
      }
    })
    .filter((hub: any) => hub.name.length > 0 && hub.collections.length > 0)

  // Cap total starter guide ideas to 10
  let ideaCount = 0
  const cappedHubs = hubs.map((hub: any) => ({
    ...hub,
    collections: hub.collections.map((col: any) => {
      if (!col.starterGuideIdeas) return col
      const allowed = Math.max(0, 10 - ideaCount)
      const sliced = col.starterGuideIdeas.slice(0, allowed)
      ideaCount += sliced.length
      return { ...col, starterGuideIdeas: sliced.length > 0 ? sliced : undefined }
    }),
  }))

  return {
    name: String(raw.name ?? "").trim() || "AI-Generated Network",
    description: String(raw.description ?? "").trim(),
    type: normalizedType,
    theme: normalizedTheme,
    visibility: raw.visibility === "public" ? "public" : "private",
    hubs: cappedHubs,
    generatedAt: now,
    generatedBy: "openai",
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Provider: openai — resolved by resolveGuideForgeProviderRoute({ mode: "ai", task: "network_scaffold" })
  const route = resolveGuideForgeProviderRoute({ mode: "ai", task: "network_scaffold" })

  const routeTimeoutPromise = new Promise<NextResponse>((resolve) =>
    setTimeout(
      () =>
        resolve(
          NextResponse.json(
            { success: false, error: "Route timed out. Please try again.", code: "timeout" },
            { status: 504 }
          )
        ),
      ROUTE_TIMEOUT_MS
    )
  )

  const handlerPromise = (async (): Promise<NextResponse> => {
    // ── Parse request body ────────────────────────────────────────────────────
    let intake: {
      prompt?: string
      idea?: string
      requestedType?: string
      networkName?: string
    }
    try {
      intake = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body", code: "unknown" },
        { status: 400 }
      )
    }

    const rawPrompt = (intake.prompt || intake.idea || "").trim()
    if (!rawPrompt) {
      return NextResponse.json(
        { success: false, error: "prompt or idea is required", code: "unknown" },
        { status: 400 }
      )
    }

    // ── Check API key ─────────────────────────────────────────────────────────
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OPENAI_API_KEY is not configured on this server.", code: "unknown" },
        { status: 503 }
      )
    }

    // ── Build prompt ──────────────────────────────────────────────────────────
    const userPrompt = buildScaffoldPrompt(rawPrompt, intake.requestedType)

    const messages = [
      {
        role: "system",
        content:
          "You are GuideForge, a network architect AI. Your job is to design structured knowledge network scaffolds. Return only valid JSON matching the schema the user provides. Never output markdown, code blocks, explanations, or any text outside the JSON object. Be specific to the user's domain — avoid generic hub names like 'General', 'Resources', or 'Other' unless truly necessary.",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ]

    // ── Call OpenAI with timeout ───────────────────────────────────────────────
    let rawContent: string | null = null
    const openaiAbort = new AbortController()
    const openaiTimeout = setTimeout(() => openaiAbort.abort(), OPENAI_TIMEOUT_MS)

    try {
      rawContent = await callOpenAI(apiKey, messages, openaiAbort.signal)
    } catch (err) {
      const normalized = normalizeGuideForgeAIError(err, route.provider, "network_scaffold")
      if (normalized.code === "auth_error") {
        return NextResponse.json(
          { success: false, error: "OpenAI API key is invalid or expired.", code: normalized.code },
          { status: 401 }
        )
      }
      if (normalized.code === "quota_error") {
        return NextResponse.json(
          { success: false, error: "OpenAI quota exceeded. Try again later.", code: normalized.code },
          { status: 429 }
        )
      }
      if (normalized.code === "timeout" || openaiAbort.signal.aborted) {
        return NextResponse.json(
          { success: false, error: "AI scaffold generation timed out. Try a shorter prompt.", code: "timeout" },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { success: false, error: `AI generation error: ${normalized.message}`, code: normalized.code },
        { status: 502 }
      )
    } finally {
      clearTimeout(openaiTimeout)
    }

    if (!rawContent) {
      return NextResponse.json(
        { success: false, error: "AI returned an empty response.", code: "empty_response" },
        { status: 502 }
      )
    }

    // ── Parse JSON ────────────────────────────────────────────────────────────
    let parsed: unknown
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid JSON.",
          code: "unknown",
          raw: rawContent.substring(0, 300),
        },
        { status: 502 }
      )
    }

    // ── Validate structure ────────────────────────────────────────────────────
    const { valid, errors } = validateNetworkScaffold(parsed)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Generated scaffold failed validation.", code: "validation_failed", errors },
        { status: 502 }
      )
    }

    // ── Normalize and return ──────────────────────────────────────────────────
    const scaffold = normalizeNetworkScaffold(parsed)

    return NextResponse.json({
      success: true,
      scaffold,
      provider: route.provider,
      generatedAt: scaffold.generatedAt,
    })
  })()

  return Promise.race([routeTimeoutPromise, handlerPromise])
}
