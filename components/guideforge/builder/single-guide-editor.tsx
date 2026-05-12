"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { GeneratedSingleGuide } from "@/lib/guideforge/generation-schemas"

export type SingleGuideEditorMode = "edit" | "preview"

interface SingleGuideEditorProps {
  /** The current guide value — editor is controlled by the parent. */
  value: GeneratedSingleGuide
  /** Called whenever any field changes. Parent should update its state. */
  onChange: (updated: GeneratedSingleGuide) => void
  /**
   * Optional: controlled tab mode. If provided, the parent owns the mode.
   * If omitted, the tab toggle is rendered and mode is managed internally.
   */
  mode?: SingleGuideEditorMode
  onModeChange?: (mode: SingleGuideEditorMode) => void
  /**
   * Label shown on the tab toggle. Defaults to "Edit Draft".
   */
  editTabLabel?: string
}

export function SingleGuideEditor({
  value,
  onChange,
  mode: externalMode,
  onModeChange,
  editTabLabel = "Edit Draft",
}: SingleGuideEditorProps) {
  // Internal mode used only when the parent does not control it
  const [internalMode, setInternalMode] = useState<SingleGuideEditorMode>("edit")

  const mode = externalMode ?? internalMode
  const setMode = (m: SingleGuideEditorMode) => {
    if (onModeChange) {
      onModeChange(m)
    } else {
      setInternalMode(m)
    }
  }

  // ---- Field update helpers ----

  const set = <K extends keyof GeneratedSingleGuide>(key: K, val: GeneratedSingleGuide[K]) => {
    onChange({ ...value, [key]: val })
  }

  // ---- List item helpers ----

  const updateListItem = (key: "requirements" | "warnings" | "assumptions", idx: number, val: string) => {
    const next = [...(value[key] ?? [])]
    next[idx] = val
    set(key, next)
  }

  const addListItem = (key: "requirements" | "warnings" | "assumptions") => {
    set(key, [...(value[key] ?? []), ""])
  }

  const removeListItem = (key: "requirements" | "warnings" | "assumptions", idx: number) => {
    set(key, (value[key] ?? []).filter((_, i) => i !== idx))
  }

  // ---- Step helpers ----

  type StepField = keyof GeneratedSingleGuide["steps"][number]

  const updateStep = (idx: number, field: StepField, val: string | null) => {
    const next = value.steps.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    set("steps", next)
  }

  const addStep = () => {
    set("steps", [
      ...value.steps,
      { title: "", body: "", tip: null, warning: null, successCondition: null },
    ])
  }

  const removeStep = (idx: number) => {
    if (value.steps.length <= 1) return
    set("steps", value.steps.filter((_, i) => i !== idx))
  }

  // ---- Edit view ----

  const editView = (
    <div className="space-y-6">
      {/* Title & Summary */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sge-title">Title</Label>
          <Input
            id="sge-title"
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Guide title"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sge-summary">Summary</Label>
          <Textarea
            id="sge-summary"
            value={value.summary}
            onChange={(e) => set("summary", e.target.value)}
            rows={3}
            placeholder="One or two sentences describing what this guide covers."
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <Label>Requirements / Prerequisites</Label>
        {(value.requirements ?? []).map((req, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              value={req}
              onChange={(e) => updateListItem("requirements", idx, e.target.value)}
              placeholder={`Requirement ${idx + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeListItem("requirements", idx)}
              aria-label={`Remove requirement ${idx + 1}`}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addListItem("requirements")}
          className="gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Requirement
        </Button>
      </div>

      {/* Warnings */}
      <div className="space-y-2">
        <Label>Warnings</Label>
        {(value.warnings ?? []).map((w, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              value={w}
              onChange={(e) => updateListItem("warnings", idx, e.target.value)}
              placeholder={`Warning ${idx + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeListItem("warnings", idx)}
              aria-label={`Remove warning ${idx + 1}`}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addListItem("warnings")}
          className="gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Warning
        </Button>
      </div>

      {/* Assumptions */}
      {(value.assumptions ?? []).length > 0 && (
        <div className="space-y-2">
          <Label>Assumptions</Label>
          {(value.assumptions ?? []).map((a, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={a}
                onChange={(e) => updateListItem("assumptions", idx, e.target.value)}
                placeholder={`Assumption ${idx + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeListItem("assumptions", idx)}
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
        <Label>Steps ({value.steps.length})</Label>
        {value.steps.map((step, idx) => (
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
                disabled={value.steps.length <= 1}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sge-step-title-${idx}`} className="text-xs text-muted-foreground">
                Title
              </Label>
              <Input
                id={`sge-step-title-${idx}`}
                value={step.title}
                onChange={(e) => updateStep(idx, "title", e.target.value)}
                placeholder="Step title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sge-step-body-${idx}`} className="text-xs text-muted-foreground">
                Instructions
              </Label>
              <Textarea
                id={`sge-step-body-${idx}`}
                value={step.body}
                onChange={(e) => updateStep(idx, "body", e.target.value)}
                rows={4}
                placeholder="Step-by-step instructions..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sge-step-tip-${idx}`} className="text-xs text-muted-foreground">
                Tip (optional)
              </Label>
              <Input
                id={`sge-step-tip-${idx}`}
                value={step.tip ?? ""}
                onChange={(e) => updateStep(idx, "tip", e.target.value || null)}
                placeholder="Pro tip or shortcut..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`sge-step-warning-${idx}`} className="text-xs text-muted-foreground">
                Step Warning (optional)
              </Label>
              <Input
                id={`sge-step-warning-${idx}`}
                value={step.warning ?? ""}
                onChange={(e) => updateStep(idx, "warning", e.target.value || null)}
                placeholder="Warning for this step..."
              />
            </div>
          </Card>
        ))}
        <Button variant="outline" size="sm" onClick={addStep} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          Add Step
        </Button>
      </div>
    </div>
  )

  // ---- Preview view ----

  const previewView = (
    <div className="space-y-6">
      {/* Title & meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">Guide</Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {value.difficulty}
          </Badge>
          {(value as any).generatedBy && (
            <Badge variant="secondary" className="text-xs">
              {(value as any).generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
            </Badge>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {value.title || <span className="text-muted-foreground italic">Untitled guide</span>}
        </h2>
        {value.summary && (
          <p className="text-base text-muted-foreground leading-relaxed">{value.summary}</p>
        )}
        {value.audience && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Audience:</span> {value.audience}
          </p>
        )}
      </div>

      {/* Warnings */}
      {(value.warnings ?? []).filter(Boolean).length > 0 && (
        <Card className="p-4 border-red-500/20 bg-red-500/5 space-y-2">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">Warnings</p>
          <ul className="space-y-1">
            {(value.warnings ?? []).filter(Boolean).map((w, idx) => (
              <li key={idx} className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                <span className="mt-0.5 shrink-0" aria-hidden="true">&#8226;</span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Requirements */}
      {(value.requirements ?? []).filter(Boolean).length > 0 && (
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 space-y-2">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Before You Start</p>
          <ul className="space-y-1">
            {(value.requirements ?? []).filter(Boolean).map((req, idx) => (
              <li key={idx} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <span className="mt-0.5 shrink-0" aria-hidden="true">&#8226;</span>
                {req}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Assumptions */}
      {(value.assumptions ?? []).filter(Boolean).length > 0 && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5 space-y-2">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Assumptions</p>
          <ul className="space-y-1">
            {(value.assumptions ?? []).filter(Boolean).map((a, idx) => (
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
        {value.steps.map((step, idx) => (
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
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">{step.body}</p>
              )}
              {step.tip && (
                <div className="ml-10 px-3 py-2 rounded-md bg-green-500/8 border border-green-500/20">
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-0.5">Tip</p>
                  <p className="text-xs text-green-700 dark:text-green-300">{step.tip}</p>
                </div>
              )}
              {step.warning && (
                <div className="ml-10 px-3 py-2 rounded-md bg-amber-500/8 border border-amber-500/20">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-0.5">Warning</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{step.warning}</p>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  )

  return (
    <div className="space-y-5">
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
          {editTabLabel}
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
