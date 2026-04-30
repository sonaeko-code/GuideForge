"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, Send, Sparkles, CheckCircle2, RefreshCw } from "lucide-react"
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

interface GuideEditorProps {
  guide: Guide
  networkId: string
}

export function GuideEditor({ guide, networkId }: GuideEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(guide.title)
  const [summary, setSummary] = useState(guide.summary)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [steps, setSteps] = useState(guide.steps)
  const [version, setVersion] = useState(guide.version || "")
  const [rulesApplied, setRulesApplied] = useState(false)
  const [rulesCheckResult, setRulesCheckResult] = useState<any>(null)
  const [regeneratedSections, setRegeneratedSections] = useState<Set<string>>(new Set())

  // Mock state tracking for draft/ready/published flow
  const isDraft = guide.status === "draft"
  const isReady = guide.status === "ready"
  const isPublished = guide.status === "published"

  const guideHubSlug = MOCK_HUBS.find((h) => h.id === guide.hubId)?.slug || "emberfall"

  const handlePublish = () => {
    // TODO: Save to Supabase and publish
    router.push(`/n/questline/${guideHubSlug}/${guide.slug}`)
  }

  const handleApplyForgeRules = () => {
    // Mock forge rules check
    const forgeRules = suggestMockForgeRules("gaming")
    const results = forgeRules.rules.map(rule => ({
      ...rule,
      passed: rule.enabled ? Math.random() > 0.2 : true // Mock: 80% pass rate
    }))
    setRulesCheckResult(results)
    setRulesApplied(true)
  }

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
          
          {/* Status indicator */}
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
                className="mt-2 border-0 bg-transparent text-2xl font-semibold"
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
                className="mt-2 border-0 bg-transparent text-sm"
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
                className="mt-1 h-8 border-border/50 text-sm"
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

        {/* Requirements and warnings */}
        <div className="grid gap-4 md:grid-cols-2">
          {guide.requirements.length > 0 && (
            <Card className="border-border/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requirements
              </p>
              <ul className="mt-3 space-y-1">
                {guide.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1 size-1 flex-shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {guide.warnings.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Warnings
              </p>
              <ul className="mt-3 space-y-1">
                {guide.warnings.map((warn, idx) => (
                  <li key={idx} className="text-sm text-amber-700 dark:text-amber-400">
                    ⚠ {warn}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Forge Rules Applied */}
        <Card className="border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Sparkles className="mt-0.5 size-4 text-primary flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {rulesApplied ? "Forge Rules Applied" : "Apply Forge Rules"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Game name, patch/version, difficulty, requirements, beginner summary, spoiler tagging, status.
                </p>
              </div>
            </div>
            {!rulesApplied && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleApplyForgeRules}
                className="flex-shrink-0"
              >
                Apply
              </Button>
            )}
            {rulesApplied && (
              <CheckCircle2 className="size-5 text-primary flex-shrink-0" aria-hidden="true" />
            )}
          </div>
        </Card>

        {/* Forge Rules Results */}
        {rulesApplied && rulesCheckResult && (
          <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Rules passed — ready for review</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rulesCheckResult.filter((r: any) => r.passed).length}/{rulesCheckResult.length} requirements met</p>
                </div>
              </div>
              <div className="space-y-2">
                {rulesCheckResult.map((result: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {result.passed ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <div className="size-3.5 rounded-full border border-amber-500" aria-hidden="true" />
                    )}
                    <span className={result.passed ? "text-foreground" : "text-amber-600"}>
                      {result.name}
                    </span>
                  </div>
                ))}
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
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRegenerateSection(step.id)
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Regenerate section"
                        >
                          <RefreshCw className={`size-4 ${regeneratedSections.has(step.id) ? "text-emerald-600" : ""}`} aria-hidden="true" />
                        </button>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {step.kind}
                      </Badge>
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

        {/* Action bar */}
        <div className="flex gap-3 border-t border-border/50 pt-6">
          <Button asChild variant="outline">
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => router.push(`/n/questline/${guideHubSlug}/${guide.slug}?preview=true`)}>
            <Eye className="mr-2 size-4" aria-hidden="true" />
            Preview
          </Button>
          <Button onClick={handlePublish} disabled={!allStepsHaveContent}>
            <Send className="mr-2 size-4" aria-hidden="true" />
            Publish Guide
          </Button>
        </div>
      </div>
    </div>
  )
}
