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
        "sticky top-0 z-40 w-full border-b bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/75",
        theme.borderClasses,
        className,
      )}
    >
      {/* Brass accent rule on top */}
      <div
        aria-hidden="true"
        className="h-px w-full bg-gradient-to-r from-transparent via-[var(--brass-500)]/70 to-transparent"
      />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href={`/n/${network.slug}`}
          className={cn(
            "group flex items-center gap-3 font-semibold tracking-tight text-balance",
            theme.accentClasses
          )}
        >
          <span className="forge-seal flex size-9 items-center justify-center rounded-md text-[oklch(0.18_0.02_50)] text-xs font-bold uppercase">
            {network.name?.slice(0, 1) || "G"}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight">
              {network.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {typeLabel}
            </span>
          </span>
        </Link>

        <nav
          aria-label="Network primary"
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
        >
          <Link
            href={`/n/${network.slug}`}
            className={cn(
              "relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100",
            )}
          >
            Home
          </Link>
          <a
            href="#hubs"
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Hubs
          </a>
          <a
            href="#guides"
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Guides
          </a>
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded-full border border-[color-mix(in_oklch,var(--brass-500)_35%,transparent)] bg-[color-mix(in_oklch,var(--brass-100)_75%,var(--card))] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--brass-700)]">
            Public Network
          </span>
        </div>
      </div>
    </header>
  )
}
