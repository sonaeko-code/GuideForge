import { Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PublishedBadgeProps {
  verification?: "forge-verified" | "verified" | null
  showLabel?: boolean
}

export function PublishedBadge({ verification, showLabel = true }: PublishedBadgeProps) {
  if (verification !== "forge-verified") {
    return null
  }

  return (
    <Badge className="gap-1 border-primary/30 bg-primary/10 text-primary">
      <Shield className="size-3" aria-hidden="true" />
      {showLabel && "Forged"}
    </Badge>
  )
}
