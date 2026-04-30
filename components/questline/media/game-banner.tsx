import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GameBannerProps {
  /** Game name displayed prominently in the banner. */
  name: string
  /** Short tagline beneath the title. */
  tagline?: string
  /** Optional eyebrow label, e.g. "Featured Hub". */
  eyebrow?: string
  /** Tonal variant — different palettes for different games. */
  tone?: "ember" | "starfall" | "hollow" | "mech" | "default"
  /** Fixed aspect ratio for cards; omit on hero usage. */
  aspect?: string
  className?: string
  children?: ReactNode
}

const TONE_GRADIENTS: Record<NonNullable<GameBannerProps["tone"]>, string> = {
  ember:
    "bg-[radial-gradient(ellipse_at_30%_20%,oklch(0.66_0.18_45)_0%,oklch(0.4_0.12_30)_50%,oklch(0.2_0.06_20)_100%)]",
  starfall:
    "bg-[radial-gradient(ellipse_at_70%_30%,oklch(0.55_0.15_240)_0%,oklch(0.3_0.1_260)_55%,oklch(0.16_0.06_270)_100%)]",
  hollow:
    "bg-[radial-gradient(ellipse_at_30%_70%,oklch(0.45_0.1_290)_0%,oklch(0.22_0.05_280)_50%,oklch(0.13_0.02_270)_100%)]",
  mech:
    "bg-[radial-gradient(ellipse_at_50%_30%,oklch(0.55_0.1_180)_0%,oklch(0.3_0.06_200)_55%,oklch(0.18_0.03_220)_100%)]",
  default:
    "bg-[radial-gradient(ellipse_at_30%_30%,oklch(0.5_0.1_60)_0%,oklch(0.3_0.06_50)_50%,oklch(0.18_0.02_40)_100%)]",
}

export function GameBanner({
  name,
  tagline,
  eyebrow,
  tone = "default",
  aspect,
  className,
  children,
}: GameBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-foreground/20",
        TONE_GRADIENTS[tone],
        aspect,
        className,
      )}
    >
      {/* Heavy dotted noise pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:14px_14px]"
      />
      {/* Diagonal hatch */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] [background-image:repeating-linear-gradient(135deg,#fff_0,#fff_1px,transparent_1px,transparent_10px)]"
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]"
      />
      {/* Bottom shadow gradient for legibility */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
      />

      <div className="relative flex h-full w-full flex-col justify-between p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-3">
          {eyebrow && (
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm">
              {eyebrow}
            </span>
          )}
          <span className="rounded-full border border-white/30 bg-black/30 px-2 py-1 text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm">
            Game Banner
          </span>
        </div>

        <div>
          <h3 className="text-balance text-3xl font-black tracking-tight md:text-4xl">
            {name}
          </h3>
          {tagline && (
            <p className="mt-1 text-sm leading-relaxed text-white/80 md:text-base">
              {tagline}
            </p>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  )
}
