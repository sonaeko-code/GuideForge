import Link from "next/link"
import { ArrowLeft, MoreVertical } from "lucide-react"
import type { Network } from "@/lib/guideforge/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NetworkContextHeaderProps {
  network: Network
  showBackButton?: boolean
  backLink?: string
}

/**
 * Reusable header component for network-scoped pages
 * Provides consistent branding, navigation, and network settings
 */
export function NetworkContextHeader({
  network,
  showBackButton = true,
  backLink = "/builder/networks",
}: NetworkContextHeaderProps) {
  return (
    <div className="space-y-3">
      {showBackButton && (
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={backLink}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      )}

      {/* Command center masthead */}
      <div className="surface-masthead relative overflow-hidden rounded-xl px-6 py-7 md:px-8 md:py-9 shadow-forge">
        <div className="absolute inset-0 bg-constellation opacity-25 pointer-events-none" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brass-700)]">
              Network &middot; Command Center
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {network.name}
            </h1>
            {network.description && (
              <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {network.description}
              </p>
            )}
            {network.slug && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                /n/{network.slug}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                aria-label="Network settings"
                className="flex-shrink-0"
              >
                <MoreVertical className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="#">Edit network</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/n/${network.slug || "questline"}`}>View public page</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#">Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
