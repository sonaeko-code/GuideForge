import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface HubCardProps {
  hub: {
    id: string
    slug: string
    name: string
    description?: string | null
    tagline?: string | null
  }
  href: string
  stats?: {
    collectionsCount?: number
    guidesCount?: number
    label?: string
  }
}

export function HubCard({ hub, href, stats }: HubCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="rounded-lg border border-foreground/15 bg-background p-6 transition-colors hover:border-primary/40 hover:bg-muted/50 h-full flex flex-col">
        <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
          {hub.name}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {hub.description || hub.tagline || "Explore this hub for guides and resources."}
        </p>
        {stats && (
          <div className="mt-4 flex flex-col gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground border-t border-foreground/10 pt-3">
            {stats.collectionsCount !== undefined && (
              <div>
                {stats.collectionsCount} collection{stats.collectionsCount !== 1 ? "s" : ""}
              </div>
            )}
            {stats.guidesCount !== undefined && (
              <div>
                {stats.guidesCount} published guide{stats.guidesCount !== 1 ? "s" : ""}
              </div>
            )}
            {stats.label && <div>{stats.label}</div>}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-mono uppercase tracking-wider">View hub</span>
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  )
}
