"use client"

import { Compass, Map, Hammer, BookOpen, Grid3x3, Check, Sparkles, Star, Badge as BadgeIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface IconConcept {
  id: string
  title: string
  description: string
  meaning: string
  recommended?: boolean
}

const ICON_CONCEPTS: IconConcept[] = [
  {
    id: "forged-compass",
    title: "Forged Compass Badge",
    description: "Compass needle with circular badge and forge accent spark",
    meaning: "Guidance, direction, trust, crafted structure",
    recommended: true,
  },
  {
    id: "guide-route",
    title: "Guide Route Badge",
    description: "Badge-like shield with route/path nodes indicating guided journey",
    meaning: "Guided paths, reusable routes, waypoint navigation",
  },
  {
    id: "hammer-wayfinding",
    title: "Hammer + Wayfinding",
    description: "Subtle forge hammer layered with wayfinding location accent",
    meaning: "Building, forging, structured wayfinding",
  },
  {
    id: "sparked-guide",
    title: "Sparked Guide",
    description: "Book/page shape with spark star accent for knowledge creation",
    meaning: "Knowledge, creation, AI-assisted drafting",
  },
  {
    id: "blueprint-compass",
    title: "Blueprint Compass",
    description: "Compass with geometric grid overlay suggesting system architecture",
    meaning: "Systems thinking, structure, knowledge architecture",
  },
  {
    id: "forged-seal",
    title: "Forged Knowledge Seal",
    description: "Seal badge with check mark center suggesting trust and verification",
    meaning: "Trust, verification, refined and trusted knowledge",
  },
]

// Custom mark components using layered shapes
function ForgedCompassMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Outer hexagon/badge circle */}
      <div className="absolute inset-0 rounded-full border-2 border-amber-500/40" />
      <div className="absolute inset-1 rounded-full border border-amber-500/20" />
      {/* Compass center */}
      <Compass className="size-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      {/* Small spark accent */}
      <Sparkles className="absolute bottom-0 right-0 size-3 text-amber-500" aria-hidden="true" />
    </div>
  )
}

function GuideRouteMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Shield background */}
      <div className="absolute inset-0 rounded-lg border-2 border-blue-500/40 bg-blue-500/5" />
      {/* Route path inside */}
      <svg className="absolute w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="1" fill="currentColor" />
        <path d="M6 6 l6 6 l6 -4" />
        <circle cx="18" cy="8" r="1" fill="currentColor" />
      </svg>
    </div>
  )
}

function HammerWayfindingMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Layered background */}
      <div className="absolute inset-0 rounded-full border border-slate-500/30" />
      {/* Hammer base */}
      <Hammer className="size-5 text-slate-600 dark:text-slate-400 absolute left-1" aria-hidden="true" />
      {/* Map pin accent */}
      <Map className="size-3 text-slate-500 dark:text-slate-400 absolute right-1 bottom-1" aria-hidden="true" />
    </div>
  )
}

function SparkedGuideMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Book base */}
      <BookOpen className="size-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
      {/* Spark overlay top-right */}
      <Star className="absolute top-1 right-1 size-3 fill-orange-500 text-orange-500" aria-hidden="true" />
    </div>
  )
}

function BlueprintCompassMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Grid background */}
      <Grid3x3 className="absolute size-5 text-slate-400 dark:text-slate-500 opacity-50" aria-hidden="true" />
      {/* Compass overlay */}
      <Compass className="relative size-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
    </div>
  )
}

function ForgedSealMark() {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Seal circle */}
      <div className="absolute inset-0 rounded-full border-2 border-purple-500/40 bg-purple-500/5" />
      <div className="absolute inset-1 rounded-full border border-purple-500/20" />
      {/* Check mark center */}
      <Check className="size-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
    </div>
  )
}

const MARK_COMPONENTS: Record<string, React.FC> = {
  "forged-compass": ForgedCompassMark,
  "guide-route": GuideRouteMark,
  "hammer-wayfinding": HammerWayfindingMark,
  "sparked-guide": SparkedGuideMark,
  "blueprint-compass": BlueprintCompassMark,
  "forged-seal": ForgedSealMark,
}

export function IconConcepts() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-12 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Brand exploration
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Brand mark directions
          </h2>
          <p className="text-pretty text-muted-foreground max-w-2xl">
            These are visual directions exploring GuideForge's identity — not final logos, but conceptual marks suggesting guidance, crafted structure, and refined knowledge. Each direction emphasizes a different aspect of the platform's mission.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ICON_CONCEPTS.map((concept) => {
            const MarkComponent = MARK_COMPONENTS[concept.id]
            return (
              <Card
                key={concept.id}
                className="group relative flex flex-col gap-4 p-6 border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors"
              >
                {/* Custom mark display */}
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-muted group-hover:bg-amber-500/10 transition-colors">
                    {MarkComponent && <MarkComponent />}
                  </div>
                  {concept.recommended && (
                    <Badge variant="default" className="text-xs bg-amber-600 hover:bg-amber-700 flex-shrink-0">
                      Recommended
                    </Badge>
                  )}
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{concept.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{concept.description}</p>
                </div>

                {/* Meaning */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Represents:</span> {concept.meaning}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="mt-8 p-4 border-amber-500/20 bg-amber-500/5">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <span className="font-semibold">Direction note:</span> The <strong>Forged Compass Badge</strong> connects guidance (compass/wayfinding) with crafted, ownable structure (forge accent and badge ring). This aligns with GuideForge's core: transforming rough ideas into structured, reusable knowledge assets that feel intentional and refined.
          </p>
        </Card>
      </div>
    </section>
  )
}
