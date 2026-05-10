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
import { buildChecklistPrompt, buildChecklistRepairPrompt } from "@/lib/guideforge/ai-prompts"
import { DEFAULT_CHECKLIST_MODEL, GENERATION_TEMPERATURE, MAX_GENERATION_TOKENS, MAX_REPAIR_ATTEMPTS } from "@/lib/guideforge/ai-generation-config"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * Call OpenAI API to generate or repair checklist
 */
async function callOpenAI(apiKey: string, messages: any[]): Promise<string | null> {
  const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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

  if (!openaiResponse.ok) {
    const error = await openaiResponse.json()
    console.error("[v0] OpenAI API error:", error)
    throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
  }

  const openaiData = await openaiResponse.json()
  const content = openaiData.choices[0]?.message?.content

  if (!content) {
    throw new Error("OpenAI returned empty response")
  }

  return content
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
      console.error("[v0] OpenAI API call failed:", err instanceof Error ? err.message : String(err))
      return NextResponse.json(
        {
          success: false,
          error: "AI generation failed. Please try again.",
        },
        { status: 500 }
      )
    }

    // Parse AI response
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
    } catch (err) {
      console.error("[v0] Failed to parse OpenAI response as JSON:", content.substring(0, 200))
      return NextResponse.json(
        {
          success: false,
          error: "AI returned invalid JSON. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    // Validate output
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
      console.log("[v0] API: Initial validation failed, attempting repair...")
      console.log("[v0] Validation errors:", validation.errors)

      // Attempt one repair
      if (MAX_REPAIR_ATTEMPTS > 0) {
        const repairedAsset = await attemptRepair(apiKey, body, asset, validation.errors)
        if (repairedAsset) {
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
      console.error("[v0] Generated asset failed validation (no successful repair):", validation.errors)
      return NextResponse.json(
        {
          success: false,
          error: "AI returned an incomplete checklist. Please try again or use Mock Preview.",
        },
        { status: 500 }
      )
    }

    console.log("[v0] API: generateChecklist - Success!")
    
    // Add source metadata (Phase 6)
    asset.generatedBy = "openai"
    
    return NextResponse.json({
      success: true,
      asset,
      repaired: false,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] generateChecklist API error:", err)
    return NextResponse.json(
      {
        success: false,
        error: "AI generation failed. Please try again.",
      },
      { status: 500 }
    )
  }
}
