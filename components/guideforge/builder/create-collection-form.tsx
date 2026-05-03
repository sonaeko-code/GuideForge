"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { createCollection } from "@/lib/guideforge/supabase-networks"
import { SaveStatus } from "@/components/guideforge/builder/save-status"
import type { GuideType, Hub } from "@/lib/guideforge/types"

interface CreateCollectionFormProps {
  networkId: string
  hubs?: Hub[]
  preselectedHubId?: string
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

const GUIDE_TYPES: { value: GuideType; label: string }[] = [
  { value: "character-build", label: "Character Build" },
  { value: "walkthrough", label: "Walkthrough" },
  { value: "boss-guide", label: "Boss Guide" },
  { value: "beginner-guide", label: "Beginner Guide" },
  { value: "patch-notes", label: "Patch Notes" },
  { value: "repair-procedure", label: "Repair Procedure" },
  { value: "sop", label: "Standard Operating Procedure" },
  { value: "tutorial", label: "Tutorial" },
  { value: "reference", label: "Reference" },
  { value: "news", label: "News" },
]

export function CreateCollectionForm({ networkId, hubs = [], preselectedHubId }: CreateCollectionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedHubId, setSelectedHubId] = useState<string>(
    preselectedHubId && hubs.some((h) => h.id === preselectedHubId)
      ? preselectedHubId
      : hubs.length > 0
        ? hubs[0].id
        : ""
  )
  const [name, setName] = useState("Character Builds")
  const [description, setDescription] = useState("Build guides for different character classes and playstyles")
  const [defaultGuideType, setDefaultGuideType] = useState<GuideType>("character-build")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!selectedHubId) {
      setError("Please select a hub")
      setSaveStatus("error")
      return
    }

    setError(null)
    setSaveStatus("saving")
    setIsSaving(true)

    try {
      const collSlug = slugify(name)
      
      console.log("[v0] Selected hub for collection:", selectedHubId)
      console.log("[v0] Collection save payload:", { networkId, hubId: selectedHubId, slug: collSlug, name, description })
      
      const { collection, error: collError } = await createCollection(
        networkId,
        selectedHubId,
        {
          slug: collSlug,
          name,
          description,
          defaultGuideType,
          guideIds: [],
        }
      )

      if (collError || !collection.id) {
        console.error("[v0] Collection save error:", collError)
        setError(collError || "Failed to create collection")
        setSaveStatus("error")
        setIsSaving(false)
        return
      }

      console.log("[v0] Collection save result:", collection.id)
      setSaveStatus("saved")
      
      // Show success toast
      toast({
        title: "Collection created",
        description: `${name} has been created successfully.`,
        duration: 3000,
      })
      
      router.push(`/builder/network/${networkId}/dashboard?tab=collections`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Collection save error:", message)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <SaveStatus state={saveStatus} error={error} message="Collection created successfully" />

      {hubs.length === 0 ? (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-8 text-center">
          <p className="font-semibold text-foreground">No hubs yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a hub first, then you can add collections to it.
          </p>
          <Button size="sm" asChild className="mt-4">
            <Link href={`/builder/network/${networkId}/dashboard?tab=hubs`}>
              Create Hub
            </Link>
          </Button>
        </div>
      ) : (
      <div className="space-y-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="hub-select">Hub</FieldLabel>
            <FieldDescription>
              Select which hub this collection belongs to.
            </FieldDescription>
            <Select value={selectedHubId} onValueChange={setSelectedHubId} disabled={isSaving}>
              <SelectTrigger id="hub-select" className="mt-2">
                <SelectValue placeholder="Select hub" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map((hub) => (
                  <SelectItem key={hub.id} value={hub.id}>
                    {hub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-name">Collection name</FieldLabel>
            <FieldDescription>Examples: "Character Builds", "Beginner Guides", "Boss Strategies"</FieldDescription>
            <Input
              id="collection-name"
              placeholder="e.g. Character Builds"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              disabled={isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="collection-desc">Description</FieldLabel>
            <FieldDescription>Describes what this collection contains and helps users understand its purpose.</FieldDescription>
            <Textarea
              id="collection-desc"
              placeholder="Describe this collection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
              disabled={isSaving}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="default-type">Default guide type</FieldLabel>
            <FieldDescription>When creating guides in this collection, this type will be pre-selected.</FieldDescription>
            <Select value={defaultGuideType} onValueChange={(v) => setDefaultGuideType(v as GuideType)} disabled={isSaving}>
              <SelectTrigger id="default-type" className="mt-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {GUIDE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <div className="flex gap-3">
          <Button asChild variant="outline" disabled={isSaving}>
            <Link href={`/builder/network/${networkId}/dashboard`}>
              <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
              Cancel
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Create Collection"}
          </Button>
        </div>
      </div>
      )}
    </div>
  )
}
