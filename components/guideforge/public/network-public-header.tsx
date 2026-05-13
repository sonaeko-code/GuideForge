import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Network } from "@/lib/guideforge/types"
import { getNetworkTheme } from "@/lib/guideforge/network-themes"
import { getRegistryTypeById, getRegistryIdFromDbType } from "@/lib/guideforge/network-types"

interface NetworkPublicHeaderProps {
  network: Network
  className?: string
}

export function NetworkPublicHeader({ network, className }: NetworkPublicHeaderProps) {
  const theme = getNetworkTheme(network.branding?.theme)
  // Convert DB type to UI registry id
  const registryId = getRegistryIdFromDbType(network.type)
  const registryEntry = getRegistryTypeById(registryId)
  const typeLabel = registryEntry?.label ?? "Guide Network"
  
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur",
        theme.borderClasses,
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href={`/n/${network.slug}`}
          className={cn(
            "flex items-center gap-2 font-semibold tracking-tight text-balance",
            theme.accentClasses
          )}
        >
          <span className="text-base font-bold tracking-tight">
            {network.name}
          </span>
        </Link>

        <nav
          aria-label="Network primary"
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
        >
          <Link href={`/n/${network.slug}`} className={cn("transition-colors hover:", theme.accentClasses)}>
            Home
          </Link>
          <Link href={`/n/${network.slug}#hubs`} className={cn("transition-colors hover:", theme.accentClasses)}>
            Hubs
          </Link>
          <Link href={`/n/${network.slug}#guides`} className={cn("transition-colors hover:", theme.accentClasses)}>
            Guides
          </Link>
        </nav>

        <div className={cn("flex items-center gap-3 text-xs", theme.accentClasses)}>
          <span className="hidden sm:inline-block capitalize">
            {typeLabel}
          </span>
        </div>
      </div>
    </header>
  )
}
