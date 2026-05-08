import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BookOpen } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import {
  getNetworkBySlug,
  getHubsByNetworkId,
  getPublishedGuidesByNetworkId,
} from "@/lib/guideforge/supabase-networks"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import { QUESTLINE_NETWORK, getHubsByNetwork, MOCK_GUIDES } from "@/lib/guideforge/mock-data"

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
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <QuestLineHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <BookOpen className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-3xl font-bold mb-2">Network Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This network doesn&apos;t exist or isn&apos;t published yet.
            </p>
            <Button asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </main>
        <QuestLineFooter />
      </div>
    )
  }

  // Load hubs
  let hubs = await getHubsByNetworkId(network.id)
  if (hubs.length === 0 && networkSlug === "questline") {
    hubs = getHubsByNetwork(network.id)
  }

  // Load published guides and filter by network
  const supabaseGuides = await loadPublishedGuides()
  const allPublishedGuides = supabaseGuides.length > 0 ? supabaseGuides : MOCK_GUIDES.filter(g => g.status === "published")

  // Load collections - get from all hubs in network
  const allCollections = []
  for (const hub of hubs) {
    const hubCollections = await import("@/lib/guideforge/supabase-networks")
      .then(m => m.getCollectionsByHubId(hub.id))
      .catch(() => [])
    allCollections.push(...hubCollections)
  }

  // Sort and slice for featured sections
  const recentGuides = [...allPublishedGuides]
    .sort((a, b) => new Date(b.publishedAt ?? b.updatedAt).getTime() - new Date(a.publishedAt ?? a.updatedAt).getTime())
    .slice(0, 6)

  const beginnerGuides = allPublishedGuides.filter(g => g.difficulty === "beginner").slice(0, 3)
  const forgedGuides = allPublishedGuides.filter(g => g.verification === "forge-verified")

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* MASTHEAD */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span>Guide Network</span>
              <span aria-hidden>—</span>
              <span>{hubs.length} hubs</span>
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-6xl">
              {network.name}
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {network.description}
            </p>
          </div>
        </div>
      </section>

      {/* HUBS SECTION */}
      {hubs.length === 0 ? (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16 text-center">
            <p className="text-lg text-muted-foreground">No hubs published yet for this network.</p>
          </div>
        </section>
      ) : (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <div className="mb-8 border-b border-foreground/15 pb-3">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Hubs</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hubs.map((hub) => {
                const hubGuides = allPublishedGuides.filter(g => g.hubId === hub.id)
                const hubCollections = collections.filter(c => c.hubId === hub.id)
                return (
                  <Link key={hub.id} href={`/n/${networkSlug}/${hub.slug}`} className="group block">
                    <div className="rounded-lg border border-foreground/15 bg-background p-6 transition-colors hover:border-primary/40 hover:bg-muted/50 h-full flex flex-col">
                      <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                        {hub.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {hub.description || hub.tagline}
                      </p>
                      <div className="mt-4 flex flex-col gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground border-t border-foreground/10 pt-3">
                        <div>{hubCollections.length} collection{hubCollections.length !== 1 ? "s" : ""}</div>
                        <div>{hubGuides.length} published guide{hubGuides.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* RECENT GUIDES */}
      {recentGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <div className="mb-8 border-b border-foreground/15 pb-3">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Recently Published</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recentGuides.map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <Link
                    key={guide.id}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                    className="group block"
                  >
                    <article className="flex flex-col gap-3 h-full">
                      <MediaPlaceholder
                        label="Guide Thumbnail"
                        variant="image"
                        aspect="aspect-[16/10]"
                      />
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                        {hub && <span className="text-primary">{hub.name}</span>}
                        <span className="text-muted-foreground" aria-hidden>·</span>
                        <span className="text-muted-foreground">
                          {guide.type.replace("-", " ")}
                        </span>
                      </div>
                      <h3 className="text-balance text-lg font-bold leading-snug transition-colors group-hover:text-primary line-clamp-2">
                        {guide.title}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground flex-1">
                        {guide.summary}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <DifficultyBadge difficulty={guide.difficulty} />
                        {guide.verification === "forge-verified" && (
                          <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                            Forged
                          </Badge>
                        )}
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* BEGINNER GUIDES */}
      {beginnerGuides.length > 0 && (
        <section className="border-b border-foreground/15 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <div className="mb-8 border-b border-foreground/15 pb-3">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Start Here</h2>
              <p className="mt-2 text-sm text-muted-foreground">Beginner-friendly guides to get you started</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {beginnerGuides.map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <Link
                    key={guide.id}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                    className="group flex items-center gap-4 rounded-lg border border-foreground/15 bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <MediaPlaceholder
                      label="Guide"
                      aspect="size-20 shrink-0"
                      tone="cyan"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                        {hub?.name || "Guide"} · Beginner
                      </p>
                      <h4 className="mt-1 line-clamp-1 text-sm font-bold transition-colors group-hover:text-primary">
                        {guide.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {guide.summary}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* FORGED GUIDES */}
      {forgedGuides.length > 0 && (
        <section className="border-b border-foreground/15">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
            <div className="mb-8 border-b border-foreground/15 pb-3">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Verified Guides</h2>
              <p className="mt-2 text-sm text-muted-foreground">Held to the highest editorial standard</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {forgedGuides.slice(0, 6).map((guide) => {
                const hub = hubs.find(h => h.id === guide.hubId)
                return (
                  <Link
                    key={guide.id}
                    href={`/n/${networkSlug}/${hub?.slug || ""}/${guide.slug}`}
                    className="group flex flex-col rounded-lg border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
                  >
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
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
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <QuestLineFooter />
    </main>
  )
}
