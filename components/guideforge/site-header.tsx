import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GuideMark } from "@/components/guideforge/brand/guide-mark"
import { cn } from "@/lib/utils"

interface SiteHeaderProps {
  className?: string
  /** Hide the primary CTA on pages where it's redundant (like the builder flow). */
  hideCta?: boolean
}

export function SiteHeader({ className, hideCta }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <GuideMark className="size-7 [&_svg]:size-4" />
          <span className="text-base">GuideForge</span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"
        >
          <Link
            href="/#what"
            className="transition-colors hover:text-foreground"
          >
            What it builds
          </Link>
          <Link
            href="/#how"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="/#examples"
            className="transition-colors hover:text-foreground"
          >
            Networks
          </Link>
          <Link
            href="/#trust"
            className="transition-colors hover:text-foreground"
          >
            Trust
          </Link>
        </nav>

        {hideCta ? (
          <div className="text-sm text-muted-foreground">Builder</div>
        ) : (
          <Button asChild size="sm">
            <Link href="/builder">Start building</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
