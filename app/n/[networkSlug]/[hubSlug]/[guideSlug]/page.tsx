import { ChevronRight, Clock, Shield, AlertCircle, BookOpen, Calendar, FileText } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { MOCK_GUIDES, MOCK_HUBS, getCollectionsByHub } from "@/lib/guideforge/mock-data"
import { loadPublishedGuide, loadPublishedGuides } from "@/lib/guideforge/supabase-public"

export default async function PublicGuidePage({
  params,
}: {
  params: Promise<{
    networkSlug: string
    hubSlug: string
    guideSlug: string
  }>
}) {
  const { hubSlug, guideSlug } = await params
  const hub = MOCK_HUBS.find((h) => h.slug === hubSlug)
  
  // Try to load from Supabase first, then fallback to mock data
  let guide = await loadPublishedGuide(guideSlug)
  if (!guide) {
    guide = MOCK_GUIDES.find((g) => g.slug === guideSlug && g.status === "published")
  }

  if (!guide || !hub) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <QuestLineHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md">
            <FileText className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-3xl font-bold mb-2 font-serif">Guide Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This guide doesn&apos;t exist yet, or it may have been moved or unpublished.
            </p>
            <Button asChild>
              <Link href="/n/questline">Back to QuestLine</Link>
            </Button>
          </div>
        </main>
        <QuestLineFooter />
      </div>
    )
  }

  const collections = getCollectionsByHub(hub.id)
  const collection = collections.find((c) => c.guideIds.includes(guide.id))

  // Find related guides (other published guides in same hub, excluding current)
  const supabaseGuides = await loadPublishedGuides()
  const allPublishedGuides = supabaseGuides.length > 0 ? supabaseGuides : MOCK_GUIDES
  const relatedGuides = allPublishedGuides.filter(
    (g) => g.hubId === hub.id && g.id !== guide.id && g.status === "published",
  ).slice(0, 3)

  // Map guide type to a display label
  const typeLabel = guide.type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <QuestLineHeader />

      <main className="flex-1">
        {/* Article header (editorial style) */}
        <article>
          <header className="border-b border-border/60 bg-muted/20">
            <div className="mx-auto max-w-4xl px-4 md:px-6 pt-10 pb-12 md:pt-14 md:pb-16">
              {/* Breadcrumb */}
              <nav
                aria-label="Breadcrumb"
                className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto pb-1"
              >
                <Link href="/n/questline" className="hover:text-foreground whitespace-nowrap uppercase tracking-wider">
                  QuestLine
                </Link>
                <ChevronRight className="size-3 flex-shrink-0" aria-hidden="true" />
                <Link
                  href={`/n/questline/${hub.slug}`}
                  className="hover:text-foreground whitespace-nowrap uppercase tracking-wider"
                >
                  {hub.name}
                </Link>
                {collection && (
                  <>
                    <ChevronRight className="size-3 flex-shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap uppercase tracking-wider">{collection.name}</span>
                  </>
                )}
              </nav>

              {/* Eyebrow */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs uppercase tracking-[0.18em]">
                <span className="text-primary font-semibold">{typeLabel}</span>
                <span className="text-muted-foreground/60" aria-hidden="true">
                  /
                </span>
                <span className="text-muted-foreground">{hub.name}</span>
              </div>

              {/* Title */}
              <h1 className="font-serif text-balance text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
                {guide.title}
              </h1>

              {/* Dek (subtitle) */}
              <p className="text-lg md:text-xl text-pretty text-muted-foreground leading-relaxed max-w-2xl mb-8 font-serif">
                {guide.summary}
              </p>

              {/* Byline + meta */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm border-t border-border/60 pt-5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">By</span>
                  <span className="font-semibold text-foreground">@{guide.author.handle}</span>
                  {guide.reviewer && (
                    <>
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-muted-foreground">Reviewed by</span>
                      <span className="font-semibold text-foreground">@{guide.reviewer.handle}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-3.5" aria-hidden="true" />
                  <time dateTime={guide.updatedAt}>
                    {new Date(guide.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                {guide.estimatedMinutes && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    <span>{guide.estimatedMinutes} min read</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DifficultyBadge difficulty={guide.difficulty} />
                  {guide.verification === "forge-verified" && (
                    <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      <Shield className="size-3" aria-hidden="true" />
                      Forged
                    </Badge>
                  )}
                  <Badge variant="outline" className="font-mono text-xs">
                    v{guide.version}
                  </Badge>
                </div>
              </div>
            </div>
          </header>

          {/* Article body */}
          <div className="px-4 md:px-6 py-12 md:py-16">
            <div className="mx-auto w-full max-w-6xl grid gap-10 lg:grid-cols-12">
              {/* Main content */}
              <div className="lg:col-span-8 lg:col-start-1 space-y-10">
                {/* Requirements */}
                {guide.requirements.length > 0 && (
                  <section className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-6">
                    <h2 className="font-semibold text-foreground flex items-center gap-2 text-sm uppercase tracking-wider">
                      <BookOpen className="size-4 text-primary" aria-hidden="true" />
                      Before You Start
                    </h2>
                    <ul className="space-y-2">
                      {guide.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm">
                          <span className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <span className="text-foreground">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Warnings */}
                {guide.warnings.length > 0 && (
                  <section className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        className="size-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <h2 className="font-semibold text-amber-700 dark:text-amber-400 text-sm uppercase tracking-wider">
                        Important Notes
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {guide.warnings.map((warn, idx) => (
                        <li key={idx} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <span aria-hidden="true">·</span>
                          <span>{warn}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Guide sections */}
                <div className="space-y-12">
                  {guide.steps.map((step, idx) => (
                    <section key={step.id} id={`section-${step.kind}`} className="scroll-mt-24 space-y-4">
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
                          {String(idx + 1).padStart(2, "0")} —
                        </span>
                        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground text-balance">
                          {step.title}
                        </h2>
                      </div>
                      <div className="prose prose-base max-w-none text-foreground leading-relaxed whitespace-pre-wrap font-serif">
                        {step.body}
                      </div>
                    </section>
                  ))}
                </div>

                {/* End of article footer */}
                <section className="border-t-2 border-border pt-8 mt-16 space-y-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">— End —</p>
                  <p className="text-sm text-muted-foreground">
                    Last updated{" "}
                    <time dateTime={guide.updatedAt} className="text-foreground font-semibold">
                      {new Date(guide.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    {" · "}
                    Version <span className="font-mono text-foreground">{guide.version}</span>
                    {guide.reviewer && (
                      <>
                        {" · Forged by "}
                        <span className="font-semibold text-foreground">@{guide.reviewer.handle}</span>
                      </>
                    )}
                  </p>
                </section>

                {/* Related guides */}
                {relatedGuides.length > 0 && (
                  <section className="border-t border-border/60 pt-10 mt-12">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
                      Keep Reading
                    </p>
                    <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-6">
                      More from {hub.name}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                      {relatedGuides.map((rg) => (
                        <Link key={rg.id} href={`/n/questline/${hub.slug}/${rg.slug}`}>
                          <Card className="border-border/60 p-5 hover:bg-muted/40 transition-colors cursor-pointer h-full flex flex-col">
                            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
                              {rg.type
                                .split("-")
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ")}
                            </p>
                            <h3 className="font-serif text-lg font-bold leading-tight mb-2 line-clamp-2 text-foreground">
                              {rg.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{rg.summary}</p>
                            <div className="flex items-center gap-2">
                              <DifficultyBadge difficulty={rg.difficulty} />
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar: TOC + meta */}
              <aside className="lg:col-span-4 lg:col-start-9">
                <div className="lg:sticky lg:top-24 space-y-6">
                  {/* TOC */}
                  {guide.steps.length > 1 && (
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
                      <h3 className="font-semibold text-foreground text-xs uppercase tracking-[0.18em] mb-3">
                        In This Guide
                      </h3>
                      <nav className="space-y-1">
                        {guide.steps.map((step, idx) => (
                          <a
                            key={step.id}
                            href={`#section-${step.kind}`}
                            className="flex items-baseline gap-2 py-1.5 px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded transition-colors"
                          >
                            <span className="font-mono text-xs text-muted-foreground/60">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <span className="line-clamp-2">{step.title}</span>
                          </a>
                        ))}
                      </nav>
                    </div>
                  )}

                  {/* Snapshot card */}
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-4">
                    <h3 className="font-semibold text-foreground text-xs uppercase tracking-[0.18em]">
                      Guide Details
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wide">Type</dt>
                        <dd className="mt-0.5 font-semibold text-foreground">{typeLabel}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wide">Difficulty</dt>
                        <dd className="mt-0.5 font-semibold text-foreground capitalize">{guide.difficulty}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground uppercase tracking-wide">Version</dt>
                        <dd className="mt-0.5 font-mono text-foreground">{guide.version}</dd>
                      </div>
                      {guide.estimatedMinutes && (
                        <div>
                          <dt className="text-xs text-muted-foreground uppercase tracking-wide">Read Time</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">~{guide.estimatedMinutes} min</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </article>
      </main>

      <QuestLineFooter />
    </div>
  )
}
