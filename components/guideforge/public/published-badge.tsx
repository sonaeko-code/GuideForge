import { Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PublishedBadgeProps {
  verification?: "forge-verified" | "verified" | null
  showLabel?: boolean
}

/**
 * Published/Forged Badge for public guides
 * 
 * Visual: Premium copper/brass styling from Forged brand reference,
 * indicating guides verified through network governance.
 */
export function PublishedBadge({ verification, showLabel = true }: PublishedBadgeProps) {
  if (verification !== "forge-verified") {
    return null
  }

  return (
    <Badge className="gap-1.5 border-amber-500/40 bg-gradient-to-br from-amber-500/12 to-amber-600/8 text-amber-700 dark:from-amber-700/20 dark:to-amber-800/15 dark:text-amber-300 font-semibold">
      <Shield className="size-3.5" aria-hidden="true" />
      {showLabel && "Forged"}
    </Badge>
  )
}
