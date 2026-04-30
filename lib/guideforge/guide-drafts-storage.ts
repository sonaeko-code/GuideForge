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
 * Returns the draftId for routing (uses guide.id if available, otherwise generates timestamp-based ID).
 */
export function saveGuideDraft(guide: Guide): string {
  const draftId = guide.id || `draft_${Date.now()}`
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

/**
 * Get all draft IDs stored in localStorage.
 */
export function getAllDrafts(): string[] {
  const drafts: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      const draftId = key.replace(STORAGE_PREFIX, "")
      drafts.push(draftId)
    }
  }
  return drafts
}

/**
 * Get all draft objects (loaded from storage).
 */
export function getAllDraftObjects(): Guide[] {
  const drafts: Guide[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          drafts.push(JSON.parse(data) as Guide)
        } catch (e) {
          console.error(`[v0] Failed to parse draft from key ${key}:`, e)
        }
      }
    }
  }
  return drafts
}

/**
 * Get most recent draft objects sorted by updatedAt (newest first).
 */
export function getRecentDrafts(limit = 10): Guide[] {
  const all = getAllDraftObjects()
  return all
    .sort((a, b) => {
      const aDate = new Date(a.updatedAt || 0).getTime()
      const bDate = new Date(b.updatedAt || 0).getTime()
      return bDate - aDate
    })
    .slice(0, limit)
}

/**
 * Get drafts for a specific network.
 */
export function getDraftsByNetwork(networkId: string): Guide[] {
  return getAllDraftObjects().filter((g) => g.networkId === networkId)
}
