/**
 * Supabase Persistence Adapter Placeholder
 * 
 * Phase 2 implementation stub for Supabase integration.
 * This adapter will handle draft persistence via Supabase PostgreSQL.
 * 
 * NO Supabase client, env vars, or secrets are configured in Phase 1.
 * This file remains a placeholder until Phase 2 implementation begins.
 */

import type { GuidePersistenceAdapter } from "./persistence"
import type { Guide } from "./types"

/**
 * Stub Supabase implementation of GuidePersistenceAdapter.
 * Phase 2: Will be implemented when Supabase integration is ready.
 * 
 * Implementation notes for Phase 2:
 * - Requires Supabase client initialization
 * - Requires auth context for current user_id
 * - Requires RLS policies on guides table
 * - Will use server-side API routes for secure writes
 * - Will respect network privacy settings
 */
export class SupabasePersistenceAdapter implements GuidePersistenceAdapter {
  // Phase 2: Will inject supabase client and auth context
  // constructor(private supabaseClient: SupabaseClient, private userId: string) {}

  async saveDraft(guide: Guide): Promise<string> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async loadDraft(draftId: string): Promise<Guide | null> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async hasDraft(draftId: string): Promise<boolean> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async deleteDraft(draftId: string): Promise<void> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async getAllDrafts(): Promise<Guide[]> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async getRecentDrafts(limit?: number): Promise<Guide[]> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async getDraftsByNetwork(networkId: string): Promise<Guide[]> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async clearAllDrafts(): Promise<void> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }

  async updateDraftStatus(draftId: string, status: string): Promise<void> {
    throw new Error(
      "Supabase adapter not implemented yet (Phase 2). Currently using localStorage."
    )
  }
}
