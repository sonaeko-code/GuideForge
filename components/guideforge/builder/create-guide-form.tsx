"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
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
import type { GuideType, DifficultyLevel } from "@/lib/guideforge/types"
import { createAndSaveGuideDraft } from "@/lib/guideforge/create-and-save-guide-draft"
import { generateMockResponse } from "@/lib/guideforge/mock-generator"

interface CreateGuideFormProps {
  networkId: string
}

const GUIDE_TYPES: GuideType[] = [
  "character-build",
  "walkthrough",
  "boss-guide",
  "beginner-guide",
  "patch-notes",
  "news",
]

const DIFFICULTY_LEVELS: DifficultyLevel[] = ["beginner", "intermediate", "advanced", "expert"]

const AUDIENCES = ["New Players", "Intermediate", "Advanced", "Hardcore", "PvP", "PvE"]

// Phase 1: Seeded IDs for QuestLine network
// These are the actual UUIDs used in Supabase seed data, not slugs
const SEEDED_NETWORK_ID = "network_questline"
const SEEDED_HUB_ID = "hub_emberfall"
const SEEDED_COLLECTION_ID = "collection_character_builds"

export function CreateGuideForm({ networkId }: CreateGuideFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [title, setTitle] = useState("Best Fire Warden Beginner Build")
  const [guideType, setGuideType] = useState<GuideType>("character-build")
  const [audience, setAudience] = useState<string[]>(["New Players"])
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner")
  const [requirements, setRequirements] = useState("Character level 10 or higher")
  const [description, setDescription] = useState(
    "A forgiving sustain-mage build for new Emberfall players. Learn the fights without getting punished."
  )

  const handleGenerateMock = async () => {
    if (!title.trim()) {
      alert("Please enter a guide title")
      return
    }

    setIsLoading(true)
    setSaveError(null)
    try {
      console.log("[v0] CreateGuideForm: Generating mock guide with title:", title)

      const response = await generateMockResponse({
        prompt: title,
        guideType,
        preferredDifficulty: difficulty,
        targetHubId: SEEDED_HUB_ID,
        targetCollectionId: SEEDED_COLLECTION_ID,
      })

      if (response.guide) {
        console.log("[v0] CreateGuideForm: Mock generated, saving draft...", {
          title: response.guide.title,
          summary: response.guide.summary?.substring(0, 60),
          sectionsCount: response.guide.sections?.length,
        })

        const { id, source, verified, error } = await createAndSaveGuideDraft({
          title: response.guide.title || title,
          summary: response.guide.summary || description,
          guideType,
          difficulty,
          networkId: SEEDED_NETWORK_ID,
          hubId: SEEDED_HUB_ID,
          collectionId: SEEDED_COLLECTION_ID,
          requirements: response.guide.requirements,
          warnings: response.guide.warnings,
          steps: response.guide.sections?.map((section) => ({
            title: section.title,
            body: section.body,
            kind: section.kind,
          })),
        })

        if (!verified) {
          console.error("[v0] CreateGuideForm: Verification failed:", error)
          setSaveError(error || "Guide save verification failed. Please try again.")
          return
        }

        console.log("[v0] CreateGuideForm: Verification succeeded, redirecting to editor id:", id)
        router.push(`/builder/network/${SEEDED_NETWORK_ID}/guide/${id}/edit`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] CreateGuideForm: Error generating guide:", error)
      setSaveError(`Could not save guide before opening editor: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueToEditor = async () => {
    if (!title.trim()) {
      alert("Please enter a guide title")
      return
    }

    setIsLoading(true)
    setSaveError(null)
    try {
      console.log("[v0] CreateGuideForm: Creating manual draft...", {
        title,
        summary: description?.substring(0, 60),
        difficulty,
        guideType,
        requirements,
      })

      const { id, source, verified, error } = await createAndSaveGuideDraft({
        title,
        summary: description,
        guideType,
        difficulty,
        networkId: SEEDED_NETWORK_ID,
        hubId: SEEDED_HUB_ID,
        collectionId: SEEDED_COLLECTION_ID,
        requirements: requirements
          ? requirements.split(",").map((r) => r.trim()).filter(Boolean)
          : [],
        warnings: [],
      })

      if (!verified) {
        console.error("[v0] CreateGuideForm: Verification failed:", error)
        setSaveError(error || "Guide save verification failed. Please try again.")
        return
      }

      console.log("[v0] CreateGuideForm: Verification succeeded, redirecting to editor id:", id)
      router.push(`/builder/network/${SEEDED_NETWORK_ID}/guide/${id}/edit`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("[v0] CreateGuideForm: Error creating guide:", error)
      setSaveError(`Could not save guide before opening editor: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="guide-title">Guide title</FieldLabel>
          <FieldDescription>
            Clear, descriptive title that appears on cards and public pages.
          </FieldDescription>
          <Input
            id="guide-title"
            placeholder="e.g. Best Fire Warden Beginner Build"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="guide-type">Guide type</FieldLabel>
          <FieldDescription>
            Determines default sections and Forge Rules applied.
          </FieldDescription>
          <Select
            value={guideType}
            onValueChange={(v) => setGuideType(v as GuideType)}
          >
            <SelectTrigger id="guide-type" className="mt-2">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {GUIDE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="audience">Audience</FieldLabel>
          <FieldDescription>Who is this guide for?</FieldDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            {AUDIENCES.map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() =>
                  setAudience((prev) =>
                    prev.includes(aud)
                      ? prev.filter((a) => a !== aud)
                      : [...prev, aud]
                  )
                }
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  audience.includes(aud)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/50 bg-transparent text-foreground hover:border-border"
                }`}
              >
                {aud}
              </button>
            ))}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
          <FieldDescription>
            What skill level does this guide assume?
          </FieldDescription>
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as DifficultyLevel)}
          >
            <SelectTrigger id="difficulty" className="mt-2">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="requirements">Requirements</FieldLabel>
          <FieldDescription>
            Comma-separated list (e.g., "Level 10, Two-piece Cinderweave").
          </FieldDescription>
          <Input
            id="requirements"
            placeholder="Character level 10, two-piece Cinderweave..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className="mt-2"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Short description</FieldLabel>
          <FieldDescription>
            Summary shown on cards and at the top of the guide.
          </FieldDescription>
          <Textarea
            id="description"
            placeholder="Brief overview of what this guide covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2"
          />
        </Field>
      </FieldGroup>

      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Forge Rules applied:</span>{" "}
          Game name, patch/version, difficulty, requirements, beginner summary, spoiler tagging.
        </p>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{saveError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button asChild variant="outline" disabled={isLoading}>
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Button onClick={handleGenerateMock} variant="secondary" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 size-4" aria-hidden="true" />
              Generate Mock Guide
            </>
          )}
        </Button>
        <Button onClick={handleContinueToEditor} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              Creating...
            </>
          ) : (
            "Continue to Editor"
          )}
        </Button>
      </div>
    </div>
  )
}
