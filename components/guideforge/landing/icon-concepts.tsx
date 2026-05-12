"use client"

import { Compass, Map, Hammer, PinIcon, Sparkles, BookOpen, Grid3x3, Shield, LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface IconConcept {
  id: string
  title: string
  description: string
  icon: LucideIcon
  meaning: string
  recommended?: boolean
}

const ICON_CONCEPTS: IconConcept[] = [
  {
    id: "forged-compass",
    title: "Forged Compass",
    description: "Compass/wayfinding symbol with subtle forge geometry",
    icon: Compass,
    meaning: "Guidance, direction, trust, crafted structure",
    recommended: true,
  },
  {
    id: "guide-badge",
    title: "Guide Mark",
    description: "Badge-like symbol with a route/path line",
    icon: Shield,
    meaning: "Guided paths, reusable routes, verification",
  },
  {
    id: "hammer-map",
    title: "Hammer + Wayfinding",
    description: "Subtle combination of building and location",
    icon: Hammer,
    meaning: "Building, forging, wayfinding, structure",
  },
  {
    id: "sparked-guide",
    title: "Sparked Guide",
    description: "Guide/book page with spark or star accent",
    icon: BookOpen,
    meaning: "Knowledge, creation, AI-assisted drafting",
  },
  {
    id: "blueprint-compass",
    title: "Blueprint Compass",
    description: "Geometric compass with blueprint/grid energy",
    icon: Grid3x3,
    meaning: "Systems thinking, structure, knowledge architecture",
  },
  {
    id: "knowledge-badge",
    title: "Knowledge Badge",
    description: "Badge/seal implying trusted, refined knowledge",
    icon: Sparkles,
    meaning: "Trust, refinement, verified knowledge",
  },
]

export function IconConcepts() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Brand exploration
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Icon direction exploration
          </h2>
          <p className="text-pretty text-muted-foreground max-w-2xl">
            These concepts explore visual directions for the GuideForge brand mark — wayfinding, forge energy, structure, and knowledge crafting.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ICON_CONCEPTS.map((concept) => {
            const IconComponent = concept.icon
            return (
              <Card
                key={concept.id}
                className="group relative flex flex-col gap-4 p-6 border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors"
              >
                {/* Icon display */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 p-2.5 rounded-lg bg-muted group-hover:bg-amber-500/10 transition-colors">
                    <IconComponent className="size-6 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{concept.title}</h3>
                  </div>
                  {concept.recommended && (
                    <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700 flex-shrink-0">
                      Recommended
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">{concept.description}</p>

                {/* Meaning */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Represents:</span> {concept.meaning}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="mt-8 p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-semibold">Direction note:</span> The <strong>Forged Compass</strong> direction connects guidance (compass/wayfinding) with crafted structure (forge). This aligns with GuideForge's core mission: transforming rough ideas into structured, reusable knowledge assets.
          </p>
        </Card>
      </div>
    </section>
  )
}
