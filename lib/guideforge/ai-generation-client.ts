/**
 * AI Generation Client
 *
 * Unified interface for generating structured assets.
 * Routes requests to appropriate provider (mock or real AI).
 * Runs on client but delegates to server-side endpoint for API calls.
 */

import type {
  GenerationProvider,
  ChecklistGenerationRequest,
  ChecklistGenerationResponse,
  AIGenerationResponse,
} from "./ai-generation-types"
import type { GeneratedChecklist } from "./generation-schemas"
import { validateGeneratedChecklist } from "./ai-generation-validation"

/**
 * Generate a Checklist asset.
 * 
 * Supports both mock (client-side) and AI (server-side) providers.
 * - If provider is "mock": uses client-side mock generator
 * - If provider is "ai": calls /api/guideforge/generate-checklist server endpoint
 * 
 * Always validates output before returning.
 * If validation fails, returns error instead of invalid asset.
 */
export async function generateChecklist(
  request: ChecklistGenerationRequest,
  provider: GenerationProvider = "mock"
): Promise<ChecklistGenerationResponse> {
  try {
    console.log("[v0] generateChecklist: Starting with provider:", provider)

    let asset: GeneratedChecklist | undefined

    if (provider === "mock") {
      // Client-side mock generation
      const { generateChecklistMock } = await import("./mock-asset-generator")
      const mockResult = await generateChecklistMock(request as any)
      if (!mockResult.success) {
        return {
          success: false,
          error: mockResult.error || "Mock generation failed",
          provider: "mock",
        }
      }
      asset = mockResult.asset as GeneratedChecklist
    } else if (provider === "ai") {
      // Server-side AI generation
      const response = await fetch("/api/guideforge/generate-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error || "AI generation failed",
          provider: "ai",
        }
      }

      const data = await response.json()
      if (!data.success) {
        return {
          success: false,
          error: data.error || "AI generation failed",
          provider: "ai",
        }
      }

      asset = data.asset
    } else {
      return {
        success: false,
        error: `Unknown provider: ${provider}`,
        provider,
      }
    }

    if (!asset) {
      return {
        success: false,
        error: "No asset generated",
        provider,
      }
    }

    // Validate generated asset
    const validation = validateGeneratedChecklist(asset)
    if (!validation.valid) {
      console.error("[v0] generateChecklist validation failed:", validation.errors)
      
      // Determine user-friendly error message based on validation errors
      let userMessage = "Generated checklist did not match GuideForge structure. Try again."
      
      if (validation.errors.some(e => e.includes("sections") && e.includes("more than"))) {
        userMessage = "Checklist has too many sections. Use up to 8 sections."
      } else if (validation.errors.some(e => e.includes("items") && e.includes("more than"))) {
        userMessage = "One or more sections have too many items. Use up to 12 items per section."
      } else if (validation.errors.some(e => e.includes("sections") || e.includes("items"))) {
        userMessage = "Checklist size constraints exceeded. Try again with fewer sections or items."
      }
      
      return {
        success: false,
        error: userMessage,
        provider,
      }
    }

    console.log("[v0] generateChecklist: Success with provider:", provider)
    return {
      success: true,
      asset,
      provider,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] generateChecklist error:", err)
    return {
      success: false,
      error: `Generation error: ${msg}`,
      provider,
    }
  }
}
