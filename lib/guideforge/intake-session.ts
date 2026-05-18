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
 * A single starter guide idea selected by the user to seed the generator.
 * Written to sessionStorage by the dashboard panel; read and cleared by the generator.
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
  source: "starter_guide_idea"
  createdAt: string
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
