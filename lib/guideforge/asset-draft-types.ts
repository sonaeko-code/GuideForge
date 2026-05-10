/**
 * Account-Bound Asset Drafts
 * 
 * These are user's personal draft assets saved to their workspace.
 * They do not require a network/hub/collection.
 * They can be attached to a network later, but start as standalone.
 */

import type { GeneratedStructuredAsset } from "./generation-schemas"

export type AssetType = "single_guide" | "recipe" | "checklist" | "sop" | "troubleshooting_flow"

export type AssetDraftStatus = "draft" | "archived"

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
