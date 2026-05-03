"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateMockHubDraft } from "@/lib/guideforge/mock-generator"
import { createHub, createCollection } from "@/lib/guideforge/supabase-networks"
import { SaveStatus } from "@/components/guideforge/builder/save-status"
import type { Hub, Collection } from "@/lib/guideforge/types"

interface CreateHubFormProps {
  networkId: string
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function CreateHubForm({ networkId }: CreateHubFormProps) {
  const router = useRouter()
  const [name, setName] = useState("Emberfall")
  const [hubKind, setHubKind] = useState<Hub["hubKind"]>("game")
  const [description, setDescription] = useState(
    "A high-fantasy MMO of burning kingdoms and cinder magic."
  )
  const [collectionNames, setCollectionNames] = useState([
    "Character Builds",
    "Beginner Guides",
    "Boss Guides",
    "Patch Notes",
  ])
  const [generationAttempted, setGenerationAttempted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleGenerateDraft = () => {
    const draft = generateMockHubDraft(hubKind)
    setName(draft.name)
    setDescription(draft.description)
    setCollectionNames(draft.suggestedCollections)
    setGenerationAttempted(true)
  }

  const handleSave = async () => {
    setError(null)
    setSaveStatus("saving")
    setIsSaving(true)

    try {
      // Create the hub
      const hubSlug = slugify(name)
      console.log("[v0] Create hub form saving to network:", networkId)

      const { hub, source, error: hubError } = await createHub(networkId, {
        id: "",
        networkId,
        slug: hubSlug,
        name,
        description,
        hubKind,
        collectionIds: [],
      })

      if (hubError || !hub.id) {
        const errorMsg = hubError || "Failed to create hub"
        setError(errorMsg)
        setSaveStatus("error")
        setIsSaving(false)
        return
      }

      console.log("[v0] Hub created successfully, id:", hub.id)
      setSaveStatus("saved")

      // Create collections for this hub
      for (const collName of collectionNames) {
        const collSlug = slugify(collName)
        const { source: collSource, error: collError } = await createCollection(
          networkId,
          hub.id,
          {
            slug: collSlug,
            name: collName,
            description: `${collName} for ${name}`,
            defaultGuideType: "guide",
            guideIds: [],
          }
        )

        if (collError) {
          console.warn(`[v0] Failed to create collection ${collName}:`, collError)
          // Continue with other collections even if one fails
        }
      }

      console.log("[v0] Hub and collections created successfully")
      // Route back to dashboard and show the hubs tab where the new hub is now visible
      router.push(`/builder/network/${networkId}/dashboard?tab=hubs`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("[v0] Hub creation exception:", message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Generate Hub Draft:</span> Auto-suggest hub name, description, and collection structure based on the hub type. <span className="text-xs text-muted-foreground">Mock generation — no credits used.</span>
            </p>
          </div>
          {generationAttempted && (
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
        </div>
        {generationAttempted && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Hub draft generated. You can edit anything before saving.</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <SaveStatus state={saveStatus} error={error} message="Hub created successfully" />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="hub-name">Hub name</FieldLabel>
          <FieldDescription>For a gaming network, this is the game title. For repair networks, a product line. For SOP networks, a department.</FieldDescription>
          <Input
            id="hub-name"
            placeholder="e.g. Emberfall, ElectriGuide Pro, Logistics SOP"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2"
            disabled={isSaving}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="hub-kind">Hub type</FieldLabel>
          <FieldDescription>Determines how the hub is presented in navigation and cards.</FieldDescription>
          <Select value={hubKind} onValueChange={(v) => setHubKind(v as Hub["hubKind"])} disabled={isSaving}>
            <SelectTrigger id="hub-kind" className="mt-2">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="game">Game</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
              <SelectItem value="channel">Channel</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="hub-desc">Description</FieldLabel>
          <FieldDescription>Plain-language overview shown on the hub card and top of hub pages.</FieldDescription>
          <Textarea
            id="hub-desc"
            placeholder="Describe what this hub covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2"
            disabled={isSaving}
          />
        </Field>

        <Field>
          <FieldLabel>Collections to include</FieldLabel>
          <FieldDescription>Create collections that hold guides. You can add more later.</FieldDescription>
          <div className="mt-2 space-y-2">
            {collectionNames.map((collName, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="flex-1 text-sm font-medium">{collName}</span>
                <button
                  type="button"
                  onClick={() =>
                    setCollectionNames(collectionNames.filter((_, i) => i !== idx))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground"
                  disabled={isSaving}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Field>
      </FieldGroup>

      <div className="flex gap-3 pt-4">
        <Button asChild variant="outline" disabled={isSaving}>
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button onClick={handleGenerateDraft} variant="secondary" disabled={isSaving}>
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
          Generate Draft
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Hub"}
        </Button>
      </div>
    </div>
  )
}
