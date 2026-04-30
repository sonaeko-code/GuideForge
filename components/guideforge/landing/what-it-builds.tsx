import { Boxes, FileText, Layers, Network } from "lucide-react"
import { SectionCard } from "@/components/guideforge/shared"

const ITEMS = [
  {
    icon: Network,
    title: "Networks",
    description:
      "Top-level brands like QuestLine. Each network has its own theme, domain, and ruleset.",
  },
  {
    icon: Layers,
    title: "Hubs",
    description:
      "A game, product line, department, or topic inside a network. Hubs hold collections.",
  },
  {
    icon: Boxes,
    title: "Collections",
    description:
      "Curated groupings like Character Builds, Boss Guides, or Onboarding SOPs.",
  },
  {
    icon: FileText,
    title: "Guides & Steps",
    description:
      "Structured guides made of typed sections. Forge Rules keep them consistent.",
  },
]

export function WhatItBuilds() {
  return (
    <section
      id="what"
      className="border-b border-border bg-secondary/40"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col gap-3 md:max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            What GuideForge creates
          </span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            A structured guide world — already wired up for you.
          </h2>
          <p className="text-pretty text-muted-foreground">
            You don&apos;t design a site. You compose a guide world from real
            primitives. Every level is opinionated, so what ships stays clean —
            and stays exportable, embeddable, and hostable from day one.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <SectionCard
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
