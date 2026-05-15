import Link from "next/link"
import { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { DifficultyBadge } from "@/components/guideforge/shared"
import { PublishedBadge } from "./published-badge"
import { MediaPlaceholder } from "@/components/questline/media/media-placeholder"

interface GuideCardProps {
  guide: {
    id: string
    slug: string
    title: string
    summary: string
    type: string
    difficulty: "beginner" | "intermediate" | "advanced" | "expert"
    verification?: "forge-verified" | "verified" | null
    estimatedMinutes?: number | null
  }
  href: string
  variant?: "grid" | "featured" | "minimal"
  imageVariant?: "image" | "spark" | "patch"
  imageAspect?: string
}

export function GuideCard({
  guide,
  href,
  variant = "grid",
  imageVariant = "image",
  imageAspect = "aspect-[16/10]",
}: GuideCardProps) {
  if (variant === "featured") {
    return (
      <Link href={href} className="group block">
        <article className="flex flex-col gap-5">
          <MediaPlaceholder
            label="Featured Guide"
            variant={imageVariant}
            tone={guide.verification === "forge-verified" ? "primary" : "default"}
            aspect="aspect-[16/9]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <DifficultyBadge difficulty={guide.difficulty} />
            <PublishedBadge verification={guide.verification} />
            {guide.estimatedMinutes && (
              <span className="text-xs text-muted-foreground">
                {guide.estimatedMinutes} min read
              </span>
            )}
          </div>
          <h3 className="text-balance text-3xl font-bold tracking-tight transition-colors group-hover:text-primary md:text-4xl">
            {guide.title}
          </h3>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            {guide.summary}
          </p>
        </article>
      </Link>
    )
  }

  if (variant === "minimal") {
    return (
      <Link
        href={href}
        className="group card-foundry flex items-center gap-4 rounded-lg p-4 transition-colors"
      >
        <MediaPlaceholder
          label="Guide"
          aspect="size-20 shrink-0 rounded-md"
          tone="cyan"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--brass-700)]">
            {guide.type.replace("-", " ")}
            {guide.estimatedMinutes && ` · ${guide.estimatedMinutes} min`}
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
  }

  // variant === "grid" (default)
  return (
    <Link href={href} className="group block">
      <article className="card-foundry flex h-full flex-col gap-3 overflow-hidden rounded-xl p-4">
        <MediaPlaceholder
          label="Guide Thumbnail"
          variant={imageVariant}
          tone={guide.verification === "forge-verified" ? "primary" : "default"}
          aspect={imageAspect}
        />
        <div className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-[0.15em]">
          <span className="text-[var(--brass-700)]">{guide.type.replace("-", " ")}</span>
          {guide.estimatedMinutes && (
            <>
              <span className="text-muted-foreground/50">&middot;</span>
              <span className="text-muted-foreground">{guide.estimatedMinutes} min</span>
            </>
          )}
        </div>
        <h3 className="px-1 text-balance text-lg font-bold leading-snug transition-colors group-hover:text-primary line-clamp-2">
          {guide.title}
        </h3>
        <p className="flex-1 px-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {guide.summary}
        </p>
        <div className="flex items-center gap-2 px-1 pt-1 text-xs">
          <DifficultyBadge difficulty={guide.difficulty} />
          <PublishedBadge verification={guide.verification} showLabel={false} />
        </div>
      </article>
    </Link>
  )
}
