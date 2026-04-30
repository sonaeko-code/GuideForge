import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { QuestLineHeader } from "@/components/questline/site-header"
import { QuestLineFooter } from "@/components/questline/site-footer"
import { GameBanner } from "@/components/questline/media/game-banner"
import { hubSlugToTone } from "@/components/questline/media/collection-icon"
import { MOCK_HUBS, getGuidesByHub } from "@/lib/guideforge/mock-data"

export default async function GamesDirectoryPage() {
  const games = MOCK_HUBS

  return (
    <main className="min-h-screen bg-background">
      <QuestLineHeader />

      {/* Masthead */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 md:px-6 md:pt-14 md:pb-10">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 gap-1">
            <Link href="/n/questline">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Home
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
            Directory
          </div>
          <h1 className="mt-2 text-balance text-4xl font-black tracking-tight md:text-5xl">
            Every game we cover
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Hand-picked games with active editorial coverage. Each hub is a
            full mini-site — guides, builds, patch notes, and beginner paths.
          </p>
        </div>
      </section>

      {/* Games grid */}
      <section className="border-b border-foreground/15">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-8 md:grid-cols-2">
            {games.map((game) => {
              const guides = getGuidesByHub(game.id).filter(
                (g) => g.status === "published",
              )
              return (
                <Link
                  key={game.id}
                  href={`/n/questline/${game.slug}`}
                  className="group block"
                >
                  <article className="flex flex-col gap-5">
                    <GameBanner
                      name={game.name}
                      tagline={game.tagline}
                      eyebrow="Game Hub"
                      tone={hubSlugToTone(game.slug)}
                      aspect="aspect-[16/9]"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      <span className="text-primary">{game.hubKind}</span>
                      <span aria-hidden>·</span>
                      <span>{game.collectionIds.length} collections</span>
                      <span aria-hidden>·</span>
                      <span>
                        {guides.length} guide{guides.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h3 className="text-balance text-2xl font-bold tracking-tight transition-colors group-hover:text-primary">
                      {game.name}
                    </h3>
                    <p className="text-pretty leading-relaxed text-muted-foreground">
                      {game.description}
                    </p>
                    <div className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Enter hub
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <QuestLineFooter />
    </main>
  )
}
