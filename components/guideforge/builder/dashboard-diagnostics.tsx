import type { Guide } from "@/lib/guideforge/types"
import type { NormalizedHub, NormalizedCollection } from "@/lib/guideforge/supabase-networks"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { normalizeGuideStatus, filterGuidesByStatus } from "@/lib/guideforge/utils"
import { AlertCircle } from "lucide-react"

interface DashboardDiagnosticsProps {
  networkId: string
  networkLoaded: boolean
  hubs: NormalizedHub[]
  collections: NormalizedCollection[]
  guides: Guide[]
  supabaseError?: string | null
}

export function DashboardDiagnostics({
  networkId,
  networkLoaded,
  hubs,
  collections,
  guides,
  supabaseError,
}: DashboardDiagnosticsProps) {
  const collectionIds = collections.map((c) => c.id)
  const guideIds = guides.map((g) => g.id)
  const guideStatuses = guides.map((g) => `${g.id.substring(0, 8)}: ${g.status}`)

  const draftGuides = filterGuidesByStatus(guides, "draft")
  const readyGuides = filterGuidesByStatus(guides, "ready")
  const publishedGuides = filterGuidesByStatus(guides, "published")

  return (
    <Card className="border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">Dashboard Diagnostics (Temporary)</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {/* Network Info */}
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Network ID</p>
            <p className="font-mono text-xs break-all text-foreground">{networkId}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Network Loaded</p>
            <Badge variant={networkLoaded ? "default" : "destructive"} className="text-xs">
              {networkLoaded ? "Yes" : "No"}
            </Badge>
          </div>

          {/* Collection Info */}
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Hub Count</p>
            <p className="text-foreground font-mono text-sm">{hubs.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Collection Count</p>
            <p className="text-foreground font-mono text-sm">{collections.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Collection IDs Loaded</p>
            <p className="text-foreground font-mono text-xs">{collectionIds.length > 0 ? "✓" : "✗"}</p>
          </div>

          {/* Guide Info */}
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Raw Guides Returned</p>
            <p className="text-foreground font-mono text-sm font-bold">{guides.length}</p>
          </div>
        </div>

        {/* Guide IDs */}
        {guides.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-2">Guide IDs Returned</p>
            <div className="space-y-1">
              {guideIds.slice(0, 5).map((id) => (
                <p key={id} className="font-mono text-xs text-foreground">
                  {id.substring(0, 12)}...
                </p>
              ))}
              {guideIds.length > 5 && (
                <p className="font-mono text-xs text-muted-foreground">
                  +{guideIds.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Guide Statuses */}
        {guides.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-2">Guide Statuses</p>
            <div className="space-y-1">
              {guideStatuses.slice(0, 8).map((status, idx) => (
                <p key={idx} className="font-mono text-xs text-foreground">
                  {status}
                </p>
              ))}
              {guideStatuses.length > 8 && (
                <p className="font-mono text-xs text-muted-foreground">
                  +{guideStatuses.length - 8} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Normalized Counts */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Normalized Draft</p>
            <p className="text-foreground font-mono text-lg font-bold">{draftGuides.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Normalized Ready</p>
            <p className="text-foreground font-mono text-lg font-bold">{readyGuides.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Normalized Published</p>
            <p className="text-foreground font-mono text-lg font-bold">{publishedGuides.length}</p>
          </div>
        </div>

        {/* Supabase Error */}
        {supabaseError && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-1">Supabase Error</p>
            <p className="font-mono text-xs text-red-700 dark:text-red-300">{supabaseError}</p>
          </div>
        )}

        {/* Collection IDs */}
        {collectionIds.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded p-2.5">
            <p className="text-muted-foreground text-xs font-medium mb-2">Collection IDs Queried</p>
            <div className="space-y-1">
              {collectionIds.slice(0, 5).map((id) => (
                <p key={id} className="font-mono text-xs text-foreground">
                  {id.substring(0, 12)}...
                </p>
              ))}
              {collectionIds.length > 5 && (
                <p className="font-mono text-xs text-muted-foreground">
                  +{collectionIds.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
