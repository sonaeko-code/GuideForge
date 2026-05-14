"use client"

import { AlertCircle, CheckCircle2, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { PublishedBadge } from "./published-badge"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"

interface PublicSingleGuideAssetProps {
  title: string
  summary: string
  asset: GeneratedSingleGuide
  estimatedMinutes?: number
}

/**
 * Lane 2D: Render a published single guide asset publicly
 * Shows title, summary, requirements, warnings, and steps
 * Hides draft-only fields like assumptions and missingInfo
 */
export function PublicSingleGuideAsset({
  title,
  summary,
  asset,
  estimatedMinutes,
}: PublicSingleGuideAssetProps) {
  return (
    <div className="min-h-screen surface-parchment">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
        {/* Header */}
        <article className="space-y-8">
          {/* Featured image placeholder */}
          <MediaPlaceholder
            label="Guide"
            variant="image"
            tone="default"
            aspect="aspect-[16/9]"
          />

          {/* Title block — editorial masthead */}
          <div className="space-y-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brass-700)]">
              Published Guide &middot; {asset.difficulty}
            </p>

            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              {title}
            </h1>

            <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
              {summary}
            </p>

            <div className="divider-brass" aria-hidden="true" />

            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={asset.difficulty} />
              <PublishedBadge verification={undefined} />
              {estimatedMinutes && (
                <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                  <Clock className="size-3" aria-hidden="true" />
                  {estimatedMinutes} min
                </Badge>
              )}
            </div>

            {/* Audience */}
            {asset.audience && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 p-3 border border-blue-500/20">
                <Users className="mt-0.5 size-4 flex-shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <p className="text-sm">
                  <span className="font-semibold text-foreground">Audience: </span>
                  <span className="text-muted-foreground">{asset.audience}</span>
                </p>
              </div>
            )}
          </div>

          {/* Requirements */}
          {asset.requirements && asset.requirements.length > 0 && (
            <Card className="card-foundry p-6">
              <h2 className="mb-4 text-base font-bold uppercase tracking-[0.12em] text-foreground">Requirements</h2>
              <ul className="space-y-3">
                {asset.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <CheckCircle2 className="mt-0.5 size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="text-muted-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Warnings */}
          {asset.warnings && asset.warnings.length > 0 && (
            <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/8 to-amber-600/5 dark:from-amber-700/12 dark:to-amber-800/8 p-5">
              <div className="flex items-start gap-4">
                <AlertCircle className="mt-0.5 size-6 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-foreground mb-3">Warnings</h2>
                  <ul className="space-y-2">
                    {asset.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-amber-900/80 dark:text-amber-100/80 leading-relaxed">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Steps */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Steps</h2>
              <span className="flex-1 divider-brass" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {asset.steps.length} {asset.steps.length === 1 ? 'step' : 'steps'}
              </span>
            </div>
            <div className="space-y-5">
              {asset.steps.map((step, index) => (
                <Card key={index} className="card-foundry p-6">
                  <div className="flex gap-5">
                    {/* Step number — forged coin */}
                    <div className="forge-seal flex size-11 flex-shrink-0 items-center justify-center rounded-full text-[oklch(0.18_0.02_50)]">
                      <span className="text-lg font-bold">{index + 1}</span>
                    </div>

                    {/* Step content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
                        {step.title}
                      </h3>
                      <div className="text-muted-foreground mb-4 leading-relaxed text-sm">
                        <p>{step.body}</p>
                      </div>

                      {/* Success condition */}
                      {step.successCondition && (
                        <div className="flex items-start gap-3 rounded-lg bg-emerald-500/8 border border-emerald-500/30 p-3 text-sm mb-3">
                          <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-900 dark:text-emerald-100 leading-relaxed">
                            <strong>Success:</strong> {step.successCondition}
                          </span>
                        </div>
                      )}

                      {/* Tip */}
                      {step.tip && (
                        <div className="mt-3 flex items-start gap-3 rounded-lg bg-blue-500/8 border border-blue-500/30 p-3 text-sm mb-3">
                          <span className="font-semibold text-blue-900 dark:text-blue-100 leading-relaxed">💡 Tip: {step.tip}</span>
                        </div>
                      )}

                      {/* Warning */}
                      {step.warning && (
                        <div className="mt-3 flex items-start gap-3 rounded-lg bg-amber-500/8 border border-amber-500/30 p-3 text-sm">
                          <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
                          <span className="text-amber-900 dark:text-amber-100 leading-relaxed">
                            <strong>Warning:</strong> {step.warning}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

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
