import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Compass } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { NetworkPublicHeader } from "@/components/guideforge/public/network-public-header"
import { NetworkPublicFooter } from "@/components/guideforge/public/network-public-footer"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { SectionHeading } from "@/components/guideforge/public/section-heading"
import { PublishedBadge } from "@/components/guideforge/public/published-badge"
import { GuideCard } from "@/components/guideforge/public/guide-card"
import { HubCard } from "@/components/guideforge/public/hub-card"
import {
  getNetworkBySlug,
  getHubsByNetworkId,
  getCollectionsByHubId,
} from "@/lib/guideforge/supabase-networks"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import { QUESTLINE_NETWORK, getHubsByNetwork } from "@/lib/guideforge/mock-data"
import { getNetworkTheme } from "@/lib/guideforge/network-themes"
import type { ThemeDirection } from "@/lib/guideforge/types"

export default async function PublicNetworkPage({
  params,
}: {
  params: Promise<{
    networkSlug: string
  }>
}) {
  const { networkSlug } = await params

  // Try to load network from Supabase, fallback to hardcoded QuestLine
  let network = await getNetworkBySlug(networkSlug)
  
  // Hardcoded fallback for QuestLine
  if (!network && networkSlug === "questline") {
    network = QUESTLINE_NETWORK
  }

  if (!network) {
    notFound()
  }

  // Load hubs - only from Supabase, no mock fallback for created networks
  let hubs = []
  if (network.id) {
    hubs = await getHubsByNetworkId(network.id)
  }
  
  // IMPORTANT: Do NOT fall back to getHubsByNetwork() for created networks.
  // QuestLine mock hubs are handled separately via the hardcoded QUESTLINE_NETWORK.
  // Created networks must load real hubs from Supabase only.

  // Load published guides - only from Supabase, no mock fallback for created networks
  const supabaseGuides = await loadPublishedGuides()
  
  // IMPORTANT: Do NOT fall back to MOCK_GUIDES for created networks.
  // Only use actual published guides from Supabase.
  // QuestLine mock data is handled separately via the hardcoded QUESTLINE_NETWORK fallback.
  const allPublishedGuides = supabaseGuides.length > 0 ? supabaseGuides : []

  // Load collections - get from all hubs in network with error handling
  const allCollections = []
  for (const hub of hubs) {
    try {
      const hubCollections = await getCollectionsByHubId(hub.id)
      if (Array.isArray(hubCollections)) {
        allCollections.push(...hubCollections)
      }
    } catch (err) {
      console.warn(`[v0] Error loading collections for hub ${hub.id}:`, err)
    }
  }

  // Resolve network theme — safe fallback to neutral
  const themeId = (network.branding?.theme ?? "neutral") as ThemeDirection
  const theme = getNetworkTheme(themeId)

  // Derive featured sections
  const featured = allPublishedGuides.find(g => g.verification === "forge-verified") ?? allPublishedGuides[0]
  const featuredHub = featured ? hubs.find(h => h.id === featured.hubId) : undefined

  const recentGuides = [...allPublishedGuides]
    .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())
    .slice(0, 6)

  const beginnerGuides = allPublishedGuides.filter(g => g.difficulty === "beginner").slice(0, 3)
  const forgedGuides = allPublishedGuides.filter(g => g.verification === "forge-verified")

  return (
    <main className="min-h-screen bg-background">
      <NetworkPublicHeader network={network} />

      {/* MASTHEAD — themed by network.branding.theme */}
      <section className={`border-b ${theme.borderClasses} ${theme.bgClasses}`}>
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="space-y-6">
            <div>
              <div className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] mb-4 ${theme.accentClasses}`}>
                <span>Guide Network</span>
                <span aria-hidden>—</span>
                <span>{hubs.length} hubs</span>
              </div>
              <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-6xl mb-4">
                {network.name}
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {network.description || "A guide network for learning and exploration."}
              </p>
            </div>

            {/* Masthead stats */}
            <dl className={`grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 border-t ${theme.borderClasses} pt-6`}>
              <div>
                <dt className={`text-xs font-mono uppercase tracking-wider ${theme.accentClasses} opacity-80`}>
                  Hubs
                </dt>
                <dd className="mt-1 text-2xl font-bold">{hubs.length}</dd>
              </div>
              <div>
                <dt className={`text-xs font-mono uppercase tracking-wider ${theme.accentClasses} opacity-80`}>
                  Verified guides
                </dt>
                <dd className="mt-1 text-2xl font-bold">{forgedGuides.length}</dd>
              </div>
              <div>
                <dt className={`text-xs font-mono uppercase tracking-wider ${theme.accentClasses} opacity-80`}>
                  Total published
                </dt>
                <dd className="mt-1 text-2xl font-bold">{allPublishedGuides.length}</dd>
              </div>
              <div>
                <dt className={`text-xs font-mono uppercase tracking-wider ${theme.accentClasses} opacity-80`}>
                  Collections
                </dt>
                <dd className="mt-1 text-2xl font-bold">{allCollections.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* FEATURED GUIDE or NO GUIDES EMPTY STATE */}
      {featured && featuredHub ? (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Featured" title="The best from this network" />

            <Link
              href={`/n/${networkSlug}/${featuredHub.slug}/${featured.slug}`}
              className="group mt-8 grid gap-8 md:grid-cols-2"
            >
              <MediaPlaceholder
                label="Featured Guide"
                variant="image"
                tone={featured.verification === "forge-verified" ? "primary" : "default"}
                aspect="aspect-[16/9]"
              />
              <div className="flex flex-col justify-center">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={featured.difficulty} />
                  <PublishedBadge verification={featured.verification} />
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
                <div className="mt-4 text-sm text-muted-foreground">
                  By{" "}
                  <span className="font-semibold text-foreground">
                    {featured.author.displayName || `@${featured.author.handle}`}
                  </span>
                  {featured.reviewer && (
                    <>
                      {" · Reviewed by "}
                      <span className="font-semibold text-foreground">
                        {featured.reviewer.displayName || `@${featured.reviewer.handle}`}
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-6">
                  <Button size="sm" className="gap-2">
                    Read the guide
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>
        </section>
      ) : hubs.length > 0 ? (
        <section className={`border-b ${theme.borderClasses} ${theme.bgClasses}`}>
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16 text-center">
            <div className="space-y-3">
              <p className="text-lg font-medium text-foreground">No published guides yet</p>
              <p className="text-sm text-muted-foreground">
                This network is being built. Check back soon for published guides.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* HUBS SECTION */}
      {hubs.length === 0 ? (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16 text-center">
            <p className="text-lg text-muted-foreground">No hubs published yet for this network.</p>
          </div>
        </section>
      ) : (
        <section className={`border-b ${theme.borderClasses} ${theme.bgClasses}`}>
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Explore" title="Available hubs" />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hubs.map((hub) => {
                const hubGuides = allPublishedGuides.filter(g => g.hubId === hub.id)
                const hubCollections = allCollections.filter(c => c.hubId === hub.id)
                return (
                  <HubCard
                    key={hub.id}
                    hub={hub}
                    href={`/n/${networkSlug}/${hub.slug}`}
                    stats={{
                      collectionsCount: hubCollections.length,
                      guidesCount: hubGuides.length,
                    }}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* RECENTLY PUBLISHED */}
      {recentGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Latest" title="Recently published" />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentGuides.map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* BEGINNER GUIDES */}
      {beginnerGuides.length > 0 && (
        <section className={`border-b ${theme.borderClasses} ${theme.bgClasses}`}>
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading
              eyebrow="Start here"
              title="Beginner-friendly guides"
              icon={<Compass className="size-4" aria-hidden="true" />}
            />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {beginnerGuides.map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                    variant="minimal"
                  />
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* VERIFIED GUIDES */}
      {forgedGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <SectionHeading eyebrow="Verified" title="Held to the highest standard" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {forgedGuides.slice(0, 6).map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <Link
                    key={guide.id}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                    className={`group flex flex-col rounded-lg border p-5 transition-colors h-full ${theme.cardClasses} ${theme.borderClasses} hover:opacity-90`}
                  >
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                      <span className={theme.accentClasses}>Verified</span>
                    </div>
                    <h4 className={`line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:${theme.accentClasses}`}>
                      {guide.title}
                    </h4>
                    <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                      {guide.summary}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <DifficultyBadge difficulty={guide.difficulty} />
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <NetworkPublicFooter network={network} />
    </main>
  )
}
