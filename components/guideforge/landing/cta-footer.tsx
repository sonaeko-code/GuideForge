import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GuideMark } from "@/components/guideforge/brand/guide-mark"

export function CtaFooter() {
  return (
    <>
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 md:px-6 md:py-24">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card px-6 py-12 md:items-center md:px-10 md:text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl md:max-w-2xl">
              Ready to forge your first guide world?
            </h2>
            <p className="max-w-xl text-pretty leading-relaxed text-muted-foreground md:text-center">
              Pick a direction, create a network, and ship a hosted guide site
              your readers will actually trust — then export and embed when
              you&apos;re ready.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/builder/welcome">
                Start building
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:px-6">
          <div className="flex items-center gap-2">
            <GuideMark className="size-6 [&_svg]:size-3.5" />
            <span className="font-medium text-foreground">GuideForge</span>
            <span>— guide worlds, sites, and embeds</span>
          </div>
          <div className="flex items-center gap-5">
            <span>Network → Hub → Collection → Guide → Step</span>
          </div>
        </div>
      </footer>
    </>
  )
}
