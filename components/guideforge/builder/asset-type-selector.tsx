"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { StructuredAssetType } from "@/lib/guideforge/generation-schemas"
import { AssetTypeBadge } from "./asset-type-badge"

export function AssetTypeSelector() {
  const assetTypes: Array<{
    id: string
    title: string
    description: string
    status: "available" | "coming-soon"
  }> = [
    {
      id: "single_guide",
      title: "Single Guide",
      description: "A structured how-to, tutorial, walkthrough, or explanatory guide with steps, tips, and warnings.",
      status: "available",
    },
    {
      id: "recipe",
      title: "Recipe",
      description: "A stylized recipe with ingredients, timing, servings, steps, and tips. Save as draft or share.",
      status: "coming-soon",
    },
    {
      id: "checklist",
      title: "Checklist",
      description: "A structured checklist grouped by sections with completion items and requirements.",
      status: "available",
    },
    {
      id: "sop",
      title: "SOP / Procedure",
      description: "A formal process guide with purpose, scope, requirements, procedure steps, and review notes.",
      status: "coming-soon",
    },
    {
      id: "troubleshooting_flow",
      title: "Troubleshooting Flow",
      description: "A diagnosis-first guide with symptoms, checks, likely causes, fixes, and escalation paths.",
      status: "coming-soon",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Workspace
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Create Structured Asset</h1>
        <p className="text-base text-muted-foreground">
          Choose an asset type to generate. Your draft saves to your workspace — then edit, refine, and reuse it.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {assetTypes.map((assetType) => {
          const isAvailable = assetType.status === "available"
          const colorClasses = {
            single_guide: "hover:border-amber-500/30 hover:bg-amber-500/5 dark:hover:bg-amber-950/20",
            recipe: "hover:border-orange-500/30 hover:bg-orange-500/5 dark:hover:bg-orange-950/20",
            checklist: "hover:border-blue-500/30 hover:bg-blue-500/5 dark:hover:bg-blue-950/20",
            sop: "hover:border-slate-500/30 hover:bg-slate-500/5 dark:hover:bg-slate-950/20",
            troubleshooting_flow: "hover:border-red-500/30 hover:bg-red-500/5 dark:hover:bg-red-950/20",
          }
          return isAvailable ? (
            <Link
              key={assetType.id}
              href={`/builder/generate-asset/${assetType.id}`}
              className="block h-full"
            >
              <Card className={`h-full min-h-56 border border-border/50 transition-all cursor-pointer ${colorClasses[assetType.id as keyof typeof colorClasses] || ""}`}>
                <div className="h-full p-6 flex flex-col">
                  {/* Asset Type Badge with Icon */}
                  <div className="flex-shrink-0 mb-4">
                    <AssetTypeBadge assetType={assetType.id as StructuredAssetType} variant="large" />
                  </div>
                  {/* Description */}
                  <p className="text-sm text-muted-foreground mt-2 flex-1 overflow-hidden break-words whitespace-normal leading-relaxed">
                    {assetType.description}
                  </p>
                  {/* Status Badge */}
                  <div className="pt-4 mt-auto flex-shrink-0">
                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                      Available
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ) : (
            <Card
              key={assetType.id}
              className="h-full min-h-56 border border-border/50 bg-muted/30 cursor-not-allowed"
            >
              <div className="h-full p-6 flex flex-col">
                {/* Asset Type Badge with Icon (muted for coming soon) */}
                <div className="flex-shrink-0 mb-4 opacity-50">
                  <AssetTypeBadge assetType={assetType.id as StructuredAssetType} variant="large" />
                </div>
                {/* Description */}
                <p className="text-sm text-muted-foreground/80 mt-2 flex-1 overflow-hidden break-words whitespace-normal leading-relaxed">
                  {assetType.description}
                </p>
                {/* Status Badge */}
                <div className="pt-4 mt-auto flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-4 border-amber-500/20 bg-amber-500/5">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <strong>How it works:</strong> Select an asset type → generate a draft → save to your workspace → edit and refine. Both Guides and Checklists are fully functional. Others are coming soon.
        </p>
      </Card>
    </div>
  )
}
