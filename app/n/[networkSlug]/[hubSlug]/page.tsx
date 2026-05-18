import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Compass, Shield } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { NetworkPublicHeader } from "@/components/guideforge/public/network-public-header"
import { NetworkPublicFooter } from "@/components/guideforge/public/network-public-footer"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { CollectionIcon } from "@/components/questline/media/collection-icon"
import { SectionHeading } from "@/components/guideforge/public/section-heading"
import { GuideCard } from "@/components/guideforge/public/guide-card"
import { PublishedBadge } from "@/components/guideforge/public/published-badge"
import {
  getNetworkBySlug,
  getHubBySlug,
  getCollectionsByHubId,
} from "@/lib/guideforge/supabase-networks"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import { getNetworkTheme } from "@/lib/guideforge/network-themes"
import type { ThemeDirection } from "@/lib/guideforge/types"
import {
  QUESTLINE_NETWORK,
  EMBERFALL_HUB,
  getHubsByNetwork,
  getCollectionsByHub,
  getGuidesByHub,
} from "@/lib/guideforge/mock-data"

export default async function PublicHubPage({
  params,
}: {
  params: Promise<{
    networkSlug: string
    hubSlug: string
  }>
}) {
  const { networkSlug, hubSlug } = await params

  // Load network with QuestLine fallback
  let network = await getNetworkBySlug(networkSlug)
  if (!network && networkSlug === "questline") {
    network = QUESTLINE_NETWORK
  }

  // Load hub with QuestLine fallback then mock fallback
  let hub = await getHubBySlug(hubSlug)
  if (!hub && networkSlug === "questline" && hubSlug === "emberfall") {
    hub = EMBERFALL_HUB
  }
  if (!hub && network) {
    hub = getHubsByNetwork(network.id).find((h) => h.slug === hubSlug) ?? null
  }

  // Clean 404 for missing network or hub
  if (!hub || !network) {
    notFound()
  }

  // Load collections (Supabase preferred, mock fallback)
  let collections: Awaited<ReturnType<typeof getCollectionsByHubId>> = []
  try {
    collections = await getCollectionsByHubId(hub.id)
  } catch (err) {
    console.warn(`[v0] Error loading collections for hub ${hub.id}:`, err)
  }
  if (!Array.isArray(collections) || collections.length === 0) {
    collections = getCollectionsByHub(hub.id) || []
  }

  // Load published guides for this hub.
  // IMPORTANT: triple-layer published-only filter:
  //   - supabase: loadPublishedGuides() already filters status === "published"
  //   - mock fallback: getGuidesByHub() filtered to status === "published"
  //   - UI: only published guides ever flow into the lists below
  const supabaseGuides = await loadPublishedGuides()
  const allPublishedGuides =
    supabaseGuides.length > 0
      ? supabaseGuides.filter((g) => g.hubId === hub.id && g.status === "published")
      : getGuidesByHub(hub.id).filter((g) => g.status === "published")

  // Curated derivations
  const featured =
    allPublishedGuides.find((g) => g.verification === "forge-verified") ?? allPublishedGuides[0]
  const recent = [...allPublishedGuides]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.updatedAt).getTime() -
        new Date(a.publishedAt ?? a.updatedAt).getTime(),
    )
    .slice(0, 4)
  const beginnerGuides = allPublishedGuides.filter((g) => g.difficulty === "beginner").slice(0, 4)
  const forgedGuides = allPublishedGuides.filter((g) => g.verification === "forge-verified")

  // Group guides by collection
  const collectionsWithGuides = collections.map((collection) => {
    const guides = allPublishedGuides.filter((g) => g.collectionId === collection.id)
    return { collection, guides }
  })
  // Guides not assigned to any collection
  const uncategorizedGuides = allPublishedGuides.filter(
    (g) => !g.collectionId || !collections.some((c) => c.id === g.collectionId),
  )

  // Resolve network theme for consistent styling across the hub page
  const themeId = (network.branding?.theme ?? "neutral") as ThemeDirection
  const theme = getNetworkTheme(themeId)

  return (
    <main className="min-h-screen bg-background">
      <NetworkPublicHeader network={network} />

      {/* HERO BANNER */}
      <section className={`border-b ${theme.borderClasses} ${theme.bgClasses}`}>
        {/* Breadcrumb / back nav */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                <span>
                  {collections.length} collection{collections.length !== 1 ? "s" : ""}
                </span>
                <span aria-hidden>—</span>
                <span>
                  {allPublishedGuides.length} published guide
                  {allPublishedGuides.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
                {hub.name}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {hub.description || hub.tagline || "A hub of guides and resources."}
              </p>
            </div>

            {/* Public hub stats */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 border-t border-foreground/15 pt-6">
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Collections
                </dt>
                <dd className="mt-1 text-2xl font-bold">{collections.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Published guides
                </dt>
                <dd className="mt-1 text-2xl font-bold">{allPublishedGuides.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Verified
                </dt>
                <dd className="mt-1 text-2xl font-bold">{forgedGuides.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Beginner-friendly
                </dt>
                <dd className="mt-1 text-2xl font-bold">{beginnerGuides.length}</dd>
              </div>
            </dl>
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
                tone={featured.verification === "forge-verified" ? "primary" : "default"}
                aspect="aspect-[4/3]"
              />
              <div className="flex flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={featured.difficulty} />
                  <PublishedBadge verification={featured.verification === "forge-verified" ? "forge-verified" : null} />
                  {featured.estimatedMinutes && (
                    <span className="text-xs text-muted-foreground">
                      {featured.estimatedMinutes} min read
                    </span>
                  )}
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
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Collections" title="Explore by category" />
            <p className="mt-8 text-base text-muted-foreground">
              No collections have been published yet for this hub.
            </p>
          </div>
        </section>
      ) : (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Collections" title="Explore by category" />

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {collections.map((collection) => {
                const collectionGuideCount = allPublishedGuides.filter(
                  (g) => g.collectionId === collection.id,
                ).length
                // Link to the collection's anchored section on this same page when there are
                // guides to read. If the collection is empty, leave a non-link card so users
                // aren't surprised by a no-op navigation.
                const href =
                  collectionGuideCount > 0
                    ? `#collection-${collection.slug || collection.id}`
                    : null
                const inner = (
                  <>
                    <CollectionIcon slug={collection.slug} size="lg" />
                    <h3 className="mt-4 text-lg font-bold tracking-tight transition-colors group-hover:text-primary">
                      {collection.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {collection.description || "Explore guides in this collection."}
                    </p>
                    <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {collectionGuideCount === 0
                        ? "No published guides yet"
                        : `${collectionGuideCount} published guide${collectionGuideCount !== 1 ? "s" : ""}`}
                    </p>
                  </>
                )
                return href ? (
                  <Link
                    key={collection.id}
                    href={href}
                    className="group flex flex-col rounded-lg border border-foreground/15 bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={collection.id}
                    className="group flex flex-col rounded-lg border border-dashed border-foreground/15 bg-background/50 p-5"
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* GUIDES GROUPED BY COLLECTION */}
      {collectionsWithGuides.some(({ guides }) => guides.length > 0) && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16 space-y-12">
            <SectionHeading eyebrow="Guides" title="Browse by collection" />

            {collectionsWithGuides
              .filter(({ guides }) => guides.length > 0)
              .map(({ collection, guides }) => (
                <div
                  key={collection.id}
                  id={`collection-${collection.slug || collection.id}`}
                  className="space-y-5 scroll-mt-20"
                >
                  <div className="flex items-end justify-between gap-3 border-b border-foreground/10 pb-2">
                    <div className="flex items-center gap-3">
                      <CollectionIcon slug={collection.slug} size="md" />
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">{collection.name}</h3>
                        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          {guides.length} guide{guides.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {guides.slice(0, 6).map((guide) => (
                      <GuideCard
                        key={guide.id}
                        guide={{ ...guide, verification: guide.verification === "forge-verified" ? "forge-verified" : null }}
                        href={`/n/${networkSlug}/${hub.slug}/${guide.slug}`}
                      />
                    ))}
                  </div>
                </div>
              ))}

            {/* Uncategorized guides if any */}
            {uncategorizedGuides.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-end justify-between gap-3 border-b border-foreground/10 pb-2">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">More guides</h3>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                      {uncategorizedGuides.length} guide
                      {uncategorizedGuides.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {uncategorizedGuides.slice(0, 6).map((guide) => (
                    <GuideCard
                      key={guide.id}
                      guide={{ ...guide, verification: guide.verification === "forge-verified" ? "forge-verified" : null }}
                      href={`/n/${networkSlug}/${hub.slug}/${guide.slug}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* EMPTY GUIDES STATE */}
      {allPublishedGuides.length === 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Guides" title="Nothing published yet" />
            <p className="mt-8 text-base text-muted-foreground">
              No guides have been published for this hub yet. Check back soon.
            </p>
          </div>
        </section>
      )}

      {/* RECENTLY PUBLISHED */}
      {recent.length > 0 && (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Latest" title="Recently published" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recent.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={{ ...guide, verification: guide.verification === "forge-verified" ? "forge-verified" : null }}
                  href={`/n/${networkSlug}/${hub.slug}/${guide.slug}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BEGINNER PATH */}
      {beginnerGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading
              eyebrow="Start here"
              icon={<Compass className="size-4" aria-hidden="true" />}
              title="Beginner-friendly guides"
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {beginnerGuides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={{ ...guide, verification: guide.verification === "forge-verified" ? "forge-verified" : null }}
                  href={`/n/${networkSlug}/${hub.slug}/${guide.slug}`}
                  variant="minimal"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VERIFIED GUIDES */}
      {forgedGuides.length > 0 && (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading
              eyebrow="Verified"
              icon={<Shield className="size-4" aria-hidden="true" />}
              title="Held to the highest editorial standard"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {forgedGuides.slice(0, 6).map((guide) => (
                <Link
                  key={guide.id}
                  href={`/n/${networkSlug}/${hub.slug}/${guide.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
                >
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                    <Shield className="size-3 text-primary" aria-hidden="true" />
                    <span className="text-primary">Verified</span>
                  </div>
                  <h4 className="line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-primary">
                    {guide.title}
                  </h4>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {guide.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <DifficultyBadge difficulty={guide.difficulty} />
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

      <NetworkPublicFooter network={network} />
    </main>
  )
}
