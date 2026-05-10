-- Phase 2: Account-Bound Asset Drafts Schema
-- Table for user-owned, account-level asset drafts
-- These are personal workspace items, not network-attached guides

CREATE TABLE IF NOT EXISTS public.asset_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Asset metadata
  asset_type text NOT NULL
    CHECK (asset_type IN ('single_guide', 'recipe', 'checklist', 'sop', 'troubleshooting_flow')),
  title text NOT NULL,
  summary text,
  
  -- Full generated payload (structured asset object serialized)
  payload jsonb NOT NULL,
  
  -- Draft status
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'archived')),
  source text NOT NULL DEFAULT 'generated'
    CHECK (source IN ('generated', 'manual', 'imported')),
  
  -- Future: attachment to network guide system (nullable until user explicitly attaches)
  attached_network_id uuid REFERENCES public.networks(id) ON DELETE SET NULL,
  attached_hub_id uuid REFERENCES public.hubs(id) ON DELETE SET NULL,
  attached_collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_asset_drafts_owner_id ON public.asset_drafts(owner_id);
CREATE INDEX IF NOT EXISTS idx_asset_drafts_created_at ON public.asset_drafts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_drafts_status ON public.asset_drafts(status);

-- Auto-update updated_at
CREATE TRIGGER update_asset_drafts_updated_at
  BEFORE UPDATE ON public.asset_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS: Asset Drafts (Private Workspace Only)
-- ============================================================================

ALTER TABLE public.asset_drafts ENABLE ROW LEVEL SECURITY;

-- Users can see their own asset drafts
CREATE POLICY asset_drafts_select_own ON public.asset_drafts
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can create their own asset drafts
CREATE POLICY asset_drafts_insert_own ON public.asset_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own asset drafts
CREATE POLICY asset_drafts_update_own ON public.asset_drafts
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own asset drafts
CREATE POLICY asset_drafts_delete_own ON public.asset_drafts
  FOR DELETE
  USING (auth.uid() = owner_id);
