/**
 * Generate Checklist - Server API Route
 *
 * POST /api/guideforge/generate-checklist
 *
 * Server-side endpoint for AI generation.
 * Uses OPENAI_API_KEY (server-only).
 * Uses gpt-4o-mini model for fast, cost-effective generation.
 * MVP approach: one OpenAI call, no repair loops.
 * All paths (normal and debug) have timeout protection to ensure JSON responses.
 */

import { NextRequest, NextResponse } from "next/server"
import type { ChecklistGenerationRequest } from "@/lib/guideforge/ai-generation-types"
import type { GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { validateGeneratedChecklist } from "@/lib/guideforge/ai-generation-validation"
import { validateChecklistQuality } from "@/lib/guideforge/checklist-quality-validation"
import { buildChecklistPrompt } from "@/lib/guideforge/ai-prompts"
import { DEFAULT_CHECKLIST_MODEL, GENERATION_TEMPERATURE, MAX_GENERATION_TOKENS } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

/** Hard ceiling for the OpenAI call inside the debug path.
 *  Must be well under maxDuration (30 s) so we always return JSON
 *  before Vercel sends a 504 HTML response. Set to 12s for structured checklist generation. */
const DEBUG_OPENAI_TIMEOUT_MS = 12000

/** Hard ceiling for the entire debug route.
 *  Must be much lower than maxDuration to ensure we return JSON
 *  before Vercel's function timeout. Returns error JSON if exceeded. */
const DEBUG_ROUTE_TIMEOUT_MS = 15000

/** Hard ceiling for the OpenAI call in normal (non-debug) path.
 *  Must be well under maxDuration (30 s). Set to 22s for normal generation with buffer. */
const NORMAL_OPENAI_TIMEOUT_MS = 22000

/** Hard ceiling for the entire normal route.
 *  Must be much lower than maxDuration to ensure we return JSON
 *  before Vercel's function timeout. Returns error JSON if exceeded. */
const NORMAL_ROUTE_TIMEOUT_MS = 27000

/**
 * Call OpenAI API to generate or repair checklist
 */
async function callOpenAI(
  apiKey: string,
  messages: any[],
  signal?: AbortSignal
): Promise<string | null> {
  let openaiResponse: Response | null = null
  
  try {
    console.log("[v0] API: Calling OpenAI with model:", DEFAULT_CHECKLIST_MODEL)
    
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_CHECKLIST_MODEL,
        messages,
        temperature: GENERATION_TEMPERATURE,
        max_tokens: MAX_GENERATION_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal,
    })

    // Handle non-2xx responses safely
    if (!openaiResponse.ok) {
      let errorDetail = "Unknown error"
      
      // Read response body exactly once
      let responseBodyText: string
      try {
        responseBodyText = await openaiResponse.text()
      } catch (readErr) {
        console.error("[v0] API: Failed to read OpenAI error response body", readErr)
        responseBodyText = ""
      }
      
      // Try to parse as JSON
      if (responseBodyText) {
        try {
          const errorJson = JSON.parse(responseBodyText)
          errorDetail = errorJson.error?.message || JSON.stringify(errorJson)
        } catch (_) {
          // If JSON parse fails, use the text as-is
          errorDetail = (typeof responseBodyText === "string" ? responseBodyText : String(responseBodyText)).substring(0, 200)
        }
      }

      const isAuthError = openaiResponse.status === 401 || errorDetail.includes("authentication") || errorDetail.includes("invalid_api_key")
      const isQuotaError = openaiResponse.status === 429 || errorDetail.includes("rate") || errorDetail.includes("quota")
      
      // Ensure errorDetail is a string before calling substring
      const errorDetailSafe = (typeof errorDetail === "string" ? errorDetail : String(errorDetail)).substring(0, 200)
      
      console.error("[v0] OpenAI API error:", {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        detail: errorDetailSafe,
        isAuth: isAuthError,
        isQuota: isQuotaError,
      })

      if (isAuthError) {
        throw new Error("AUTH_ERROR")
      } else if (isQuotaError) {
        throw new Error("QUOTA_ERROR")
      } else {
        throw new Error(`OPENAI_ERROR: ${errorDetail}`)
      }
    }

    // Parse successful response - body is unread, so json() is safe here
    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      console.error("[v0] OpenAI returned empty content in response")
      throw new Error("EMPTY_RESPONSE")
    }

    console.log("[v0] API: OpenAI returned content (" + content.length + " chars)")
    return content
  } catch (err) {
    // Re-throw with categorized error types for the caller to handle
    if (err instanceof Error) {
      throw err
    }
    throw new Error("UNKNOWN_ERROR")
  }
}

/**
 * Attempt to repair invalid output
 */
/**
 * Debug-only mode: trace through generation stages with detailed timing and validation
 * Returns object with stage results instead of final asset
 * 
 * Wrapped with a hard timeout (DEBUG_ROUTE_TIMEOUT_MS) to ensure this function
 * always returns JSON before Vercel's FUNCTION_INVOCATION_TIMEOUT fires.
 */
async function debugGenerateOnly(request: NextRequest, body: ChecklistGenerationRequest) {
  // Initialize all debug tracking variables upfront, before any try/catch or error handling
  let debugStage = "body_parse"
  let debugElapsedMs = 0
  let debugOpenaiElapsedMs: number | undefined = undefined
  let debugModel = DEFAULT_CHECKLIST_MODEL
  let debugPromptLength = 0
  let debugContentLength: number | undefined = undefined

  // API key debug variables - declared BEFORE any try/catch
  let debugApiKeyPresent = false
  let debugApiKeyLength = 0
  let debugApiKeyMasked = "not_configured"
  let debugApiKeyErrorDetail: string | null = null

  // Parse result tracking
  let debugParseSuccess = false
  let debugParseError: string | null = null

  // Validation result tracking
  let debugSchemaValidValid = false
  let debugSchemaValidErrors: string[] = []
  let debugQualityValidValid = false
  let debugQualityValidErrors: string[] = []

  const startTime = Date.now()
  
  // Hard route-level timeout: if we exceed this, return error JSON
  // before Vercel's function timeout can send us a 504 HTML response.
  const debugRouteAbortController = new AbortController()
  const debugRouteTimeoutHandle = setTimeout(() => {
    debugRouteAbortController.abort()
  }, DEBUG_ROUTE_TIMEOUT_MS)

  try {
    // STAGE: body_parse
    debugStage = "body_parse"
    if (!body.title?.trim() || !body.audience?.trim() || !body.goal?.trim() || !body.purpose?.trim()) {
      throw new Error("Required fields missing")
    }

    // STAGE: input_clamp
    debugStage = "input_clamp"
    const clampedRequest = {
      ...body,
      numberOfSections: Math.max(1, Math.min(8, body.numberOfSections)),
      itemsPerSection: Math.max(1, Math.min(12, body.itemsPerSection)),
    }

    // STAGE: prompt_build
    debugStage = "prompt_build"
    const prompt = buildChecklistPrompt(clampedRequest)
    debugPromptLength = prompt.length

    // STAGE: message_build
    debugStage = "message_build"
    const messages = [
      {
        role: "system" as const,
        content:
          "You are a structured data generator for GuideForge. Return valid JSON only. Do not include markdown or explanations.",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ]

    // STAGE: api_key_check - ALL VARIABLES DECLARED BEFORE THIS BLOCK
    debugStage = "api_key_check"
    const rawOpenAiApiKey = process.env.OPENAI_API_KEY ?? ""
    debugApiKeyPresent = rawOpenAiApiKey.length > 0
    debugApiKeyLength = rawOpenAiApiKey.length
    debugApiKeyMasked = debugApiKeyPresent
      ? `${rawOpenAiApiKey.slice(0, 7)}...${rawOpenAiApiKey.slice(-4)}`
      : "not_configured"

    if (!debugApiKeyPresent) {
      debugApiKeyErrorDetail = "OPENAI_API_KEY is not configured"
      throw new Error(debugApiKeyErrorDetail)
    }

    // Check route-level timeout before proceeding
    if (debugRouteAbortController.signal.aborted) {
      clearTimeout(debugRouteTimeoutHandle)
      debugElapsedMs = Date.now() - startTime
      debugStage = "route_timeout"
      return NextResponse.json(
        {
          success: false,
          stage: debugStage,
          elapsedMs: debugElapsedMs,
          error: `Debug route exceeded ${DEBUG_ROUTE_TIMEOUT_MS}ms timeout`,
          detail: "The entire debug pipeline took too long. Likely stuck in a previous stage.",
        },
        { status: 200 }
      )
    }

    // STAGE: openai_call — raced against a hard timeout so we always
    // return JSON before Vercel can send a 504 HTML response.
    debugStage = "openai_call"
    const openaiStartTime = Date.now()

    const debugAbortController = new AbortController()
    const debugTimeoutHandle = setTimeout(() => {
      debugAbortController.abort()
    }, DEBUG_OPENAI_TIMEOUT_MS)

    let content: string | null = null
    try {
      content = await callOpenAI(rawOpenAiApiKey, messages, debugAbortController.signal)
    } catch (openaiErr) {
      clearTimeout(debugTimeoutHandle)
      debugOpenaiElapsedMs = Date.now() - openaiStartTime

      // Distinguish an abort (timeout) from any other OpenAI error
      const isAbort =
        debugAbortController.signal.aborted ||
        (openaiErr instanceof Error && (openaiErr.name === "AbortError" || openaiErr.message.includes("abort")))

      if (isAbort) {
        clearTimeout(debugRouteTimeoutHandle)
        debugStage = "openai_timeout"
        const timeoutMsg = `OpenAI request timed out after ${DEBUG_OPENAI_TIMEOUT_MS}ms`
        console.error("[v0] Debug: " + timeoutMsg)
        debugElapsedMs = Date.now() - startTime

        return NextResponse.json(
          {
            success: false,
            stage: debugStage,
            elapsedMs: debugElapsedMs,
            openaiElapsedMs: debugOpenaiElapsedMs,
            model: debugModel,
            promptLength: debugPromptLength,
            contentLength: null,
            apiKeyPresent: debugApiKeyPresent,
            apiKeyLength: debugApiKeyLength,
            apiKeyMasked: debugApiKeyMasked,
            error: timeoutMsg,
            detail: "The request reached OpenAI but did not return before the debug timeout.",
          },
          { status: 200 }
        )
      }

      // Non-timeout OpenAI error — re-throw so the outer catch handles it
      throw openaiErr
    }

    clearTimeout(debugTimeoutHandle)
    debugOpenaiElapsedMs = Date.now() - openaiStartTime

    if (!content) {
      throw new Error("Empty response from OpenAI")
    }
    debugContentLength = content.length

    // STAGE: parse
    debugStage = "parse"
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
      debugParseSuccess = true
    } catch (parseErr) {
      debugParseSuccess = false
      debugParseError = parseErr instanceof Error ? parseErr.message : String(parseErr)
      throw parseErr
    }

    // STAGE: schema_validation
    debugStage = "schema_validation"
    const schemaValidation = validateGeneratedChecklist(asset)
    debugSchemaValidValid = schemaValidation.valid
    debugSchemaValidErrors = schemaValidation.errors

    if (!debugSchemaValidValid) {
      throw new Error(`Schema validation failed: ${schemaValidation.errors.join(", ")}`)
    }

    // STAGE: quality_validation
    debugStage = "quality_validation"
    const qualityValidation = validateChecklistQuality(asset)
    debugQualityValidValid = qualityValidation.valid
    debugQualityValidErrors = qualityValidation.errors

    if (!debugQualityValidValid) {
      throw new Error(`Quality validation failed: ${qualityValidation.errors.join(", ")}`)
    }

    clearTimeout(debugRouteTimeoutHandle)
    debugStage = "success"
    debugElapsedMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      stage: debugStage,
      elapsedMs: debugElapsedMs,
      openaiElapsedMs: debugOpenaiElapsedMs,
      model: debugModel,
      promptLength: debugPromptLength,
      contentLength: debugContentLength,
      apiKeyPresent: debugApiKeyPresent,
      apiKeyLength: debugApiKeyLength,
      apiKeyMasked: debugApiKeyMasked,
      parseSuccess: debugParseSuccess,
      parseError: debugParseError,
      schemaValidValid: debugSchemaValidValid,
      schemaValidErrors: debugSchemaValidErrors,
      qualityValidValid: debugQualityValidValid,
      qualityValidErrors: debugQualityValidErrors,
      asset,
    })
  } catch (err) {
    clearTimeout(debugRouteTimeoutHandle)
    debugElapsedMs = Date.now() - startTime

    // Check if this was a route-level timeout
    if (debugRouteAbortController.signal.aborted) {
      const timeoutMsg = `Debug route exceeded ${DEBUG_ROUTE_TIMEOUT_MS}ms timeout`
      console.error("[v0] Debug: " + timeoutMsg)
      return NextResponse.json(
        {
          success: false,
          stage: "route_timeout",
          elapsedMs: debugElapsedMs,
          error: timeoutMsg,
          detail: "The entire debug pipeline took too long.",
        },
        { status: 200 }
      )
    }

    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[v0] Debug stage '${debugStage}' failed:`, err)

    return NextResponse.json(
      {
        success: false,
        stage: debugStage,
        elapsedMs: debugElapsedMs,
        openaiElapsedMs: debugOpenaiElapsedMs,
        model: debugModel,
        promptLength: debugPromptLength,
        contentLength: debugContentLength,
        apiKeyPresent: debugApiKeyPresent,
        apiKeyLength: debugApiKeyLength,
        apiKeyMasked: debugApiKeyMasked,
        apiKeyErrorDetail: debugApiKeyErrorDetail,
        parseSuccess: debugParseSuccess,
        parseError: debugParseError,
        schemaValidValid: debugSchemaValidValid,
        schemaValidErrors: debugSchemaValidErrors,
        qualityValidValid: debugQualityValidValid,
        qualityValidErrors: debugQualityValidErrors,
        error: errorMsg,
        detail: errorMsg,
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check for debug mode query parameter
  const url = new URL(request.url)
  const isDebugMode = url.searchParams.get("debug") === "true"

  // Initialize route-level timeout for normal (non-debug) path
  let normalRouteAbortController: AbortController | null = null
  let normalRouteTimeoutHandle: NodeJS.Timeout | null = null

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim()

    // Parse body first to allow debug mode to use it
    const body: ChecklistGenerationRequest = await request.json()

    // Route to debug handler if requested
    if (isDebugMode) {
      return await debugGenerateOnly(request, body)
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI generation is not configured. Please set OPENAI_API_KEY environment variable.",
        },
        { status: 400 }
      )
    }

    // Validate intake request
    if (!body.title?.trim()) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      )
    }
    if (!body.audience?.trim()) {
      return NextResponse.json(
        { success: false, error: "audience is required" },
        { status: 400 }
      )
    }
    if (!body.goal?.trim()) {
      return NextResponse.json(
        { success: false, error: "goal is required" },
        { status: 400 }
      )
    }
    if (!body.purpose?.trim()) {
      return NextResponse.json(
        { success: false, error: "purpose is required" },
        { status: 400 }
      )
    }

    console.log("[v0] API: generateChecklist - Starting AI generation for:", body.title)

    // Set up route-level timeout to ensure we return JSON before Vercel timeout
    normalRouteAbortController = new AbortController()
    normalRouteTimeoutHandle = setTimeout(() => {
      normalRouteAbortController!.abort()
    }, NORMAL_ROUTE_TIMEOUT_MS)

    // Build the prompt
    const prompt = buildChecklistPrompt(body)

    // Call OpenAI API with timeout protection
    let content: string | null = null
    try {
      const openaiAbortController = new AbortController()
      const openaiTimeoutHandle = setTimeout(() => {
        openaiAbortController.abort()
      }, NORMAL_OPENAI_TIMEOUT_MS)

      try {
        content = await callOpenAI(apiKey, [
          {
            role: "system",
            content:
              "You are a structured data generator for GuideForge. Return valid JSON only. Do not include markdown or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ], openaiAbortController.signal)
      } finally {
        clearTimeout(openaiTimeoutHandle)
      }

      if (!content) {
        clearTimeout(normalRouteTimeoutHandle!)
        return NextResponse.json(
          {
            success: false,
            error: "AI returned an incomplete response. Please try again.",
          },
          { status: 500 }
        )
      }
    } catch (openaiErr) {
      // Check if this was a timeout
      const isAbort =
        normalRouteAbortController!.signal.aborted ||
        (openaiErr instanceof Error && (openaiErr.name === "AbortError" || openaiErr.message.includes("abort")))

      if (isAbort) {
        clearTimeout(normalRouteTimeoutHandle!)
        console.error("[v0] OpenAI call timed out after", NORMAL_OPENAI_TIMEOUT_MS, "ms")
        return NextResponse.json(
          {
            success: false,
            error: "AI generation is taking too long. Please try again.",
            stage: "openai_timeout",
          },
          { status: 500 }
        )
      }

      const errorMsg = openaiErr instanceof Error ? openaiErr.message : "Unknown error"
      console.error("[v0] OpenAI API call failed:", errorMsg)

      clearTimeout(normalRouteTimeoutHandle!)

      // Provide user-friendly error messages based on error type
      if (errorMsg === "AUTH_ERROR") {
        return NextResponse.json(
          {
            success: false,
            error: "AI generation authentication failed. Check OPENAI_API_KEY.",
          },
          { status: 401 }
        )
      } else if (errorMsg === "QUOTA_ERROR") {
        return NextResponse.json(
          {
            success: false,
            error: "AI generation is temporarily unavailable. Check API usage or billing.",
          },
          { status: 429 }
        )
      } else if (errorMsg === "EMPTY_RESPONSE") {
        return NextResponse.json(
          {
            success: false,
            error: "AI returned an incomplete response. Please try again.",
          },
          { status: 500 }
        )
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "AI generation failed. Please try again.",
          },
          { status: 500 }
        )
      }
    }

    // Parse AI response — MVP: no repair loop
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
    } catch (parseErr) {
      console.error("[v0] Failed to parse OpenAI response as JSON")
      const debugContent = (typeof content === "string" ? content : String(content)).substring(0, 300)
      console.error("[v0] Raw content:", debugContent)
      clearTimeout(normalRouteTimeoutHandle!)
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid JSON. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    // Validate output (schema first, then quality) — MVP: no repair loop
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
      console.log("[v0] API: Schema validation failed")
      console.log("[v0] Schema errors:", validation.errors)
      clearTimeout(normalRouteTimeoutHandle!)
      return NextResponse.json(
        {
          success: false,
          error: "AI returned an incomplete checklist. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    // Schema passed, now check quality
    const qualityCheck = validateChecklistQuality(asset)
    if (!qualityCheck.valid) {
      console.log("[v0] API: Quality validation failed")
      console.log("[v0] Quality errors:", qualityCheck.errors)
      clearTimeout(normalRouteTimeoutHandle!)
      return NextResponse.json(
        {
          success: false,
          error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    clearTimeout(normalRouteTimeoutHandle!)
    console.log("[v0] API: generateChecklist - Success!")

    // Add source metadata
    asset.generatedBy = "openai"

    return NextResponse.json({
      success: true,
      asset,
      repaired: false,
    })
  } catch (err) {
    if (normalRouteTimeoutHandle) {
      clearTimeout(normalRouteTimeoutHandle)
    }

    // Check if this was a route-level timeout
    if (normalRouteAbortController && normalRouteAbortController.signal.aborted) {
      console.error("[v0] Generation exceeded", NORMAL_ROUTE_TIMEOUT_MS, "ms timeout")
      return NextResponse.json(
        {
          success: false,
          error: "AI generation is taking too long. Please try again.",
          stage: "route_timeout",
        },
        { status: 500 }
      )
    }

    const msg = err instanceof Error ? err.message : "Unknown error"

    // Log the actual error for debugging
    console.error("[v0] generateChecklist API error:", err)

    // Check if it's a body-stream error and log with context
    if (typeof msg === "string" && msg.includes("body stream")) {
      console.error("[v0] Body stream error - likely due to multiple reads of the same Response object")
    }

    // Always return a friendly error to user
    return NextResponse.json(
      {
        success: false,
        error: "AI generation failed. Please try again.",
      },
      { status: 500 }
    )
  }
}
