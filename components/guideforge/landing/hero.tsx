import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-parchment-grid">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-col items-start gap-6 md:max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full pill-warm px-3 py-1 text-xs font-medium">
            <Zap
              className="size-3.5 text-gf-copper"
              aria-hidden="true"
            />
            Forge structured knowledge
          </span>

          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Forge structured guides from rough ideas.
          </h1>

          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            GuideForge helps you turn messy notes, workflows, tutorials, and plans into organized guides, checklists, and knowledge networks — ready to edit, reuse, and grow.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/builder/welcome">
                Start building
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/#examples">See an example</Link>
            </Button>
          </div>

          <div className="divider-brass w-full mt-4" aria-hidden="true" />

          <dl className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gf-copper/80">Transform</dt>
              <dd className="mt-1 font-medium text-foreground">
                Rough idea → Structured draft
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gf-copper/80">Asset types</dt>
              <dd className="mt-1 font-medium text-foreground">
                Guides, Checklists, Networks
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-gf-copper/80">Ownership</dt>
              <dd className="mt-1 font-medium text-foreground">
                Edit, reuse, grow together
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
