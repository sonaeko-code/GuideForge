"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"

interface SingleGuideProposalProps {
  asset: GeneratedSingleGuide
  isSaving: boolean
  saveError: string | null
  onBack: () => void
  onSave: (edited: GeneratedSingleGuide) => void
}

type TabMode = "edit" | "preview"

type EditableStep = {
  title: string
  body: string
  tip: string | null
  warning: string | null
  successCondition: string | null
}

export function SingleGuideProposal({
  asset,
  isSaving,
  saveError,
  onBack,
  onSave,
}: SingleGuideProposalProps) {
  const [mode, setMode] = useState<TabMode>("edit")

  // Editable top-level fields
  const [title, setTitle] = useState(asset.title)
  const [summary, setSummary] = useState(asset.summary)

  // Editable list fields
  const [requirements, setRequirements] = useState<string[]>(asset.requirements ?? [])
  const [assumptions, setAssumptions] = useState<string[]>(asset.assumptions ?? [])

  // Editable steps
  const [steps, setSteps] = useState<EditableStep[]>(
    (asset.steps ?? []).map((s) => ({
      title: s.title,
      body: s.body,
      tip: s.tip,
      warning: s.warning,
      successCondition: s.successCondition,
    }))
  )

  // ---- Step helpers ----

  const updateStep = (idx: number, field: keyof EditableStep, value: string | null) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    )
  }

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { title: "", body: "", tip: null, warning: null, successCondition: null },
    ])
  }

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  // ---- List item helpers ----

  const updateListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number,
    value: string
  ) => {
    setter((prev) => prev.map((v, i) => (i === idx ? value : v)))
  }

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => [...prev, ""])
  }

  const removeListItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number
  ) => {
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  // ---- Save ----

  const handleSave = () => {
    const edited: GeneratedSingleGuide = {
      ...asset,
      title: title.trim() || asset.title,
      summary: summary.trim() || asset.summary,
      requirements,
      assumptions,
      steps: steps.map((s) => ({
        title: s.title,
        body: s.body,
        tip: s.tip || null,
        warning: s.warning || null,
        successCondition: s.successCondition || null,
      })),
    }
    onSave(edited)
  }

  // ---- Shared footer ----

  const footer = (
    <div className="space-y-3 pt-4 border-t border-border">
      {saveError && (
        <Card className="p-3 border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
        </Card>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Saving to Workspace...
            </>
          ) : (
            "Save to Workspace"
          )}
        </Button>
      </div>
    </div>
  )

  // ---- Edit Draft tab ----

  const editView = (
    <div className="space-y-6">
      {/* Title & Summary */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Guide title"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-summary">Summary</Label>
          <Textarea
            id="edit-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="One or two sentences describing what this guide covers."
          />
        </div>
      </div>

      {/* Requirements */}
      {(requirements.length > 0 || asset.hasPrerequisites) && (
        <div className="space-y-2">
          <Label>Requirements / Prerequisites</Label>
          {requirements.map((req, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={req}
                onChange={(e) => updateListItem(setRequirements, idx, e.target.value)}
                placeholder={`Requirement ${idx + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeListItem(setRequirements, idx)}
                aria-label={`Remove requirement ${idx + 1}`}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addListItem(setRequirements)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add Requirement
          </Button>
        </div>
      )}

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div className="space-y-2">
          <Label>Assumptions</Label>
          {assumptions.map((a, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={a}
                onChange={(e) => updateListItem(setAssumptions, idx, e.target.value)}
                placeholder={`Assumption ${idx + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeListItem(setAssumptions, idx)}
                aria-label={`Remove assumption ${idx + 1}`}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <Label>Steps ({steps.length})</Label>
        {steps.map((step, idx) => (
          <Card key={idx} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Step {idx + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeStep(idx)}
                aria-label={`Remove step ${idx + 1}`}
                disabled={steps.length <= 1}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`step-title-${idx}`} className="text-xs text-muted-foreground">
                Title
              </Label>
              <Input
                id={`step-title-${idx}`}
                value={step.title}
                onChange={(e) => updateStep(idx, "title", e.target.value)}
                placeholder="Step title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`step-body-${idx}`} className="text-xs text-muted-foreground">
                Instructions
              </Label>
              <Textarea
                id={`step-body-${idx}`}
                value={step.body}
                onChange={(e) => updateStep(idx, "body", e.target.value)}
                rows={4}
                placeholder="Step-by-step instructions..."
              />
            </div>

            {(step.tip !== null) && (
              <div className="space-y-1.5">
                <Label htmlFor={`step-tip-${idx}`} className="text-xs text-muted-foreground">
                  Tip (optional)
                </Label>
                <Input
                  id={`step-tip-${idx}`}
                  value={step.tip ?? ""}
                  onChange={(e) => updateStep(idx, "tip", e.target.value || null)}
                  placeholder="Pro tip or shortcut..."
                />
              </div>
            )}
          </Card>
        ))}
        <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          Add Step
        </Button>
      </div>

      {footer}
    </div>
  )

  // ---- Preview Guide tab ----

  const previewView = (
    <div className="space-y-6">
      {/* Title & meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Guide</Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {asset.difficulty}
          </Badge>
          {asset.generatedBy && (
            <Badge variant="secondary" className="text-xs">
              {asset.generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {summary && (
          <p className="text-base text-muted-foreground leading-relaxed">{summary}</p>
        )}
        {asset.audience && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Audience:</span> {asset.audience}
          </p>
        )}
      </div>

      {/* Requirements */}
      {requirements.filter(Boolean).length > 0 && (
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Before You Start
          </p>
          <ul className="space-y-1">
            {requirements.filter(Boolean).map((req, idx) => (
              <li key={idx} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <span className="mt-0.5 shrink-0" aria-hidden="true">&#8226;</span>
                {req}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Assumptions */}
      {assumptions.filter(Boolean).length > 0 && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5 space-y-2">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Assumptions</p>
          <ul className="space-y-1">
            {assumptions.filter(Boolean).map((a, idx) => (
              <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <span className="mt-0.5 shrink-0" aria-hidden="true">&#8226;</span>
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Steps */}
      <ol className="space-y-4">
        {steps.map((step, idx) => (
          <li key={idx}>
            <Card className="p-5 space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-muted-foreground/40 shrink-0 leading-none tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {step.title || <span className="text-muted-foreground italic">Untitled step</span>}
                </h3>
              </div>
              {step.body && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                  {step.body}
                </p>
              )}
              {step.tip && (
                <div className="ml-10 px-3 py-2 rounded-md bg-green-500/8 border border-green-500/20">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-0.5">
                    Tip
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">{step.tip}</p>
                </div>
              )}
              {step.warning && (
                <div className="ml-10 px-3 py-2 rounded-md bg-amber-500/8 border border-amber-500/20">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-0.5">
                    Warning
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{step.warning}</p>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ol>

      {footer}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
        Back
      </Button>

      {/* Page header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">Single Guide</Badge>
        <span className="text-sm text-muted-foreground">Generated — Not Saved Yet</span>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        <button
          onClick={() => setMode("edit")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === "edit"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Edit Draft
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === "preview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview Guide
        </button>
      </div>

      {/* Tab content */}
      {mode === "edit" ? editView : previewView}
    </div>
  )
}
