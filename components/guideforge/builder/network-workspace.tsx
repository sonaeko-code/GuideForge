import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Grid, Plus, Sparkles } from "lucide-react"

interface NetworkWorkspaceProps {
  networkId: string
}

export function NetworkWorkspace({ networkId }: NetworkWorkspaceProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Grid className="size-6" aria-hidden="true" />
          Network Workspace
        </h2>
        <p className="text-sm text-muted-foreground">
          Quick access to network management, hubs, and guide generation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <div className="text-base font-semibold">Dashboard</div>
            <div className="text-xs text-muted-foreground">View all guides</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href={`/builder/network/${networkId}/hub/new`}>
            <Plus className="size-5" aria-hidden="true" />
            <div className="text-base font-semibold">Create Hub</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href={`/builder/network/${networkId}/guide/new`}>
            <Plus className="size-5" aria-hidden="true" />
            <div className="text-base font-semibold">Create Manual</div>
            <div className="text-xs text-muted-foreground">New guide</div>
          </Link>
        </Button>

        <Button asChild size="lg" className="h-auto flex-col gap-2 py-4">
          <Link href={`/builder/network/${networkId}/generate`}>
            <Sparkles className="size-5" aria-hidden="true" />
            <div className="text-base font-semibold">Generate Guide</div>
            <div className="text-xs text-muted-foreground">AI-powered</div>
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="h-auto flex-col gap-2 py-4">
          <Link href={`/builder/network/new?type=gaming`}>
            <Plus className="size-5" aria-hidden="true" />
            <div className="text-base font-semibold">New Network</div>
          </Link>
        </Button>
      </div>
    </section>
  )
}
