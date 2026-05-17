"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle, Trash2, LinkIcon, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/guideforge/auth-context"
import { getAssetDraft, updateAssetDraft, deleteAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"
import type { GeneratedSingleGuide, GeneratedChecklist } from "@/lib/guideforge/generation-schemas"
import { SingleGuideEditor } from "@/components/guideforge/builder/single-guide-editor"
import { ChecklistEditor } from "@/components/guideforge/builder/checklist-editor"
import { AssetTypeBadge } from "@/components/guideforge/builder/asset-type-badge"
import { AttachToNetworkPanel } from "@/components/guideforge/builder/attach-to-network-panel"

interface AssetDetailPageProps {
  params: Promise<{ assetId: string }>
  searchParams?: Promise<{ edit?: string }>
}

export default function AssetDetailPage({ params, searchParams }: AssetDetailPageProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [asset, setAsset] = useState<AssetDraft | null>(null)
  const [assetId, setAssetId] = useState<string>("")
  const [notFound, setNotFound] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editSummary, setEditSummary] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editPayload, setEditPayload] = useState<any>(null)
  const [showAttachPanel, setShowAttachPanel] = useState(false)

  // Extract assetId from params
  useEffect(() => {
    params.then(({ assetId }) => {
      setAssetId(assetId)
    })
  }, [params])

  // Check if edit mode should be enabled via URL
  useEffect(() => {
    if (searchParams) {
      searchParams.then((sp) => {
        if (sp?.edit === 'true') {
          setIsEditMode(true)
        }
      })
    }
  }, [searchParams])

  // Fetch asset once authenticated and assetId is set
  useEffect(() => {
    if (!isAuthenticated || isLoading || !assetId) {
      return
    }

    const fetchAsset = async () => {
      setIsFetching(true)
      try {
        const data = await getAssetDraft(assetId)
        if (!data) {
          setNotFound(true)
        } else {
          setAsset(data)
          setEditTitle(data.title)
          setEditSummary(data.summary || "")
          setEditPayload(JSON.parse(JSON.stringify(data.payload))) // Deep copy
        }
      } catch (err) {
        console.error("[v0] Asset fetch error:", err)
        setNotFound(true)
      } finally {
        setIsFetching(false)
      }
    }

    fetchAsset()
  }, [isAuthenticated, isLoading, assetId])

  const handleSaveChanges = async () => {
    if (!asset) return
    
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      // For Single Guide, SingleGuideEditor writes title/summary directly into editPayload.
      // Sync editTitle/editSummary from editPayload so the save call uses the edited values.
      if (asset.assetType === "single_guide" && editPayload) {
        if (editPayload.title) setEditTitle(editPayload.title)
        if (editPayload.summary != null) setEditSummary(editPayload.summary)
      }

      // For Checklist, update payload fields
      if (asset.assetType === "checklist" && editPayload) {
        editPayload.title = editTitle
        editPayload.summary = editSummary
      }

      // Validate steps have required fields (Single Guide)
      if (asset.assetType === "single_guide" && editPayload?.steps) {
        for (const step of editPayload.steps) {
          if (!step.title?.trim() || !step.body?.trim()) {
            setSaveMessage({
              type: 'error',
              text: 'All steps must have a title and body'
            })
            setIsSaving(false)
            return
          }
        }
      }

      // Validate sections and items have required fields (Checklist)
      if (asset.assetType === "checklist" && editPayload?.sections) {
        for (const section of editPayload.sections) {
          if (!section.title?.trim()) {
            setSaveMessage({
              type: 'error',
              text: 'All section titles must be non-empty'
            })
            setIsSaving(false)
            return
          }
          for (const item of (section.items ?? [])) {
            if (!item.label?.trim()) {
              setSaveMessage({
                type: 'error',
                text: 'All item labels must be non-empty'
              })
              setIsSaving(false)
              return
            }
          }
        }
      }

      // Call updateAssetDraft helper to persist to Supabase
      const result = await updateAssetDraft(asset.id, {
        title: editTitle,
        summary: editSummary,
        payload: editPayload, // Include full payload with edits
      } as any)

      if (!result.success) {
        setSaveMessage({
          type: 'error',
          text: result.error || 'Failed to save changes'
        })
        return
      }

      // Update local state with new values
      const updatedAsset = {
        ...asset,
        title: editTitle,
        summary: editSummary,
        payload: editPayload,
        updatedAt: new Date().toISOString(),
      }
      setAsset(updatedAsset)
      setIsEditMode(false)
      setSaveMessage({type: 'success', text: 'Asset updated successfully'})
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes'
      console.error("[v0] handleSaveChanges error:", err)
      setSaveMessage({
        type: 'error',
        text: msg
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!asset) return
    
    setIsDeleting(true)
    try {
      const result = await deleteAssetDraft(asset.id)
      
      if (!result.success) {
        setSaveMessage({
          type: 'error',
          text: result.error || 'Failed to delete asset'
        })
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      // Redirect to assets list
      router.push('/builder/assets')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete'
      console.error("[v0] handleDeleteConfirm error:", err)
      setSaveMessage({
        type: 'error',
        text: msg
      })
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Show sign-in required state
  if (!isLoading && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <div className="space-y-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/builder/assets">
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to Assets
              </Link>
            </Button>
            <Card className="p-6 border-border/50">
              <div className="space-y-4 text-center">
                <p className="font-semibold text-foreground">Sign in to view your assets</p>
                <div className="flex gap-2 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth/signup">Create Account</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  // Show loading state
  if (isLoading || isFetching) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <div className="space-y-8">
            <Button variant="ghost" size="sm" disabled>
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Assets
            </Button>
            <Card className="p-12 text-center">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-muted-foreground">Loading asset...</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  // Show not found state
  if (notFound || !asset) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <div className="space-y-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/builder/assets">
                <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
                Back to Assets
              </Link>
            </Button>
            <Card className="p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Asset not found</p>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    The asset you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/builder/assets">Back to Assets</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to My Assets
          </Link>
        </Button>
        <div className="hidden sm:block text-xs text-muted-foreground">
          Builder / My Assets / Asset Detail
        </div>
      </div>

      {/* Title and Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {asset && <AssetTypeBadge assetType={asset.assetType} variant="small" />}
          {asset?.payload?.generatedBy && (
            <Badge variant="secondary" className="text-xs">
              {asset.payload.generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">Draft</Badge>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {asset?.createdAt && (
              <span>Created {new Date(asset.createdAt).toLocaleDateString()}</span>
            )}
            {asset?.updatedAt && asset.updatedAt !== asset.createdAt && (
              <span>Updated {new Date(asset.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {isEditMode ? (
          <h1 className="text-lg md:text-xl font-semibold text-foreground break-words">
            <span className="text-muted-foreground">Editing:</span> {asset?.title}
          </h1>
        ) : (
          <div className="space-y-1.5">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words">{asset?.title}</h1>
            {asset?.summary && (
              <p className="text-sm md:text-base text-muted-foreground">{asset.summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Checklist at-a-glance stats — compact pills, preview mode only */}
      {!isEditMode && asset.assetType === "checklist" && (() => {
        const sections = Array.isArray(asset.payload?.sections) ? asset.payload.sections : []
        const totalItems = sections.reduce((sum: number, s: any) => sum + (Array.isArray(s?.items) ? s.items.length : 0), 0)
        const requiredItems = sections.reduce((sum: number, s: any) => sum + (Array.isArray(s?.items) ? s.items.filter((i: any) => i?.required === true).length : 0), 0)
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium">
              <span className="font-bold text-foreground">{sections.length}</span>
              <span className="text-muted-foreground">section{sections.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium">
              <span className="font-bold text-foreground">{totalItems}</span>
              <span className="text-muted-foreground">item{totalItems !== 1 ? "s" : ""}</span>
            </div>
            {requiredItems > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-xs font-medium">
                <span className="font-bold text-amber-700 dark:text-amber-400">{requiredItems}</span>
                <span className="text-amber-700 dark:text-amber-400">required</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Single Guide at-a-glance metadata — compact pills, preview mode only.
          The embedded editor hides its difficulty/audience block via showModeTabs=false,
          so surface that information here instead. */}
      {!isEditMode && asset.assetType === "single_guide" && (() => {
        const steps = Array.isArray(asset.payload?.steps) ? asset.payload.steps : []
        const difficulty = asset.payload?.difficulty as string | undefined
        const audience = asset.payload?.audience as string | undefined
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium">
              <span className="font-bold text-foreground">{steps.length}</span>
              <span className="text-muted-foreground">step{steps.length !== 1 ? "s" : ""}</span>
            </div>
            {difficulty && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium capitalize">
                <span className="text-muted-foreground">Level:</span>
                <span className="font-semibold text-foreground">{difficulty}</span>
              </div>
            )}
            {audience && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium min-w-0">
                <span className="text-muted-foreground shrink-0">For:</span>
                <span className="font-medium text-foreground truncate max-w-[16rem]" title={audience}>{audience}</span>
              </div>
            )}
          </div>
        )
      })()}

      {isEditMode && (
        <Card className="p-5 space-y-5 border-border rounded-lg bg-muted/40">
          <div className="space-y-6">
            {/* Title/summary inputs are shown for non-single_guide assets.
                For single_guide, SingleGuideEditor renders its own title/summary fields. */}
            {asset?.assetType !== "single_guide" && (
              <>
                <div className="space-y-2">
                  <label htmlFor="asset-title" className="text-sm font-semibold text-foreground">Title</label>
                  <input
                    id="asset-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-lg font-semibold"
                    placeholder="Asset title..."
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="asset-summary" className="text-sm font-semibold text-foreground">Summary</label>
                  <textarea
                    id="asset-summary"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-base"
                    placeholder="Asset summary..."
                  />
                </div>
              </>
            )}

            {/* Single Guide: shared editor (edit + preview tabs, add/remove steps) */}
            {asset?.assetType === "single_guide" && editPayload && (
              <SingleGuideEditor
                value={editPayload as GeneratedSingleGuide}
                onChange={(updated) => setEditPayload(updated as any)}
                editTabLabel="Edit Asset"
              />
            )}

            {/* Checklist: Full Editor */}
            {asset?.assetType === "checklist" && editPayload && (
              <ChecklistEditor
                value={editPayload as GeneratedChecklist}
                onChange={(updated) => setEditPayload(updated)}
                editTabLabel="Edit Draft"
              />
            )}
          </div>

          {/* Save/Cancel Actions - Sticky at bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-muted/40 via-muted/40 to-transparent pt-4 mt-4 flex flex-wrap gap-2 items-center justify-between border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditTitle(asset?.title || "")
                setEditSummary(asset?.summary || "")
                setEditPayload(JSON.parse(JSON.stringify(asset?.payload)))
                setIsEditMode(false)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {saveMessage && (
                <div
                  className={`text-xs font-medium break-words max-w-full ${saveMessage.type === 'error' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}
                  role={saveMessage.type === 'error' ? 'alert' : 'status'}
                >
                  {saveMessage.text}
                </div>
              )}
              <Button
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Card className="p-4 sm:p-5 border-red-500/30 bg-red-500/5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Delete this asset draft?</h3>
                {asset?.attachedCollectionId ? (
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    This draft is attached to a network collection. Deleting it will remove it from that network&apos;s private dashboard. This action cannot be undone.
                  </p>
                ) : (
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    This cannot be undone. The draft and all its content will be permanently deleted.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-red-500/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Draft"}
              </Button>
            </div>
          </div>
        </Card>
      )}


      {/* Asset Content Preview — flat structure (no outer Card) so the inner
          section/step Cards aren't visually nested. */}
      {!isEditMode && (
        <section className="space-y-3" aria-label="Asset preview">
          <h2 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 text-muted-foreground">
            <Eye className="size-3.5" aria-hidden="true" />
            Preview
          </h2>

          {asset.assetType === "single_guide" && (
            <SingleGuideEditor
              value={asset.payload as GeneratedSingleGuide}
              onChange={() => {}}
              mode="preview"
              showModeTabs={false}
            />
          )}

          {asset.assetType === "recipe" && (
            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Ingredients ({asset.payload.ingredients.length})
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {asset.payload.ingredients.slice(0, 10).map((ing, idx) => (
                  <li key={idx}>
                    • {ing.name}
                    {ing.amount && ` (${ing.amount})`}
                    {ing.notes && ` - ${ing.notes}`}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {asset.assetType === "checklist" && (
            <ChecklistEditor
              value={asset.payload as GeneratedChecklist}
              onChange={() => {}}
              mode="preview"
              showModeTabs={false}
            />
          )}
        </section>
      )}

      {/* Attachment Panel or Attach prompt */}
      {showAttachPanel ? (
        <Card className="p-4 sm:p-5 border-blue-500/20 bg-blue-500/5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">Attach to Network</h2>
              <button
                onClick={() => setShowAttachPanel(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Close attachment panel"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <AttachToNetworkPanel
              assetId={asset!.id}
              currentNetworkId={asset?.attachedNetworkId}
              currentHubId={asset?.attachedHubId}
              currentCollectionId={asset?.attachedCollectionId}
              onClose={() => setShowAttachPanel(false)}
              onSuccess={() => {
                // Refresh asset to show updated attachment
                const fetchAsset = async () => {
                  const updated = await getAssetDraft(assetId)
                  if (updated) {
                    setAsset(updated)
                    setSaveMessage({
                      type: 'success',
                      text: 'Asset attached successfully!'
                    })
                    setTimeout(() => setSaveMessage(null), 3000)
                  }
                }
                fetchAsset()
              }}
            />
          </div>
        </Card>
      ) : asset?.attachedCollectionId ? (() => {
        // Status-aware attached card. Published assets show "Published to Network"
        // and offer a Public View link; other statuses keep the private-draft framing.
        const isPublished = asset.status === "published"
        const isPendingReview = asset.status === "pending_review"
        const heading = isPublished
          ? "Published to Network"
          : isPendingReview
            ? "Submitted for Review"
            : "Attached as Private Draft"
        const body = isPublished
          ? "This asset is attached to a network collection and published. Single guides and checklists appear on the public network page."
          : isPendingReview
            ? "Submitted to the network's reviewers. Not visible publicly until approved and published."
            : "This asset is attached to a collection in your network's private workspace. It will not appear publicly until published."
        return (
          <Card className="p-4 sm:p-5 border-green-500/20 bg-green-500/5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <LinkIcon className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-green-900 dark:text-green-100">{heading}</h3>
                  <p className="text-sm text-green-800 dark:text-green-200">{body}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 self-start sm:self-auto shrink-0">
                {asset.attachedNetworkId && (
                  <Button asChild size="sm" variant="default">
                    <Link href={`/builder/network/${asset.attachedNetworkId}/dashboard`}>
                      Open Network
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAttachPanel(true)}
                >
                  Change
                </Button>
              </div>
            </div>
          </Card>
        )
      })()
      ) : (
        <Card className="p-4 sm:p-5 border-blue-500/20 bg-blue-500/5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-semibold text-foreground">Attach to Network</p>
              <p className="text-sm text-muted-foreground">
                Add this asset to one of your networks to make it part of a collection.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAttachPanel(true)}
              className="self-start sm:self-auto shrink-0"
            >
              <LinkIcon className="mr-2 size-4" aria-hidden="true" />
              Attach
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/builder/assets">Back to Assets</Link>
        </Button>
        {!isEditMode && (
          <Button onClick={() => setIsEditMode(true)} size="sm">
            Edit Asset
          </Button>
        )}
        {!showDeleteConfirm && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            Delete Draft
          </Button>
        )}
      </div>
        </div>
      </div>
    </main>
  )
}
