/**
 * Shared sessionStorage helpers for welcome intake handoff.
 * Provides consistent keys and safe client-only accessors.
 */

import type { IdeaRouterResult, RecommendedPath } from "./idea-router"
import type { NetworkBuildPlan } from "./smart-fill-network"

export const INTAKE_KEYS = {
  QUICK_IDEA: "guideforge:quick-idea",
  ROUTER_RESULT: "guideforge:idea-router-result",
  TARGET_PATH: "guideforge:intake-target",
} as const

export interface IntakeSession {
  idea: string
  routerResult: IdeaRouterResult | null
  targetPath: RecommendedPath | null
}

/**
 * Write intake session to sessionStorage (client-side only).
 * Safe to call from client components.
 */
export function writeIntakeSession(session: Partial<IntakeSession>): void {
  if (typeof window === "undefined") return

  if (session.idea !== undefined) {
    sessionStorage.setItem(INTAKE_KEYS.QUICK_IDEA, session.idea)
  }
  if (session.routerResult !== undefined) {
    sessionStorage.setItem(
      INTAKE_KEYS.ROUTER_RESULT,
      JSON.stringify(session.routerResult)
    )
  }
  if (session.targetPath !== undefined && session.targetPath !== null) {
    sessionStorage.setItem(INTAKE_KEYS.TARGET_PATH, session.targetPath)
  }
}

/**
 * Read intake session from sessionStorage (client-side only).
 * Returns null values for any missing keys.
 */
export function readIntakeSession(): IntakeSession {
  if (typeof window === "undefined") {
    return { idea: "", routerResult: null, targetPath: null }
  }

  const idea = sessionStorage.getItem(INTAKE_KEYS.QUICK_IDEA) || ""
  let routerResult: IdeaRouterResult | null = null
  let targetPath: RecommendedPath | null = null

  try {
    const resultStr = sessionStorage.getItem(INTAKE_KEYS.ROUTER_RESULT)
    if (resultStr) {
      routerResult = JSON.parse(resultStr)
    }
  } catch (e) {
    console.warn(
      "[v0] Failed to parse router result from sessionStorage:",
      e instanceof Error ? e.message : String(e)
    )
  }

  try {
    const pathStr = sessionStorage.getItem(INTAKE_KEYS.TARGET_PATH)
    if (pathStr && ["network", "single_guide", "checklist"].includes(pathStr)) {
      targetPath = pathStr as RecommendedPath
    }
  } catch (e) {
    console.warn(
      "[v0] Failed to parse target path from sessionStorage:",
      e instanceof Error ? e.message : String(e)
    )
  }

  return { idea, routerResult, targetPath }
}

/**
 * Clear all intake session data from sessionStorage (client-side only).
 */
export function clearIntakeSession(): void {
  if (typeof window === "undefined") return

  sessionStorage.removeItem(INTAKE_KEYS.QUICK_IDEA)
  sessionStorage.removeItem(INTAKE_KEYS.ROUTER_RESULT)
  sessionStorage.removeItem(INTAKE_KEYS.TARGET_PATH)
}

/**
 * Check if there is a valid intake session in storage.
 */
export function hasIntakeSession(): boolean {
  if (typeof window === "undefined") return false
  return !!sessionStorage.getItem(INTAKE_KEYS.QUICK_IDEA)
}

// ── Starter Guide Idea Handoff ───────────────────────────────────────────────

/**
 * Source label for a starter guide handoff. Drives the context-card copy in
 * the generator and the `_source` value forwarded into AI Builder Core.
 */
export type StarterGuideHandoffSource =
  | "starter_guide_idea"
  | "launch_plan_priority_guide"

/**
 * A single starter guide idea selected by the user to seed the generator.
 * Written to sessionStorage by the dashboard panel; read and cleared by the generator.
 *
 * Session-only: never written to Supabase. Cleared after the generator reads it.
 */
export interface StarterGuideIdeaHandoff {
  title: string
  summary: string
  /** Pre-constructed prompt ready for the generator prompt field. */
  prompt: string
  guideType: string
  difficulty: string
  hubName: string
  collectionName: string
  source: StarterGuideHandoffSource
  /** Optional network context — included so the generator can show a rich card. */
  networkName?: string
  networkType?: string
  /** Optional launch-plan context — only set when source = launch_plan_priority_guide. */
  goal?: string
  reason?: string
  createdAt: string
}

/**
 * Input shape for `buildStarterGuideHandoffPrompt`. All fields except
 * `title` are optional so the helper degrades gracefully if any context is
 * missing.
 */
export interface StarterGuidePromptContext {
  title: string
  summary?: string
  networkName?: string
  networkType?: string
  hubName?: string
  collectionName?: string
  guideType?: string
  difficulty?: string
  goal?: string
  reason?: string
}

/**
 * Build a richer prompt for the Network Guide Generator from a starter guide
 * handoff. Output is human-readable and domain-generic — works equally well
 * for gaming networks (QuestLine-style) and tech repair networks
 * (Techsperts-style). Keeps length reasonable.
 *
 * The prompt always ends with the "Do not publish automatically" instruction.
 */
export function buildStarterGuideHandoffPrompt(ctx: StarterGuidePromptContext): string {
  const difficultyPhrase = ctx.difficulty ? `${ctx.difficulty}-level ` : ""
  const lines: string[] = []

  if (ctx.networkName) {
    lines.push(
      `Create a ${difficultyPhrase}guide draft for the network "${ctx.networkName}".`
    )
  } else {
    lines.push(`Create a ${difficultyPhrase}guide draft.`)
  }

  lines.push("", "Guide title:", ctx.title)

  if (ctx.summary && ctx.summary.trim()) {
    lines.push("", "Summary:", ctx.summary.trim())
  }

  if (ctx.networkType) {
    lines.push("", "Network context:", `This is a ${ctx.networkType} network.`)
  }

  if (ctx.hubName || ctx.collectionName) {
    lines.push("", "Placement:")
    if (ctx.hubName) lines.push(`Hub: ${ctx.hubName}`)
    if (ctx.collectionName) lines.push(`Collection: ${ctx.collectionName}`)
  }

  if (ctx.guideType) {
    lines.push("", `Format: ${ctx.guideType}`)
  }

  if (ctx.goal && ctx.goal.trim()) {
    lines.push("", "Launch plan goal:", ctx.goal.trim())
  }

  if (ctx.reason && ctx.reason.trim()) {
    lines.push("", "Why this guide is prioritized:", ctx.reason.trim())
  }

  lines.push(
    "",
    "Expected output:",
    "A structured guide draft with clear sections, prerequisites, any safety warnings, step-by-step actions, and success criteria. Keep it practical and ready for review. Do not publish automatically."
  )

  return lines.join("\n")
}

/**
 * A set of starter guide ideas derived from the scaffold at network creation time.
 * Keyed by networkId so ideas are isolated to the network they came from.
 */
export interface NetworkStarterIdeas {
  networkId: string
  ideas: Array<{
    title: string
    summary: string
    guideType: string
    difficulty: string
    hubName: string
    collectionName: string
  }>
  createdAt: string
}

function starterIdeasKey(networkId: string): string {
  return `guideforge:starterGuideIdeas:${networkId}`
}

function starterHandoffKey(networkId: string): string {
  return `guideforge:starterGuideHandoff:${networkId}`
}

export function writeNetworkStarterIdeas(networkId: string, data: NetworkStarterIdeas): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(starterIdeasKey(networkId), JSON.stringify(data))
  } catch {
    // sessionStorage may be unavailable in some environments
  }
}

export function readNetworkStarterIdeas(networkId: string): NetworkStarterIdeas | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(starterIdeasKey(networkId))
    if (!raw) return null
    return JSON.parse(raw) as NetworkStarterIdeas
  } catch {
    return null
  }
}

export function clearNetworkStarterIdeas(networkId: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(starterIdeasKey(networkId))
  } catch {
    // ignore
  }
}

export function writeStarterGuideHandoff(networkId: string, handoff: StarterGuideIdeaHandoff): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(starterHandoffKey(networkId), JSON.stringify(handoff))
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readStarterGuideHandoff(networkId: string): StarterGuideIdeaHandoff | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(starterHandoffKey(networkId))
    if (!raw) return null
    return JSON.parse(raw) as StarterGuideIdeaHandoff
  } catch {
    return null
  }
}

export function clearStarterGuideHandoff(networkId: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(starterHandoffKey(networkId))
  } catch {
    // ignore
  }
}

// ── Started-this-session marker (session-only UX hint) ───────────────────────
// Tracks which starter guide ideas the user has clicked "Create this guide" on
// during the current session. NEVER persisted to Supabase. The marker is keyed
// by the lowercased idea title so it is stable across re-renders even though
// session-stored ideas don't carry stable IDs.

function startedTitlesKey(networkId: string): string {
  return `guideforge:startedGuideTitles:${networkId}`
}

function normalizeStartedTitle(title: string): string {
  return title.trim().toLowerCase()
}

export function getStartedGuideTitles(networkId: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = sessionStorage.getItem(startedTitlesKey(networkId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((t): t is string => typeof t === "string"))
  } catch {
    return new Set()
  }
}

export function addStartedGuideTitle(networkId: string, title: string): void {
  if (typeof window === "undefined") return
  if (!title || !title.trim()) return
  try {
    const current = getStartedGuideTitles(networkId)
    current.add(normalizeStartedTitle(title))
    sessionStorage.setItem(
      startedTitlesKey(networkId),
      JSON.stringify(Array.from(current))
    )
  } catch {
    // sessionStorage may be unavailable
  }
}

export function isGuideTitleStarted(networkId: string, title: string): boolean {
  if (!title) return false
  return getStartedGuideTitles(networkId).has(normalizeStartedTitle(title))
}

export function clearStartedGuideTitles(networkId: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(startedTitlesKey(networkId))
  } catch {
    // ignore
  }
}

// ── Network Build Plan ───────────────────────────────────────────────────────

function buildPlanKey(networkId: string): string {
  return `guideforge:networkBuildPlan:${networkId}`
}

export function writeNetworkBuildPlan(networkId: string, plan: NetworkBuildPlan): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(buildPlanKey(networkId), JSON.stringify(plan))
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readNetworkBuildPlan(networkId: string): NetworkBuildPlan | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(buildPlanKey(networkId))
    if (!raw) return null
    return JSON.parse(raw) as NetworkBuildPlan
  } catch {
    return null
  }
}

export function clearNetworkBuildPlan(networkId: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(buildPlanKey(networkId))
  } catch {
    // ignore
  }
}
