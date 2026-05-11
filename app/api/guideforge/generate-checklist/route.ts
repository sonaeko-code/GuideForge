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
import { buildChecklistPrompt } from "@/lib/guideforge/ai-prompts"
import { 
  DEFAULT_CHECKLIST_MODEL, 
  GENERATION_TEMPERATURE, 
  MAX_GENERATION_TOKENS, 
  MAX_REPAIR_ATTEMPTS,
  MAX_SECTIONS_AI_MVP,
  MAX_ITEMS_AI_MVP,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 50

/**
 * Call OpenAI API to generate checklist (no repairs in MVP).
 * Includes AbortController timeout (10 seconds) to prevent hangs.
 */
async function callOpenAI(apiKey: string, messages: any[], debugInfo: any = {}): Promise<string | null> {
  let openaiResponse: Response | null = null
  const controller = new AbortController()
  const startTime = Date.now()
  
  // Set timeout for the OpenAI request (10 seconds for MVP)
  const timeoutHandle = setTimeout(() => {
    console.log("[v0] API: OpenAI request timeout triggered after " + OPENAI_REQUEST_TIMEOUT_MS + "ms")
    controller.abort()
  }, OPENAI_REQUEST_TIMEOUT_MS)
  
  try {
    console.log("[v0] API: callOpenAI start", {
      endpoint: "/v1/chat/completions",
      model: DEFAULT_CHECKLIST_MODEL,
      maxTokensField: "max_tokens",
      maxTokensValue: MAX_GENERATION_TOKENS,
      responseFormatPresent: true,
      messagesCount: messages.length,
      smokeTest: debugInfo.smokeTest || false,
      elapsedBeforeCall: debugInfo.elapsedBeforeCall || 0,
      repairsEnabled: MAX_REPAIR_ATTEMPTS > 0,
    })
    
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_CHECKLIST_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: MAX_GENERATION_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })

    // Handle non-2xx responses
    if (!openaiResponse.ok) {
      let errorDetail = "Unknown error"
      let errorType = "unknown"
      let errorCode = "unknown"
      let errorParam = ""
      
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
          errorDetail = errorJson.error?.message || JSON.stringify(errorJson).substring(0, 200)
          errorType = errorJson.error?.type || "unknown"
          errorCode = errorJson.error?.code || "unknown"
          errorParam = errorJson.error?.param || ""
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
        type: errorType,
        code: errorCode,
        param: errorParam,
        isAuth: isAuthError,
        isQuota: isQuotaError,
        elapsedMs: Date.now() - startTime,
      })

      clearTimeout(timeoutHandle)

      if (isAuthError) {
        throw new Error("AUTH_ERROR")
      } else if (isQuotaError) {
        throw new Error("QUOTA_ERROR")
      } else {
        throw new Error(`OPENAI_ERROR_${openaiResponse.status}: ${errorType}`)
      }
    }

    // Parse successful response
    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      console.error("[v0] OpenAI returned empty content in response")
      clearTimeout(timeoutHandle)
      throw new Error("EMPTY_RESPONSE")
    }

    const elapsedMs = Date.now() - startTime
    console.log("[v0] API: OpenAI call succeeded in " + elapsedMs + "ms", {
      contentLength: content.length,
      model: DEFAULT_CHECKLIST_MODEL,
    })
    
    clearTimeout(timeoutHandle)
    return content
  } catch (err) {
    clearTimeout(timeoutHandle)
    
    // Check for timeout/abort errors
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.error("[v0] OpenAI request timed out after " + OPENAI_REQUEST_TIMEOUT_MS + "ms")
        throw new Error("OPENAI_TIMEOUT")
      }
    }
    
    // Re-throw with categorized error types
    if (err instanceof Error) {
      throw err
    }
    throw new Error("UNKNOWN_ERROR")
  }
}

/**
 * API Route Handler
 */
export async function POST(request: NextRequest) {
  const routeStartTime = Date.now()
  const ROUTE_VERSION = "ai-checklist-fast-mvp-v1"
  
  try {
    const body: ChecklistGenerationRequest = await request.json()
    
    // PHASE 1: Diagnostic-only mode (no OpenAI call, no cost)
    if ((body as any).diagnosticOnly === true) {
      console.log("[v0] API: Diagnostic-only mode requested")
      
      return NextResponse.json({
        success: true,
        diagnosticOnly: true,
        routeVersion: ROUTE_VERSION,
        model: DEFAULT_CHECKLIST_MODEL,
        maxTokens: MAX_GENERATION_TOKENS,
        maxRepairAttempts: MAX_REPAIR_ATTEMPTS,
        maxSectionsAiMvp: MAX_SECTIONS_AI_MVP,
        maxItemsAiMvp: MAX_ITEMS_AI_MVP,
        openaiRequestTimeoutMs: OPENAI_REQUEST_TIMEOUT_MS,
        runtime: "nodejs",
        maxDuration: 50,
        timestamp: new Date().toISOString(),
      })
    }
    
    // PHASE 4: Smoke test mode (minimal OpenAI call for connectivity check)
    if ((body as any).smokeTest === true) {
      console.log("[v0] API: Smoke test mode requested (minimal OpenAI call)")
      
      const apiKey = process.env.OPENAI_API_KEY?.trim()
      if (!apiKey) {
        return NextResponse.json(
          { success: false, smokeTest: true, error: "OPENAI_API_KEY not configured" },
          { status: 400 }
        )
      }
      
      const smokeStartTime = Date.now()
      const controller = new AbortController()
      const timeoutHandle = setTimeout(() => {
        console.log("[v0] API: Smoke test timeout after 8s")
        controller.abort()
      }, 8000)
      
      try {
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
                content: "Return JSON only.",
              },
              {
                role: "user",
                content: 'Return: {"ok":true}',
              },
            ],
            max_tokens: 20,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutHandle)
        
        if (!response.ok) {
          // Capture OpenAI error details
          let errorDetail = ""
          let errorType = ""
          let errorCode = ""
          
          try {
            const errorBody = await response.text()
            if (errorBody) {
              try {
                const errorJson = JSON.parse(errorBody)
                errorDetail = errorJson.error?.message || ""
                errorType = errorJson.error?.type || ""
                errorCode = errorJson.error?.code || ""
              } catch (_) {
                errorDetail = errorBody.substring(0, 100)
              }
            }
          } catch (_) {
            // Ignore error reading response body
          }
          
          return NextResponse.json({
            success: false,
            smokeTest: true,
            providerResponded: false,
            statusCode: response.status,
            error: errorDetail || `HTTP ${response.status}`,
            detail: `${errorType}${errorCode ? ` (${errorCode})` : ""}`.trim() || undefined,
            elapsedMs: Date.now() - smokeStartTime,
          }, { status: 500 })
        }
        
        const data = await response.json()
        return NextResponse.json({
          success: true,
          smokeTest: true,
          providerResponded: true,
          elapsedMs: Date.now() - smokeStartTime,
        })
      } catch (err) {
        clearTimeout(timeoutHandle)
        
        if (err instanceof Error && err.name === "AbortError") {
          return NextResponse.json({
            success: false,
            smokeTest: true,
            providerResponded: false,
            error: "OpenAI timeout",
            elapsedMs: Date.now() - smokeStartTime,
          }, { status: 504 })
        }
        
        return NextResponse.json({
          success: false,
          smokeTest: true,
          providerResponded: false,
          error: err instanceof Error ? err.message : "Unknown error",
          elapsedMs: Date.now() - smokeStartTime,
        }, { status: 500 })
      }
    }
    
    // PHASE 2: Debug-only full generation mode (no save, debug details only)
    if ((body as any).debugGenerateOnly === true) {
      console.log("[v0] API: debugGenerateOnly mode requested")
      
      const debugStartTime = Date.now()
      let currentStage = "body_parse"
      
      try {
        // Stage 1: Body validation
        console.log("[v0] DEBUG: Stage 1 - Body parse")
        currentStage = "body_parse"
        
        if (!body.title?.trim()) {
          throw new Error("Title is required")
        }
        if (!body.audience?.trim()) {
          throw new Error("Audience is required")
        }
        if (!body.goal?.trim()) {
          throw new Error("Goal is required")
        }
        if (!body.purpose?.trim()) {
          throw new Error("Purpose is required")
        }
        
        // Stage 2: Input clamping
        console.log("[v0] DEBUG: Stage 2 - Input clamping")
        currentStage = "input_clamp"
        
        const debugRequestedSections = Math.min(Math.max(body.numberOfSections || 4, 1), MAX_SECTIONS_AI_MVP)
        const debugRequestedItems = Math.min(Math.max(body.itemsPerSection || 5, 1), MAX_ITEMS_AI_MVP)
        
        console.log("[v0] DEBUG: Clamped values", {
          sections: debugRequestedSections,
          items: debugRequestedItems,
        })
        
        // Stage 3: Prompt building
        console.log("[v0] DEBUG: Stage 3 - Prompt build")
        currentStage = "prompt_build"
        
        const debugPrompt = buildChecklistPrompt(body)
        const debugPromptLength = debugPrompt.length
        
        console.log("[v0] DEBUG: Prompt built", {
          length: debugPromptLength,
        })
        
        // Stage 4: Message building
        console.log("[v0] DEBUG: Stage 4 - Message build")
        currentStage = "message_build"
        
        const debugMessages = [
          {
            role: "system",
            content: "You are a structured data generator for GuideForge. Return valid JSON only. Do not include markdown or explanations.",
          },
          {
            role: "user",
            content: debugPrompt,
          },
        ]
        
        console.log("[v0] DEBUG: Messages built", {
          count: debugMessages.length,
        })
        
        // Stage 5: Pre-OpenAI setup
        console.log("[v0] DEBUG: Stage 5 - Pre-OpenAI setup")
        currentStage = "pre_openai_setup"
        
        if (!apiKey) {
          throw new Error("OPENAI_API_KEY not configured")
        }
        
        console.log("[v0] DEBUG: Pre-OpenAI setup complete")
        
        // Stage 6: OpenAI call
        console.log("[v0] DEBUG: Stage 6 - OpenAI call starting")
        currentStage = "openai_call"
        
        const debugOpenaiStartTime = Date.now()
        let debugContent: string
        
        try {
          debugContent = await callOpenAI(apiKey, debugMessages, {
            sections: debugRequestedSections,
            itemsPerSection: debugRequestedItems,
            elapsedBeforeCallMs: debugOpenaiStartTime - debugStartTime,
            debugMode: true,
          })
          
          const debugOpenaiElapsedMs = Date.now() - debugOpenaiStartTime
          
          console.log("[v0] DEBUG: OpenAI call completed", {
            elapsedMs: debugOpenaiElapsedMs,
            contentLength: debugContent.length,
          })
        } catch (openaiErr) {
          const debugOpenaiElapsedMs = Date.now() - debugOpenaiStartTime
          const openaiErrorMessage = openaiErr instanceof Error ? openaiErr.message : "Unknown error"
          
          console.error("[v0] DEBUG: OpenAI call failed", {
            elapsedMs: debugOpenaiElapsedMs,
            error: openaiErrorMessage,
          })
          
          return NextResponse.json({
            success: false,
            debugGenerateOnly: true,
            stage: "openai_call",
            elapsedMs: Date.now() - debugStartTime,
            openaiElapsedMs: debugOpenaiElapsedMs,
            model: DEFAULT_CHECKLIST_MODEL,
            promptLength: debugPromptLength,
            error: openaiErrorMessage,
          })
        }
        
        // Stage 7: JSON parse
        console.log("[v0] DEBUG: Stage 7 - JSON parse")
        currentStage = "parse"
        
        let debugAsset: GeneratedChecklist
        try {
          debugAsset = JSON.parse(debugContent)
          console.log("[v0] DEBUG: JSON parse succeeded")
        } catch (parseErr) {
          const parseErrorMessage = parseErr instanceof Error ? parseErr.message : "Unknown error"
          console.error("[v0] DEBUG: JSON parse failed", {
            error: parseErrorMessage,
          })
          
          return NextResponse.json({
            success: false,
            debugGenerateOnly: true,
            stage: "parse",
            elapsedMs: Date.now() - debugStartTime,
            openaiElapsedMs: 0,
            model: DEFAULT_CHECKLIST_MODEL,
            promptLength: debugPromptLength,
            contentLength: debugContent.length,
            error: parseErrorMessage,
          })
        }
        
        // Stage 8: Schema validation
        console.log("[v0] DEBUG: Stage 8 - Schema validation")
        currentStage = "schema_validation"
        
        const debugSchemaValidation = validateGeneratedChecklist(debugAsset)
        if (!debugSchemaValidation.valid) {
          console.error("[v0] DEBUG: Schema validation failed", {
            errors: debugSchemaValidation.errors,
          })
          
          return NextResponse.json({
            success: false,
            debugGenerateOnly: true,
            stage: "schema_validation",
            elapsedMs: Date.now() - debugStartTime,
            openaiElapsedMs: 0,
            model: DEFAULT_CHECKLIST_MODEL,
            promptLength: debugPromptLength,
            contentLength: debugContent.length,
            error: "Schema validation failed",
            detail: debugSchemaValidation.errors[0] || "Unknown schema error",
          })
        }
        
        console.log("[v0] DEBUG: Schema validation passed")
        
        // Stage 9: Quality validation
        console.log("[v0] DEBUG: Stage 9 - Quality validation")
        currentStage = "quality_validation"
        
        const debugQualityValidation = validateChecklistQuality(debugAsset)
        if (!debugQualityValidation.valid) {
          console.error("[v0] DEBUG: Quality validation failed", {
            errors: debugQualityValidation.errors,
          })
          
          return NextResponse.json({
            success: false,
            debugGenerateOnly: true,
            stage: "quality_validation",
            elapsedMs: Date.now() - debugStartTime,
            openaiElapsedMs: 0,
            model: DEFAULT_CHECKLIST_MODEL,
            promptLength: debugPromptLength,
            contentLength: debugContent.length,
            error: "Quality validation failed",
            detail: debugQualityValidation.errors[0] || "Unknown quality error",
          })
        }
        
        console.log("[v0] DEBUG: Quality validation passed")
        
        // Stage 10: Success
        console.log("[v0] DEBUG: Stage 10 - Success")
        currentStage = "success"
        
        const debugTotalElapsedMs = Date.now() - debugStartTime
        console.log("[v0] DEBUG: Full generation succeeded (debugGenerateOnly - not saved)", {
          totalElapsedMs: debugTotalElapsedMs,
        })
        
        return NextResponse.json({
          success: true,
          debugGenerateOnly: true,
          stage: "success",
          elapsedMs: debugTotalElapsedMs,
          openaiElapsedMs: 0,
          model: DEFAULT_CHECKLIST_MODEL,
          promptLength: debugPromptLength,
          contentLength: debugContent.length,
          parseOk: true,
          schemaOk: true,
          qualityOk: true,
        })
      } catch (unexpectedErr) {
        const errorMessage = unexpectedErr instanceof Error ? unexpectedErr.message : "Unknown error"
        console.error("[v0] DEBUG: Unexpected error at stage", {
          stage: currentStage,
          error: errorMessage,
        })
        
        return NextResponse.json({
          success: false,
          debugGenerateOnly: true,
          stage: currentStage,
          elapsedMs: Date.now() - debugStartTime,
          model: DEFAULT_CHECKLIST_MODEL,
          error: errorMessage,
        }, { status: 500 })
      }
    }

    console.log("[v0] API: generateChecklist - Route start", {
      routeVersion: ROUTE_VERSION,
      model: DEFAULT_CHECKLIST_MODEL,
      maxTokens: MAX_GENERATION_TOKENS,
      maxRepairAttempts: MAX_REPAIR_ATTEMPTS,
      maxSectionsAiMvp: MAX_SECTIONS_AI_MVP,
      maxItemsAiMvp: MAX_ITEMS_AI_MVP,
      openaiRequestTimeoutMs: OPENAI_REQUEST_TIMEOUT_MS,
      runtime: "nodejs",
      maxDuration: 50,
    })
    
    const apiKey = process.env.OPENAI_API_KEY?.trim()

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

    // IMPORTANT: Cap sections and items for MVP speed
    // User can request up to 8/12, but we clamp to 4/5 for AI Generate MVP
    const requestedSections = Math.min(Math.max(body.numberOfSections || 4, 1), MAX_SECTIONS_AI_MVP)
    const requestedItems = Math.min(Math.max(body.itemsPerSection || 5, 1), MAX_ITEMS_AI_MVP)
    
    console.log("[v0] API: generateChecklist MVP - Starting for:", {
      title: body.title,
      sectionsRequested: body.numberOfSections,
      sectionsCapped: requestedSections,
      itemsRequested: body.itemsPerSection,
      itemsCapped: requestedItems,
      repairsEnabled: MAX_REPAIR_ATTEMPTS > 0,
      model: DEFAULT_CHECKLIST_MODEL,
      maxTokens: MAX_GENERATION_TOKENS,
    })

    // Build the prompt with capped values
    console.log("[v0] STAGE: Building prompt...")
    const promptStartTime = Date.now()
    const prompt = buildChecklistPrompt(body)
    const promptBuildMs = Date.now() - promptStartTime
    console.log("[v0] STAGE: Prompt built", {
      length: prompt.length,
      elapsedMs: promptBuildMs,
    })

    // Call OpenAI API with debug info
    console.log("[v0] STAGE: OpenAI call starting...")
    const openaiStartTime = Date.now()
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
      ], {
        sections: requestedSections,
        itemsPerSection: requestedItems,
        elapsedBeforeCallMs: openaiStartTime - routeStartTime,
      })
      const openaiMs = Date.now() - openaiStartTime
      console.log("[v0] STAGE: OpenAI call completed", {
        contentLength: content.length,
        elapsedMs: openaiMs,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      const totalElapsedMs = Date.now() - routeStartTime
      console.error("[v0] OpenAI API call failed after " + totalElapsedMs + "ms:", errorMsg)
      
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
      } else if (errorMsg === "OPENAI_TIMEOUT") {
        return NextResponse.json(
          {
            success: false,
            error: "AI generation took too long. Please try again.",
          },
          { status: 504 }
        )
      } else if (errorMsg.startsWith("OPENAI_ERROR_")) {
        // Extract status code from error message
        const parts = errorMsg.split(": ")
        const statusCode = parseInt(parts[0].replace("OPENAI_ERROR_", ""))
        const errorType = parts[1] || "request_error"
        
        // Return safe error details
        return NextResponse.json(
          {
            success: false,
            error: "OpenAI request failed. Please try again.",
            detail: `${errorType} (status: ${statusCode})`,
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
    console.log("[v0] STAGE: Parsing JSON...")
    const parseStartTime = Date.now()
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
      const parseMs = Date.now() - parseStartTime
      console.log("[v0] STAGE: JSON parse succeeded", {
        elapsedMs: parseMs,
      })
    } catch (parseErr) {
      const parseMs = Date.now() - parseStartTime
      console.error("[v0] STAGE: JSON parse failed", {
        elapsedMs: parseMs,
        error: parseErr instanceof Error ? parseErr.message : "Unknown",
      })
      console.error("[v0] Failed to parse OpenAI response as JSON")
      // Safely log first 300 chars of content
      const debugContent = (typeof content === "string" ? content : String(content)).substring(0, 300)
      console.error("[v0] Raw content:", debugContent)

      // MVP: No repair attempts - return error quickly
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid JSON. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    // Validate output (schema first, then quality)
    console.log("[v0] STAGE: Schema validation...")
    const schemaStartTime = Date.now()
    const validation = validateGeneratedChecklist(asset)
    const schemaMs = Date.now() - schemaStartTime
    
    if (!validation.valid) {
      console.log("[v0] STAGE: Schema validation failed", {
        elapsedMs: schemaMs,
        errors: validation.errors,
      })
      console.log("[v0] API: Schema validation failed (MVP: no repair)")
      console.log("[v0] Schema errors:", validation.errors)

      // MVP: No repair attempts - return error quickly
      return NextResponse.json(
        {
          success: false,
          error: "AI returned an incomplete checklist. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    console.log("[v0] STAGE: Schema validation passed", {
      elapsedMs: schemaMs,
    })

    // Schema passed, now check quality
    console.log("[v0] STAGE: Quality validation...")
    const qualityStartTime = Date.now()
    const qualityCheck = validateChecklistQuality(asset)
    const qualityMs = Date.now() - qualityStartTime
    
    if (!qualityCheck.valid) {
      console.log("[v0] STAGE: Quality validation failed", {
        elapsedMs: qualityMs,
        errors: qualityCheck.errors,
      })
      console.log("[v0] API: Schema passed but quality validation failed (MVP: no repair)")
      console.log("[v0] Quality errors:", qualityCheck.errors)

      // MVP: No repair attempts - return error quickly
      return NextResponse.json(
        {
          success: false,
          error: "AI generated a checklist, but it was too generic. Please try again with more context or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    console.log("[v0] STAGE: Quality validation passed", {
      elapsedMs: qualityMs,
    })

    // Success! Add source metadata
    asset.generatedBy = "openai"
    
    const totalElapsedMs = Date.now() - routeStartTime
    console.log("[v0] STAGE: Complete success", {
      totalElapsedMs,
    })
    console.log("[v0] API: generateChecklist MVP - Success! Total elapsed: " + totalElapsedMs + "ms", {
      model: DEFAULT_CHECKLIST_MODEL,
      sections: requestedSections,
      itemsPerSection: requestedItems,
      repairsEnabled: MAX_REPAIR_ATTEMPTS > 0,
    })
    
    return NextResponse.json({
      success: true,
      asset,
      debug: {
        model: DEFAULT_CHECKLIST_MODEL,
        maxTokens: MAX_GENERATION_TOKENS,
        repairsEnabled: MAX_REPAIR_ATTEMPTS > 0,
        requestedSections: body.numberOfSections,
        cappedSections: requestedSections,
        requestedItems: body.itemsPerSection,
        cappedItems: requestedItems,
        totalElapsedMs,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    const totalElapsedMs = Date.now() - routeStartTime
    
    // Log the actual error for debugging
    console.error("[v0] generateChecklist API error after " + totalElapsedMs + "ms:", err)
    
    // Check if it's a body-stream error and log with context
    if (typeof msg === "string" && msg.includes("body stream")) {
      console.error("[v0] Body stream error - likely due to multiple reads of the same Response object")
    }
    
    // Always return a friendly error to user
    return NextResponse.json(
      {
        success: false,
        error: "AI generation failed. Please try again or use Mock Preview.",
      },
      { status: 500 }
    )
  }
}
