import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Clock,
  Shield,
  Sparkles,
  TrendingUp,
  Compass,
} from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { QuestLineMark } from "@/components/questline/brand/questline-mark"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"
import { GameBanner } from "@/components/questline/media/game-banner"
import {
  CollectionIcon,
  hubSlugToTone,
} from "@/components/questline/media/collection-icon"
import {
  QUESTLINE_NETWORK,
  MOCK_GUIDES,
  getHubsByNetwork,
} from "@/lib/guideforge/mock-data"
import { loadPublishedGuides } from "@/lib/guideforge/supabase-public"
import { QUESTLINE_NEWS } from "@/lib/questline/mock-news"

function formatPublished(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export default async function QuestLineHomePage() {
  const network = QUESTLINE_NETWORK
  const hubs = getHubsByNetwork(network.id)
  
  // Load published guides: prefer Supabase, fallback to mock data
  const supabaseGuides = await loadPublishedGuides()
  const guides = supabaseGuides.length > 0 
    ? supabaseGuides 
    : MOCK_GUIDES.filter((g) => g.status === "published")

  const featured = guides.find((g) => g.verification === "forge-verified") ?? guides[0]
  const featuredHub = hubs.find((h) => h.id === featured.hubId)

  const latestPatch = guides.find((g) => g.type === "patch-notes")
  const beginnerGuides = guides.filter((g) => g.difficulty === "beginner")
  const builds = guides.filter((g) => g.type === "character-build")
  const forged = guides.filter((g) => g.verification === "forge-verified")

  // "Recently Forged" — latest published guides
  const recent = [...guides]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.updatedAt).getTime() -
        new Date(a.publishedAt ?? a.updatedAt).getTime(),
    )
    .slice(0, 6)

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* MASTHEAD ===================================================== */}
      <section className="relative border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-6 md:px-6 md:pt-14 md:pb-8">
          <div className="flex flex-col items-start gap-4 border-b border-foreground/15 pb-6">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <QuestLineMark className="size-5 [&_svg]:size-3" />
                Issue No. 04
              </span>
              <span aria-hidden>—</span>
              <time>
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span aria-hidden>—</span>
              <span>An editorial guide network</span>
            </div>

            <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              Quest<span className="text-primary">Line</span>
            </h1>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Editorial guides, patch coverage, and build theory for the games
              you actually play. Forged by writers, reviewed by veterans, structured
              for the moment you need them.
            </p>
          </div>

          {/* Top stats row, masthead-feel */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-6 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Games covered
              </dt>
              <dd className="mt-1 text-2xl font-bold">{hubs.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Forged guides
              </dt>
              <dd className="mt-1 text-2xl font-bold">{forged.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                In review
              </dt>
              <dd className="mt-1 text-2xl font-bold">
                {MOCK_GUIDES.filter((g) => g.status !== "published").length}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Last patch
              </dt>
              <dd className="mt-1 text-2xl font-bold font-mono">4.2</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* FEATURED + LATEST PATCH SIDEBAR ============================== */}
      <section
        id="guides"
        className="border-b border-foreground/15"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Featured"
            title="The build everyone is reading right now"
          />

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Featured card — large editorial layout */}
            <Link
              href={`/n/questline/${featuredHub?.slug ?? "emberfall"}/${featured.slug}`}
              className="group lg:col-span-2"
            >
              <article className="flex flex-col gap-5">
                <GameBanner
                  name={featured.title}
                  tagline={featured.summary}
                  eyebrow={featuredHub?.name ?? "Featured"}
                  tone={hubSlugToTone(featuredHub?.slug ?? "")}
                  aspect="aspect-[16/9]"
                />
                <div className="flex flex-wrap items-center gap-3">
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
                <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
                  {featured.summary}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    @{featured.author.handle}
                  </span>
                  {featured.reviewer && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        Reviewed by{" "}
                        <span className="font-semibold text-foreground">
                          @{featured.reviewer.handle}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </article>
            </Link>

            {/* Latest dispatches sidebar */}
            <aside id="patch-notes" className="lg:col-span-1">
              <div className="rounded-xl border border-foreground/15 bg-muted/30 p-5">
                <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em]">
                    Latest dispatch
                  </h4>
                  <Link
                    href="#news"
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    All
                  </Link>
                </div>
                <ul className="divide-y divide-foreground/10">
                  {QUESTLINE_NEWS.slice(0, 4).map((n) => (
                    <li key={n.id} className="py-3 first:pt-4 last:pb-1">
                      <Link
                        href={`/n/questline/${n.hubSlug}`}
                        className="group block"
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                          <span className="text-primary">{n.category}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {n.hubName}
                          </span>
                        </div>
                        <h5 className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                          {n.title}
                        </h5>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="size-3" aria-hidden="true" />
                          {n.readMinutes} min · {formatPublished(n.publishedAt)}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {latestPatch && (
                <Link
                  href={`/n/questline/emberfall/${latestPatch.slug}`}
                  className="mt-6 block"
                >
                  <MediaPlaceholder
                    label="Patch Art"
                    variant="patch"
                    tone="primary"
                    aspect="aspect-[4/3]"
                  >
                    <p className="text-xs uppercase tracking-wider opacity-80">
                      Patch {latestPatch.version?.replace("Patch ", "")}
                    </p>
                    <p className="mt-1 text-base font-bold leading-tight">
                      {latestPatch.title}
                    </p>
                  </MediaPlaceholder>
                </Link>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* FEATURED GAMES ================================================ */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Featured games"
            title="Hubs we are covering this month"
            action={
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/n/questline/games">
                  All games
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {hubs.map((hub) => (
              <Link
                key={hub.id}
                href={`/n/questline/${hub.slug}`}
                className="group block"
              >
                <GameBanner
                  name={hub.name}
                  tone={hubSlugToTone(hub.slug)}
                  aspect="aspect-[3/4]"
                />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {hub.collectionIds.length} collections
                  </p>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {hub.tagline ?? hub.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RECENTLY FORGED =============================================== */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="Recently forged"
            title="Fresh from the editors' desk"
          />

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((g) => {
              const hub = hubs.find((h) => h.id === g.hubId)
              return (
                <Link
                  key={g.id}
                  href={`/n/questline/${hub?.slug ?? "emberfall"}/${g.slug}`}
                  className="group block"
                >
                  <article className="flex flex-col gap-3">
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
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                      <span className="text-primary">{hub?.name ?? "Game"}</span>
                      <span className="text-muted-foreground" aria-hidden>·</span>
                      <span className="text-muted-foreground">
                        {g.type.replace("-", " ")}
                      </span>
                    </div>
                    <h3 className="text-balance text-lg font-bold leading-snug transition-colors group-hover:text-primary">
                      {g.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {g.summary}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <DifficultyBadge difficulty={g.difficulty} />
                      {g.verification === "forge-verified" && (
                        <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
                          <Shield className="size-3" aria-hidden="true" />
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

      {/* TWO-COL: TRENDING BUILDS / BEGINNER PATHS ===================== */}
      <section className="border-b border-foreground/15 bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Trending builds */}
            <div>
              <SectionHeading
                eyebrow="Trending"
                icon={<TrendingUp className="size-4" aria-hidden="true" />}
                title="Builds gaining traction"
              />
              <ul className="mt-6 divide-y divide-foreground/10 border-y border-foreground/15">
                {builds.map((b, idx) => {
                  const hub = hubs.find((h) => h.id === b.hubId)
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/n/questline/${hub?.slug ?? "emberfall"}/${b.slug}`}
                        className="group flex items-start gap-4 py-4"
                      >
                        <span className="mt-1 font-mono text-xl font-bold text-muted-foreground tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <CollectionIcon
                          slug="builds"
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-primary">
                            {hub?.name ?? "Game"}
                          </p>
                          <h4 className="mt-0.5 line-clamp-1 text-sm font-bold transition-colors group-hover:text-primary">
                            {b.title}
                          </h4>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {b.summary}
                          </p>
                        </div>
                        <ArrowRight
                          className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Beginner-friendly */}
            <div>
              <SectionHeading
                eyebrow="Start here"
                icon={<Compass className="size-4" aria-hidden="true" />}
                title="Beginner-friendly paths"
              />
              <div className="mt-6 grid gap-4">
                {beginnerGuides.slice(0, 3).map((g) => {
                  const hub = hubs.find((h) => h.id === g.hubId)
                  return (
                    <Link
                      key={g.id}
                      href={`/n/questline/${hub?.slug ?? "emberfall"}/${g.slug}`}
                      className="group flex items-center gap-4 rounded-xl border border-foreground/15 bg-background p-4 transition-colors hover:border-primary/40"
                    >
                      <MediaPlaceholder
                        label="Guide"
                        aspect="size-20 shrink-0"
                        tone="cyan"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          {hub?.name ?? "Game"} · Beginner
                        </p>
                        <h4 className="mt-1 line-clamp-1 text-sm font-bold transition-colors group-hover:text-primary">
                          {g.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {g.summary}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORGED GUIDES SHELF ========================================== */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="The Forged shelf"
            icon={<Shield className="size-4" aria-hidden="true" />}
            title="Guides that passed every editorial check"
          />
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Forged guides are written, peer-reviewed, and re-tested against the
            current patch. They&apos;re held to the highest editorial bar on the
            network.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {forged.map((g) => {
              const hub = hubs.find((h) => h.id === g.hubId)
              return (
                <Link
                  key={g.id}
                  href={`/n/questline/${hub?.slug ?? "emberfall"}/${g.slug}`}
                  className="group flex flex-col rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
                >
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                    <Shield className="size-3 text-primary" aria-hidden="true" />
                    <span className="text-primary">Forged</span>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {hub?.name ?? "Game"}
                  </p>
                  <h4 className="mt-1 line-clamp-2 text-base font-bold leading-snug">
                    {g.title}
                  </h4>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                    {g.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{g.version?.replace("Patch ", "") ?? "—"}</span>
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* NEWS / EDITORIAL DISPATCHES =================================== */}
      <section id="news" className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <SectionHeading
            eyebrow="News & dispatches"
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            title="Patch coverage, season reveals, editorial"
          />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Lead news with art */}
            <Link
              href={`/n/questline/${QUESTLINE_NEWS[0].hubSlug}`}
              className="group lg:col-span-2"
            >
              <article className="flex flex-col gap-4">
                <MediaPlaceholder
                  label="Patch Art"
                  variant="patch"
                  tone="ink"
                  aspect="aspect-[16/9]"
                />
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  <span className="text-primary">{QUESTLINE_NEWS[0].category}</span>
                  <span className="text-muted-foreground" aria-hidden>·</span>
                  <span className="text-muted-foreground">
                    {QUESTLINE_NEWS[0].hubName}
                  </span>
                </div>
                <h3 className="text-balance text-2xl font-bold leading-snug transition-colors group-hover:text-primary md:text-3xl">
                  {QUESTLINE_NEWS[0].title}
                </h3>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {QUESTLINE_NEWS[0].blurb}
                </p>
              </article>
            </Link>

            {/* Stacked dispatches */}
            <ul className="space-y-5">
              {QUESTLINE_NEWS.slice(1, 5).map((n) => (
                <li
                  key={n.id}
                  className="border-b border-foreground/10 pb-5 last:border-0 last:pb-0"
                >
                  <Link
                    href={`/n/questline/${n.hubSlug}`}
                    className="group block"
                  >
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                      <span className="text-primary">{n.category}</span>
                      <span className="text-muted-foreground" aria-hidden>·</span>
                      <span className="text-muted-foreground">{n.hubName}</span>
                    </div>
                    <h4 className="text-sm font-bold leading-snug transition-colors group-hover:text-primary">
                      {n.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {n.blurb}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <QuestLineFooter />
    </main>
  )
}

/* ----------------------------------------------------------------- */

interface SectionHeadingProps {
  eyebrow: string
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

function SectionHeading({ eyebrow, title, icon, action }: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-foreground/15 pb-3">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
          {icon}
          {eyebrow}
        </div>
        <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}
