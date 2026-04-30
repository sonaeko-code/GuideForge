import Link from "next/link"
import { QuestLineMark } from "./brand/questline-mark"
import { GuideMark } from "@/components/guideforge/brand/guide-mark"

export function QuestLineFooter() {
  return (
    <footer className="border-t border-foreground/10 bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link
              href="/n/questline"
              className="inline-flex items-center gap-2 font-semibold tracking-tight"
            >
              <QuestLineMark className="size-7 [&_svg]:size-4" />
              <span className="text-base font-bold">
                Quest<span className="text-primary">Line</span>
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              An editorial guide network for gaming worlds. Builds, beginner
              paths, raid mechanics, patch coverage, and news — written for
              players, structured for clarity.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Browse
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/n/questline/games" className="hover:text-foreground">
                  Games
                </Link>
              </li>
              <li>
                <Link href="/n/questline/emberfall/builds" className="hover:text-foreground">
                  Builds
                </Link>
              </li>
              <li>
                <Link href="/n/questline" className="hover:text-foreground">
                  Latest
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              About
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/n/questline" className="hover:text-foreground">
                  Editorial standards
                </Link>
              </li>
              <li>
                <Link href="/n/questline" className="hover:text-foreground">
                  Forged guides
                </Link>
              </li>
              <li>
                <Link href="/n/questline" className="hover:text-foreground">
                  Become a contributor
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-foreground/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} QuestLine. A gaming guide network.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <span>Powered by</span>
            <GuideMark className="size-5 [&_svg]:size-3" />
            <span className="font-semibold text-foreground">GuideForge</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
