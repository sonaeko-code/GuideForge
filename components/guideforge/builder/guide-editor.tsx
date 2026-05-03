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
import { StatusBadge, DifficultyBadge } from "@/components/guideforge/shared"
import { MOCK_HUBS } from "@/lib/guideforge/mock-data"
import { generateAlternateSectionContent, suggestMockForgeRules } from "@/lib/guideforge/mock-generator"
import { saveGuideDraft, deleteDraft, updateDraftStatus } from "@/lib/guideforge/guide-drafts-storage"
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

  // Autosave effect - debounced by 300ms, only saves after user edits
  useEffect(() => {
    // Skip autosave if guide is published
    if (guideStatus === "published") {
      console.log("[v0] Autosave skipped: guide is published")
      return
    }
    
    // Skip autosave on initial load before user has edited anything
    if (!hasHydratedRef.current || !userEditedRef.current) {
      console.log("[v0] Autosave skipped initial load: hydrated=", hasHydratedRef.current, "userEdited=", userEditedRef.current)
      return
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    // Show "Saving..." when changes are detected after hydration
    console.log("[v0] Autosave triggered by user edit")
    console.log("[v0] Autosave toast state changed: saving")
    setAutosaveStatus("saving")

    // Set a minimum visibility timer for "Saving" state (700ms)
    const savingStartTime = Date.now()
    const minSavingDuration = 700

    // Set new timer
    autosaveTimerRef.current = setTimeout(() => {
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

      console.log("[v0] Guide save mode:", {
        guideId: updatedGuide.id,
        isUuid: updatedGuide.id?.includes("-") && updatedGuide.id?.length === 36,
        collectionId: updatedGuide.collectionId,
        slug: updatedGuide.slug,
        saveMode: updatedGuide.id && updatedGuide.id !== "new" ? "update" : "insert",
      })
      console.log("[v0] Guide save payload:", {
        id: updatedGuide.id,
        title: updatedGuide.title,
        collectionId: updatedGuide.collectionId,
        slug: updatedGuide.slug,
        requirements: updatedGuide.requirements?.length || 0,
        stepsCount: updatedGuide.steps?.length || 0,
      })
      setSaveError(null)
      ;(async () => {
        try {
          const { source, error } = await saveGuideDraft(updatedGuide)
          const elapsed = Date.now() - savingStartTime
          const remainingMinDuration = Math.max(0, minSavingDuration - elapsed)
          
          setSaveSource(source)
          setLastSaved(new Date())
          
          // Show actual error if Supabase save failed
          if (source === "supabase") {
            setSaveError(null)
            
            // Wait for minimum saving duration, then show "Saved"
            if (remainingMinDuration > 0) {
              setTimeout(() => {
                setAutosaveStatus("saved")
                console.log("[v0] Autosave completed: saved to Supabase")
                console.log("[v0] Autosave toast state changed: saved")
                
                // Keep "Saved" for at least 2000ms
                if (autosaveStatusTimeoutRef.current) {
                  clearTimeout(autosaveStatusTimeoutRef.current)
                }
                autosaveStatusTimeoutRef.current = setTimeout(() => {
                  setAutosaveStatus("idle")
                  console.log("[v0] Autosave idle: returning to idle state")
                  console.log("[v0] Autosave toast state changed: idle")
                }, 2000)
              }, remainingMinDuration)
            } else {
              setAutosaveStatus("saved")
              console.log("[v0] Autosave completed: saved to Supabase")
              console.log("[v0] Autosave toast state changed: saved")
              
              // Keep "Saved" for at least 2000ms
              if (autosaveStatusTimeoutRef.current) {
                clearTimeout(autosaveStatusTimeoutRef.current)
              }
              autosaveStatusTimeoutRef.current = setTimeout(() => {
                setAutosaveStatus("idle")
                console.log("[v0] Autosave idle: returning to idle state")
                console.log("[v0] Autosave toast state changed: idle")
              }, 2000)
            }
          } else if (error) {
            // Display specific error message based on error type
            let errorMessage = error
            if (error.includes("23505")) {
              errorMessage = "Save failed: another guide in this collection already uses this slug."
            } else if (error.includes("collection_id is missing")) {
              errorMessage = "Cannot save guide because no collection is selected."
            } else if (error.includes("Supabase")) {
              errorMessage = `Supabase save failed: ${error}`
            }
            setSaveError(errorMessage)
            
            // Ensure minimum saving visibility even on error
            if (remainingMinDuration > 0) {
              setTimeout(() => {
                setAutosaveStatus("failed")
                console.log("[v0] Autosave toast state changed: failed")
              }, remainingMinDuration)
            } else {
              setAutosaveStatus("failed")
              console.log("[v0] Autosave toast state changed: failed")
            }
          } else {
            setSaveError("Saved locally — Supabase save failed")
            
            // Ensure minimum saving visibility
            if (remainingMinDuration > 0) {
              setTimeout(() => {
                setAutosaveStatus("failed")
                console.log("[v0] Autosave toast state changed: failed")
              }, remainingMinDuration)
            } else {
              setAutosaveStatus("failed")
              console.log("[v0] Autosave toast state changed: failed")
            }
          }
        } catch (error) {
          console.error("[v0] Autosave error:", error)
          const elapsed = Date.now() - savingStartTime
          const remainingMinDuration = Math.max(0, minSavingDuration - elapsed)
          
          setSaveError(`Save error: ${error instanceof Error ? error.message : "Unknown error"}`)
          
          // Ensure minimum saving visibility
          if (remainingMinDuration > 0) {
            setTimeout(() => {
              setAutosaveStatus("failed")
              console.log("[v0] Autosave toast state changed: failed")
            }, remainingMinDuration)
          } else {
            setAutosaveStatus("failed")
            console.log("[v0] Autosave toast state changed: failed")
          }
        } finally {
          setIsSaving(false)
        }
      })()
    }, 300)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [title, summary, requirementsText, steps, version, guideStatus])

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
  const currentStep = steps && steps.length > 0 ? steps.find((s) => s.id === editingStepId) : undefined
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
    console.log("[v0] Mark Ready status before:", guideStatus)
    
    // Check if validation is stale
    if (rulesStale) {
      setMarkReadyError(true)
      setTimeout(() => setMarkReadyError(false), 3000)
      return
    }

    // Check if REQUIRED Forge Rules pass
    if (rulesCheckResult && rulesCheckResult.length > 0) {
      const requiredFailures = rulesCheckResult.filter(
        (r: any) => !r.passed && (r.required !== false)
      )
      if (requiredFailures.length > 0) {
        console.log("[v0] Mark Ready blocked by required failures:", requiredFailures)
        setMarkReadyError(true)
        setTimeout(() => setMarkReadyError(false), 3000)
        return
      }
    }
    
    // Cancel any pending autosave before changing status
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    
    // Normalize requirements from textarea for save
    const requirementsArray = requirementsText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // Update status to "ready"
    setGuideStatus("ready")
    console.log("[v0] Mark Ready status after: ready")
    
    // Update status to "ready" in Supabase
    const updatedGuide: Guide = {
      ...guide,
      title,
      summary,
      requirements: requirementsArray,
      steps,
      version,
      status: "ready",
      updatedAt: new Date().toISOString(),
      forgeRulesCheckResult: rulesCheckResult as any,
      forgeRulesCheckTimestamp: rulesCheckTimestamp || undefined,
    }
    
    console.log("[v0] Mark Ready guide id:", guide.id)
    console.log("[v0] Autosave triggered by: Mark Ready button")
    setAutosaveStatus("saving")
    console.log("[v0] Autosave indicator state: saving")
    
    const { source } = await saveGuideDraft(updatedGuide)
    console.log("[v0] Mark Ready save source:", source)
    console.log("[v0] Mark Ready save result:", { source, guideId: guide.id, status: "ready" })
    
    setSaveSource(source)
    setLastSaved(new Date())
    if (source !== "supabase") {
      setSaveError("Supabase save failed — saved locally instead")
      setAutosaveStatus("failed")
      console.log("[v0] Autosave indicator state: failed")
    } else {
      setSaveError(null)
      setAutosaveStatus("saved")
      console.log("[v0] Autosave indicator state: saved")
      
      // Keep "Saved" status for at least 2 seconds
      if (autosaveStatusTimeoutRef.current) {
        clearTimeout(autosaveStatusTimeoutRef.current)
      }
      autosaveStatusTimeoutRef.current = setTimeout(() => {
        setAutosaveStatus("idle")
        console.log("[v0] Autosave indicator state: idle")
      }, 2000)
    }
    
    setMarkedReady(true)
    
    // Clear confirmation message after 5 seconds
    setTimeout(() => {
      setMarkedReady(false)
    }, 5000)
  }

  const handlePublish = async () => {
    setShowPublishDialog(false)
    setIsPublishing(true)
    
    console.log("[v0] Publishing guide id:", guide.id)
    console.log("[v0] Autosave triggered by: Publish button")
    setAutosaveStatus("saving")
    
    try {
      // Normalize requirements from textarea
      const requirementsArray = requirementsText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)

      // Update guide to published status
      const publishedGuide: Guide = {
        ...guide,
        title,
        summary,
        requirements: requirementsArray,
        steps,
        version,
        status: "published",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        forgeRulesCheckResult: rulesCheckResult as any,
        forgeRulesCheckTimestamp: rulesCheckTimestamp || undefined,
      }

      const { source } = await saveGuideDraft(publishedGuide)
      console.log("[v0] Publish save result:", { source, guideId: guide.id, status: "published" })
      
      setSaveSource(source)
      setLastSaved(new Date())
      
      if (source === "supabase") {
        setSaveError(null)
        setGuideStatus("published")
        setAutosaveStatus("saved")
        console.log("[v0] Autosave indicator state: saved")
        setPublishedMessage(true)
        
        // Keep "Saved" visible for 2 seconds
        setTimeout(() => {
          setAutosaveStatus("idle")
          console.log("[v0] Autosave indicator state: idle")
        }, 2000)
        
        // Clear published message after 5 seconds
        setTimeout(() => {
          setPublishedMessage(false)
        }, 5000)
      } else {
        setSaveError("Supabase publish failed — saved locally instead")
        setAutosaveStatus("failed")
        console.log("[v0] Autosave indicator state: failed")
      }
    } catch (error) {
      console.error("[v0] Publish error:", error)
      setSaveError(`Publish error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setAutosaveStatus("failed")
      console.log("[v0] Autosave indicator state: failed")
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
              <span>Saving changes...</span>
              <span className="text-xs opacity-75 ml-2">[saving]</span>
            </>
          )}
          {autosaveStatus === "saved" && (
            <>
              <CheckCircle2 className="size-4" />
              <span>Saved to Supabase</span>
              <span className="text-xs opacity-75 ml-2">[saved]</span>
            </>
          )}
          {autosaveStatus === "failed" && (
            <>
              <AlertCircle className="size-4" />
              <span>Save failed</span>
              <span className="text-xs opacity-75 ml-2">[failed]</span>
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
            {isDraft && (
              <div className="flex gap-2 ml-auto items-center">
                {/* Persistent autosave status indicator */}
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
                      <div className="inline-flex">
                        <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      </div>
                      <span>Saving...</span>
                    </>
                  )}
                  {autosaveStatus === "saved" && (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      <span>Saved to Supabase</span>
                    </>
                  )}
                  {autosaveStatus === "failed" && (
                    <>
                      <AlertCircle className="size-4" aria-hidden="true" />
                      <span>Save failed</span>
                    </>
                  )}
                  {autosaveStatus === "idle" && (
                    <>
                      <div className="h-1.5 w-1.5 rounded-full bg-current" />
                      <span>Idle</span>
                    </>
                  )}
                </div>

                {/* Error details when save fails */}
                {autosaveStatus === "failed" && saveError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                    {saveError}
                  </div>
                )}

                {/* Dev debug info */}
                <button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  title="Toggle Supabase configuration debug info"
                >
                  {showDebugInfo ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  Config
                </button>

                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button size="sm" onClick={handlePublishDraft} disabled={isReady}>
                  <CheckCircle2 className="size-4 mr-1" aria-hidden="true" />
                  {isReady ? "Ready" : "Mark Ready"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Ready state actions */}
            {isReady && (
              <div className="flex gap-2 ml-auto items-center">
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Ready to publish
                </div>
                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button size="sm" onClick={() => setShowPublishDialog(true)} disabled={isPublishing}>
                  <CheckCircle2 className="size-4 mr-1" aria-hidden="true" />
                  {isPublishing ? "Publishing..." : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}

            {/* Published state actions */}
            {isPublished && (
              <div className="flex gap-2 ml-auto items-center">
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Published to QuestLine
                </div>
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
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 ml-auto">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Guide published to QuestLine.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
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
            </TabsContent>

            {/* Section editor */}
            <TabsContent value="editor" className="space-y-4">
              {currentStep && (
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
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
