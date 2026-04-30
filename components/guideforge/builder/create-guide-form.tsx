"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
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
import type { GuideType, DifficultyLevel, Guide, GuideAuthor } from "@/lib/guideforge/types"
import { getHubsByNetwork, getCollectionsByHub } from "@/lib/guideforge/mock-data"
import { saveGuideDraft } from "@/lib/guideforge/guide-drafts-storage"
import { generateMockResponse } from "@/lib/guideforge/mock-generator"
import { normalizeGeneratedGuide } from "@/lib/guideforge/normalize-generated-guide"

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

export function CreateGuideForm({ networkId }: CreateGuideFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState("Best Fire Warden Beginner Build")
  const [guideType, setGuideType] = useState<GuideType>("character-build")
  const [hubId, setHubId] = useState("hub_emberfall")
  const [collectionId, setCollectionId] = useState("collection_character_builds")
  const [audience, setAudience] = useState(["New Players"])
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner")
  const [requirements, setRequirements] = useState("Character level 10 or higher")
  const [description, setDescription] = useState(
    "A forgiving sustain-mage build for new Emberfall players. Learn the fights without getting punished."
  )

  const hubs = getHubsByNetwork(networkId)
  const collections = hubId ? getCollectionsByHub(hubId) : []

  // Mock author
  const mockAuthor: GuideAuthor = {
    id: "user_builder",
    displayName: "You",
    handle: "@builder",
  }

  const createEmptyGuide = (): Guide => {
    const draftId = `draft_${Date.now()}`
    return {
      id: draftId,
      networkId,
      hubId,
      collectionId,
      slug: draftId,
      title: title || "Untitled Guide",
      summary: description || "",
      type: guideType,
      difficulty,
      status: "draft",
      verification: "unverified",
      requirements: requirements ? requirements.split(",").map((r) => r.trim()) : [],
      warnings: [],
      version: "",
      steps: [],
      author: mockAuthor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const handleGenerateMock = async () => {
    // Create empty guide first
    const guide = createEmptyGuide()

    // Generate mock content
    const response = await generateMockResponse({
      title: guide.title,
      type: guide.type,
      difficulty: guide.difficulty,
      audience: audience,
      summary: guide.summary,
    })

    if (response.guide) {
      // Normalize generated guide to editor shape
      const normalized = normalizeGeneratedGuide(response.guide, guide.id)
      
      // Save to localStorage
      saveGuideDraft(normalized)

      // Navigate to editor
      router.push(`/builder/network/${networkId}/guide/${guide.id}/edit`)
    }
  }

  const handleContinueToEditor = () => {
    // Create empty guide and save to localStorage
    const guide = createEmptyGuide()
    saveGuideDraft(guide)

    // Navigate to editor
    router.push(`/builder/network/${networkId}/guide/${guide.id}/edit`)
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
          <Select value={guideType} onValueChange={(v) => setGuideType(v as GuideType)}>
            <SelectTrigger id="guide-type" className="mt-2">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {GUIDE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="hub">Hub</FieldLabel>
          <FieldDescription>Which hub does this guide belong to?</FieldDescription>
          <Select value={hubId} onValueChange={setHubId}>
            <SelectTrigger id="hub" className="mt-2">
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
          <FieldLabel htmlFor="collection">Collection</FieldLabel>
          <FieldDescription>Which collection holds this guide?</FieldDescription>
          <Select value={collectionId} onValueChange={setCollectionId}>
            <SelectTrigger id="collection" className="mt-2">
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              {collections.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.name}
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
                    prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud]
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
          <FieldDescription>What skill level does this guide assume?</FieldDescription>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
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
          <span className="font-semibold text-foreground">Forge Rules applied:</span> Game name,
          patch/version, difficulty, requirements, beginner summary, spoiler tagging.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button asChild variant="outline">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Button onClick={handleGenerateMock} variant="secondary">
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
          Generate Mock Guide
        </Button>
        <Button onClick={handleContinueToEditor}>
          Continue to Editor
        </Button>
      </div>
    </div>
  )
}
