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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <Link
          href={`/n/${network.slug}`}
          className={cn(
            "group flex items-center gap-3 font-semibold tracking-tight text-balance min-w-0",
            theme.accentClasses
          )}
        >
          <span className="forge-seal flex size-9 items-center justify-center rounded-md text-[oklch(0.18_0.02_50)] text-xs font-bold uppercase shrink-0">
            {network.name?.slice(0, 1) || "G"}
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-base font-bold tracking-tight truncate">
              {network.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {typeLabel}
            </span>
          </span>
        </Link>

        {/* Primary nav — visible on tablet+. Always routes back to the network home with anchor,
            so links work from any inner page (hub, guide, asset) too. */}
        <nav
          aria-label="Network primary"
          className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex"
        >
          <Link
            href={`/n/${network.slug}`}
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Overview
          </Link>
          <Link
            href={`/n/${network.slug}#hubs`}
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Hubs
          </Link>
          <Link
            href={`/n/${network.slug}#collections`}
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Collections
          </Link>
          <Link
            href={`/n/${network.slug}#guides`}
            className="relative py-1 transition-colors hover:text-foreground after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:scale-x-0 after:bg-[var(--brass-500)] after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Guides
          </Link>
        </nav>

        <div className="hidden items-center gap-2 sm:flex shrink-0">
          <span className="rounded-full border border-[color-mix(in_oklch,var(--brass-500)_35%,transparent)] bg-[color-mix(in_oklch,var(--brass-100)_75%,var(--card))] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--brass-700)] whitespace-nowrap">
            Public Network
          </span>
        </div>
      </div>

      {/* Mobile nav — horizontal scroll row, hidden on tablet+ */}
      <nav
        aria-label="Network primary mobile"
        className="md:hidden border-t border-foreground/10 bg-background/60"
      >
        <div className="mx-auto w-full max-w-6xl px-4">
          <ul className="flex items-center gap-1 overflow-x-auto py-1.5 text-xs font-medium text-muted-foreground">
            <li>
              <Link
                href={`/n/${network.slug}`}
                className="inline-block whitespace-nowrap rounded-md px-2.5 py-1 hover:bg-muted hover:text-foreground"
              >
                Overview
              </Link>
            </li>
            <li>
              <Link
                href={`/n/${network.slug}#hubs`}
                className="inline-block whitespace-nowrap rounded-md px-2.5 py-1 hover:bg-muted hover:text-foreground"
              >
                Hubs
              </Link>
            </li>
            <li>
              <Link
                href={`/n/${network.slug}#collections`}
                className="inline-block whitespace-nowrap rounded-md px-2.5 py-1 hover:bg-muted hover:text-foreground"
              >
                Collections
              </Link>
            </li>
            <li>
              <Link
                href={`/n/${network.slug}#guides`}
                className="inline-block whitespace-nowrap rounded-md px-2.5 py-1 hover:bg-muted hover:text-foreground"
              >
                Guides
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}
