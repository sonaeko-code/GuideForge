/**
 * Generate Checklist - Server API Route
 *
 * POST /api/guideforge/generate-checklist
 *
 * Server-side endpoint for AI generation.
 * Uses OPENAI_API_KEY (server-only).
 * Validates output before returning.
 */

import { NextRequest, NextResponse } from "next/server"
import type { ChecklistGenerationRequest } from "@/lib/guideforge/ai-generation-types"
import type { GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { validateGeneratedChecklist } from "@/lib/guideforge/ai-generation-validation"
import { buildChecklistPrompt } from "@/lib/guideforge/ai-prompts"

export const runtime = "nodejs"
export const maxDuration = 30

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
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a structured data generator for GuideForge. Return valid JSON only. Do not include markdown or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json()
      console.error("[v0] OpenAI API error:", error)
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${error.error?.message || "Unknown error"}`,
        },
        { status: 500 }
      )
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices[0]?.message?.content

    if (!content) {
      console.error("[v0] OpenAI returned no content")
      return NextResponse.json(
        { success: false, error: "OpenAI returned empty response" },
        { status: 500 }
      )
    }

    // Parse AI response
    let asset: GeneratedChecklist
    try {
      asset = JSON.parse(content)
    } catch (err) {
      console.error("[v0] Failed to parse OpenAI response as JSON:", content)
      return NextResponse.json(
        {
          success: false,
          error: "Generated content was not valid JSON",
        },
        { status: 500 }
      )
    }

    // Validate output
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
      console.error("[v0] Generated asset failed validation:", validation.errors)
      return NextResponse.json(
        {
          success: false,
          error: `Generated checklist validation failed: ${validation.errors.join("; ")}`,
        },
        { status: 500 }
      )
    }

    console.log("[v0] API: generateChecklist - Success!")
    return NextResponse.json({
      success: true,
      asset,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] generateChecklist API error:", err)
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${msg}`,
      },
      { status: 500 }
    )
  }
}
