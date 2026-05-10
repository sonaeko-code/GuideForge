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

/**
 * Call OpenAI API to generate or repair checklist
 */
async function callOpenAI(apiKey: string, messages: any[]): Promise<string | null> {
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

export async function POST(request: NextRequest) {
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
