"use client"

import {
  CheckSquare2,
  BookOpen,
  HelpCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AssetType } from "@/lib/guideforge/asset-draft-types"

/**
 * Asset type metadata: icon, label, color scheme, and descriptions
 */
const ASSET_TYPE_CONFIG: Record<
  AssetType | "unknown",
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
    badgeColor: string // Tailwind bg color for badge
    accentColor: string // Tailwind text/border color for accents
    dotColor: string // Tailwind bg color for small dot indicator
  }
> = {
  single_guide: {
    icon: BookOpen,
    label: "Guide",
    description: "A structured how-to or tutorial guide",
    badgeColor: "bg-amber-100 dark:bg-amber-900/30",
    accentColor: "text-amber-700 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  checklist: {
    icon: CheckSquare2,
    label: "Checklist",
    description: "A sectioned checklist with completion items",
    badgeColor: "bg-blue-100 dark:bg-blue-900/30",
    accentColor: "text-blue-700 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  recipe: {
    icon: BookOpen,
    label: "Recipe",
    description: "A stylized recipe with ingredients and steps",
    badgeColor: "bg-orange-100 dark:bg-orange-900/30",
    accentColor: "text-orange-700 dark:text-orange-300",
    dotColor: "bg-orange-500",
  },
  sop: {
    icon: CheckSquare2,
    label: "SOP",
    description: "A formal standard operating procedure",
    badgeColor: "bg-slate-100 dark:bg-slate-900/30",
    accentColor: "text-slate-700 dark:text-slate-300",
    dotColor: "bg-slate-500",
  },
  troubleshooting_flow: {
    icon: HelpCircle,
    label: "Troubleshooting",
    description: "A diagnosis-first troubleshooting guide",
    badgeColor: "bg-red-100 dark:bg-red-900/30",
    accentColor: "text-red-700 dark:text-red-300",
    dotColor: "bg-red-500",
  },
  unknown: {
    icon: HelpCircle,
    label: "Asset",
    description: "Unknown asset type",
    badgeColor: "bg-gray-100 dark:bg-gray-900/30",
    accentColor: "text-gray-700 dark:text-gray-300",
    dotColor: "bg-gray-500",
  },
}

export interface AssetTypeBadgeProps {
  assetType: AssetType | string
  variant?: "small" | "large" // "small" = badge with icon+label, "large" = card-style with description
}

/**
 * Reusable asset type badge with icon, label, and color treatment.
 * Supports small badge variant and larger card variant.
 */
export function AssetTypeBadge({
  assetType,
  variant = "small",
}: AssetTypeBadgeProps) {
  const config =
    ASSET_TYPE_CONFIG[assetType as AssetType] || ASSET_TYPE_CONFIG.unknown
  const Icon = config.icon

  if (variant === "large") {
    return (
      <div
        className={`flex items-start gap-2 px-3 py-2 rounded-lg ${config.badgeColor}`}
      >
        <Icon className={`size-5 shrink-0 mt-0.5 ${config.accentColor}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className={`font-semibold text-sm ${config.accentColor}`}>
            {config.label}
          </p>
          <p className={`text-xs line-clamp-1 ${config.accentColor.replace("700", "600").replace("300", "400")}`}>
            {config.description}
          </p>
        </div>
      </div>
    )
  }

  // Default "small" variant — compact badge
  return (
    <Badge variant="outline" className={`${config.badgeColor} border-transparent gap-1.5`}>
      <Icon className={`size-3.5 ${config.accentColor}`} aria-hidden="true" />
      <span className={config.accentColor}>{config.label}</span>
    </Badge>
  )
}

/**
 * Dot indicator for inline display (e.g., in lists)
 */
export function AssetTypeDot({
  assetType,
  className = "size-2",
}: {
  assetType: AssetType | string
  className?: string
}) {
  const config =
    ASSET_TYPE_CONFIG[assetType as AssetType] || ASSET_TYPE_CONFIG.unknown
  return (
    <div
      className={`rounded-full ${config.dotColor} ${className}`}
      aria-label={config.label}
    />
  )
}

/**
 * Get asset type label (for backward compatibility with existing code)
 */
export function getAssetTypeLabel(assetType: AssetType | string): string {
  const config =
    ASSET_TYPE_CONFIG[assetType as AssetType] || ASSET_TYPE_CONFIG.unknown
  return config.label
}
