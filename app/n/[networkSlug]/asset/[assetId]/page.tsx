import { notFound } from "next/navigation"
import { NetworkPublicHeader } from "@/components/guideforge/public/network-public-header"
import { NetworkPublicFooter } from "@/components/guideforge/public/network-public-footer"
import { PublicSingleGuideAsset } from "@/components/guideforge/public/public-single-guide-asset"
import { PublicChecklistAsset } from "@/components/guideforge/public/public-checklist-asset"
import { loadPublishedAsset } from "@/lib/guideforge/supabase-public"
import { getNetworkBySlug } from "@/lib/guideforge/supabase-networks"
import { getNetworkTheme } from "@/lib/guideforge/network-themes"
import type { ThemeDirection } from "@/lib/guideforge/types"
import type {
  GeneratedSingleGuide,
  GeneratedChecklist,
} from "@/lib/guideforge/generation-schemas"

/**
 * Lane 2D: Public asset detail page
 * Route: /n/[networkSlug]/asset/[assetId]
 * 
 * Renders published single_guide and checklist assets
 * Enforces privacy: only shows if status=published and attached to this network
 */
export default async function PublicAssetPage({
  params,
}: {
  params: Promise<{
    networkSlug: string
    assetId: string
  }>
}) {
  const { networkSlug, assetId } = await params

  // Load network
  const network = await getNetworkBySlug(networkSlug)
  if (!network) {
    notFound()
  }

  // Load published asset - enforces status=published and attached_network_id match
  const asset = await loadPublishedAsset(assetId, network.id)
  if (!asset) {
    notFound()
  }

  // Get network theme
  const themeId = (network.branding?.theme ?? "neutral") as ThemeDirection
  const theme = getNetworkTheme(themeId)

  // Type-safe asset payload casting
  const payload = asset.payload as GeneratedSingleGuide | GeneratedChecklist

  // Render based on asset type
  let content = null
  if (asset.assetType === "single_guide") {
    const singleGuide = payload as GeneratedSingleGuide
    content = (
      <PublicSingleGuideAsset
        title={asset.title}
        summary={asset.summary || ""}
        asset={singleGuide}
        estimatedMinutes={undefined}
      />
    )
  } else if (asset.assetType === "checklist") {
    const checklist = payload as GeneratedChecklist
    content = (
      <PublicChecklistAsset
        title={asset.title}
        summary={asset.summary || ""}
        asset={checklist}
      />
    )
  } else {
    // Unsupported asset type
    notFound()
  }

  return (
    <main className="min-h-screen surface-parchment">
      <NetworkPublicHeader network={network} />
      {content}
      <NetworkPublicFooter network={network} />
    </main>
  )
}
