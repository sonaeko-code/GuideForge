/**
 * Generate Checklist - Server API Route
 *
 * POST /api/guideforge/generate-checklist
 *
 * Server-side endpoint for AI generation.
 * Uses OPENAI_API_KEY (server-only).
 * Validates output before returning.
 * Attempts one repair pass if output is malformed.
 */

import { NextRequest, NextResponse } from "next/server"
import type { ChecklistGenerationRequest } from "@/lib/guideforge/ai-generation-types"
import type { GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { validateGeneratedChecklist } from "@/lib/guideforge/ai-generation-validation"
import { validateChecklistQuality } from "@/lib/guideforge/checklist-quality-validation"
import { buildChecklistPrompt, buildChecklistRepairPrompt } from "@/lib/guideforge/ai-prompts"
import { DEFAULT_CHECKLIST_MODEL, GENERATION_TEMPERATURE, MAX_GENERATION_TOKENS, MAX_REPAIR_ATTEMPTS } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

/** Hard ceiling for the OpenAI call inside the debug path.
 *  Must be well under maxDuration (30 s) so we always return JSON
 *  before Vercel sends a 504 HTML response. Set to 5s to give buffer. */
const DEBUG_OPENAI_TIMEOUT_MS = 5000

/** Hard ceiling for the entire debug route.
 *  Must be much lower than maxDuration to ensure we return JSON
 *  before Vercel's function timeout. Returns error JSON if exceeded. */
const DEBUG_ROUTE_TIMEOUT_MS = 9000

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
async function attemptRepair(
  apiKey: string,
  body: ChecklistGenerationRequest,
  invalidOutput: any,
  validationErrors: string[]
): Promise<GeneratedChecklist | null> {
  console.log("[v0] API: Attempting repair of invalid AI output...")

  try {
    const repairPrompt = buildChecklistRepairPrompt(body, invalidOutput, validationErrors)

    const repairContent = await callOpenAI(apiKey, [
      {
        role: "system",
        content:
          "You are a JSON repair specialist. Your job is to fix broken JSON output to match the GuideForge schema. Return valid JSON only.",
      },
      {
        role: "user",
        content: repairPrompt,
      },
    ])

    if (!repairContent) {
      console.log("[v0] API: Repair returned empty content")
      return null
    }

    let repairedAsset: GeneratedChecklist
    try {
      repairedAsset = JSON.parse(repairContent)
    } catch (err) {
      console.log("[v0] API: Repair JSON parsing failed")
      return null
    }

    const repairValidation = validateGeneratedChecklist(repairedAsset)
    if (repairValidation.valid) {
      console.log("[v0] API: Repair successful!")
      return repairedAsset
    } else {
      console.log("[v0] API: Repaired output still invalid:", repairValidation.errors)
      return null
    }
  } catch (err) {
    console.error("[v0] API: Repair attempt failed:", err instanceof Error ? err.message : String(err))
    return null
  }
}

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

    // Build the prompt
    const prompt = buildChecklistPrompt(body)

    // Call OpenAI API
    let content: string
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
      ])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] OpenAI API call failed:", errorMsg)
      
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

    // Parse AI response
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
    } catch (parseErr) {
      console.error("[v0] Failed to parse OpenAI response as JSON, attempting repair...")
      // Safely log first 300 chars of content
      const debugContent = (typeof content === "string" ? content : String(content)).substring(0, 300)
      console.error("[v0] Raw content:", debugContent)

      // If parsing fails, try repair pass
      if (MAX_REPAIR_ATTEMPTS > 0) {
        try {
          // Build repair prompt with the raw content that failed to parse
          const repairPrompt = buildChecklistRepairPrompt(body, { raw: content }, ["JSON parsing failed"])
          const repairContent = await callOpenAI(apiKey, [
            {
              role: "system",
              content: "You are a JSON repair specialist. Fix the following content to return valid JSON only.",
            },
            {
              role: "user",
              content: repairPrompt,
            },
          ])

          if (repairContent) {
            try {
              asset = JSON.parse(repairContent)
              console.log("[v0] JSON repair succeeded!")
              // Continue to validation below
            } catch (repairParseErr) {
              console.error("[v0] JSON repair parsing also failed")
              return NextResponse.json(
                {
                  success: false,
                  error: "AI returned an incomplete checklist. Please try again or use Mock Preview.",
                },
                { status: 500 }
              )
            }
          } else {
            return NextResponse.json(
              {
                success: false,
                error: "AI returned an incomplete checklist. Please try again or use Mock Preview.",
              },
              { status: 500 }
            )
          }
        } catch (repairErr) {
          console.error("[v0] JSON repair attempt failed:", repairErr instanceof Error ? repairErr.message : String(repairErr))
          return NextResponse.json(
            {
              success: false,
              error: "AI returned invalid JSON. Please try again or use Mock Preview.",
            },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "AI returned invalid JSON. Please try again or use Mock Preview.",
          },
          { status: 500 }
        )
      }
    }

    // Validate output (schema first, then quality)
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
      console.log("[v0] API: Schema validation failed, attempting repair...")
      console.log("[v0] Schema errors:", validation.errors)

      // Attempt one repair for schema errors
      if (MAX_REPAIR_ATTEMPTS > 0) {
        const repairedAsset = await attemptRepair(apiKey, body, asset, validation.errors)
        if (repairedAsset) {
          // Check quality after repair
          const qualityCheck = validateChecklistQuality(repairedAsset)
          if (!qualityCheck.valid) {
            console.log("[v0] API: Repair succeeded schema but failed quality check")
            return NextResponse.json(
              {
                success: false,
                error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview.",
              },
              { status: 500 }
            )
          }
          console.log("[v0] API: generateChecklist - Success after repair!")
          repairedAsset.generatedBy = "openai"
          return NextResponse.json({
            success: true,
            asset: repairedAsset,
            repaired: true,
          })
        }
      }

      // Repair failed or not attempted
      console.error("[v0] Generated asset failed schema validation (no successful repair):", validation.errors)
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
      console.log("[v0] API: Schema passed but quality validation failed, attempting repair...")
      console.log("[v0] Quality errors:", qualityCheck.errors)

      // Attempt one repair for quality issues
      if (MAX_REPAIR_ATTEMPTS > 0) {
        const repairedAsset = await attemptRepair(apiKey, body, asset, qualityCheck.errors)
        if (repairedAsset) {
          // Verify repair passes both schema and quality
          const schemaCheck = validateGeneratedChecklist(repairedAsset)
          if (!schemaCheck.valid) {
            console.log("[v0] API: Quality repair failed schema check")
            return NextResponse.json(
              {
                success: false,
                error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview.",
              },
              { status: 500 }
            )
          }
          const finalQualityCheck = validateChecklistQuality(repairedAsset)
          if (!finalQualityCheck.valid) {
            console.log("[v0] API: Quality repair still has quality issues")
            return NextResponse.json(
              {
                success: false,
                error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview.",
              },
              { status: 500 }
            )
          }
          console.log("[v0] API: generateChecklist - Success after quality repair!")
          repairedAsset.generatedBy = "openai"
          return NextResponse.json({
            success: true,
            asset: repairedAsset,
            repaired: true,
          })
        }
      }

      // Quality repair failed or not attempted
      console.error("[v0] Generated asset failed quality validation (no successful repair):", qualityCheck.errors)
      return NextResponse.json(
        {
          success: false,
          error: "AI generated a checklist, but it was too generic for GuideForge quality standards. Please try again with more context or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    console.log("[v0] API: generateChecklist - Success!")
    
    // Add source metadata
    asset.generatedBy = "openai"
    
    return NextResponse.json({
      success: true,
      asset,
      repaired: false,
    })
  } catch (err) {
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
