import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Clock } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { GameBanner } from "@/components/questline/media/game-banner"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import {
  CollectionIcon,
  hubSlugToTone,
} from "@/components/questline/media/collection-icon"
import {
  HOLLOWSPIRE_HUB,
  getCollectionsByHub,
  getGuidesByCollection,
  getGuidesByHub,
} from "@/lib/guideforge/mock-data"
import { QUESTLINE_NEWS } from "@/lib/questline/mock-news"

export default async function HollowspireHubPage() {
  const hub = HOLLOWSPIRE_HUB
  const collections = getCollectionsByHub(hub.id)
  const guides = getGuidesByHub(hub.id).filter((g) => g.status === "published")
  const recent = [...guides]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.updatedAt).getTime() -
        new Date(a.publishedAt ?? a.updatedAt).getTime(),
    )
    .slice(0, 4)
  const hubNews = QUESTLINE_NEWS.filter((n) => n.hubSlug === hub.slug).slice(0, 3)

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* HERO BANNER */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
            <Link href="/n/questline/games">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              All games
            </Link>
          </Button>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16">
          <GameBanner
            name={hub.name}
            tagline={hub.tagline ?? hub.description}
            eyebrow="Game Hub"
            tone={hubSlugToTone(hub.slug)}
            aspect="aspect-[21/9] md:aspect-[3/1]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                {hub.hubKind}
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                Patch 3.8
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                {guides.length} guide{guides.length !== 1 ? "s" : ""}
              </span>
            </div>
          </GameBanner>

          <div className="mt-8 max-w-3xl">
            <p className="text-base leading-relaxed text-muted-foreground">
              {hub.description}
            </p>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading eyebrow="Collections" title="Explore by category" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {collections.map((collection) => {
              const collGuides = getGuidesByCollection(collection.id)
              const firstGuide = collGuides[0]
              const href = firstGuide
                ? `/n/questline/${hub.slug}/${firstGuide.slug}`
                : `/n/questline/${hub.slug}`
              return (
                <Link
                  key={collection.id}
                  href={href}
                  className="group flex flex-col rounded-xl border border-foreground/15 bg-background p-5 transition-colors hover:border-primary/40"
                >
                  <CollectionIcon slug={collection.slug} size="lg" />
                  <h3 className="mt-4 text-lg font-bold tracking-tight transition-colors group-hover:text-primary">
                    {collection.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {collection.description}
                  </p>
                  <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {collGuides.length} guide
                    {collGuides.length !== 1 ? "s" : ""}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* LATEST GUIDES */}
      {recent.length > 0 && (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Latest" title="Recently published" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((g) => (
                <Link
                  key={g.id}
                  href={`/n/questline/${hub.slug}/${g.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <MediaPlaceholder
                    label="Guide Thumbnail"
                    variant={g.type === "boss-guide" ? "spark" : "image"}
                    tone={
                      g.verification === "forge-verified" ? "primary" : "default"
                    }
                    aspect="aspect-[16/10]"
                  />
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {g.type.replace("-", " ")}
                  </div>
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                    {g.title}
                  </h4>
                  <div className="mt-auto flex items-center gap-2 text-xs">
                    <DifficultyBadge difficulty={g.difficulty} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NEWS RAIL */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading eyebrow="Dispatches" title={`Latest from ${hub.name}`} />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {hubNews.map((n) => (
              <Link
                key={n.id}
                href={`/n/questline/${hub.slug}`}
                className="group flex flex-col gap-3"
              >
                <MediaPlaceholder
                  label="News Art"
                  variant="patch"
                  tone="ink"
                  aspect="aspect-[16/10]"
                />
                <div className="text-[10px] font-mono uppercase tracking-wider text-primary">
                  {n.category}
                </div>
                <h4 className="text-base font-bold leading-snug transition-colors group-hover:text-primary">
                  {n.title}
                </h4>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {n.blurb}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  {n.readMinutes} min read
                </div>
              </Link>
            ))}
            {hubNews.length === 0 && (
              <p className="col-span-3 text-sm text-muted-foreground">
                No dispatches for this hub yet.
              </p>
            )}
          </div>

          <div className="mt-10">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/n/questline/games">
                Browse all games
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <QuestLineFooter />
    </main>
  )
}

/* ---------------------------------------------------------------- */

interface SectionHeadingProps {
  eyebrow: string
  title: string
}

function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="border-b border-foreground/15 pb-3">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
    </div>
  )
}
