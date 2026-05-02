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
    <div className="space-y-2">
      {showBackButton && (
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href={backLink}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {network.name}
          </h1>
          <p className="mt-2 text-pretty text-lg text-muted-foreground">
            {network.description}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              aria-label="Network settings"
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
  )
}
