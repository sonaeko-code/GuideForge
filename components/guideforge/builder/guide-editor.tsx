"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, Send, Sparkles, CheckCircle2, RefreshCw, Save, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  
  const [title, setTitle] = useState(normalizedGuide.title || "")
  const [summary, setSummary] = useState(normalizedGuide.summary || "")
  const [requirementsText, setRequirementsText] = useState(normalizedGuide.requirements.join("\n") || "")
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
  
  // Debounce autosave timer
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Autosave effect - debounced by 300ms
  useEffect(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

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
        updatedAt: new Date().toISOString(),
      }
      setIsSaving(true)
      setSaveError(null)
      ;(async () => {
        try {
          const { source, error } = await saveGuideDraft(updatedGuide)
          setSaveSource(source)
          setLastSaved(new Date())
          
          // Show actual error if Supabase save failed
          if (source === "supabase") {
            setSaveError(null)
          } else if (error) {
            setSaveError(`Supabase save failed: ${error}`)
          } else {
            setSaveError("Supabase save failed — saved locally instead")
          }
        } catch (error) {
          console.error("[v0] Autosave error:", error)
          setSaveError(`Save error: ${error instanceof Error ? error.message : "Unknown error"}`)
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
  }, [title, summary, requirementsText, steps, version, normalizedGuide])

  // Mock state tracking for draft/ready/published flow
  const isDraft = normalizedGuide.status === "draft"
  const isReady = normalizedGuide.status === "ready"
  const isPublished = normalizedGuide.status === "published"

  // Safe .find() with defensive chaining
  const currentStep = steps && steps.length > 0 ? steps.find((s) => s.id === editingStepId) : undefined
  const allStepsHaveContent = steps && steps.length > 0 ? steps.every((s) => s.title.trim() && s.body.trim()) : false

  const handleApplyForgeRules = async () => {
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
    
    // Perform deterministic validation
    const results = validateForgeRules(currentGuide, forgeRules.rules)
    const checkTimestamp = Date.now()

    setRulesCheckResult(results)
    setRulesCheckTimestamp(checkTimestamp)
    setRulesApplied(true)
    setRulesStale(false)
    
    const updatedGuide: Guide = {
      ...currentGuide,
      forgeRulesCheckResult: results as any,
      forgeRulesCheckTimestamp: checkTimestamp,
    }
    const { source } = await saveGuideDraft(updatedGuide)
    setSaveSource(source)
    setLastSaved(new Date())
    if (source !== "supabase") {
      setSaveError("Supabase save failed — saved locally instead")
    } else {
      setSaveError(null)
    }
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
    setSteps(updatedSteps)
    setRegeneratedSections(new Set([...regeneratedSections, stepId]))
    
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
    // Check if validation is stale
    if (rulesStale) {
      setMarkReadyError(true)
      setTimeout(() => setMarkReadyError(false), 3000)
      return
    }

    // Check if Forge Rules pass
    if (rulesCheckResult && rulesCheckResult.length > 0) {
      const allPassed = rulesCheckResult.every((r: any) => r.passed)
      if (!allPassed) {
        setMarkReadyError(true)
        setTimeout(() => setMarkReadyError(false), 3000)
        return
      }
    }
    
    // Update status to "ready" in Supabase
    const updatedGuide: Guide = {
      ...guide,
      title,
      summary,
      steps,
      version,
      status: "ready",
      updatedAt: new Date().toISOString(),
      forgeRulesCheckResult: rulesCheckResult as any,
      forgeRulesCheckTimestamp: rulesCheckTimestamp || undefined,
    }
    const { source } = await saveGuideDraft(updatedGuide)
    setSaveSource(source)
    setLastSaved(new Date())
    if (source !== "supabase") {
      setSaveError("Supabase save failed — saved locally instead")
    } else {
      setSaveError(null)
    }
    await updateDraftStatus(guide.id, "ready")
    setMarkedReady(true)
    
    // Clear confirmation message after 3 seconds
    setTimeout(() => {
      setMarkedReady(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-background">
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

            {/* Draft action buttons */}
            {isDraft && (
              <div className="flex gap-2 ml-auto">
                {saveError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded">
                    <div className="size-2 rounded-full bg-red-500" />
                    {saveError}
                  </div>
                )}
                {lastSaved && !saveError && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    {saveSource === "supabase" ? "Saved to Supabase" : "Saved locally"}
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
                {markedReady && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Guide marked ready. Public publishing will be enabled after Supabase is connected.
                  </div>
                )}
                {markReadyError && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <div className="size-4 rounded-full border border-current" />
                    {rulesStale 
                      ? "Rules check is stale. Re-check before marking ready."
                      : "This guide needs to pass all Forge Rules before it can be marked ready."
                    }
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" aria-hidden="true" />
                  Preview
                </Button>
                <Button size="sm" onClick={handlePublishDraft}>
                  <CheckCircle2 className="size-4 mr-1" aria-hidden="true" />
                  Mark Ready
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
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
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 border border-border/50 bg-muted/40 text-2xl font-semibold rounded-md focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Guide title"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-2 border border-border/50 bg-muted/40 text-sm rounded-md focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Brief description of what readers will learn..."
                rows={2}
              />
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid gap-3 pt-2 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Difficulty
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {guide.difficulty.charAt(0).toUpperCase() + guide.difficulty.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patch / Version
              </p>
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. Patch 4.2"
                className="mt-1 h-8 border border-border/50 bg-muted/40 text-sm rounded focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </p>
              <p className="mt-1 text-sm font-medium capitalize text-foreground">
                {guide.type.replace("-", " ")}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            <DifficultyBadge difficulty={guide.difficulty} />
            <Badge variant="secondary" className="text-xs">
              {guide.type.replace("-", " ")}
            </Badge>
          </div>
        </div>

        {/* Debug Config Panel */}
        {showDebugInfo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3 space-y-2 text-xs font-mono">
            <div className="font-semibold text-amber-900 dark:text-amber-300">Supabase Configuration Debug</div>
            <div className="space-y-1 text-amber-800 dark:text-amber-200">
              <div>URL present: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ yes" : "✗ no"}</div>
              <div>Anon key present: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✓ yes" : "✗ no"}</div>
              <div>Last save target: {saveSource || "not yet"}</div>
              <div>Adapter: {saveSource === "supabase" ? "Supabase" : "localStorage"}</div>
              <div className="text-xs text-amber-700 dark:text-amber-300 pt-1">
                Check browser console for detailed [v0] logs about configuration detection and adapter selection.
              </div>
            </div>
          </div>
        )}

        {/* Requirements and warnings */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Editable Requirements */}
          <Card className="border-border/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements
              </p>
              {requirementsText.trim().length > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {requirementsText.split("\n").filter(l => l.trim().length > 0).length} item{requirementsText.split("\n").filter(l => l.trim().length > 0).length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <textarea
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder="Add requirements here, one per line:&#10;• Level 30+&#10;• Completion of main questline"
              className="w-full h-24 p-2 text-sm rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              One requirement per line. Leave empty if not applicable.
            </p>
          </Card>

          {normalizedGuide.warnings.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Warnings
              </p>
              <ul className="mt-3 space-y-1">
                {normalizedGuide.warnings.map((warn, idx) => (
                  <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠ {warn}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

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
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">Rules passed — ready for review</p>
                      <p className="mt-1 text-xs text-muted-foreground">{rulesCheckResult.filter((r: any) => r.passed).length}/{rulesCheckResult.length} requirements met</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-0.5 size-5 rounded-full border-2 border-amber-500 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-700 dark:text-amber-300">Rules need attention</p>
                      <p className="mt-1 text-xs text-muted-foreground">{rulesCheckResult.filter((r: any) => r.passed).length}/{rulesCheckResult.length} requirements met</p>
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Fix the missing requirements, then re-check.</p>
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
