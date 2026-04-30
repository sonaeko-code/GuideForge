import { cn } from "@/lib/utils"
import { ImageIcon, PlayCircle, Newspaper, MapPin, Sparkles } from "lucide-react"
import type { ReactNode } from "react"

type MediaTone = "default" | "primary" | "ink" | "cyan"

interface MediaPlaceholderProps {
  /** Display label, e.g. "Game Banner", "Patch Art". */
  label: string
  /** Optional sub-label, e.g. game name. */
  caption?: string
  /** Aspect ratio class, defaults to 16:9. */
  aspect?: string
  /** Icon variant. */
  variant?: "image" | "video" | "patch" | "map" | "spark"
  tone?: MediaTone
  className?: string
  children?: ReactNode
}

const TONE_STYLES: Record<MediaTone, string> = {
  default: "bg-muted/40 text-muted-foreground border-foreground/10",
  primary: "bg-primary/10 text-primary border-primary/30",
  ink: "bg-foreground text-background border-foreground/30",
  cyan: "bg-[oklch(0.6_0.118_184.704)]/10 text-[oklch(0.45_0.118_184.704)] border-[oklch(0.6_0.118_184.704)]/30 dark:text-[oklch(0.7_0.118_184.704)]",
}

export function MediaPlaceholder({
  label,
  caption,
  aspect = "aspect-video",
  variant = "image",
  tone = "default",
  className,
  children,
}: MediaPlaceholderProps) {
  const Icon =
    variant === "video"
      ? PlayCircle
      : variant === "patch"
        ? Newspaper
        : variant === "map"
          ? MapPin
          : variant === "spark"
            ? Sparkles
            : ImageIcon

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border",
        aspect,
        TONE_STYLES[tone],
        className,
      )}
    >
      {/* Subtle dotted texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50 bg-parchment-dots"
      />
      {/* Diagonal scan lines for editorial atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,currentColor_0,currentColor_1px,transparent_1px,transparent_8px)]"
      />

      <div className="relative flex h-full w-full flex-col items-start justify-between p-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
            {label}
          </span>
        </div>
        <div className="w-full">
          {children}
          {caption && (
            <p className="mt-1 text-sm font-semibold leading-tight">{caption}</p>
          )}
        </div>
      </div>
    </div>
  )
}
