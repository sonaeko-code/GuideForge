"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { StructuredAssetType } from "@/lib/guideforge/generation-schemas"

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
      status: "coming-soon",
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
          <Link href="/builder/networks">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Generate Structured Asset</h1>
        <p className="text-base text-muted-foreground">
          Create a single asset draft. It saves to your workspace first — no network needed. You can edit, attach to a network later, or publish separately.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assetTypes.map((assetType) => {
          const isAvailable = assetType.status === "available"
          return isAvailable ? (
            <Button
              key={assetType.id}
              asChild
              variant="outline"
              className="h-full min-h-32 justify-start p-4 text-left hover:bg-accent transition-colors"
            >
              <Link href={`/builder/generate-asset/${assetType.id}`}>
                <div className="space-y-2 w-full">
                  <h2 className="font-semibold text-foreground text-base">{assetType.title}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">{assetType.description}</p>
                </div>
              </Link>
            </Button>
          ) : (
            <div
              key={assetType.id}
              className="border border-border rounded-lg p-4 bg-muted/50 h-full min-h-32 flex flex-col justify-between opacity-60"
            >
              <div className="space-y-2">
                <h2 className="font-semibold text-foreground text-base">{assetType.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2">{assetType.description}</p>
              </div>
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">Coming soon</Badge>
              </div>
            </div>
          )
        })}
      </div>

      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>How it works:</strong> Generate an asset draft → save to your workspace → review it → attach to a network or use separately. Only Single Guides are fully implemented now.
        </p>
      </Card>
    </div>
  )
}
