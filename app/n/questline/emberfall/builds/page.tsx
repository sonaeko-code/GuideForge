import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Shield, Sword } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { CollectionIcon } from "@/components/questline/media/collection-icon"
import {
  CHARACTER_BUILDS_COLLECTION,
  EMBERFALL_HUB,
  getGuidesByCollection,
} from "@/lib/guideforge/mock-data"

export default async function CharacterBuildsPage() {
  const collection = CHARACTER_BUILDS_COLLECTION
  const hub = EMBERFALL_HUB
  const guides = getGuidesByCollection(collection.id)

  // Mock future builds (still in production)
  const upcomingBuilds = [
    {
      title: "Stormcaller DPS Build",
      summary:
        "High-mobility lightning rotation built around the new Tempest set. Burst-heavy and gear-light.",
      difficulty: "intermediate" as const,
      patch: "4.2",
    },
    {
      title: "Paladin Tank Guide",
      summary:
        "The new high-difficulty tank meta. Holds the line through Phase 3 of Frostmarch with no deaths.",
      difficulty: "advanced" as const,
      patch: "4.2",
    },
  ]

  const filterChips = [
    "All",
    "Beginner",
    "Intermediate",
    "Advanced",
    "Forged",
    "Patch 4.2",
  ]

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* HERO */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
            <Link href={`/n/questline/${hub.slug}`}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {hub.name}
            </Link>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16">
          <div className="flex flex-wrap items-start gap-6">
            <CollectionIcon slug={collection.slug} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
                <Sword className="size-3.5" aria-hidden="true" />
                Collection
              </div>
              <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight md:text-4xl">
                {collection.name}
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                {collection.description}
              </p>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-foreground/15 pt-6 md:max-w-md">
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Published
              </dt>
              <dd className="mt-1 text-xl font-bold">{guides.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Upcoming
              </dt>
              <dd className="mt-1 text-xl font-bold">{upcomingBuilds.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Patch
              </dt>
              <dd className="mt-1 text-xl font-bold font-mono">4.2</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FILTERS */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Filter
            </span>
            {filterChips.map((chip, i) => (
              <Button
                key={chip}
                size="sm"
                variant={i === 0 ? "default" : "outline"}
                className="h-8 rounded-full px-3 text-xs"
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLISHED GUIDES */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="border-b border-foreground/15 pb-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
              Published
            </div>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
              Builds you can run today
            </h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/n/questline/${hub.slug}/${guide.slug}`}
                className="group flex flex-col rounded-xl border border-foreground/15 bg-background p-5 transition-colors hover:border-primary/40"
              >
                <MediaPlaceholder
                  label="Build Cover"
                  variant="spark"
                  tone={
                    guide.verification === "forge-verified" ? "primary" : "default"
                  }
                  aspect="aspect-[16/10]"
                  className="-mx-5 -mt-5 mb-4 rounded-b-none rounded-t-xl"
                />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={guide.difficulty} />
                  {guide.verification === "forge-verified" && (
                    <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                      <Shield className="size-3" aria-hidden="true" />
                      Forged
                    </Badge>
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {guide.version}
                  </span>
                </div>
                <h3 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-primary">
                  {guide.title}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {guide.summary}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    By{" "}
                    <span className="font-semibold text-foreground">
                      @{guide.author.handle}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="border-b border-foreground/15 pb-3">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
              In the forge
            </div>
            <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
              Coming soon
            </h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {upcomingBuilds.map((build) => (
              <div
                key={build.title}
                className="flex flex-col rounded-xl border border-dashed border-foreground/20 bg-muted/30 p-5"
              >
                <MediaPlaceholder
                  label="Coming Soon"
                  variant="patch"
                  tone="default"
                  aspect="aspect-[16/10]"
                  className="-mx-5 -mt-5 mb-4 rounded-b-none rounded-t-xl opacity-60"
                />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={build.difficulty} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Patch {build.patch}
                  </span>
                </div>
                <h3 className="text-base font-bold leading-snug">
                  {build.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {build.summary}
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="outline" disabled className="gap-2">
                    In the forge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <QuestLineFooter />
    </main>
  )
}
