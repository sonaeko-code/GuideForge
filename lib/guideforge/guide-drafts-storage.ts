/**
 * Guide Drafts Storage
 * Manages localStorage persistence for generated guide drafts.
 * 
 * localStorage key: "guideforge:drafts:[draftId]"
 * Each draft stores the full Guide object for retrieval in the editor.
 */

import type { Guide } from "./types"

const STORAGE_PREFIX = "guideforge:drafts:"

/**
 * Save a generated guide draft to localStorage.
 * Returns the draftId for routing.
 */
export function saveGuideDraft(guide: Guide): string {
  const draftId = `draft_${Date.now()}`
  const key = `${STORAGE_PREFIX}${draftId}`
  localStorage.setItem(key, JSON.stringify(guide))
  return draftId
}

/**
 * Load a guide draft from localStorage by draftId.
 * Returns null if not found or expired.
 */
export function loadGuideDraft(draftId: string): Guide | null {
  const key = `${STORAGE_PREFIX}${draftId}`
  const stored = localStorage.getItem(key)
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Check if a draftId exists in localStorage.
 */
export function hasDraft(draftId: string): boolean {
  const key = `${STORAGE_PREFIX}${draftId}`
  return localStorage.getItem(key) !== null
}

/**
 * Delete a draft from localStorage.
 */
export function deleteDraft(draftId: string): void {
  const key = `${STORAGE_PREFIX}${draftId}`
  localStorage.removeItem(key)
}

/**
 * Clear all guide drafts from localStorage.
 */
export function clearAllDrafts(): void {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(STORAGE_PREFIX)
  )
  keys.forEach((key) => localStorage.removeItem(key))
}
