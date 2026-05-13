/**
 * Shared sessionStorage helpers for welcome intake handoff.
 * Provides consistent keys and safe client-only accessors.
 */

import type { IdeaRouterResult, RecommendedPath } from "./idea-router"

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
  if (session.targetPath !== undefined) {
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
