import Link from "next/link"
import { cn } from "@/lib/utils"
import { QuestLineMark } from "./brand/questline-mark"

interface QuestLineHeaderProps {
  className?: string
}

const NAV_ITEMS = [
  { label: "Games", href: "/n/questline/games" },
  { label: "Builds", href: "/n/questline/emberfall/builds" },
  { label: "Guides", href: "/n/questline#guides" },
  { label: "Patch Notes", href: "/n/questline#patch-notes" },
  { label: "News", href: "/n/questline#news" },
]

export function QuestLineHeader({ className }: QuestLineHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-foreground/10 bg-background/95 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/n/questline"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <QuestLineMark className="size-7 [&_svg]:size-4" />
          <span className="text-base font-bold tracking-tight">
            Quest<span className="text-primary">Line</span>
          </span>
        </Link>

        <nav
          aria-label="QuestLine primary"
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden sm:inline-block">
            Issue <span className="font-mono font-semibold text-foreground">No. 04</span>
          </span>
        </div>
      </div>
    </header>
  )
}
