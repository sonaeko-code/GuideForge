"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, Send, Sparkles, CheckCircle2, RefreshCw, Save, Trash2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Guide, GuideStep } from "@/lib/guideforge/types"
import { v4 as uuidv4 } from "uuid"
import { StatusBadge, DifficultyBadge } from "@/components/guideforge/shared"
import { MOCK_HUBS } from "@/lib/guideforge/mock-data"
import { generateAlternateSectionContent, suggestMockForgeRules } from "@/lib/guideforge/mock-generator"
import { saveGuideDraft, deleteDraft, updateDraftStatus } from "@/lib/guideforge/guide-drafts-storage"
import { updateGuideStatus } from "@/lib/guideforge/supabase-persistence"
import { validateForgeRules, isValidationStale, type ForgeRulesCheckResult } from "@/lib/guideforge/forge-rules-validator"

interface GuideEditorProps {
  guide: Guide
  networkId: string
}

export function GuideEditor({ guide, networkId }: GuideEditorProps) {
  const router = useRouter()
  // Ensure requirements is always an array
  const normalizedGuide = {
    ...guide,
    requirements: guide.requirements && Array.isArray(guide.requirements) ? guide.requirements : [],
    warnings: guide.warnings && Array.isArray(guide.warnings) ? guide.warnings : [],
  }
  
  // Track hydration to prevent autosave on initial load
  const hasHydratedRef = useRef(false)
  const userEditedRef = useRef(false)
  
  // Snapshot-based change detection to prevent flickering saves
  const lastSavedSnapshotRef = useRef<string | null>(null)
  const currentSnapshotRef = useRef<string | null>(null)
  
  const [title, setTitle] = useState(normalizedGuide.title || "")
  const [summary, setSummary] = useState(normalizedGuide.summary || "")
  const [requirementsText, setRequirementsText] = useState(normalizedGuide.requirements.join("\n") || "")
  const [guideStatus, setGuideStatus] = useState(normalizedGuide.status ?? "draft")
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [steps, setSteps] = useState(normalizedGuide.steps || [])
  const [version, setVersion] = useState(normalizedGuide.version || "")
  const [rulesApplied, setRulesApplied] = useState(false)
  const [rulesCheckResult, setRulesCheckResult] = useState<ForgeRulesCheckResult[] | null>(null)
  const [rulesCheckTimestamp, setRulesCheckTimestamp] = useState<number | null>(null)
  const [rulesStale, setRulesStale] = useState(false)
  const [regeneratedSections, setRegeneratedSections] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveSource, setSaveSource] = useState<"supabase" | "localStorage" | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [markedReady, setMarkedReady] = useState(false)
  const [markReadyError, setMarkReadyError] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedMessage, setPublishedMessage] = useState(false)
  
  // Autosave status tracking
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle")
  const autosaveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Debounce autosave timer
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Mark hydration complete on mount
  useEffect(() => {
    console.log("[v0] Guide editor hydrated: initial state loaded, autosave disabled until user edit")
    hasHydratedRef.current = true
    userEditedRef.current = false
  }, [])

  // Autosave effect - debounced by 1500ms, only saves if snapshot changed
  // Uses snapshot comparison to prevent unnecessary saves and indicator flicker
  useEffect(() => {
    // Skip autosave on initial load before user has edited anything
    if (!hasHydratedRef.current || !userEditedRef.current) {
      console.log("[v0] Autosave skipped initial load: hydrated=", hasHydratedRef.current, "userEdited=", userEditedRef.current)
      return
    }

    // Create a snapshot of current state
    const snapshot = JSON.stringify({ title, summary, requirementsText, steps, guideStatus })
    currentSnapshotRef.current = snapshot
    
    // Skip save if nothing changed since last save
    if (lastSavedSnapshotRef.current === snapshot) {
      console.log("[v0] Autosave skipped: no changes since last save")
      return
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    // Only show "Saving..." if we're actually going to save (debounce before displaying)
    // Set new timer with 1500ms debounce
    autosaveTimerRef.current = setTimeout(() => {
      // Re-check snapshot hasn't changed again while waiting
      const finalSnapshot = JSON.stringify({ title, summary, requirementsText, steps, guideStatus })
      if (lastSavedSnapshotRef.current === finalSnapshot) {
        console.log("[v0] Autosave cancelled: changes reverted")
        return
      }
      
      // NOW show "Saving..." since we're truly going to save
      console.log("[v0] Autosave triggered by user edit")
      setAutosaveStatus("saving")

      // Normalize requirements from textarea (one per line)
      const requirementsArray = requirementsText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)

      const updatedGuide: Guide = {
        ...normalizedGuide,
        title,
        summary,
        requirements: requirementsArray,
        steps,
        version,
        status: guideStatus,
        updatedAt: new Date().toISOString(),
      }

      console.log("[v0] Guide save requested:", {
        guideId: updatedGuide.id,
        status: updatedGuide.status,
        saveMode: updatedGuide.id && updatedGuide.id !== "new" ? "update" : "insert",
        hasCollectionId: !!updatedGuide.collectionId,
        hasSections: (updatedGuide.steps?.length ?? 0) > 0,
        sectionCount: updatedGuide.steps?.length ?? 0,
        isPublished: updatedGuide.status === "published",
        isReady: updatedGuide.status === "ready",
      })
      setSaveError(null)
      ;(async () => {
        try {
          const { source, error } = await saveGuideDraft(updatedGuide)
          console.log("[v0] Guide save Supabase result:", {
            success: source === "supabase",
            source,
            errorCode: error ? (error.match(/^(\w+):/) || [])[1] || "unknown" : null,
            errorMessage: error || null,
          })
          
          setSaveSource(source)
          setLastSaved(new Date())
          
          // Show actual error if Supabase save failed
          if (source === "supabase") {
            setSaveError(null)
            setAutosaveStatus("saved")
            
            // Update snapshot to reflect saved state
            lastSavedSnapshotRef.current = finalSnapshot
            console.log("[v0] Autosave completed: saved to Supabase")
            
            // Keep "Saved" for at least 2000ms
            if (autosaveStatusTimeoutRef.current) {
              clearTimeout(autosaveStatusTimeoutRef.current)
            }
            autosaveStatusTimeoutRef.current = setTimeout(() => {
              setAutosaveStatus("idle")
              console.log("[v0] Autosave idle: returning to idle state")
            }, 2000)
          } else {
            setSaveError(error ? `Autosave failed: ${error}` : "Autosave failed — localStorage only")
            setAutosaveStatus("failed")
          }
        } catch (error) {
          console.error("[v0] Autosave error:", error)
          setSaveError(error instanceof Error ? error.message : "Autosave failed")
          setAutosaveStatus("failed")
        }
      })()
    }, 1500)  // 1500ms debounce
    
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [title, summary, requirementsText, steps, guideStatus])

  // Initialize snapshot on mount
  useEffect(() => {
    const initialSnapshot = JSON.stringify({ title, summary, requirementsText, steps, guideStatus })
    lastSavedSnapshotRef.current = initialSnapshot
    currentSnapshotRef.current = initialSnapshot
    hasHydratedRef.current = true
  }, [])

  // Mark guide as edited when user changes content
  const markDirty = () => {
    if (!userEditedRef.current) {
      console.log("[v0] User marked guide dirty: first edit detected")
      userEditedRef.current = true
    }
  }
  
  // Mock state tracking for draft/ready/published flow
  const isDraft = guideStatus === "draft"
  const isReady = guideStatus === "ready"
  const isPublished = guideStatus === "published"

  // Safe .find() with defensive chaining
  const handleAddSection = async () => {
    console.log("[v0] Adding new section to guide:", normalizedGuide.id)
    const newStep: GuideStep = {
      id: uuidv4(),
      guideId: normalizedGuide.id,
      order: steps.length,
      kind: "custom",
      title: "New Section",
      body: "",
      isSpoiler: false,
    }
    
    const updatedSteps = [...steps, newStep]
    setSteps(updatedSteps)
    setEditingStepId(newStep.id)
    markDirty()
    
    // Persist to Supabase by triggering autosave
    // The autosave handler will save the guide with the new steps
    console.log("[v0] Section added, marking dirty for autosave persistence")
  }
  const allStepsHaveContent = steps && steps.length > 0 ? steps.every((s) => s.title.trim() && s.body.trim()) : false

  const handleApplyForgeRules = async () => {
    console.log("[v0] Forge Rules Re-check: validation only, no save")
    
    // Normalize requirements from textarea
    const requirementsArray = requirementsText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // Get the complete guide object
    const currentGuide: Guide = {
      ...normalizedGuide,
      title,
      summary,
      requirements: requirementsArray,
      steps,
      version,
      updatedAt: new Date().toISOString(),
    }

    // Get available rules
    const forgeRules = suggestMockForgeRules("gaming")
    
    // Perform deterministic validation only — do NOT save
    const results = validateForgeRules(currentGuide, forgeRules.rules)
    const checkTimestamp = Date.now()

    setRulesCheckResult(results)
    setRulesCheckTimestamp(checkTimestamp)
    setRulesApplied(true)
    setRulesStale(false)
    
    console.log("[v0] Forge Rules validation complete:", {
      passed: results.filter((r: any) => r.passed).length,
      failed: results.filter((r: any) => !r.passed).length,
      total: results.length,
    })
  }

  // Check if validation needs refreshing when content changes
  useEffect(() => {
    if (rulesApplied && rulesCheckTimestamp) {
      const stale = isValidationStale(guide, rulesCheckResult || undefined, rulesCheckTimestamp)
      setRulesStale(stale)
    }
  }, [title, summary, version, steps, rulesApplied, rulesCheckTimestamp, rulesCheckResult, guide])

  const handleRegenerateSection = (stepId: string) => {
    const updatedSteps = steps.map(s => 
      s.id === stepId 
        ? { ...s, body: generateAlternateSectionContent(s.kind) }
        : s
    )
    markDirty()
    setSteps(updatedSteps)
    setRegeneratedSections(new Set([...regeneratedSections, stepId]))
    
    // Trigger autosave status on regenerate
    console.log("[v0] Autosave triggered by regenerate: user regenerated section")
    setAutosaveStatus("saving")
    console.log("[v0] Autosave indicator state: saving")
    
    // Clear the highlight after 2 seconds
    setTimeout(() => {
      setRegeneratedSections(prev => {
        const next = new Set(prev)
        next.delete(stepId)
        return next
      })
    }, 2000)
  }

  const handlePreview = () => {
    router.push(`/builder/network/${networkId}/guide/${guide.id}/preview`)
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this draft? This cannot be undone.")) {
      await deleteDraft(guide.id)
      router.push(`/builder/network/${networkId}/dashboard`)
    }
  }

  const handlePublishDraft = async () => {
    // Forge rules validation before status transition
    const rulesErrors = rulesCheckResult?.filter((r) => r.severity === "error") ?? []
    if (rulesErrors.length > 0) {
      console.log("[v0] Status transition blocked: draft → ready (forge rules errors)")
      setMarkReadyError(true)
      setTimeout(() => setMarkReadyError(false), 3000)
      setSaveError("Cannot mark ready: Forge Rules have errors. Please fix them first.")
      return
    }
    
    console.log("[v0] Status transition requested: draft → ready")
    setMarkReadyError(false)
    setAutosaveStatus("saving")
    
    try {
      // Call updateGuideStatus to atomically update the guide status in Supabase
      const result = await updateGuideStatus(normalizedGuide.id, "ready")
      
      if (!result.success) {
        console.error("[v0] Mark Ready failed:", result.error)
        setSaveError(`Mark Ready failed: ${result.error}`)
        setAutosaveStatus("failed")
        return
      }
      
      // Success! Update local state from the returned guide data
      if (result.guide) {
        console.log("[v0] Mark Ready succeeded, updating local state from Supabase response")
        setGuideStatus("ready")
        setSaveError(null)
        setAutosaveStatus("saved")
        setMarkedReady(true)
        
        // Clear the indicator after a delay
        setTimeout(() => {
          setAutosaveStatus("idle")
        }, 2000)
        
        setTimeout(() => {
          setMarkedReady(false)
        }, 5000)
      }
    } catch (error) {
      console.error("[v0] Mark Ready error:", error)
      setSaveError(error instanceof Error ? error.message : "Mark Ready failed")
      setAutosaveStatus("failed")
    }
  }

  const handlePublish = async () => {
    setShowPublishDialog(false)
    setIsPublishing(true)
    
    console.log("[v0] Status transition requested: ready → published | guideId:", normalizedGuide.id)
    setAutosaveStatus("saving")
    
    try {
      // Call updateGuideStatus to atomically update the guide status to published
      const result = await updateGuideStatus(normalizedGuide.id, "published")
      
      if (!result.success) {
        console.error("[v0] Publish failed:", result.error)
        setSaveError(`Publish failed: ${result.error}`)
        setAutosaveStatus("failed")
        setIsPublishing(false)
        return
      }
      
      // Success! Update local state from the returned guide data
      if (result.guide) {
        console.log("[v0] Publish succeeded, updating local state from Supabase response")
        setGuideStatus("published")
        setSaveError(null)
        setAutosaveStatus("saved")
        
        // Clear the indicator after a delay
        setTimeout(() => {
          setAutosaveStatus("idle")
        }, 2000)
        
        // Redirect after a brief delay
        setTimeout(() => {
          router.push(`/builder/network/${networkId}/dashboard?tab=published`)
        }, 1000)
      }
    } catch (error) {
      console.error("[v0] Publish error:", error)
      setSaveError(error instanceof Error ? error.message : "Publish failed")
      setAutosaveStatus("failed")
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this guide?</AlertDialogTitle>
            <AlertDialogDescription>
              Published guides will appear on QuestLine public pages and can be seen by everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {/* Fixed autosave toast in top-right corner */}
      <div 
        className={`fixed top-[88px] right-6 z-9999 transition-all duration-300 ${
          autosaveStatus === "idle" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className={`rounded-lg shadow-lg p-3 flex items-center gap-2 text-sm font-medium ${
          autosaveStatus === "saving"
            ? "bg-amber-500 text-white"
            : autosaveStatus === "saved"
            ? "bg-emerald-500 text-white"
            : autosaveStatus === "failed"
            ? "bg-red-500 text-white"
            : "bg-muted text-foreground"
        }`}>
          {autosaveStatus === "saving" && (
            <>
              <div className="inline-flex">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              </div>
              <span>Saving...</span>
            </>
          )}
          {autosaveStatus === "saved" && (
            <>
              <CheckCircle2 className="size-4" />
              <span>Saved to Supabase</span>
            </>
          )}
          {autosaveStatus === "failed" && (
            <>
              <AlertCircle className="size-4" />
              <span>Save failed</span>
            </>
          )}
        </div>
        {autosaveStatus === "failed" && saveError && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {saveError}
          </div>
        )}
      </div>

      {/* Sticky top action bar */}
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost">
              <Link href={`/builder/network/${networkId}/dashboard`}>
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">Guide Editor</p>
              <p className="font-semibold text-foreground truncate max-w-xs">{title || "Untitled"}</p>
            </div>
          </div>
          
          {/* Status indicator and actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {isDraft && (
                <Badge variant="secondary" className="gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-current" />
                  Draft
                </Badge>
              )}
              {isReady && (
                <Badge className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Ready to publish
                </Badge>
              )}
              {isPublished && (
                <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  Published
                </Badge>
              )}
            </div>

            {/* Published guide warning */}
            {isPublished && (
              <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800/50 ml-2">
                <AlertCircle className="size-3" aria-hidden="true" />
                <span>Published guide. Editing changes will update the live guide.</span>
              </div>
            )}

            {/* Draft action buttons */}
            {/* Shared inline save status indicator — shown for all statuses */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              autosaveStatus === "saving"
                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                : autosaveStatus === "saved"
                ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                : autosaveStatus === "failed"
                ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                : "bg-muted text-muted-foreground"
            }`}>
              {autosaveStatus === "saving" && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  <span>Saving...</span>
                </>
              )}
              {autosaveStatus === "saved" && (
                <>
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  <span>Saved to Supabase</span>
                </>
              )}
              {autosaveStatus === "failed" && (
                <>
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  <span>Save failed</span>
                </>
              )}
              {autosaveStatus === "idle" && (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                  <span>{userEditedRef.current ? "Unsaved changes" : "Idle"}</span>
                </>
              )}
            </div>

            {/* Error detail when save fails */}
            {autosaveStatus === "failed" && saveError && (
              <div className="text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate" title={saveError}>
                {saveError}
              </div>
            )}

            {isDraft && (
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublishDraft}
                  className={markReadyError ? "border-red-500 text-red-600" : ""}
                  variant={markReadyError ? "outline" : "default"}
                >
                  <CheckCircle2 className="size-4 mr-1" aria-hidden="true" />
                  {markReadyError ? "Fix required rules first" : "Mark Ready"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Ready state actions */}
            {isReady && (
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button size="sm" onClick={() => setShowPublishDialog(true)} disabled={isPublishing}>
                  <Send className="size-4 mr-1" aria-hidden="true" />
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Published state actions */}
            {isPublished && (
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {publishedMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Guide published.
              </div>
            )}

            {markedReady && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Guide marked ready.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* Metadata Context Header */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/50">
          {/* Guide type */}
          {normalizedGuide.type && (
            <Badge variant="outline" className="capitalize">
              {normalizedGuide.type.replace("-", " ")}
            </Badge>
          )}
          
          {/* Difficulty */}
          {normalizedGuide.difficulty && (
            <DifficultyBadge difficulty={normalizedGuide.difficulty} />
          )}
          
          {/* Audience tags */}
          {normalizedGuide.audience && normalizedGuide.audience.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {normalizedGuide.audience.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Hub/Collection context */}
          {normalizedGuide.hubId && (
            <div className="ml-auto text-xs text-muted-foreground">
              Editing in: {normalizedGuide.hubId} / {normalizedGuide.collectionId}
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => {
                  markDirty()
                  setTitle(e.target.value)
                }}
                className="mt-2 border border-border/50 bg-muted/40 text-2xl font-semibold rounded-md focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Guide title"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary (Short Description)
              </label>
              <Textarea
                value={summary}
                onChange={(e) => {
                  markDirty()
                  setSummary(e.target.value)
                }}
                placeholder="Brief summary of this guide. Shown on guide cards and list pages."
                className="w-full h-20 p-2 text-sm rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none mt-2"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                This summary appears on guide cards and in search results. Keep it concise.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements
              </label>
              <Textarea
                value={requirementsText}
                onChange={(e) => {
                  markDirty()
                  setRequirementsText(e.target.value)
                }}
                placeholder="Add requirements here, one per line:&#10;• Level 30+&#10;• Completion of main questline"
                className="w-full h-24 p-2 text-sm rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                One requirement per line. Leave empty if not applicable.
              </p>
            </div>
          </div>
        </div>

        {(normalizedGuide.warnings ?? []).length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Warnings
            </p>
            <ul className="mt-3 space-y-1">
              {(normalizedGuide.warnings ?? []).map((warn, idx) => (
                <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                  ⚠ {warn}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Forge Rules Applied */}
        <Card className={`p-4 ${rulesStale ? "border-amber-500/30 bg-amber-500/5" : "border-primary/30 bg-primary/5"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Sparkles className={`mt-0.5 size-4 flex-shrink-0 ${rulesStale ? "text-amber-600" : "text-primary"}`} aria-hidden="true" />
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wider ${rulesStale ? "text-amber-700 dark:text-amber-400" : "text-primary"}`}>
                  {!rulesApplied ? "Forge Rules Check" : rulesStale ? "Results Stale — Re-check Needed" : (rulesCheckResult?.every((r: any) => r.passed) ? "Forge Rules Passed" : "Rules Need Attention")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {rulesStale 
                    ? "Content changed since last check. Re-check to validate." 
                    : "Game name, patch/version, difficulty, requirements, beginner summary, spoiler tagging, status."
                  }
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleApplyForgeRules}
              className="flex-shrink-0"
            >
              {rulesApplied ? "Re-check" : "Check Rules"}
            </Button>
          </div>
        </Card>

        {/* Forge Rules Results */}
        {rulesApplied && rulesCheckResult && (
          <Card className={`p-4 ${rulesCheckResult.every((r: any) => r.passed) ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {rulesCheckResult.every((r: any) => r.passed) ? (
                  <>
                    <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">All rules passed — ready for review</p>
                      <p className="mt-1 text-xs text-muted-foreground">{rulesCheckResult.filter((r: any) => r.passed).length}/{rulesCheckResult.length} requirements met</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-0.5 size-5 rounded-full border-2 border-amber-500 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      {(() => {
                        const requiredFailures = rulesCheckResult.filter((r: any) => !r.passed && r.required !== false)
                        const optionalFailures = rulesCheckResult.filter((r: any) => !r.passed && r.required === false)
                        
                        if (requiredFailures.length > 0) {
                          return (
                            <>
                              <p className="font-semibold text-amber-700 dark:text-amber-300">
                                {requiredFailures.length} required rule{requiredFailures.length !== 1 ? "s" : ""} need{requiredFailures.length !== 1 ? "" : "s"} fixing
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{requiredFailures.map((r: any) => r.rule.label).join(", ")}</p>
                              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Fix these required issues to mark ready.</p>
                            </>
                          )
                        } else if (optionalFailures.length > 0) {
                          return (
                            <>
                              <p className="font-semibold text-blue-700 dark:text-blue-300">Optional recommendations remain</p>
                              <p className="mt-1 text-xs text-muted-foreground">{optionalFailures.map((r: any) => r.rule.label).join(", ")}</p>
                              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">These are suggestions but won&apos;t block marking ready.</p>
                            </>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                {rulesCheckResult.map((result: ForgeRulesCheckResult, idx: number) => {
                  const isFailedRequired = !result.passed && result.required !== false
                  const isFailedOptional = !result.passed && result.required === false

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {result.passed ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                        ) : isFailedRequired ? (
                          <div className="size-3.5 rounded-full border border-amber-500 bg-amber-500/10" aria-hidden="true" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-blue-400 bg-blue-400/10" aria-hidden="true" />
                        )}
                        <span className={result.passed ? "text-foreground font-medium" : isFailedRequired ? "text-amber-600 font-medium" : "text-blue-600 dark:text-blue-400 font-medium"}>
                          {result.rule.label}
                          {!result.passed && result.required === false && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
                          )}
                        </span>
                      </div>
                      {result.reason && (
                        <p className={`ml-5 text-xs ${isFailedRequired ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                          {result.reason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Sections Editor */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Guide Sections</h2>
            <Badge variant="outline" className="text-xs">
              {steps.filter(s => s.title.trim() && s.body.trim()).length}/{steps.length} complete
            </Badge>
          </div>

          <Tabs defaultValue="sections" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sections">Edit Sections</TabsTrigger>
              <TabsTrigger value="editor" disabled={!editingStepId}>
                Section Editor
              </TabsTrigger>
            </TabsList>

            {/* Sections list */}
            <TabsContent value="sections" className="space-y-2">
              {steps.map((step) => {
                const isComplete = step.title.trim() && step.body.trim()
                return (
                  <Card
                    key={step.id}
                    className={`cursor-pointer border-border/50 px-4 py-3 transition-all hover:bg-muted/50 ${
                      editingStepId === step.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : ""
                    } ${
                      regeneratedSections.has(step.id)
                        ? "ring-2 ring-emerald-500 bg-emerald-500/5"
                        : ""
                    }`}
                    onClick={() => setEditingStepId(step.id)}
                  >
                      <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isComplete && (
                            <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                          )}
                          <h3 className="font-semibold text-foreground truncate">{step.title || "Untitled section"}</h3>
                        </div>
                        <p className="line-clamp-2 text-sm text-muted-foreground">{step.body || "No content yet..."}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRegenerateSection(step.id)
                          }}
                          title="Regenerate section with alternative content"
                          className={regeneratedSections.has(step.id) ? "text-emerald-600" : ""}
                        >
                          <Sparkles className="size-4 mr-1" aria-hidden="true" />
                          Regenerate
                        </Button>
                        <Badge variant="outline" className="text-xs">
                          {step.kind}
                        </Badge>
                      </div>
                    </div>
                    {regeneratedSections.has(step.id) && (
                      <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Generated draft updated</p>
                    )}
                  </Card>
                )
              })}
              
              {/* Add Section Button */}
              <Card className="border-dashed border-border/50 px-4 py-6 flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleAddSection}>
                <div className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="size-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Add Section</span>
                </div>
              </Card>
            </TabsContent>

            {/* Section editor */}
            <TabsContent value="editor" className="space-y-4">
              {currentStep ? (
                <Card className="border-border/50 p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Section Type
                      </label>
                      <p className="mt-1 text-sm font-medium capitalize text-foreground">
                        {currentStep.kind.replace("-", " ")}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Title
                      </label>
                      <Input
                        value={currentStep.title}
                        onChange={(e) => {
                          markDirty()
                          const updated = { ...currentStep, title: e.target.value }
                          setSteps(steps.map((s) => (s.id === currentStep.id ? updated : s)))
                        }}
                        className="mt-1 border-border/50"
                        placeholder="Section title"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Content
                      </label>
                      <Textarea
                        value={currentStep.body}
                        onChange={(e) => {
                          markDirty()
                          const updated = { ...currentStep, body: e.target.value }
                          setSteps(steps.map((s) => (s.id === currentStep.id ? updated : s)))
                        }}
                        className="mt-1 border-border/50"
                        placeholder="Write your section content..."
                        rows={8}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingStepId(null)}
                      >
                        Back to List
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="border-border/50 p-8 text-center">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">No section selected</p>
                    <p className="text-sm text-muted-foreground">Click a section from the list to edit it, or add a new one.</p>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
