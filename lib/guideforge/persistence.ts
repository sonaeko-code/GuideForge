/**
 * Guide Persistence Adapter Interface
 * 
 * Strategy pattern for swapping between localStorage and Supabase storage.
 * Allows GuideForge to remain storage-agnostic during the migration to Supabase.
 * 
 * Phase 1: localStorage implementation (currently active)
 * Phase 2: Supabase implementation (in supabase-persistence.ts)
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
   * Returns { id, source } indicating where the guide was saved.
   */
  saveDraft(guide: Guide): Promise<{ id: string; source: "supabase" | "localStorage" }>

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

  async saveDraft(guide: Guide): Promise<{ id: string; source: "supabase" | "localStorage" }> {
    return { id: this.saveDraftSync(guide), source: "localStorage" }
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
 * Factory function to get the active persistence adapter.
 * Automatically selects Supabase if configured, otherwise falls back to localStorage.
 */
export function getPersistenceAdapter(): GuidePersistenceAdapter {
  // Check if Supabase environment variables are present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  // Validate that both are present
  const urlPresent = !!supabaseUrl
  const keyPresent = !!supabaseAnonKey
  
  // If Supabase is configured, use Supabase adapter
  if (urlPresent && keyPresent) {
    // Additional validation
    const urlValid = supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co")
    const keyValid = supabaseAnonKey.includes(".") && supabaseAnonKey.length > 50
    
    if (urlValid && keyValid) {
      console.log("[v0] Persistence adapter selected: Supabase")
      // Lazy import to avoid circular dependency issues
      const { SupabasePersistenceAdapter } = require("./supabase-persistence")
      return new SupabasePersistenceAdapter()
    } else {
      console.log("[v0] Persistence adapter selected: localStorage because Supabase env vars present but invalid")
      if (!urlValid) console.log("[v0]   - URL invalid: must start with https:// and include supabase.co")
      if (!keyValid) console.log("[v0]   - Key invalid: must contain . and be > 50 chars")
    }
  } else {
    const missing: string[] = []
    if (!urlPresent) missing.push("NEXT_PUBLIC_SUPABASE_URL")
    if (!keyPresent) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    console.log("[v0] Persistence adapter selected: localStorage because missing:", missing.join(", "))
  }

  // Default to localStorage
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
