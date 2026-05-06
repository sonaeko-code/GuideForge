"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, Loader2, Lock } from "lucide-react"
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
import { getCurrentUserNetworkAuthority } from "@/lib/guideforge/supabase-networks"
import { useAuth } from "@/lib/guideforge/auth-context"

interface CreateGuideFormProps {
  networkId: string
  hubs?: any[]
  collectionsMap?: { [hubId: string]: any[] }
  preselectedHubId?: string
  preselectedCollectionId?: string
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

export function CreateGuideForm({
  networkId,
  hubs = [],
  collectionsMap = {},
  preselectedHubId,
  preselectedCollectionId,
}: CreateGuideFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Phase 6: Permission gating
  const [canSubmitGuides, setCanSubmitGuides] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(true)

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isAuthenticated) {
        setCheckingPermissions(false)
        return
      }
      
      const authority = await getCurrentUserNetworkAuthority(networkId)
      setCanSubmitGuides(authority.canSubmitGuides)
      setCheckingPermissions(false)
    }
    
    checkPermissions()
  }, [networkId, isAuthenticated])

  // Check if this is a fresh form load (should start blank)
  const isFresh = searchParams.get("fresh") === "true"

  // Initialize with blank defaults if fresh, otherwise with template
  const [title, setTitle] = useState("")
  const [guideType, setGuideType] = useState<GuideType>("character-build")
  const [audience, setAudience] = useState<string[]>(["New Players"])
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("beginner")
  const [requirements, setRequirements] = useState("")
  const [description, setDescription] = useState("")

  // Determine initial hub: preselected (if valid) > first hub > empty
  const initialHubId = (() => {
    if (preselectedHubId && hubs.some((h) => h.id === preselectedHubId)) {
      return preselectedHubId
    }
    return hubs.length > 0 ? hubs[0].id : ""
  })()

  // Determine initial collection: preselected (if valid for hub) > single collection > first > empty
  const initialCollectionId = (() => {
    const hubCollections = collectionsMap[initialHubId] || []
    if (
      preselectedCollectionId &&
      hubCollections.some((c) => c.id === preselectedCollectionId)
    ) {
      return preselectedCollectionId
    }
    return hubCollections.length > 0 ? hubCollections[0].id : ""
  })()

  const [selectedHubId, setSelectedHubId] = useState<string>(initialHubId)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(initialCollectionId)

  // Update available collections when hub changes
  const availableCollections = collectionsMap[selectedHubId] || []
  const hasPrereqs = hubs.length > 0 && availableCollections.length > 0
  const canSubmit = hasPrereqs && !!selectedHubId && !!selectedCollectionId && !!title.trim()

  const validateBeforeSave = (): string | null => {
    if (!title.trim()) return "Please enter a guide title."
    if (!selectedHubId) return "Please select a hub."
    if (!selectedCollectionId) return "Please select a collection."
    // Verify collection belongs to selected hub (and therefore to current network)
    const hubCollections = collectionsMap[selectedHubId] || []
    if (!hubCollections.some((c) => c.id === selectedCollectionId)) {
      return "Selected collection does not belong to the chosen hub. Please reselect."
    }
    return null
  }

  const handleGenerateMock = async () => {
    const validationError = validateBeforeSave()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsLoading(true)
    setSaveError(null)
    try {
      console.log("[v0] CreateGuideForm generate target:", {
        networkId,
        hubId: selectedHubId,
        collectionId: selectedCollectionId,
      })

      const response = await generateMockResponse({
        prompt: title,
        guideType,
        preferredDifficulty: difficulty,
        targetHubId: selectedHubId,
        targetCollectionId: selectedCollectionId,
      })

      if (response.guide) {
        console.log("[v0] CreateGuideForm: Mock generated, saving draft...", {
          title: response.guide.title,
          summary: response.guide.summary?.substring(0, 60),
          sectionsCount: response.guide.sections?.length,
        })

        const { id, verified, error } = await createAndSaveGuideDraft({
          title: response.guide.title || title,
          summary: response.guide.summary || description,
          guideType,
          difficulty,
          networkId,
          hubId: selectedHubId,
          collectionId: selectedCollectionId,
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
        router.push(`/builder/network/${networkId}/guide/${id}/edit`)
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
    const validationError = validateBeforeSave()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsLoading(true)
    setSaveError(null)
    try {
      console.log("[v0] CreateGuideForm manual create target:", {
        networkId,
        hubId: selectedHubId,
        collectionId: selectedCollectionId,
        title,
      })

      const { id, verified, error } = await createAndSaveGuideDraft({
        title,
        summary: description,
        guideType,
        difficulty,
        networkId,
        hubId: selectedHubId,
        collectionId: selectedCollectionId,
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
      router.push(`/builder/network/${networkId}/guide/${id}/edit`)
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
      {checkingPermissions ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : !canSubmitGuides ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <Lock className="size-5 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You need contributor access or higher to create guides in this network.
          </p>
        </div>
      ) : (
        <>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="hub-select">Hub</FieldLabel>
          <FieldDescription>
            Select which hub (game/product/topic) this guide belongs to.
          </FieldDescription>
          <Select value={selectedHubId} onValueChange={(v) => {
            setSelectedHubId(v)
            // Reset collection to first available when hub changes
            const collections = collectionsMap[v] || []
            if (collections.length > 0) {
              setSelectedCollectionId(collections[0].id)
            }
          }}>
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
          <FieldLabel htmlFor="collection-select">Collection</FieldLabel>
          <FieldDescription>
            Select which collection within the hub this guide belongs to.
          </FieldDescription>
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger id="collection-select" className="mt-2">
              <SelectValue placeholder="Select collection" />
            </SelectTrigger>
            <SelectContent>
              {availableCollections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

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

      <div className="flex flex-wrap gap-3 pt-4">
        <Button asChild variant="outline" disabled={isLoading}>
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <Button
          onClick={handleGenerateMock}
          variant="secondary"
          disabled={isLoading || !canSubmit}
        >
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
        <Button onClick={handleContinueToEditor} disabled={isLoading || !canSubmit}>
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
      {!canSubmit && hasPrereqs && (
        <p className="text-xs text-muted-foreground">
          Enter a title and select a hub and collection to enable creation.
        </p>
      )}
        </>
      )}
    </div>
  )
}
