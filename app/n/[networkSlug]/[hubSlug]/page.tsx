import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, BookOpen, Compass, Shield } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { GameBanner } from "@/components/questline/media/game-banner"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { CollectionIcon } from "@/components/questline/media/collection-icon"
import {
  getNetworkBySlug,
  getHubBySlug,
  getCollectionsByHubId,
  getPublishedGuidesByHubId,
} from "@/lib/guideforge/supabase-networks"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import {
  QUESTLINE_NETWORK,
  EMBERFALL_HUB,
  getHubsByNetwork,
  getCollectionsByHub,
  getGuidesByHub,
} from "@/lib/guideforge/mock-data"

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

export default async function PublicHubPage({
  params,
}: {
  params: Promise<{
    networkSlug: string
    hubSlug: string
  }>
}) {
  const { networkSlug, hubSlug } = await params

  // Load network
  let network = await getNetworkBySlug(networkSlug)
  if (!network && networkSlug === "questline") {
    network = QUESTLINE_NETWORK
  }

  // Load hub
  let hub = await getHubBySlug(hubSlug)
  if (!hub && networkSlug === "questline" && hubSlug === "emberfall") {
    hub = EMBERFALL_HUB
  }
  if (!hub) {
    hub = getHubsByNetwork(network?.id || "").find(h => h.slug === hubSlug)
  }

  if (!hub || !network) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <QuestLineHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <BookOpen className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-3xl font-bold mb-2">Hub Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This hub doesn&apos;t exist or isn&apos;t published yet.
            </p>
            <Button asChild>
              <Link href={`/n/${networkSlug}`}>Back to Network</Link>
            </Button>
          </div>
        </main>
        <QuestLineFooter />
      </div>
    )
  }

  // Load collections
  let collections = await getCollectionsByHubId(hub.id)
  if (collections.length === 0) {
    collections = getCollectionsByHub(hub.id)
  }

  // Load published guides for this hub
  const supabaseGuides = await loadPublishedGuides()
  const allPublishedGuides = supabaseGuides.length > 0 
    ? supabaseGuides.filter(g => g.hubId === hub.id)
    : getGuidesByHub(hub.id).filter(g => g.status === "published")

  // Curated sections
  const featured = allPublishedGuides.find(g => g.verification === "forge-verified") ?? allPublishedGuides[0]
  const recent = [...allPublishedGuides]
    .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())
    .slice(0, 4)
  const beginnerGuides = allPublishedGuides.filter(g => g.difficulty === "beginner")
  const forgedGuides = allPublishedGuides.filter(g => g.verification === "forge-verified")

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* HERO BANNER */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1">
              <Link href={`/n/${networkSlug}`}>
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {network.name}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 md:px-6 md:pb-16">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>Hub</span>
                <span aria-hidden>—</span>
                <span>{collections.length} collection{collections.length !== 1 ? "s" : ""}</span>
                <span aria-hidden>—</span>
                <span>{allPublishedGuides.length} guide{allPublishedGuides.length !== 1 ? "s" : ""}</span>
              </div>
              <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
                {hub.name}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {hub.description || hub.tagline}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED GUIDE */}
      {featured && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Featured" title="The guide everyone is reading" />

            <Link
              href={`/n/${networkSlug}/${hub.slug}/${featured.slug}`}
              className="group mt-8 grid gap-8 md:grid-cols-2"
            >
              <MediaPlaceholder
                label="Featured Guide"
                variant="image"
                tone="primary"
                aspect="aspect-[4/3]"
              />
              <div className="flex flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={featured.difficulty} />
                  {featured.verification === "forge-verified" && (
                    <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                      <Shield className="size-3" aria-hidden="true" />
                      Verified
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
                <div className="mt-6">
                  <Button size="sm" className="gap-2">
                    Read now
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* COLLECTIONS */}
      {collections.length === 0 ? (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16 text-center">
            <p className="text-lg text-muted-foreground">No collections yet for this hub.</p>
          </div>
        </section>
      ) : (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Collections" title="Explore by category" />

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {collections.map((collection) => {
                const collectionGuides = allPublishedGuides.filter(g => g.collectionId === collection.id)
                const firstGuide = collectionGuides[0]
                const href = firstGuide
                  ? `/n/${networkSlug}/${hub.slug}/${firstGuide.slug}`
                  : `/n/${networkSlug}/${hub.slug}`
                return (
                  <Link
                    key={collection.id}
                    href={href}
                    className="group flex flex-col rounded-lg border border-foreground/15 bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <CollectionIcon slug={collection.slug} size="lg" />
                    <h3 className="mt-4 text-lg font-bold tracking-tight transition-colors group-hover:text-primary">
                      {collection.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {collection.description || "No description yet"}
                    </p>
                    <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {collectionGuides.length} guide{collectionGuides.length !== 1 ? "s" : ""}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* LATEST GUIDES */}
      {recent.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Latest" title="Recently published" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((g) => (
                <Link
                  key={g.id}
                  href={`/n/${networkSlug}/${hub.slug}/${g.slug}`}
                  className="group flex flex-col gap-3"
                >
                  <MediaPlaceholder
                    label="Guide Thumbnail"
                    variant="image"
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

      {/* BEGINNER PATH */}
      {beginnerGuides.length > 0 && (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading
              eyebrow="Start here"
              icon={<Compass className="size-4" aria-hidden="true" />}
              title="Beginner-friendly guides"
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {beginnerGuides.slice(0, 2).map((g) => (
                <Link
                  key={g.id}
                  href={`/n/${networkSlug}/${hub.slug}/${g.slug}`}
                  className="group flex items-center gap-4 rounded-lg border border-foreground/15 bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
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
            </div>
          </div>
        </section>
      )}

      {/* VERIFIED GUIDES */}
      {forgedGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading
              eyebrow="Verified"
              icon={<Shield className="size-4" aria-hidden="true" />}
              title="Held to the highest editorial standard"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {forgedGuides.slice(0, 6).map((g) => (
                <Link
                  key={g.id}
                  href={`/n/${networkSlug}/${hub.slug}/${g.slug}`}
                  className="group flex flex-col rounded-lg border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
                >
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                    <Shield className="size-3 text-primary" aria-hidden="true" />
                    <span className="text-primary">Verified</span>
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
      )}

      <QuestLineFooter />
    </main>
  )
}
