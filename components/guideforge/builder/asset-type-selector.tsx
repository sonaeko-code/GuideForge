"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { StructuredAssetType } from "@/lib/guideforge/generation-schemas"

export function AssetTypeSelector() {
  const assetTypes: Array<{
    id: StructuredAssetType
    title: string
    description: string
  }> = [
    {
      id: "single_guide",
      title: "Single Guide",
      description: "A structured how-to, tutorial, walkthrough, or explanatory guide.",
    },
    {
      id: "recipe",
      title: "Recipe",
      description: "A stylized recipe with ingredients, timing, servings, steps, tips, and notes.",
    },
    {
      id: "checklist",
      title: "Checklist",
      description: "A structured checklist grouped by sections, with completion items.",
    },
    {
      id: "sop",
      title: "SOP / Procedure",
      description: "A formal process guide with purpose, scope, requirements, procedure steps, and review notes.",
    },
    {
      id: "troubleshooting_flow",
      title: "Troubleshooting Flow",
      description: "A diagnosis-first guide with symptoms, checks, likely causes, fixes, and escalation.",
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
          Choose what you'd like to create, and we'll guide you through a structured generation process.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assetTypes.map((assetType) => (
          <Button
            key={assetType.id}
            asChild
            variant="outline"
            className="h-auto justify-start p-6 text-left"
          >
            <Link href={`/builder/generate-asset/${assetType.id}`}>
              <div className="space-y-2">
                <h2 className="font-semibold text-foreground">{assetType.title}</h2>
                <p className="text-sm text-muted-foreground">{assetType.description}</p>
              </div>
            </Link>
          </Button>
        ))}
      </div>

      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Coming soon:</strong> Embeddable guide widgets. For now, you can create full guides, recipes, checklists, SOPs, and troubleshooting flows as drafts.
        </p>
      </Card>
    </div>
  )
}
