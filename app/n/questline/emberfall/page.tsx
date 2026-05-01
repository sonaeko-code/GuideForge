import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Shield,
  Compass,
  Sparkles,
} from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { GameBanner } from "@/components/questline/media/game-banner"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { CollectionIcon } from "@/components/questline/media/collection-icon"
import {
  EMBERFALL_HUB,
  getCollectionsByHub,
  getGuidesByCollection,
  getGuidesByHub,
} from "@/lib/guideforge/mock-data"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import { QUESTLINE_NEWS } from "@/lib/questline/mock-news"

export default async function EmberfallHubPage() {
  const hub = EMBERFALL_HUB
  const collections = getCollectionsByHub(hub.id)
  
  // Load published guides: prefer Supabase, fallback to mock data
  const supabaseGuides = await loadPublishedGuides()
  const allHubGuides = (supabaseGuides.length > 0 
    ? supabaseGuides 
    : getGuidesByHub(hub.id).filter((g) => g.status === "published")
  ).filter((g) => g.hubId === hub.id || !g.hubId) // Support both old and new format

  // Show empty state if no published guides for this hub
  if (allHubGuides.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <QuestLineHeader />
        <div className="mx-auto w-full max-w-6xl px-4 py-24 md:px-6">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No published guides yet for {hub.displayName}.</p>
          </div>
        </div>
        <QuestLineFooter />
      </main>
    )
  }

  const featured =
    allHubGuides.find((g) => g.verification === "forge-verified") ??
    allHubGuides[0]
  const beginnerGuides = allHubGuides.filter((g) => g.difficulty === "beginner")
  const forged = allHubGuides.filter((g) => g.verification === "forge-verified")
  const recent = [...allHubGuides]
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

      {/* HERO BANNER ================================================= */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
              <Link href="/n/questline/games">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                All games
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16">
          <GameBanner
            name={hub.name}
            tagline={hub.tagline ?? hub.description}
            eyebrow="Game Hub"
            tone="ember"
            aspect="aspect-[21/9] md:aspect-[3/1]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                {hub.hubKind}
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                Patch 4.2
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-mono uppercase tracking-wider backdrop-blur-sm">
                {allHubGuides.length} guides
              </span>
            </div>
          </GameBanner>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-base leading-relaxed text-muted-foreground">
                {hub.description}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 md:grid-cols-1">
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Collections
                </dt>
                <dd className="mt-1 text-xl font-bold">{collections.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Forged
                </dt>
                <dd className="mt-1 text-xl font-bold">{forged.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Last updated
                </dt>
                <dd className="mt-1 text-xl font-bold font-mono">
                  Nov 4
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* FEATURED GUIDE =============================================== */}
      {featured && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Featured" title="The build everyone is reading" />

            <Link
              href={`/n/questline/${hub.slug}/${featured.slug}`}
              className="group mt-8 grid gap-8 md:grid-cols-2"
            >
              <MediaPlaceholder
                label="Featured Build"
                variant="spark"
                tone="primary"
                aspect="aspect-[4/3] md:aspect-[5/4]"
              />
              <div className="flex flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={featured.difficulty} />
                  {featured.verification === "forge-verified" && (
                    <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                      <Shield className="size-3" aria-hidden="true" />
                      Forged
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {featured.version} · {featured.estimatedMinutes} min read
                  </span>
                </div>
                <h3 className="text-balance text-3xl font-bold tracking-tight transition-colors group-hover:text-primary md:text-4xl">
                  {featured.title}
                </h3>
                <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
                  {featured.summary}
                </p>
                <div className="mt-4 text-sm text-muted-foreground">
                  By{" "}
                  <span className="font-semibold text-foreground">
                    @{featured.author.handle}
                  </span>
                  {featured.reviewer && (
                    <>
                      {" · Reviewed by "}
                      <span className="font-semibold text-foreground">
                        @{featured.reviewer.handle}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-6">
                  <Button size="sm" className="gap-2">
                    Read the build
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* COLLECTIONS ================================================== */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Collections"
            title="Explore by category"
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((collection) => {
              const guides = getGuidesByCollection(collection.id)
              const firstGuide = guides[0]
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
                    {guides.length} guide{guides.length !== 1 ? "s" : ""}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* LATEST GUIDES =============================================== */}
      <section className="border-b border-foreground/15">
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
                  variant={
                    g.type === "patch-notes"
                      ? "patch"
                      : g.type === "boss-guide"
                        ? "spark"
                        : "image"
                  }
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

      {/* PATCH / NEWS RAIL ============================================ */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Patch coverage"
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            title="Latest from Emberfall"
          />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {hubNews.map((n) => (
              <Link
                key={n.id}
                href={`/n/questline/${hub.slug}`}
                className="group flex flex-col gap-3"
              >
                <MediaPlaceholder
                  label="Patch Art"
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
        </div>
      </section>

      {/* BEGINNER PATH ============================================== */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Start here"
            icon={<Compass className="size-4" aria-hidden="true" />}
            title="New to Emberfall?"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {beginnerGuides.map((g) => (
              <Link
                key={g.id}
                href={`/n/questline/${hub.slug}/${g.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-foreground/15 bg-background p-4 transition-colors hover:border-primary/40"
              >
                <MediaPlaceholder
                  label="Guide"
                  aspect="size-24 shrink-0"
                  tone="cyan"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Beginner · {g.estimatedMinutes} min
                  </p>
                  <h4 className="mt-1 line-clamp-1 text-base font-bold transition-colors group-hover:text-primary">
                    {g.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {g.summary}
                  </p>
                </div>
              </Link>
            ))}
            {beginnerGuides.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">
                No beginner guides published yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FORGED GUIDES =============================================== */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Forged"
            icon={<Shield className="size-4" aria-hidden="true" />}
            title="Held to the highest editorial bar"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forged.map((g) => (
              <Link
                key={g.id}
                href={`/n/questline/${hub.slug}/${g.slug}`}
                className="group flex flex-col rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
              >
                <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  <Shield className="size-3 text-primary" aria-hidden="true" />
                  <span className="text-primary">Forged</span>
                </div>
                <h4 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-primary">
                  {g.title}
                </h4>
                <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {g.summary}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <DifficultyBadge difficulty={g.difficulty} />
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

      <QuestLineFooter />
    </main>
  )
}

/* ---------------------------------------------------------------- */

interface SectionHeadingProps {
  eyebrow: string
  title: string
  icon?: React.ReactNode
}

function SectionHeading({ eyebrow, title, icon }: SectionHeadingProps) {
  return (
    <div className="border-b border-foreground/15 pb-3">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
    </div>
  )
}
