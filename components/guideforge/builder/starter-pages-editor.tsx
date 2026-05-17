"use client"

/**
 * Step 3 — Starter Pages Editor
 *
 * Reads the unified WizardDraft from sessionStorage, lets the user edit
 * the scaffold (hubs and their collections), then writes the updated
 * scaffold back to the same draft. Nothing is persisted to Supabase
 * here — that happens at the end of Step 4.
 *
 * If no draft is present (deep-link or page refresh after the session is gone),
 * we route the user back to Step 2.
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { slugify } from "@/lib/guideforge/utils"
import { getRegistryTypeById } from "@/lib/guideforge/network-types"
import {
  makeCollectionClientId,
  makeHubClientId,
  readWizardDraft,
  writeWizardDraft,
  validateWizardDraft,
  type ScaffoldHubDraft,
  type ScaffoldCollectionDraft,
  type WizardDraft,
} from "@/lib/guideforge/wizard-state"

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; draft: WizardDraft }

export function StarterPagesEditor() {
  const router = useRouter()
  const [load, setLoad] = useState<LoadState>({ kind: "loading" })
  const [hubs, setHubs] = useState<ScaffoldHubDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savingNext, setSavingNext] = useState(false)
  // Track which hub IDs are expanded; default first hub open on mount.
  const [openHubIds, setOpenHubIds] = useState<Set<string>>(new Set())
  // Track which hub slugs have been manually edited so we don't overwrite them.
  const [manualHubSlugs, setManualHubSlugs] = useState<Set<string>>(new Set())
  const [manualCollectionSlugs, setManualCollectionSlugs] = useState<Set<string>>(new Set())

  // Load the wizard draft once on mount.
  useEffect(() => {
    const draft = readWizardDraft()
    if (!draft) {
      console.log("[v0] StarterPagesEditor: no draft found, redirecting to Step 2")
      setLoad({ kind: "missing" })
      // Defer the redirect a tick so the UI can render a fallback if needed.
      router.replace("/builder/network/new")
      return
    }
    setHubs(draft.scaffold.hubs)
    if (draft.scaffold.hubs.length > 0) {
      setOpenHubIds(new Set([draft.scaffold.hubs[0].clientId]))
    }
    setLoad({ kind: "ready", draft })
  }, [router])

  const validation = useMemo(() => {
    if (load.kind !== "ready") return null
    return validateWizardDraft({ ...load.draft, scaffold: { hubs } })
  }, [hubs, load])

  // ---------- Hub mutations ----------

  function toggleHub(hubClientId: string) {
    setOpenHubIds((prev) => {
      const next = new Set(prev)
      if (next.has(hubClientId)) {
        next.delete(hubClientId)
      } else {
        next.add(hubClientId)
      }
      return next
    })
  }

  function updateHubName(hubClientId: string, name: string) {
    setHubs((prev) =>
      prev.map((hub) => {
        if (hub.clientId !== hubClientId) return hub
        const next = { ...hub, name }
        if (!manualHubSlugs.has(hubClientId)) {
          next.slug = slugify(name)
        }
        return next
      }),
    )
  }

  function updateHubDescription(hubClientId: string, description: string) {
    setHubs((prev) =>
      prev.map((hub) => (hub.clientId === hubClientId ? { ...hub, description } : hub)),
    )
  }

  function updateHubSlug(hubClientId: string, slug: string) {
    setManualHubSlugs((prev) => {
      const next = new Set(prev)
      next.add(hubClientId)
      return next
    })
    setHubs((prev) =>
      prev.map((hub) => (hub.clientId === hubClientId ? { ...hub, slug: slugify(slug) } : hub)),
    )
  }

  function moveHub(hubClientId: string, direction: -1 | 1) {
    setHubs((prev) => {
      const idx = prev.findIndex((h) => h.clientId === hubClientId)
      if (idx === -1) return prev
      const target = idx + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function addHub() {
    const newHub: ScaffoldHubDraft = {
      clientId: makeHubClientId(),
      name: "New Hub",
      slug: "new-hub",
      description: "",
      collections: [
        {
          clientId: makeCollectionClientId(),
          name: "New Collection",
          slug: "new-collection",
          description: "",
        },
      ],
    }
    setHubs((prev) => [...prev, newHub])
    setOpenHubIds((prev) => new Set(prev).add(newHub.clientId))
  }

  function removeHub(hubClientId: string) {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Remove this hub and all of its collections?")
      if (!ok) return
    }
    setHubs((prev) => prev.filter((h) => h.clientId !== hubClientId))
  }

  // ---------- Collection mutations ----------

  function updateCollection(
    hubClientId: string,
    collectionClientId: string,
    patch: Partial<ScaffoldCollectionDraft>,
    options?: { slugIsManual?: boolean },
  ) {
    if (options?.slugIsManual) {
      setManualCollectionSlugs((prev) => {
        const next = new Set(prev)
        next.add(collectionClientId)
        return next
      })
    }
    setHubs((prev) =>
      prev.map((hub) => {
        if (hub.clientId !== hubClientId) return hub
        return {
          ...hub,
          collections: hub.collections.map((col) => {
            if (col.clientId !== collectionClientId) return col
            const merged = { ...col, ...patch }
            // Auto-slug on name change unless user has manually edited slug.
            if (patch.name !== undefined && !manualCollectionSlugs.has(collectionClientId)) {
              merged.slug = slugify(patch.name)
            }
            // Sanitize a manually edited slug.
            if (patch.slug !== undefined) {
              merged.slug = slugify(patch.slug)
            }
            return merged
          }),
        }
      }),
    )
  }

  function moveCollection(hubClientId: string, collectionClientId: string, direction: -1 | 1) {
    setHubs((prev) =>
      prev.map((hub) => {
        if (hub.clientId !== hubClientId) return hub
        const idx = hub.collections.findIndex((c) => c.clientId === collectionClientId)
        if (idx === -1) return hub
        const target = idx + direction
        if (target < 0 || target >= hub.collections.length) return hub
        const nextCols = [...hub.collections]
        ;[nextCols[idx], nextCols[target]] = [nextCols[target], nextCols[idx]]
        return { ...hub, collections: nextCols }
      }),
    )
  }

  function addCollection(hubClientId: string) {
    setHubs((prev) =>
      prev.map((hub) => {
        if (hub.clientId !== hubClientId) return hub
        return {
          ...hub,
          collections: [
            ...hub.collections,
            {
              clientId: makeCollectionClientId(),
              name: "New Collection",
              slug: "new-collection",
              description: "",
            },
          ],
        }
      }),
    )
  }

  function removeCollection(hubClientId: string, collectionClientId: string) {
    setHubs((prev) =>
      prev.map((hub) => {
        if (hub.clientId !== hubClientId) return hub
        return {
          ...hub,
          collections: hub.collections.filter((c) => c.clientId !== collectionClientId),
        }
      }),
    )
  }

  // ---------- Navigation ----------

  function handleContinue() {
    if (load.kind !== "ready") return
    setSavingNext(true)
    setError(null)

    // Final validation
    const result = validateWizardDraft({ ...load.draft, scaffold: { hubs } })
    if (!result.valid) {
      setError(result.errors[0] || "Please fix the issues above before continuing.")
      setSavingNext(false)
      return
    }

    // Persist back to sessionStorage with the edited scaffold.
    const nextDraft: WizardDraft = {
      ...load.draft,
      scaffold: { hubs },
      // The user has now touched the scaffold; mark it as no-longer-default
      // so a subsequent type change will prompt-before-reset.
      scaffoldIsDefaultForType: false,
      updatedAt: new Date().toISOString(),
    }
    writeWizardDraft(nextDraft)
    router.push("/builder/network/forge-rules")
  }

  function handleBack() {
    if (load.kind !== "ready") return
    setError(null)

    // Save any edits to the scaffold before going back
    const nextDraft: WizardDraft = {
      ...load.draft,
      scaffold: { hubs },
      scaffoldIsDefaultForType: false,
      updatedAt: new Date().toISOString(),
    }
    writeWizardDraft(nextDraft)
    router.back()
  }

  // ---------- Render ----------

  if (load.kind === "loading") {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading draft…</p>
      </div>
    )
  }

  if (load.kind === "missing") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="text-base font-semibold text-foreground">Wizard session not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find your in-progress network setup. Redirecting you back to start fresh…
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/builder/network/new">Back to Create Network</Link>
        </Button>
      </div>
    )
  }

  const totalCollections = hubs.reduce((sum, h) => sum + h.collections.length, 0)
  const isValid = !!validation?.valid

  return (
    <div className="flex flex-col gap-6">
      {/* Summary panel */}
      <Card className="border-border/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{load.draft.name}</p>
            <p className="text-xs text-muted-foreground">
              {getRegistryTypeById(load.draft.type)?.label ?? load.draft.type} · {hubs.length} hubs · {totalCollections} collections
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Step 3 of 5
          </Badge>
        </div>
      </Card>

      {/* Context note */}
      <p className="text-xs text-muted-foreground -mt-2">
        These starter pages become your hubs and collections after the network is created. You can rename, reorder, or remove them before continuing.
      </p>

      {/* Validation panel */}
      {validation && validation.hubsWithoutCollections.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Heads up</p>
          <p className="mt-1 text-xs">
            These hubs have no collections yet:{" "}
            <span className="font-mono">{validation.hubsWithoutCollections.join(", ")}</span>. You can
            continue, but readers will find them empty.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Hubs list */}
      <div className="flex flex-col gap-3">
        {hubs.map((hub, hubIdx) => {
          const isOpen = openHubIds.has(hub.clientId)
          return (
            <Card key={hub.clientId} className="border-border/50">
              {/* Hub header row */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleHub(hub.clientId)}
                  className="flex flex-1 items-center gap-2 text-left"
                  aria-expanded={isOpen}
                  aria-controls={`hub-body-${hub.clientId}`}
                >
                  {isOpen ? (
                    <ChevronUp className="size-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {hub.name || `Hub ${hubIdx + 1}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {hub.collections.length} {hub.collections.length === 1 ? "collection" : "collections"}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveHub(hub.clientId, -1)}
                    disabled={hubIdx === 0}
                    aria-label={`Move hub ${hub.name} up`}
                  >
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => moveHub(hub.clientId, 1)}
                    disabled={hubIdx === hubs.length - 1}
                    aria-label={`Move hub ${hub.name} down`}
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeHub(hub.clientId)}
                    aria-label={`Remove hub ${hub.name}`}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {/* Hub body */}
              {isOpen && (
                <div
                  id={`hub-body-${hub.clientId}`}
                  className="flex flex-col gap-4 border-t border-border/50 px-4 py-4"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Hub name</span>
                      <Input
                        value={hub.name}
                        onChange={(e) => updateHubName(hub.clientId, e.target.value)}
                        placeholder="e.g. Beginner Guides"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Slug</span>
                      <Input
                        value={hub.slug}
                        onChange={(e) => updateHubSlug(hub.clientId, e.target.value)}
                        placeholder="beginner-guides"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Description</span>
                    <Textarea
                      rows={2}
                      value={hub.description}
                      onChange={(e) => updateHubDescription(hub.clientId, e.target.value)}
                      placeholder="One sentence about what this hub covers."
                    />
                  </label>

                  {/* Collections list */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Collections
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addCollection(hub.clientId)}
                        className="gap-1.5"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Add collection
                      </Button>
                    </div>

                    {hub.collections.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        No collections yet. Add one above so readers have something to explore.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {hub.collections.map((col, colIdx) => (
                          <div
                            key={col.clientId}
                            className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/20 p-3"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 grid gap-2 md:grid-cols-2">
                                <Input
                                  value={col.name}
                                  onChange={(e) =>
                                    updateCollection(hub.clientId, col.clientId, {
                                      name: e.target.value,
                                    })
                                  }
                                  placeholder="Collection name"
                                  aria-label="Collection name"
                                />
                                <Input
                                  value={col.slug}
                                  onChange={(e) =>
                                    updateCollection(
                                      hub.clientId,
                                      col.clientId,
                                      { slug: e.target.value },
                                      { slugIsManual: true },
                                    )
                                  }
                                  placeholder="collection-slug"
                                  aria-label="Collection slug"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveCollection(hub.clientId, col.clientId, -1)}
                                    disabled={colIdx === 0}
                                    aria-label="Move collection up"
                                    className="size-7"
                                  >
                                    <ChevronUp className="size-3.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => moveCollection(hub.clientId, col.clientId, 1)}
                                    disabled={colIdx === hub.collections.length - 1}
                                    aria-label="Move collection down"
                                    className="size-7"
                                  >
                                    <ChevronDown className="size-3.5" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeCollection(hub.clientId, col.clientId)}
                                    aria-label="Remove collection"
                                    className="size-7 text-red-600 hover:text-red-700 dark:text-red-400"
                                  >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <Textarea
                              rows={2}
                              value={col.description}
                              onChange={(e) =>
                                updateCollection(hub.clientId, col.clientId, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Short description shown on the public collection page."
                              className="text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        <Button
          type="button"
          variant="outline"
          onClick={addHub}
          className="gap-2 self-start"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add hub
        </Button>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <Button variant="ghost" type="button" onClick={handleBack}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          className="gap-2"
          onClick={handleContinue}
          disabled={savingNext || !isValid}
        >
          {savingNext ? "Saving..." : "Continue to Forge Rules"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
