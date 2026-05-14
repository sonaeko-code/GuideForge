/**
 * Account-Bound Asset Drafts
 * 
 * These are user's personal draft assets saved to their workspace.
 * They do not require a network/hub/collection.
 * They can be attached to a network later, but start as standalone.
 */

import type { GeneratedStructuredAsset } from "./generation-schemas"

export type AssetType = "single_guide" | "recipe" | "checklist" | "sop" | "troubleshooting_flow"

/**
 * Asset Draft Status — Maps to guide status workflow
 * draft: Private workspace, not on public site
 * pending_review: Submitted for review, not on public site
 * published: Visible on public site (Lane 2B+)
 * archived: Preserved for reference, not visible
 */
export type AssetDraftStatus = "draft" | "pending_review" | "published" | "archived"

export type AssetDraftSource = "generated" | "manual" | "imported"

export interface AssetDraft {
  id: string
  ownerId: string // auth.users(id)
  assetType: AssetType
  title: string
  summary: string | null
  payload: GeneratedStructuredAsset
  status: AssetDraftStatus
  source: AssetDraftSource
  
  // Future: attachment to network (nullable until explicitly attached)
  attachedNetworkId: string | null
  attachedHubId: string | null
  attachedCollectionId: string | null
  
  createdAt: string
  updatedAt: string
}

export interface CreateAssetDraftInput {
  assetType: AssetType
  title: string
  summary: string | null
  payload: GeneratedStructuredAsset
  source?: AssetDraftSource
}

export interface UpdateAssetDraftInput {
  title?: string
  summary?: string | null
  status?: AssetDraftStatus
  attachedNetworkId?: string | null
  attachedHubId?: string | null
  attachedCollectionId?: string | null
}
