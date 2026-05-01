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
import { createCollection } from "@/lib/guideforge/supabase-networks"
import type { GuideType } from "@/lib/guideforge/types"

interface CreateCollectionFormProps {
  networkId: string
  hubId: string
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

export function CreateCollectionForm({ networkId, hubId }: CreateCollectionFormProps) {
  const router = useRouter()
  const [name, setName] = useState("Character Builds")
  const [description, setDescription] = useState("Build guides for different character classes and playstyles")
  const [defaultGuideType, setDefaultGuideType] = useState<GuideType>("character-build")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      const collSlug = slugify(name)
      const { collection, error: collError } = await createCollection(
        networkId,
        hubId,
        {
          slug: collSlug,
          name,
          description,
          defaultGuideType,
          guideIds: [],
        }
      )

      if (collError || !collection.id) {
        setError(collError || "Failed to create collection")
        setIsSaving(false)
        return
      }

      console.log("[v0] Collection created:", collection.id)
      router.push(`/builder/network/${networkId}/dashboard`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
      console.error("[v0] Collection creation exception:", message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <FieldGroup>
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

      <div className="flex gap-3 pt-4">
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
  )
}
