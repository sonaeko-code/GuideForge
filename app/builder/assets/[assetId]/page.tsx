"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle, Trash2, CheckSquare2, ListTodo, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/guideforge/auth-context"
import { getAssetDraft, updateAssetDraft, deleteAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import type { AssetDraft } from "@/lib/guideforge/asset-draft-types"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"
import { SingleGuideEditor } from "@/components/guideforge/builder/single-guide-editor"

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

  const getAssetTypeName = (): string => {
    if (!asset) return ""
    const names: Record<string, string> = {
      single_guide: "Guide",
      recipe: "Recipe",
      checklist: "Checklist",
      sop: "SOP / Procedure",
      troubleshooting_flow: "Troubleshooting Flow",
    }
    return names[asset.assetType] || asset.assetType
  }

  // Calculate checklist statistics
  const getChecklistStats = (): { sections: number; totalItems: number; requiredItems: number; malformed: boolean } => {
    if (asset?.assetType !== "checklist" || !asset.payload) {
      return { sections: 0, totalItems: 0, requiredItems: 0, malformed: false }
    }
    
    const payload = asset.payload as any
    
    // Check if sections exist and are an array
    if (!Array.isArray(payload.sections)) {
      return { sections: 0, totalItems: 0, requiredItems: 0, malformed: true }
    }

    let totalItems = 0
    let requiredItems = 0
    let isMalformed = false

    for (const section of payload.sections) {
      if (!section || typeof section !== 'object') {
        isMalformed = true
        continue
      }
      if (!Array.isArray(section.items)) {
        isMalformed = true
        continue
      }
      totalItems += section.items.length
      requiredItems += section.items.filter((item: any) => item?.required === true).length
    }

    return {
      sections: payload.sections.length,
      totalItems,
      requiredItems,
      malformed: isMalformed
    }
  }

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
          for (const item of section.items) {
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
      <div className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="space-y-8">
      {/* Header Navigation */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/builder/assets">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to My Assets
          </Link>
        </Button>
        <div className="text-xs text-muted-foreground">
          Builder / My Assets / Asset Detail
        </div>
      </div>

      {/* Title and Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{getAssetTypeName()}</Badge>
          {asset?.payload?.generatedBy && (
            <Badge variant="secondary" className="text-xs">
              {asset.payload.generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">Workspace Draft</span>
        </div>
        
        {isEditMode ? (
          <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
            {/* Title/summary inputs are shown for non-single_guide assets.
                For single_guide, SingleGuideEditor renders its own title/summary fields. */}
            {asset?.assetType !== "single_guide" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-2xl font-bold"
                    placeholder="Asset title..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Summary</label>
                  <textarea
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

            {/* Checklist: Edit Sections & Items */}
            {asset?.assetType === "checklist" && editPayload && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Completion Criteria (one per line)</label>
                  <textarea
                    value={editPayload.completionCriteria?.join('\n') || ''}
                    onChange={(e) => {
                      setEditPayload({
                        ...editPayload,
                        completionCriteria: e.target.value.split('\n').filter(c => c.trim()),
                      })
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm font-mono"
                    placeholder="Enter one completion criterion per line..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Assumptions (one per line)</label>
                  <textarea
                    value={editPayload.assumptions?.join('\n') || ''}
                    onChange={(e) => {
                      setEditPayload({
                        ...editPayload,
                        assumptions: e.target.value.split('\n').filter(a => a.trim()),
                      })
                    }}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm font-mono"
                    placeholder="Enter one assumption per line..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Sections</label>
                  <div className="space-y-4">
                    {editPayload.sections?.map((section: any, sIdx: number) => (
                      <Card key={sIdx} className="p-3 border-blue-500/30">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...editPayload.sections]
                              newSections[sIdx].title = e.target.value
                              setEditPayload({ ...editPayload, sections: newSections })
                            }}
                            className="w-full px-2 py-1 border border-border rounded text-sm font-semibold bg-background"
                            placeholder={`Section ${sIdx + 1} title...`}
                          />
                          <div className="space-y-2 ml-2">
                            {section.items?.map((item: any, iIdx: number) => (
                              <div key={iIdx} className="space-y-1 p-2 bg-muted/20 rounded">
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(e) => {
                                    const newSections = [...editPayload.sections]
                                    newSections[sIdx].items[iIdx].label = e.target.value
                                    setEditPayload({ ...editPayload, sections: newSections })
                                  }}
                                  className="w-full px-1 py-1 border border-border rounded text-xs bg-background"
                                  placeholder="Item label..."
                                />
                                {item.description && (
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const newSections = [...editPayload.sections]
                                      newSections[sIdx].items[iIdx].description = e.target.value
                                      setEditPayload({ ...editPayload, sections: newSections })
                                    }}
                                    className="w-full px-1 py-1 border border-border rounded text-xs bg-background text-muted-foreground"
                                    placeholder="Item description (optional)..."
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setEditTitle(asset?.title || "")
                  setEditSummary(asset?.summary || "")
                  setEditPayload(JSON.parse(JSON.stringify(asset?.payload)))
                  setIsEditMode(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">{asset?.title}</h1>
            {asset?.summary && (
              <p className="text-base text-muted-foreground">{asset.summary}</p>
            )}
          </>
        )}
      </div>

      {/* Save Message */}
      {saveMessage && (
        <Card className={`p-4 ${saveMessage.type === 'success' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {saveMessage.text}
          </p>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Card className="p-6 border-red-500/30 bg-red-500/5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Delete this asset draft?</h3>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  This cannot be undone. The draft and all its content will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-red-500/20">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Draft"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Metadata Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Created
          </p>
          <p className="text-sm font-medium">{new Date(asset.createdAt).toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Last Updated
          </p>
          <p className="text-sm font-medium">{new Date(asset.updatedAt).toLocaleString()}</p>
        </Card>
      </div>

      {/* Checklist Summary Card */}
      {asset.assetType === "checklist" && (
        <Card className="p-6 border-blue-500/20 bg-blue-500/5">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Checklist Overview</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Sections</p>
                <p className="text-2xl font-bold text-foreground">{getChecklistStats().sections}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{getChecklistStats().totalItems}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Required Items</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{getChecklistStats().requiredItems}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Source</p>
                <p className="text-sm font-medium capitalize">
                  {asset?.payload?.generatedBy === "openai" ? "AI Generated" : asset?.payload?.generatedBy === "mock" ? "Mock Preview" : asset?.source || "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Asset Content Preview */}
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Asset Content</h2>

          {asset.assetType === "single_guide" && (
            <SingleGuideEditor
              value={asset.payload as GeneratedSingleGuide}
              onChange={() => {}}
              mode="preview"
              showModeTabs={false}
            />
          )}

          {asset.assetType === "recipe" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
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
              </div>
            </div>
          )}

          {asset.assetType === "checklist" && (
            <div className="space-y-6">
              {/* Checklist Statistics */}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-muted-foreground">Sections</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{getChecklistStats().sections}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <ListTodo className="size-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-muted-foreground">Total Items</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{getChecklistStats().totalItems}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckSquare2 className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span className="text-xs font-semibold text-muted-foreground">Required</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{getChecklistStats().requiredItems}</p>
                </div>
              </div>

              {/* Malformed Data Alert */}
              {getChecklistStats().malformed && (
                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-100">Malformed Checklist Data</p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        Some sections or items are missing expected fields. Edit the asset to correct the structure.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Completion Criteria */}
              {asset.payload.completionCriteria && asset.payload.completionCriteria.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Completion Criteria</h3>
                  <ul className="space-y-1">
                    {asset.payload.completionCriteria.map((criterion, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">✓</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sections with Items */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Checklist Sections</h3>
                {asset.payload.sections && Array.isArray(asset.payload.sections) && asset.payload.sections.length > 0 ? (
                  <div className="space-y-3">
                    {asset.payload.sections.map((section, sIdx) => {
                      const itemCount = Array.isArray(section?.items) ? section.items.length : 0
                      const requiredCount = Array.isArray(section?.items) ? section.items.filter((item: any) => item?.required === true).length : 0
                      return (
                        <div key={sIdx} className="border border-border rounded-lg overflow-hidden">
                          <div className="bg-muted/40 px-4 py-3 border-b border-border">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-foreground">{section?.title || `Section ${sIdx + 1}`}</h4>
                              <div className="flex gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-background text-muted-foreground">
                                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                                </span>
                                {requiredCount > 0 && (
                                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                    {requiredCount} required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            {itemCount > 0 ? (
                              <ul className="space-y-2">
                                {section.items.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start gap-3 text-sm">
                                    <div className="flex-shrink-0 mt-1">
                                      <input
                                        type="checkbox"
                                        disabled
                                        className="w-4 h-4 rounded border-border"
                                        aria-label="Checklist item"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-foreground">{item?.label || '(untitled item)'}</span>
                                        {item?.required && (
                                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                      {item?.description && (
                                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No items in this section</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="p-6 text-center border-dashed">
                    <AlertCircle className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" aria-hidden="true" />
                    <p className="text-muted-foreground">No sections found in this checklist</p>
                  </Card>
                )}
              </div>

              {/* Assumptions */}
              {asset.payload.assumptions && asset.payload.assumptions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Assumptions</h3>
                  <ul className="space-y-1">
                    {asset.payload.assumptions.map((assumption, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                        <span>{assumption}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Future Actions */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Coming soon:</strong> You'll be able to attach this asset to a network, convert it to a full guide, or publish it separately.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/builder/assets">Back to Assets</Link>
        </Button>
        {!isEditMode && (
          <Button onClick={() => setIsEditMode(true)} variant="default">
            Edit Asset
          </Button>
        )}
        {!showDeleteConfirm && (
          <Button
            variant="destructive"
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
