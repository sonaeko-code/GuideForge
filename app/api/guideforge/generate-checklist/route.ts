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
      model: DEFAULT_CHECKLIST_MODEL,
      maxTokens: MAX_GENERATION_TOKENS,
      repairsEnabled: MAX_REPAIR_ATTEMPTS > 0,
      ...debugInfo,
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
        temperature: GENERATION_TEMPERATURE,
        max_tokens: MAX_GENERATION_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })

    // Handle non-2xx responses
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
        elapsedMs: Date.now() - startTime,
      })

      clearTimeout(timeoutHandle)

      if (isAuthError) {
        throw new Error("AUTH_ERROR")
      } else if (isQuotaError) {
        throw new Error("QUOTA_ERROR")
      } else {
        throw new Error(`OPENAI_ERROR: ${errorDetail}`)
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
  
  try {
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

    const body: ChecklistGenerationRequest = await request.json()

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
    // TODO: Pass capped values to buildChecklistPrompt
    const prompt = buildChecklistPrompt(body)

    // Call OpenAI API with debug info
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
        elapsedBeforeCallMs: Date.now() - routeStartTime,
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
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
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

    // Schema passed, now check quality
    const qualityCheck = validateChecklistQuality(asset)
    if (!qualityCheck.valid) {
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

    // Success! Add source metadata
    asset.generatedBy = "openai"
    
    const totalElapsedMs = Date.now() - routeStartTime
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
