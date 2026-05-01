/**
 * Guide Persistence Adapter Interface
 * 
 * Strategy pattern for swapping between localStorage and Supabase storage.
 * Allows GuideForge to remain storage-agnostic during the migration to Supabase.
 * 
 * Phase 1: localStorage implementation
 * Phase 2: Supabase implementation (new adapter added)
 * Phase 3: Runtime configuration to switch adapters
 */

import type { Guide } from "./types"

/**
 * Interface for guide persistence operations.
 * Implementations can be localStorage, Supabase, or other backends.
 */
export interface GuidePersistenceAdapter {
  /**
   * Save or update a guide draft.
   * Returns the ID of the saved guide.
   */
  saveDraft(guide: Guide): Promise<string>

  /**
   * Load a guide draft by ID.
   * Returns null if not found.
   */
  loadDraft(draftId: string): Promise<Guide | null>

  /**
   * Check if a draft exists.
   */
  hasDraft(draftId: string): Promise<boolean>

  /**
   * Delete a draft by ID.
   */
  deleteDraft(draftId: string): Promise<void>

  /**
   * Load all drafts.
   */
  getAllDrafts(): Promise<Guide[]>

  /**
   * Load recent drafts, sorted by updatedAt (newest first).
   */
  getRecentDrafts(limit?: number): Promise<Guide[]>

  /**
   * Load drafts for a specific network.
   */
  getDraftsByNetwork(networkId: string): Promise<Guide[]>

  /**
   * Clear all drafts (destructive operation).
   */
  clearAllDrafts(): Promise<void>

  /**
   * Update draft status (draft, ready, published, archived).
   */
  updateDraftStatus(draftId: string, status: string): Promise<void>
}

/**
 * localStorage implementation of GuidePersistenceAdapter.
 * Phase 1: Primary storage backend for draft persistence.
 */
export class LocalStoragePersistenceAdapter implements GuidePersistenceAdapter {
  private readonly prefix = "guideforge:drafts:"

  async saveDraft(guide: Guide): Promise<string> {
    return this.saveDraftSync(guide)
  }

  /**
   * Synchronous version of saveDraft for direct localStorage usage.
   * Useful for Phase 1 where localStorage is synchronous.
   */
  saveDraftSync(guide: Guide): string {
    const draftId = guide.id || `draft_${Date.now()}`
    const key = `${this.prefix}${draftId}`
    localStorage.setItem(key, JSON.stringify(guide))
    return draftId
  }

  async loadDraft(draftId: string): Promise<Guide | null> {
    return this.loadDraftSync(draftId)
  }

  /**
   * Synchronous version of loadDraft for direct localStorage usage.
   */
  loadDraftSync(draftId: string): Guide | null {
    const key = `${this.prefix}${draftId}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    try {
      return JSON.parse(stored) as Guide
    } catch (error) {
      console.error(`[v0] Failed to parse draft ${draftId}:`, error)
      return null
    }
  }

  async hasDraft(draftId: string): Promise<boolean> {
    return this.hasDraftSync(draftId)
  }

  /**
   * Synchronous version of hasDraft.
   */
  hasDraftSync(draftId: string): boolean {
    const key = `${this.prefix}${draftId}`
    return localStorage.getItem(key) !== null
  }

  async deleteDraft(draftId: string): Promise<void> {
    this.deleteDraftSync(draftId)
  }

  /**
   * Synchronous version of deleteDraft.
   */
  deleteDraftSync(draftId: string): void {
    const key = `${this.prefix}${draftId}`
    localStorage.removeItem(key)
  }

  async getAllDrafts(): Promise<Guide[]> {
    return this.getAllDraftsSync()
  }

  /**
   * Synchronous version of getAllDrafts.
   */
  getAllDraftsSync(): Guide[] {
    const drafts: Guide[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            drafts.push(JSON.parse(data) as Guide)
          } catch (error) {
            console.error(`[v0] Failed to parse draft from key ${key}:`, error)
          }
        }
      }
    }
    return drafts
  }

  async getRecentDrafts(limit = 10): Promise<Guide[]> {
    return this.getRecentDraftsSync(limit)
  }

  /**
   * Synchronous version of getRecentDrafts.
   */
  getRecentDraftsSync(limit = 10): Guide[] {
    const all = this.getAllDraftsSync()
    return all
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || 0).getTime()
        const bDate = new Date(b.updatedAt || 0).getTime()
        return bDate - aDate
      })
      .slice(0, limit)
  }

  async getDraftsByNetwork(networkId: string): Promise<Guide[]> {
    return this.getDraftsByNetworkSync(networkId)
  }

  /**
   * Synchronous version of getDraftsByNetwork.
   */
  getDraftsByNetworkSync(networkId: string): Guide[] {
    const all = this.getAllDraftsSync()
    return all.filter((g) => g.networkId === networkId)
  }

  async clearAllDrafts(): Promise<void> {
    this.clearAllDraftsSync()
  }

  /**
   * Synchronous version of clearAllDrafts.
   */
  clearAllDraftsSync(): void {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        keys.push(key)
      }
    }
    keys.forEach((key) => localStorage.removeItem(key))
  }

  async updateDraftStatus(draftId: string, status: string): Promise<void> {
    this.updateDraftStatusSync(draftId, status)
  }

  /**
   * Synchronous version of updateDraftStatus.
   */
  updateDraftStatusSync(draftId: string, status: string): void {
    const key = `${this.prefix}${draftId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const guide = JSON.parse(stored) as Guide
        guide.status = status as any
        guide.updatedAt = new Date().toISOString()
        localStorage.setItem(key, JSON.stringify(guide))
      } catch (error) {
        console.error(`[v0] Failed to update draft status ${draftId}:`, error)
      }
    }
  }
}

/**
 * Stub Supabase implementation of GuidePersistenceAdapter.
 * Phase 2: Will be implemented when Supabase integration is ready.
 * 
 * This stub allows code to prepare for Supabase without breaking Phase 1.
 */
export class SupabasePersistenceAdapter implements GuidePersistenceAdapter {
  // TODO: Implement in Phase 2
  // Will require: supabase client, auth context, RLS policies

  async saveDraft(guide: Guide): Promise<string> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async loadDraft(draftId: string): Promise<Guide | null> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async hasDraft(draftId: string): Promise<boolean> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async deleteDraft(draftId: string): Promise<void> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async getAllDrafts(): Promise<Guide[]> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async getRecentDrafts(limit?: number): Promise<Guide[]> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async getDraftsByNetwork(networkId: string): Promise<Guide[]> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async clearAllDrafts(): Promise<void> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }

  async updateDraftStatus(draftId: string, status: string): Promise<void> {
    throw new Error("Supabase adapter not implemented yet (Phase 2)")
  }
}

/**
 * Factory function to get the active persistence adapter.
 * Phase 1: Returns localStorage adapter.
 * Phase 2: Will accept environment variable or config to switch.
 */
export function getPersistenceAdapter(): GuidePersistenceAdapter {
  // Phase 1: Always use localStorage
  // Phase 2: Add logic like:
  // const adapterType = process.env.NEXT_PUBLIC_GUIDEFORGE_STORAGE || 'localStorage'
  // if (adapterType === 'supabase') return new SupabasePersistenceAdapter()
  // return new LocalStoragePersistenceAdapter()

  return new LocalStoragePersistenceAdapter()
}

/**
 * Synchronous helper to get localStorage adapter directly.
 * Phase 1 only: For components that need synchronous localStorage access.
 * Phase 2: Will be wrapped in async adapter calls via storage layer.
 * 
 * @returns LocalStoragePersistenceAdapter - Direct access to sync methods
 */
export function getLocalStorageAdapter(): LocalStoragePersistenceAdapter {
  return new LocalStoragePersistenceAdapter()
}
