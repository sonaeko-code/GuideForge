import { cn } from "@/lib/utils"
import {
  Sword,
  Sparkles,
  Skull,
  Newspaper,
  Map,
  Crosshair,
  ScrollText,
  Trophy,
  type LucideIcon,
} from "lucide-react"

interface CollectionIconProps {
  /** Collection slug — used to pick a thematic glyph. */
  slug: string
  /** Defaults to medium; "lg" used in collection lists. */
  size?: "sm" | "md" | "lg"
  className?: string
}

const SLUG_TO_ICON: Record<string, LucideIcon> = {
  builds: Sword,
  "character-builds": Sword,
  "mech-builds": Sword,
  loadouts: Crosshair,
  "beginner-guides": ScrollText,
  guides: ScrollText,
  "boss-guides": Skull,
  dungeons: Skull,
  "patch-notes": Newspaper,
  arena: Trophy,
}

const SIZE_CLASS = {
  sm: "size-9 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-5",
  lg: "size-14 [&_svg]:size-6",
}

export function CollectionIcon({
  slug,
  size = "md",
  className,
}: CollectionIconProps) {
  const Icon = SLUG_TO_ICON[slug] || Sparkles
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-foreground/15 bg-foreground/5 text-foreground",
        SIZE_CLASS[size],
        className,
      )}
    >
      <Icon aria-hidden="true" />
      {/* Tiny corner notch for a "map marker" feel */}
      <span
        aria-hidden
        className="absolute size-1 rounded-full bg-primary opacity-0"
      />
    </span>
  )
}

/** Quick lookup helper for tone hints (used by GameBanner). */
export function hubSlugToTone(
  slug: string,
): "ember" | "starfall" | "hollow" | "mech" | "default" {
  if (slug === "emberfall") return "ember"
  if (slug === "starfall-outriders") return "starfall"
  if (slug === "hollowspire") return "hollow"
  if (slug === "mechbound-tactics") return "mech"
  return "default"
}
