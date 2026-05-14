"use client"

import { CheckCircle2, Circle, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { PublishedBadge } from "./published-badge"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import type { GeneratedChecklist } from "@/lib/guideforge/generation-schemas"

interface PublicChecklistAssetProps {
  title: string
  summary: string
  asset: GeneratedChecklist
}

/**
 * Lane 2D: Render a published checklist asset publicly
 * Shows title, summary, sections with items, and completion criteria
 * Hides draft-only fields like assumptions and missingInfo
 * 
 * Note: Items are rendered as static list, not interactive/checked UI
 * (Client-side checking state would require auth and persistence)
 */
export function PublicChecklistAsset({
  title,
  summary,
  asset,
}: PublicChecklistAssetProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <article className="space-y-6">
          {/* Featured image placeholder */}
          <MediaPlaceholder
            label="Checklist"
            variant="image"
            tone="default"
            aspect="aspect-[16/9]"
          />

          {/* Title and metadata */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                Checklist
              </Badge>
              <PublishedBadge verification={undefined} />
            </div>

            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              {title}
            </h1>

            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              {summary}
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {asset.sections.map((section, sectionIndex) => (
              <Card key={sectionIndex} className="border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {section.title}
                </h2>

                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={`flex items-start gap-3 rounded-lg p-3 ${
                        item.required
                          ? "bg-amber-500/5 border border-amber-500/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {/* Checkbox icon (not interactive) */}
                      <div className="mt-1 flex-shrink-0">
                        <Circle className="size-5 text-muted-foreground" aria-hidden="true" />
                      </div>

                      {/* Item content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-foreground">
                            {item.label}
                          </span>
                          {item.required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 flex-shrink-0"
                            >
                              Required
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Completion criteria */}
          {asset.completionCriteria && asset.completionCriteria.length > 0 && (
            <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground mb-2">Completion Criteria</h2>
                  <ul className="space-y-2">
                    {asset.completionCriteria.map((criteria, i) => (
                      <li key={i} className="text-sm text-emerald-900 dark:text-emerald-100">
                        ✓ {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Tags */}
          {asset.tags && asset.tags.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
