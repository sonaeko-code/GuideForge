/**
 * Guide Drafts Storage
 * Manages draft persistence for GuideForge.
 * 
 * This module provides a high-level API that currently uses localStorage
 * but is abstracted via a persistence adapter to support Supabase in Phase 2.
 * 
 * localStorage key: "guideforge:drafts:[draftId]"
 * Each draft stores the full Guide object for retrieval in the editor.
 */

import type { Guide } from "./types"
import { getPersistenceAdapter, getLocalStorageAdapter } from "./persistence"

/**
 * Get the active persistence adapter.
 * Abstraction for storage implementation (localStorage now, Supabase in Phase 2).
 */
function getAdapter() {
  return getPersistenceAdapter()
}

// ============================================================================
// SYNCHRONOUS HELPERS (Phase 1)
// ============================================================================
// For components that need synchronous localStorage access directly.
// These call the sync methods on LocalStoragePersistenceAdapter.
// Phase 2: These will become async wrapper calls to the persistence layer.

/**
 * Save a generated guide draft to localStorage (synchronous).
 * Phase 1 compatibility method for components like guide-editor.
 * 
 * @param guide - The Guide object to save
 * @returns string - The draftId of the saved guide
 */
export function saveGuideDraftSync(guide: Guide): string {
  return getLocalStorageAdapter().saveDraftSync(guide)
}

/**
 * Load a guide draft from localStorage (synchronous).
 * Phase 1 compatibility method.
 * 
 * @param draftId - The ID of the draft to load
 * @returns Guide | null - The loaded Guide or null if not found
 */
export function loadGuideDraftSync(draftId: string): Guide | null {
  return getLocalStorageAdapter().loadDraftSync(draftId)
}

/**
 * Check if a draft exists (synchronous).
 * Phase 1 compatibility method.
 * 
 * @param draftId - The ID to check
 * @returns boolean - True if draft exists
 */
export function hasDraftSync(draftId: string): boolean {
  return getLocalStorageAdapter().hasDraftSync(draftId)
}

/**
 * Delete a draft from localStorage (synchronous).
 * Phase 1 compatibility method.
 * 
 * @param draftId - The ID of the draft to delete
 */
export function deleteDraftSync(draftId: string): void {
  return getLocalStorageAdapter().deleteDraftSync(draftId)
}

/**
 * Get all draft objects (synchronous).
 * Phase 1 compatibility method.
 * 
 * @returns Guide[] - Array of all loaded Guide objects
 */
export function getAllDraftObjectsSync(): Guide[] {
  return getLocalStorageAdapter().getAllDraftsSync()
}

/**
 * Get drafts for a specific network (synchronous).
 * Phase 1 compatibility method.
 * 
 * @param networkId - The network ID to filter by
 * @returns Guide[] - Array of Guide objects for the network
 */
export function getDraftsByNetworkSync(networkId: string): Guide[] {
  return getLocalStorageAdapter().getDraftsByNetworkSync(networkId)
}

/**
 * Update a draft's status (synchronous).
 * Phase 1 compatibility method.
 * 
 * @param draftId - The ID of the draft to update
 * @param status - The new status value
 */
export function updateDraftStatusSync(draftId: string, status: string): void {
  return getLocalStorageAdapter().updateDraftStatusSync(draftId, status)
}

// ============================================================================
// ASYNC HELPERS (Phase 2)
// ============================================================================
// These wrap the persistence adapter for future async/Supabase support.
// Phase 1: These resolve immediately since localStorage is sync.
// Phase 2: These will properly handle Supabase async calls.

/**
 * Save a guide draft and return both ID and storage source.
 * Used by create/generate flows to verify save succeeded before redirecting.
 * 
 * @param guide - The Guide object to save
 * @returns Promise<{ id: string; source: "supabase" | "localStorage" }> - Save result with storage source
 */
export async function saveGuideDraft(
  guide: Guide
): Promise<{ id: string; source: "supabase" | "localStorage" }> {
  const adapter = getAdapter()
  return adapter.saveDraft(guide)
}

/**
 * Load a guide draft by draftId.
 * Returns null if not found or expired.
 * 
 * @param draftId - The ID of the draft to load
 * @returns Promise<Guide | null> - The loaded Guide or null if not found
 */
export async function loadGuideDraft(draftId: string): Promise<Guide | null> {
  return getAdapter().loadDraft(draftId)
}

/**
 * Check if a draftId exists.
 * 
 * @param draftId - The ID to check
 * @returns Promise<boolean> - True if draft exists
 */
export async function hasDraft(draftId: string): Promise<boolean> {
  return getAdapter().hasDraft(draftId)
}

/**
 * Delete a draft by draftId.
 * 
 * @param draftId - The ID of the draft to delete
 * @returns Promise<void>
 */
export async function deleteDraft(draftId: string): Promise<void> {
  return getAdapter().deleteDraft(draftId)
}

/**
 * Clear all guide drafts.
 * WARNING: This is a destructive operation.
 * 
 * @returns Promise<void>
 */
export async function clearAllDrafts(): Promise<void> {
  return getAdapter().clearAllDrafts()
}

/**
 * Get all draft IDs stored.
 * DEPRECATED: Use getAllDraftObjects() instead for full Guide objects.
 * 
 * @returns Promise<string[]> - Array of draft IDs
 */
export async function getAllDrafts(): Promise<string[]> {
  const drafts = await getAdapter().getAllDrafts()
  return drafts.map((d) => d.id)
}

/**
 * Get all draft objects (loaded from storage).
 * 
 * @returns Promise<Guide[]> - Array of loaded Guide objects
 */
export async function getAllDraftObjects(): Promise<Guide[]> {
  return getAdapter().getAllDrafts()
}

/**
 * Get most recent draft objects sorted by updatedAt (newest first).
 * 
 * @param limit - Maximum number of drafts to return (default: 10)
 * @returns Promise<Guide[]> - Array of recent Guide objects
 */
export async function getRecentDrafts(limit = 10): Promise<Guide[]> {
  return getAdapter().getRecentDrafts(limit)
}

/**
 * Get drafts for a specific network.
 * 
 * @param networkId - The network ID to filter by
 * @returns Promise<Guide[]> - Array of Guide objects for the network
 */
export async function getDraftsByNetwork(networkId: string): Promise<Guide[]> {
  return getAdapter().getDraftsByNetwork(networkId)
}

/**
 * Update a draft's status (draft, ready, published, archived).
 * 
 * @param draftId - The ID of the draft to update
 * @param status - The new status value
 * @returns Promise<void>
 */
export async function updateDraftStatus(
  draftId: string,
  status: string
): Promise<void> {
  return getAdapter().updateDraftStatus(draftId, status)
}
