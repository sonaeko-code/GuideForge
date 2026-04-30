import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-parchment-grid">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-col items-start gap-6 md:max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass
              className="size-3.5 text-primary"
              aria-hidden="true"
            />
            Build guide worlds, not blank websites
          </span>

          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Build hosted guide worlds, sites, and structured guides without
            designing from scratch.
          </h1>

          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            GuideForge lets you choose a direction, generate a structured guide
            site, and create hubs and guide pages — then publish, export, or
            embed those guides wherever your readers are.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/builder/welcome">
                Start building
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/#examples">See an example network</Link>
            </Button>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground">Object model</dt>
              <dd className="mt-1 font-medium text-foreground">
                Network → Hub → Collection → Guide → Step
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Setup</dt>
              <dd className="mt-1 font-medium text-foreground">
                Guided wizard, not blank canvas
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Output</dt>
              <dd className="mt-1 font-medium text-foreground">
                Hosted, exportable, embeddable
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
