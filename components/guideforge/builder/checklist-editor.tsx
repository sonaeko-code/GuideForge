"use client"

import { useState } from "react"
import { Plus, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import type { GeneratedChecklist } from "@/lib/guideforge/generation-schemas"

export type ChecklistEditorMode = "edit" | "preview"

interface ChecklistEditorProps {
  /** The current checklist value — editor is controlled by the parent. */
  value: GeneratedChecklist
  /** Called whenever any field changes. Parent should update its state. */
  onChange: (updated: GeneratedChecklist) => void
  /**
   * Optional: controlled tab mode. If provided, the parent owns the mode.
   * If omitted, the tab toggle is rendered and mode is managed internally.
   */
  mode?: ChecklistEditorMode
  onModeChange?: (mode: ChecklistEditorMode) => void
  /**
   * Initial tab mode for uncontrolled usage. Defaults to "edit".
   * Use "preview" to show the generated content first before editing.
   */
  initialMode?: ChecklistEditorMode
  /**
   * Label shown on the edit tab. Defaults to "Edit Draft".
   */
  editTabLabel?: string
  /**
   * Whether to render the Edit / Preview tab toggle.
   * Set to false for read-only preview contexts where tabs would be confusing.
   * Defaults to true.
   */
  showModeTabs?: boolean
}

export function ChecklistEditor({
  value,
  onChange,
  mode: externalMode,
  onModeChange,
  initialMode,
  editTabLabel = "Edit Draft",
  showModeTabs = true,
}: ChecklistEditorProps) {
  const [internalMode, setInternalMode] = useState<ChecklistEditorMode>(initialMode ?? "edit")

  const mode = externalMode ?? internalMode
  const setMode = (m: ChecklistEditorMode) => {
    if (onModeChange) {
      onModeChange(m)
    } else {
      setInternalMode(m)
    }
  }

  // ---- Field update helpers ----

  const set = <K extends keyof GeneratedChecklist>(key: K, val: GeneratedChecklist[K]) => {
    onChange({ ...value, [key]: val })
  }

  // ---- List helpers for criteria and assumptions ----

  const updateListItem = (key: "completionCriteria" | "assumptions", idx: number, val: string) => {
    const next = [...(value[key] ?? [])]
    next[idx] = val
    set(key, next)
  }

  const addListItem = (key: "completionCriteria" | "assumptions") => {
    set(key, [...(value[key] ?? []), ""])
  }

  const removeListItem = (key: "completionCriteria" | "assumptions", idx: number) => {
    set(key, (value[key] ?? []).filter((_, i) => i !== idx))
  }

  // ---- Section helpers ----

  const safeSections = value.sections ?? []

  const updateSection = (sectionIdx: number, field: "title", val: string) => {
    const next = safeSections.map((s, i) =>
      i === sectionIdx ? { ...s, [field]: val } : s
    )
    set("sections", next)
  }

  const addSection = () => {
    set("sections", [...safeSections, { title: "", items: [] }])
  }

  const removeSection = (sectionIdx: number) => {
    if (safeSections.length <= 1) return
    set("sections", safeSections.filter((_, i) => i !== sectionIdx))
  }

  // ---- Item helpers ----

  const updateItem = (sectionIdx: number, itemIdx: number, field: "label" | "description" | "required", val: any) => {
    const next = safeSections.map((s, si) =>
      si === sectionIdx
        ? {
            ...s,
            items: (s.items ?? []).map((item, ii) =>
              ii === itemIdx ? { ...item, [field]: val } : item
            ),
          }
        : s
    )
    set("sections", next)
  }

  const addItem = (sectionIdx: number) => {
    const next = safeSections.map((s, i) =>
      i === sectionIdx
        ? { ...s, items: [...(s.items ?? []), { label: "", description: null, required: false }] }
        : s
    )
    set("sections", next)
  }

  const removeItem = (sectionIdx: number, itemIdx: number) => {
    const next = safeSections.map((s, i) =>
      i === sectionIdx
        ? { ...s, items: (s.items ?? []).filter((_, ii) => ii !== itemIdx) }
        : s
    )
    set("sections", next)
  }

  // ---- Edit view ----

  const editView = (
    <div className="space-y-6">
      {/* Title & Summary */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ce-title">Title</Label>
          <Input
            id="ce-title"
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Checklist title"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ce-summary">Summary</Label>
          <Textarea
            id="ce-summary"
            value={value.summary}
            onChange={(e) => set("summary", e.target.value)}
            rows={3}
            placeholder="One or two sentences describing what this checklist covers."
          />
        </div>
      </div>

      {/* Completion Criteria */}
      <div className="space-y-2">
        <Label>Completion Criteria</Label>
        {(value.completionCriteria ?? []).map((criterion, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              value={criterion}
              onChange={(e) => updateListItem("completionCriteria", idx, e.target.value)}
              placeholder={`Criterion ${idx + 1}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeListItem("completionCriteria", idx)}
              aria-label={`Remove criterion ${idx + 1}`}
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addListItem("completionCriteria")}
          className="gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Criterion
        </Button>
      </div>

      {/* Assumptions */}
      {(value.assumptions ?? []).length > 0 && (
        <div className="space-y-2">
          <Label>Assumptions</Label>
          {(value.assumptions ?? []).map((assumption, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={assumption}
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

      {/* Sections */}
      <div className="space-y-4">
        <Label>Sections ({safeSections.length})</Label>
        {safeSections.map((section, sectionIdx) => {
          const sectionItems = section.items ?? []
          return (
          <Card key={sectionIdx} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Section {sectionIdx + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSection(sectionIdx)}
                aria-label={`Remove section ${sectionIdx + 1}`}
                disabled={safeSections.length <= 1}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Section Title */}
            <div className="space-y-1.5">
              <Label htmlFor={`ce-section-title-${sectionIdx}`} className="text-xs text-muted-foreground">
                Section Title
              </Label>
              <Input
                id={`ce-section-title-${sectionIdx}`}
                value={section.title}
                onChange={(e) => updateSection(sectionIdx, "title", e.target.value)}
                placeholder="Section title"
              />
            </div>

            {/* Items in Section */}
            <div className="space-y-2 pl-4 border-l-2 border-border">
              <p className="text-xs font-semibold text-muted-foreground">Items ({sectionItems.length})</p>
              {sectionItems.map((item, itemIdx) => (
                <div key={itemIdx} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Input
                      value={item.label}
                      onChange={(e) => updateItem(sectionIdx, itemIdx, "label", e.target.value)}
                      placeholder="Item label"
                      className="text-sm"
                    />
                    {item.description && (
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(sectionIdx, itemIdx, "description", e.target.value)}
                        placeholder="Item description (optional)"
                        className="text-xs"
                      />
                    )}
                  </div>
                  <div className="flex gap-1 items-center shrink-0">
                    <Checkbox
                      checked={item.required}
                      onCheckedChange={(checked) => updateItem(sectionIdx, itemIdx, "required", checked)}
                      aria-label={`Mark item as required`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(sectionIdx, itemIdx)}
                      aria-label={`Remove item`}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addItem(sectionIdx)}
                className="gap-1.5 mt-2"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Item
              </Button>
            </div>
          </Card>
          )
        })}
        <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5">
          <Plus className="size-3.5" aria-hidden="true" />
          Add Section
        </Button>
      </div>
    </div>
  )

  // ---- Preview view ----

  const stats = {
    sections: safeSections.length,
    totalItems: safeSections.reduce((sum, s) => sum + (s.items?.length ?? 0), 0),
    requiredItems: safeSections.reduce((sum, s) => sum + (s.items?.filter((i) => i.required)?.length ?? 0), 0),
  }

  const previewView = (
    <div className="space-y-5">
      {/* Title, meta, and stats — only shown in standalone/proposal context (showModeTabs=true).
          In embedded asset-detail context the page already renders the title and stat pills. */}
      {showModeTabs && (
        <>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Checklist</Badge>
              {(value as any).generatedBy && (
                <Badge variant="secondary" className="text-xs">
                  {(value as any).generatedBy === "openai" ? "AI Generated" : "Mock Preview"}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {value.title || <span className="text-muted-foreground italic">Untitled checklist</span>}
            </h2>
            {value.summary && (
              <p className="text-base text-muted-foreground leading-relaxed">{value.summary}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.sections}</div>
              <div className="text-xs text-muted-foreground">Section{stats.sections !== 1 ? "s" : ""}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.totalItems}</div>
              <div className="text-xs text-muted-foreground">Total Item{stats.totalItems !== 1 ? "s" : ""}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.requiredItems}</div>
              <div className="text-xs text-muted-foreground">Required</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{(value.completionCriteria ?? []).length}</div>
              <div className="text-xs text-muted-foreground">Criteria</div>
            </Card>
          </div>
        </>
      )}

      {/* Completion Criteria */}
      {(value.completionCriteria ?? []).filter(Boolean).length > 0 && (
        <Card className="p-4 border-green-500/20 bg-green-500/5 space-y-2">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">Success Criteria</p>
          <ul className="space-y-1">
            {(value.completionCriteria ?? []).filter(Boolean).map((criterion, idx) => (
              <li key={idx} className="text-sm text-green-800 dark:text-green-200 flex items-start gap-2">
                <Check className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
                {criterion}
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

      {/* Sections */}
      <div className="space-y-4">
        {safeSections.map((section, sectionIdx) => {
          const sectionItems = section.items ?? []
          return (
          <Card key={sectionIdx} className="p-4 space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {section.title || <span className="text-muted-foreground italic">Untitled section</span>}
            </h3>
            <div className="space-y-2">
              {sectionItems.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    disabled
                    className="mt-1 size-5 rounded border-2 border-muted-foreground/30 cursor-not-allowed"
                    aria-label={item.label}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                  {item.required && (
                    <Badge variant="secondary" className="text-xs shrink-0">Required</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Tab toggle — hidden when showModeTabs is false */}
      {showModeTabs && (
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
            Preview Checklist
          </button>
        </div>
      )}

      {/* Tab content */}
      {mode === "edit" ? editView : previewView}
    </div>
  )
}
