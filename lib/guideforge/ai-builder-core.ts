/**
 * GuideForge AI Builder Core
 *
 * Unified contract for all AI generation flows across GuideForge.
 * The prompt is always the source of truth — never mutate or clear it.
 * Pages provide builder kind, context, Forge Rules, and save target.
 * The core handles:
 * - Request validation
 * - Mode routing (mock | ai | smart_fill)
 * - Schema normalization
 * - Error handling
 *
 * Builder kind map (current migration status):
 *   single_guide_asset  → fully migrated, uses generateSingleGuideAsset()
 *   checklist_asset     → fully migrated, uses generateChecklistAsset() via ai-generation-client
 *   network_guide       → migrated; uses generateNetworkGuide() via AI Builder Core
 *   network_scaffold    → stub; active flow is in smart-fill-network + forge-rules-editor (migrate later)
 *
 * Do NOT create separate one-off builders. Extend this file instead.
 */

import type {
  GeneratedGuide,
  GeneratedChecklist,
  GeneratedSingleGuide,
} from "./generation-schemas"

// ============================================================================
// BUILDER KINDS
// ============================================================================

export type GuideForgeBuilderKind =
  | "network_guide"
  | "single_guide_asset"
  | "checklist_asset"
  | "network_scaffold"
  // Future types (placeholder)
  | "recipe_asset"
  | "sop_asset"
  | "troubleshooting_asset"

// ============================================================================
// GENERATION MODE
// ============================================================================

/**
 * mock       — local, fast, never calls AI; used for testing and proposal preview
 * ai         — calls OpenAI; requires API key; validates structured output
 * smart_fill — heuristic-only field extraction; no content generation; no network call
 */
export type GenerationMode = "mock" | "ai" | "smart_fill"

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/** Network context — passed when the builder is scoped to an existing network. */
export interface NetworkContext {
  networkId: string
  networkName?: string
  networkType?: string
  hubId?: string
  hubName?: string
  collectionId?: string
  collectionName?: string
  forgeRules?: Record<string, any>
}

/** Asset context — passed for standalone workspace asset builders. */
export interface AssetContext {
  workspaceId?: string
  assetType?: string
  guideType?: string
  audience?: string
  difficulty?: string
}

export interface UserContext {
  userId?: string
  userName?: string
}

export interface OutputPreferences {
  difficulty?: "beginner" | "intermediate" | "advanced"
  style?: "technical" | "casual" | "formal"
  numberOfSections?: number
  itemsPerSection?: number
}

/**
 * Builder rules — Forge Rules and output/verification constraints.
 * Pass forge rule strings as freeform rule entries; the AI prompt builder
 * will include them as system-level constraints.
 */
export interface BuilderRules {
  forgeRules?: string[]
  verificationRequired?: boolean
  contentStandard?: string
  aiPolicy?: string
  outputConstraints?: string[]
}

/**
 * Save target — where the generated content should be persisted.
 * Used as a hint to the consuming component; the builder core does not
 * perform saves directly.
 */
export interface BuilderTarget {
  type: "workspace_asset" | "network_collection" | "network_scaffold"
  networkId?: string
  hubId?: string
  collectionId?: string
  assetType?: string
}

// ============================================================================
// BUILDER REQUEST (UNIFIED ENTRY POINT)
// ============================================================================

export interface GuideForgeBuilderRequest {
  kind: GuideForgeBuilderKind
  /** The original user prompt. Must never be mutated or cleared by the system. */
  prompt: string
  mode: GenerationMode

  // Structured context
  networkContext?: NetworkContext
  assetContext?: AssetContext
  userContext?: UserContext
  outputPreferences?: OutputPreferences
  rules?: BuilderRules
  target?: BuilderTarget

  // Raw form data passed through (varies by builder kind; prefer typed context fields)
  formData?: Record<string, any>
}

// ============================================================================
// BUILDER RESULT (UNIFIED RESPONSE)
// ============================================================================

export interface GuideForgeBuilderResult {
  kind: GuideForgeBuilderKind
  mode: GenerationMode
  success: boolean

  // On success
  title?: string
  summary?: string
  structuredPayload?: GeneratedGuide | GeneratedChecklist | GeneratedSingleGuide | Record<string, any>

  // On success or partial success
  assumptions?: string[]
  missingInfo?: string[]
  warnings?: string[]

  // Save hint for parent component
  saveTargetHint?: {
    type: "network_collection" | "workspace_asset" | "network_scaffold"
    targetId?: string
    context?: Record<string, any>
  }

  // On error
  error?: string
  stage?: string // Which stage failed (validation, generation, normalization, etc.)

  // Metadata
  generatedAt?: string
  generatedBy?: "mock" | "openai" | "claude" | "other"
  modelUsed?: string
}

// ============================================================================
// CENTRAL GENERATION FUNCTION
// ============================================================================

/**
 * Generate a draft using the shared AI Builder Core.
 *
 * Routes by builder kind, applies context/Forge Rules, uses mock or AI mode,
 * normalizes output, and returns consistent result.
 *
 * @param request - Unified builder request with kind, prompt, mode, context
 * @returns Unified result with structured payload and save hints
 */
export async function generateGuideForgeDraft(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  try {
    // Route by builder kind
    switch (request.kind) {
      case "network_guide":
        return await generateNetworkGuide(request)
      case "single_guide_asset":
        return await generateSingleGuideAsset(request)
      case "checklist_asset":
        return await generateChecklistAsset(request)
      case "network_scaffold":
        return await generateNetworkScaffold(request)

      // Future types
      case "recipe_asset":
      case "sop_asset":
      case "troubleshooting_asset":
        return {
          kind: request.kind,
          mode: request.mode,
          success: false,
          error: `${request.kind} generation is not yet available`,
        }

      default:
        return {
          kind: request.kind,
          mode: request.mode,
          success: false,
          error: `Unknown builder kind: ${request.kind}`,
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return {
      kind: request.kind,
      mode: request.mode,
      success: false,
      error: message,
      stage: "unknown",
    }
  }
}

// ============================================================================
// BUILDER-SPECIFIC HANDLERS (INTERNAL)
// ============================================================================

async function generateNetworkGuide(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  try {
    // Prefer typed context fields; fall back to formData for legacy callers
    const nc = request.networkContext
    const ac = request.assetContext
    const fd = request.formData ?? {}

    // Small helper: safely extract a string from untyped formData
    const fdStr = (k: string, fallback = ""): string =>
      typeof fd[k] === "string" ? (fd[k] as string) || fallback : fallback

    const targetHubId: string = nc?.hubId ?? fdStr("targetHubId")
    const targetCollectionId: string | undefined =
      nc?.collectionId ?? (fd.targetCollectionId ? String(fd.targetCollectionId) : undefined)
    const guideType: string = ac?.guideType ?? fdStr("guideType", "tutorial")
    const difficulty: string = ac?.difficulty ?? fdStr("preferredDifficulty", "intermediate")

    if (request.mode === "mock") {
      const { generateMockResponse } = await import("./mock-generator")
      const result = generateMockResponse({
        prompt: request.prompt,
        guideType: guideType as any,
        preferredDifficulty: difficulty as any,
        targetHubId,
        targetCollectionId,
      })
      if (!result.success) {
        return {
          kind: "network_guide",
          mode: "mock",
          success: false,
          error: result.error || "Mock generation failed",
        }
      }
      return {
        kind: "network_guide",
        mode: "mock",
        success: true,
        title: result.guide.title,
        summary: result.guide.summary,
        structuredPayload: result.guide,
        generatedBy: "mock",
        generatedAt: result.guide.generatedAt,
        saveTargetHint: {
          type: "network_collection",
          targetId: targetCollectionId,
          context: {
            networkId: nc?.networkId,
            hubId: targetHubId,
            collectionId: targetCollectionId,
          },
        },
      }
    }

    if (request.mode === "ai") {
      // AI mode is invoked from the client-side generator; the relative URL works in the browser.
      // Server-side callers must supply an absolute URL or call the route handler directly.
      const fetchResponse = await fetch("/api/guideforge/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: request.prompt,
          guideType,
          preferredDifficulty: difficulty,
          targetHubId,
          networkId: nc?.networkId,
          networkName: nc?.networkName,
          targetCollectionId,
          forgeRuleContext: request.rules?.forgeRules?.join("\n"),
        }),
      })

      let responseText: string
      try {
        responseText = await fetchResponse.text()
      } catch {
        return {
          kind: "network_guide",
          mode: "ai",
          success: false,
          error: "AI generation failed — could not read server response. Please try again.",
          stage: "network",
        }
      }

      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        return {
          kind: "network_guide",
          mode: "ai",
          success: false,
          error: "AI generation failed — server returned an invalid response. Please try again.",
          stage: "parse",
        }
      }

      if (!fetchResponse.ok || !data.success) {
        let errorMsg: string = data.error || "AI generation failed"
        if (!fetchResponse.ok && fetchResponse.status === 500) {
          errorMsg = "AI service temporarily unavailable. Try Mock Preview or simplify your prompt."
        } else if (!fetchResponse.ok && fetchResponse.status === 429) {
          errorMsg = "Rate limit reached. Please wait a moment and try again."
        } else if (errorMsg.includes("timeout") || errorMsg.includes("took too long")) {
          errorMsg = "Generation took too long. Try a shorter prompt or use Mock Preview."
        }
        return {
          kind: "network_guide",
          mode: "ai",
          success: false,
          error: errorMsg,
          stage: data.stage ?? "generation",
        }
      }

      const guide = data.guide
      if (!guide?.sections?.length || !guide?.title) {
        return {
          kind: "network_guide",
          mode: "ai",
          success: false,
          error: "AI returned an incomplete guide. Please try again.",
          stage: "validation",
        }
      }

      return {
        kind: "network_guide",
        mode: "ai",
        success: true,
        title: guide.title,
        summary: guide.summary,
        structuredPayload: guide,
        generatedBy: "openai",
        generatedAt: guide.generatedAt,
        saveTargetHint: {
          type: "network_collection",
          targetId: targetCollectionId,
          context: {
            networkId: nc?.networkId,
            hubId: targetHubId,
            collectionId: targetCollectionId,
          },
        },
      }
    }

    return {
      kind: "network_guide",
      mode: request.mode,
      success: false,
      error: `Unknown generation mode: ${request.mode}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return {
      kind: "network_guide",
      mode: request.mode,
      success: false,
      error: message,
      stage: "generation",
    }
  }
}

async function generateSingleGuideAsset(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  try {
    const formData = (request.formData ?? {}) as any

    let asset: any = null
    let generatedBy: "mock" | "openai" = "mock"

    if (request.mode === "mock") {
      const { generateSingleGuideMock } = await import("./mock-asset-generator")
      const mockResult = await generateSingleGuideMock(formData)
      if (!mockResult.success) {
        return {
          kind: "single_guide_asset",
          mode: "mock",
          success: false,
          error: mockResult.error || "Mock generation failed",
        }
      }
      asset = mockResult.asset
      generatedBy = "mock"
    } else if (request.mode === "ai") {
      const response = await fetch("/api/guideforge/generate-single-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, prompt: request.prompt }),
      })

      let responseText: string
      try {
        responseText = await response.text()
      } catch {
        return {
          kind: "single_guide_asset",
          mode: "ai",
          success: false,
          error: "AI generation failed — could not read server response. Please try again.",
        }
      }

      let data: any
      try {
        data = JSON.parse(responseText)
      } catch {
        return {
          kind: "single_guide_asset",
          mode: "ai",
          success: false,
          error: "AI generation failed — server returned an invalid response. Please try again.",
        }
      }

      if (!response.ok || !data.success) {
        return {
          kind: "single_guide_asset",
          mode: "ai",
          success: false,
          error: data.error || "AI generation failed. Please try again.",
        }
      }

      if (!data.asset || !Array.isArray(data.asset.steps) || data.asset.steps.length === 0) {
        return {
          kind: "single_guide_asset",
          mode: "ai",
          success: false,
          error: "AI returned an incomplete guide. Please try again.",
        }
      }

      asset = data.asset
      generatedBy = "openai"
    } else {
      return {
        kind: "single_guide_asset",
        mode: request.mode,
        success: false,
        error: `Unknown generation mode: ${request.mode}`,
      }
    }

    return {
      kind: "single_guide_asset",
      mode: request.mode,
      success: true,
      title: asset.title,
      summary: asset.summary,
      structuredPayload: asset,
      assumptions: asset.assumptions || [],
      missingInfo: asset.missingInfo || [],
      warnings: asset.warnings || [],
      generatedBy,
      saveTargetHint: {
        type: "workspace_asset",
        context: { assetType: "single_guide" },
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return {
      kind: "single_guide_asset",
      mode: request.mode,
      success: false,
      error: message,
      stage: "generation",
    }
  }
}

async function generateChecklistAsset(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  try {
    // Extract form data from request
    const formData = request.formData as any || {}
    
    // Build checklist intake request from form data
    const checklistRequest = {
      title: formData.title || request.prompt.split('\n')[0],
      audience: formData.audience || "",
      goal: formData.goal || "",
      purpose: formData.purpose || request.prompt,
      tone: formData.tone || "practical",
      numberOfSections: formData.numberOfSections || 3,
      itemsPerSection: formData.itemsPerSection || 5,
      useCase: formData.useCase || "",
      optionalContext: formData.optionalContext || "",
    }

    let asset: any = null

    if (request.mode === "mock") {
      // Use mock generator directly
      const { generateChecklistMock } = await import("./mock-asset-generator")
      const mockResult = await generateChecklistMock(checklistRequest)
      if (!mockResult.success) {
        return {
          kind: "checklist_asset",
          mode: "mock",
          success: false,
          error: mockResult.error || "Mock generation failed",
        }
      }
      asset = mockResult.asset
    } else if (request.mode === "ai") {
      // Use existing AI generation client
      const { generateChecklist } = await import("./ai-generation-client")
      const aiResult = await generateChecklist(checklistRequest, "ai")
      if (!aiResult.success) {
        return {
          kind: "checklist_asset",
          mode: "ai",
          success: false,
          error: aiResult.error || "AI generation failed",
        }
      }
      asset = aiResult.asset
    } else {
      return {
        kind: "checklist_asset",
        mode: request.mode,
        success: false,
        error: `Unknown generation mode: ${request.mode}`,
      }
    }

    // Return normalized result
    return {
      kind: "checklist_asset",
      mode: request.mode,
      success: true,
      title: asset.title,
      summary: asset.summary,
      structuredPayload: asset,
      assumptions: asset.assumptions || [],
      missingInfo: asset.missingInfo || [],
      warnings: asset.warnings || [],
      saveTargetHint: {
        type: "workspace_asset",
        context: { assetType: "checklist" },
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return {
      kind: "checklist_asset",
      mode: request.mode,
      success: false,
      error: message,
      stage: "generation",
    }
  }
}

async function generateNetworkScaffold(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  // Migration path: create-network-form.tsx currently calls smartFillNetwork() (heuristic)
  // and forge-rules-editor.tsx calls createNetworkScaffold() to save.
  // When migrating:
  //   smart_fill → import { smartFillNetwork } from "./smart-fill-network"; return SmartFillResult
  //   ai         → call a future /api/guideforge/generate-scaffold endpoint
  //   Both       → structuredPayload should conform to NetworkSkeletonGenerationResponse shape
  return {
    kind: "network_scaffold",
    mode: request.mode,
    success: false,
    error: "Not yet migrated to core — use smartFillNetwork() in create-network-form.tsx",
  }
}

// ============================================================================
// ADAPTER HELPERS
// ============================================================================

/**
 * Build a GuideForgeBuilderRequest from network guide generator form data.
 * Used by buildNetworkGuideGenerationRequest() in generator-client.tsx to
 * construct the unified request before calling generateGuideForgeDraft().
 */
export function toNetworkGuideBuilderRequest(opts: {
  prompt: string
  mode: "mock" | "ai"
  networkId: string
  networkName: string
  hubId: string
  collectionId: string
  guideType?: string
  difficulty?: string
  forgeRules?: string[]
}): GuideForgeBuilderRequest {
  return {
    kind: "network_guide",
    prompt: opts.prompt,
    mode: opts.mode,
    networkContext: {
      networkId: opts.networkId,
      networkName: opts.networkName,
      hubId: opts.hubId,
      collectionId: opts.collectionId,
    },
    assetContext: {
      guideType: opts.guideType,
      difficulty: opts.difficulty,
    },
    rules: opts.forgeRules ? { forgeRules: opts.forgeRules } : undefined,
    target: {
      type: "network_collection",
      networkId: opts.networkId,
      hubId: opts.hubId,
      collectionId: opts.collectionId,
    },
  }
}
