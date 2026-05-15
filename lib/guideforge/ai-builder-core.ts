/**
 * GuideForge AI Builder Core
 *
 * Unified contract for all AI generation flows across GuideForge.
 * Pages provide builder kind, context, Forge Rules, and save target.
 * The core handles:
 * - Request validation
 * - Mode routing (mock vs AI)
 * - Schema normalization
 * - Error handling
 *
 * This is GuideForge's equivalent to Techsperts' diagnosis/intake intelligence layer.
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

export type GenerationMode = "mock" | "ai"

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface NetworkContext {
  networkId: string
  networkName?: string
  hubId?: string
  collectionId?: string
  forgeRules?: Record<string, any>
}

export interface AssetContext {
  workspaceId?: string
  forgeRules?: Record<string, any>
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

// ============================================================================
// BUILDER REQUEST (UNIFIED ENTRY POINT)
// ============================================================================

export interface GuideForgeBuilderRequest {
  kind: GuideForgeBuilderKind
  prompt: string
  mode: GenerationMode

  // Optional context
  networkContext?: NetworkContext
  assetContext?: AssetContext
  userContext?: UserContext
  outputPreferences?: OutputPreferences

  // Raw form data passed through (varies by builder kind)
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
  // To be implemented: call existing network guide generation logic
  // This will gradually migrate generator-client.tsx to use this core
  return {
    kind: "network_guide",
    mode: request.mode,
    success: false,
    error: "Not yet migrated to core",
  }
}

async function generateSingleGuideAsset(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  // To be implemented: call existing single guide asset generation logic
  // This will gradually migrate generate-single-guide-client.tsx
  return {
    kind: "single_guide_asset",
    mode: request.mode,
    success: false,
    error: "Not yet migrated to core",
  }
}

async function generateChecklistAsset(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  // To be implemented: call existing checklist generation logic
  // This will gradually migrate generate-checklist-client.tsx
  return {
    kind: "checklist_asset",
    mode: request.mode,
    success: false,
    error: "Not yet migrated to core",
  }
}

async function generateNetworkScaffold(
  request: GuideForgeBuilderRequest
): Promise<GuideForgeBuilderResult> {
  // To be implemented: smart fill network scaffold generation
  // This will eventually replace the heuristic in create-network-form.tsx
  return {
    kind: "network_scaffold",
    mode: request.mode,
    success: false,
    error: "Not yet migrated to core",
  }
}
