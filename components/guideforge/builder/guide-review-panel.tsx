'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getGuideReviewSummary, castGuideReviewVote, publishEligibleGuide } from '@/lib/guideforge/supabase-guide-reviews'

interface GuideReviewPanelProps {
  guideId: string
  guideStatus: string
  canPublish?: boolean
  onVoteSuccess?: () => void
  onPublishSuccess?: () => void
}

export default function GuideReviewPanel({ guideId, guideStatus, canPublish, onVoteSuccess, onPublishSuccess }: GuideReviewPanelProps) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getGuideReviewSummary>> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "success" | "error">("idle")
  const [publishError, setPublishError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      setIsLoading(true)
      const result = await getGuideReviewSummary(guideId)
      setSummary(result)
      setIsLoading(false)
    }

    loadSummary()
  }, [guideId, guideStatus])

  const handleVote = async (vote: 'approve' | 'request_changes') => {
    setIsVoting(true)
    setVoteError(null)

    const result = await castGuideReviewVote(guideId, vote)

    if (result.success && result.summary) {
      setSummary(result.summary)
      onVoteSuccess?.()
    } else {
      setVoteError(result.error || 'Failed to cast vote')
    }

    setIsVoting(false)
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    setPublishStatus("publishing")
    setPublishError(null)

    const result = await publishEligibleGuide(guideId)

    if (result.success) {
      setPublishStatus("success")
      setPublishError(null)
      
      // Notify parent that publish succeeded
      onPublishSuccess?.()
      
      // Show success for 2 seconds
      setTimeout(() => {
        setPublishStatus("idle")
      }, 2000)
    } else {
      setPublishStatus("error")
      setPublishError(result.error || "Failed to publish guide")
    }

    setIsPublishing(false)
  }

  // Only show panel if status is ready (even with 0 votes)
  if (guideStatus !== 'ready') {
    return null
  }

  if (isLoading || !summary) {
    return (
      <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading review status...</p>
        </div>
      </div>
    )
  }

  // If summary has an error (e.g., missing collection/hub context), show it but still render panel
  if (summary.error) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">Review Status Unavailable</h3>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">{summary.error}</p>
          </div>
        </div>
      </div>
    )
  }

  const canVote = summary.canCurrentUserVote && guideStatus === 'ready'

  return (
    <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Review Status</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {guideStatus === 'ready' ? 'Pending review' : `Status: ${guideStatus}`}
          </p>
        </div>
      </div>

      {/* Vote Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-background border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Approve</span>
          </div>
          <div className="text-lg font-semibold text-foreground">{summary.approveWeight}</div>
          <div className="text-xs text-muted-foreground">{summary.votes.filter((v) => v.vote === 'approve').length} votes</div>
        </div>

        <div className="p-3 rounded-lg bg-background border border-border/30">
          <div className="flex items-center gap-2 mb-1">
            <ThumbsDown className="size-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Request Changes</span>
          </div>
          <div className="text-lg font-semibold text-foreground">{summary.requestChangesWeight}</div>
          <div className="text-xs text-muted-foreground">{summary.votes.filter((v) => v.vote === 'request_changes').length} votes</div>
        </div>
      </div>

      {/* Publish Eligibility */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="text-xs font-semibold text-foreground">Publish Eligibility</h4>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            summary.publishEligibility.publishEligible
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : summary.publishEligibility.needsChanges
              ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
              : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
          }`}>
            {summary.publishEligibility.label}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{summary.publishEligibility.helperText}</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-background border border-border/30">
            <div className="text-muted-foreground">Approve</div>
            <div className="font-semibold text-foreground">{summary.publishEligibility.approveWeight}</div>
          </div>
          <div className="p-2 rounded bg-background border border-border/30">
            <div className="text-muted-foreground">Changes</div>
            <div className="font-semibold text-foreground">{summary.publishEligibility.requestChangesWeight}</div>
          </div>
          <div className="p-2 rounded bg-background border border-border/30">
            <div className="text-muted-foreground">Net</div>
            <div className="font-semibold text-foreground">{summary.publishEligibility.netApprovalWeight}</div>
          </div>
        </div>
      </div>

      {/* Voting UI - Hidden for published guides */}
      {guideStatus === 'published' ? (
        <div className="p-2 rounded text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <AlertCircle className="size-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>This guide is published. Review votes are now locked.</span>
        </div>
      ) : canVote ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Cast your vote</p>
          <div className="flex gap-2">
            <Button
              onClick={() => handleVote('approve')}
              disabled={isVoting}
              variant={summary.currentUserVote === 'approve' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-9 text-xs gap-1"
            >
              {isVoting && summary.currentUserVote === 'approve' ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <ThumbsUp className="size-3" aria-hidden="true" />
                  {summary.currentUserVote === 'approve' ? 'Approved' : 'Approve'}
                </>
              )}
            </Button>

            <Button
              onClick={() => handleVote('request_changes')}
              disabled={isVoting}
              variant={summary.currentUserVote === 'request_changes' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 h-9 text-xs gap-1"
            >
              {isVoting && summary.currentUserVote === 'request_changes' ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <ThumbsDown className="size-3" aria-hidden="true" />
                  {summary.currentUserVote === 'request_changes' ? 'Requesting Changes' : 'Request Changes'}
                </>
              )}
            </Button>
          </div>

          {voteError && (
            <div className="p-2 rounded text-xs bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="size-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{voteError}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2 rounded text-xs bg-muted/50 text-muted-foreground">
          You can view review status, but your current role cannot vote.
        </div>
      )}

      {/* Publish Button and Status - Hidden for published guides */}
      {guideStatus !== 'published' && (
        <div className="space-y-2">
          {summary.publishEligibility.publishEligible && canPublish ? (
          <>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || publishStatus === "publishing"}
              variant="default"
              size="sm"
              className="w-full h-9 text-xs"
            >
              {publishStatus === "publishing" || isPublishing ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" aria-hidden="true" />
                  Publishing...
                </>
              ) : publishStatus === "success" ? (
                <>
                  <Check className="size-3 mr-1" aria-hidden="true" />
                  Guide published.
                </>
              ) : (
                'Publish Guide'
              )}
            </Button>
            {publishStatus === "error" && publishError && (
              <div className="p-2 rounded text-xs bg-red-500/10 text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="size-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{publishError}</span>
              </div>
            )}
          </>
        ) : !summary.publishEligibility.publishEligible ? (
          <div className="p-2 rounded text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300">
            Publish becomes available when this guide is eligible.
          </div>
        ) : !canPublish ? (
          <div className="p-2 rounded text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300">
            Only network owners/admins can publish eligible guides.
          </div>
        ) : null}
        </div>
      )}

      {/* Voter List */}
      {summary.totalVotes > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Votes ({summary.totalVotes})</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {summary.votes.map((v, idx) => (
              <div key={`${v.voterId}-${idx}`} className="flex items-center justify-between text-xs p-2 rounded bg-background border border-border/20">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {v.voterDisplayName || `User (${v.voterId.substring(0, 8)})`}
                  </div>
                  <div className="text-muted-foreground">{v.voterRole}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {v.vote === 'approve' ? (
                    <ThumbsUp className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <ThumbsDown className="size-3 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                  )}
                  <span className="font-medium text-foreground">{v.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threshold note */}
      <div className="p-2 rounded text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 flex items-start gap-2 border border-blue-500/20">
        <AlertCircle className="size-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>Publishing thresholds are visible but not enforced yet.</span>
      </div>
    </div>
  )
}
