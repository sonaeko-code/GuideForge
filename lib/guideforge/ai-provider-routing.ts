/**
 * GuideForge AI Provider Routing
 *
 * Infrastructure-only layer for routing generation tasks to the correct AI provider.
 * No API calls are made here. This file defines the types and resolution logic
 * that ai-builder-core.ts and API routes can use to select and label their provider.
 *
 * Current providers: "openai" (active), "anthropic" (reserved), "mock" (local)
 * To add Anthropic: add ANTHROPIC_API_KEY, implement a Claude route handler,
 * then update resolveGuideForgeProviderRoute() to route "anthropic" requests directly.
 *
 * Cost-control hooks: resolveGuideForgeProviderRoute() is the intended extension point.
 * Future: add budget/quota metadata to GuideForgeProviderRoute, read from env or config,
 * and downgrade provider here before the call reaches any route handler.
 */

// ── Provider and task types ───────────────────────────────────────────────────

/** All AI providers GuideForge can route to (including local mock). */
export type GuideForgeAIProvider = "openai" | "anthropic" | "mock"

/** Every generation task kind, matching GuideForgeBuilderKind from ai-builder-core. */
export type GuideForgeGenerationTask =
  | "network_guide"
  | "single_guide_asset"
  | "checklist_asset"
  | "network_scaffold"

/** Whether the caller wants real AI or local mock generation. */
export type GuideForgeProviderMode = "mock" | "ai"

// ── Provider route ────────────────────────────────────────────────────────────

/**
 * The resolved route for a generation request.
 * Returned by resolveGuideForgeProviderRoute() and used as metadata
 * by ai-builder-core.ts and route handlers.
 */
export interface GuideForgeProviderRoute {
  /** The provider that will handle this request. */
  provider: GuideForgeAIProvider
  /** True when a real external AI API will be called. False for mock/local. */
  isRealAI: boolean
  /** The generation task being routed. */
  task: GuideForgeGenerationTask
  /** The mode the caller requested. */
  mode: GuideForgeProviderMode
}

// ── Resolution input ──────────────────────────────────────────────────────────

export interface ResolveProviderRouteInput {
  mode: GuideForgeProviderMode
  task: GuideForgeGenerationTask
  /**
   * Optional provider override. If "anthropic", the router will note it
   * but fall back to "openai" until the Claude integration is enabled.
   */
  requestedProvider?: GuideForgeAIProvider
}

// ── Route resolver ────────────────────────────────────────────────────────────

/**
 * Resolve the AI provider route for a generation request.
 *
 * Rules:
 * - mode "mock" always returns provider "mock", isRealAI false.
 * - requestedProvider "anthropic" is reserved — falls back to "openai" until enabled.
 * - Default AI mode routes to "openai".
 *
 * This is the extension point for future cost-control routing:
 * read a budget config here and downgrade provider before any API call is made.
 */
export function resolveGuideForgeProviderRoute(
  input: ResolveProviderRouteInput
): GuideForgeProviderRoute {
  if (input.mode === "mock") {
    return { provider: "mock", isRealAI: false, task: input.task, mode: "mock" }
  }

  // Cost-control hook (future): read budget config or env flags here to
  // downgrade provider (e.g. "openai" → "mock") before any API call is made.
  // Example: if (process.env.AI_COST_CAP_EXCEEDED === "true") return { provider: "mock", ... }

  if (input.requestedProvider === "anthropic") {
    // Anthropic/Claude is not yet enabled. Fall back to OpenAI.
    // To enable: implement a Claude route handler and remove this fallback.
    return { provider: "openai", isRealAI: true, task: input.task, mode: "ai" }
  }

  return { provider: "openai", isRealAI: true, task: input.task, mode: "ai" }
}

// ── Normalized AI error ───────────────────────────────────────────────────────

/** Canonical error codes used across all GuideForge AI route handlers. */
export type GuideForgeAIErrorCode =
  | "auth_error"
  | "quota_error"
  | "timeout"
  | "validation_failed"
  | "empty_response"
  | "network_error"
  | "unknown"

/** Normalized error shape returned by normalizeGuideForgeAIError(). */
export interface GuideForgeAIError {
  code: GuideForgeAIErrorCode
  message: string
  provider: GuideForgeAIProvider
  task?: GuideForgeGenerationTask
  originalError?: unknown
}

/**
 * Normalize a caught error from an AI API call into a GuideForgeAIError.
 *
 * Matches the error string conventions used by callOpenAI() in all three
 * generate-* route handlers (AUTH_ERROR, QUOTA_ERROR, OPENAI_ERROR).
 */
export function normalizeGuideForgeAIError(
  err: unknown,
  provider: GuideForgeAIProvider,
  task?: GuideForgeGenerationTask
): GuideForgeAIError {
  if (err instanceof Error) {
    const msg = err.message

    if (msg === "AUTH_ERROR" || msg.startsWith("AUTH_ERROR")) {
      return { code: "auth_error", message: "API key is invalid or expired.", provider, task, originalError: err }
    }
    if (msg === "QUOTA_ERROR" || msg.startsWith("QUOTA_ERROR")) {
      return { code: "quota_error", message: "API quota exceeded. Try again later.", provider, task, originalError: err }
    }
    if (err.name === "AbortError" || msg.includes("timed out") || msg.includes("abort")) {
      return { code: "timeout", message: "AI call timed out.", provider, task, originalError: err }
    }
    if (msg.includes("validation") || msg.includes("VALIDATION")) {
      return { code: "validation_failed", message: msg, provider, task, originalError: err }
    }
    if (msg.includes("empty") || msg.includes("EMPTY")) {
      return { code: "empty_response", message: "AI returned an empty response.", provider, task, originalError: err }
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("ECONNREFUSED")) {
      return { code: "network_error", message: msg, provider, task, originalError: err }
    }

    return { code: "unknown", message: msg, provider, task, originalError: err }
  }

  return { code: "unknown", message: String(err), provider, task, originalError: err }
}
