'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Archive } from 'lucide-react'

interface GuideVersion {
  id: string
  revisionNumber: number
  status: string
  publishedAt: string | null
  updatedAt: string
  isCurrentPublished: boolean
}

interface GuideVersionHistoryProps {
  versions: GuideVersion[]
  networkId: string
  isLoading?: boolean
}

export function GuideVersionHistory({ versions, networkId, isLoading }: GuideVersionHistoryProps) {
  if (!versions || versions.length === 0) {
    return null
  }

  // Only show archived versions in history, not the current version
  const historyVersions = versions.filter((v) => v.status === 'archived')

  if (historyVersions.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 mt-6 border-t border-border pt-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Version History</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Archived versions of this guide. Previous published versions are preserved for reference.
        </p>
      </div>

      <div className="space-y-2">
        {historyVersions.map((version) => (
          <Card
            key={version.id}
            className="border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 min-w-0 mb-3 sm:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  Revision #{version.revisionNumber}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Archived
                </Badge>
                {version.isCurrentPublished && (
                  <Badge
                    variant="outline"
                    className="text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                    Currently Published
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                {version.publishedAt && (
                  <p>
                    Published {formatDistanceToNow(new Date(version.publishedAt), { addSuffix: true })}
                  </p>
                )}
                <p>Updated {formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" asChild variant="outline" disabled={isLoading}>
                <Link href={`/builder/network/${networkId}/guide/${version.id}/preview`}>
                  View
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Version history shows archived revisions. You can view them but cannot edit them.
      </p>
    </div>
  )
}
