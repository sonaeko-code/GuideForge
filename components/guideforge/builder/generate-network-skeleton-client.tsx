"use client"

import { useState } from "react"
import { Loader2, AlertCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  NetworkSkeletonGenerationRequest,
  NetworkSkeletonGenerationResponse,
} from "@/lib/guideforge/generation-schemas"
import { generateNetworkSkeletonMock } from "@/lib/guideforge/mock-network-generator"
import { NetworkSkeletonProposal } from "./network-skeleton-proposal"

export function GenerateNetworkSkeletonClient() {
  const [formState, setFormState] = useState<NetworkSkeletonGenerationRequest>({
    networkTopic: "",
    intendedAudience: "",
    networkPurpose: "",
    tone: "helpful",
    referenceStyle: "questline",
    numberOfHubs: 2,
    collectionsPerHub: 2,
    guideIdeasPerCollection: 2,
    guideTypeEmphasis: ["guide"],
    optionalNotes: "",
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [proposal, setProposal] = useState<NetworkSkeletonGenerationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFieldChange = (field: keyof NetworkSkeletonGenerationRequest, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const handleGenerate = async () => {
    setError(null)

    // Validate required fields
    if (!formState.networkTopic.trim()) {
      setError("Please enter a network topic")
      return
    }
    if (!formState.intendedAudience.trim()) {
      setError("Please specify the intended audience")
      return
    }
    if (!formState.networkPurpose.trim()) {
      setError("Please describe the network purpose")
      return
    }

    setIsGenerating(true)
    try {
      // Call mock generator (will be replaced with real AI later)
      const response = await generateNetworkSkeletonMock(formState)

      if (!response.success) {
        throw new Error(response.error || "Generation failed")
      }

      setProposal(response)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Network skeleton generation error:", err)
      setError(`Generation failed: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // If proposal is showing, render the review UI
  if (proposal) {
    return (
      <NetworkSkeletonProposal
        proposal={proposal}
        onBack={() => setProposal(null)}
      />
    )
  }

  // Otherwise, render the intake form
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Generate Network Skeleton</h1>
          <p className="text-base text-muted-foreground">
            Tell us about your network, and AI will generate a reviewable structure with hubs, collections, and guide ideas.
          </p>
        </div>
        <Card className="p-3 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Coming soon:</strong> GuideForge will support generation of single guides, recipes, checklists, SOPs, troubleshooting flows, and embeddable guide widgets. This tool currently generates full network skeletons.
          </p>
        </Card>
      </div>

      <Card className="p-6 md:p-8">
        <div className="space-y-6">
          {/* Network Basics */}
          <div className="space-y-3 pb-6 border-b border-border">
            <h2 className="font-semibold text-foreground">Network Basics</h2>
            <p className="text-sm text-muted-foreground">Tell us what your network is about</p>

            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-foreground mb-1.5">
                  Network Topic *
                </label>
                <Input
                  id="topic"
                  placeholder="e.g. RPG Game Builds, API Documentation, Tutorial Series"
                  value={formState.networkTopic}
                  onChange={(e) => handleFieldChange("networkTopic", e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="audience" className="block text-sm font-medium text-foreground mb-1.5">
                  Intended Audience *
                </label>
                <Input
                  id="audience"
                  placeholder="e.g. New players, Intermediate developers, Domain experts"
                  value={formState.intendedAudience}
                  onChange={(e) => handleFieldChange("intendedAudience", e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="purpose" className="block text-sm font-medium text-foreground mb-1.5">
                  Network Purpose *
                </label>
                <Textarea
                  id="purpose"
                  placeholder="e.g. Help new players master character building. Provide best practices for API design."
                  value={formState.networkPurpose}
                  onChange={(e) => handleFieldChange("networkPurpose", e.target.value)}
                  className="w-full min-h-20"
                />
              </div>
            </div>
          </div>

          {/* Style & Tone */}
          <div className="space-y-3 pb-6 border-b border-border">
            <h2 className="font-semibold text-foreground">Style & Tone</h2>
            <p className="text-sm text-muted-foreground">Define the writing style and reference template</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-foreground mb-1.5">
                  Tone
                </label>
                <Select value={formState.tone} onValueChange={(value) => handleFieldChange("tone", value)}>
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                    <SelectItem value="technical">Technical & Precise</SelectItem>
                    <SelectItem value="narrative">Narrative & Engaging</SelectItem>
                    <SelectItem value="minimal">Minimal & Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-foreground mb-1.5">
                  Reference Style
                </label>
                <Select value={formState.referenceStyle} onValueChange={(value) => handleFieldChange("referenceStyle", value)}>
                  <SelectTrigger id="reference">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questline">QuestLine (Gaming Reference)</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive Documentation</SelectItem>
                    <SelectItem value="minimal">Minimal Quick-Start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Structure */}
          <div className="space-y-3 pb-6 border-b border-border">
            <h2 className="font-semibold text-foreground">Structure</h2>
            <p className="text-sm text-muted-foreground">Define the hierarchy and number of items</p>
            <p className="text-xs text-muted-foreground italic">Start small. You can generate more guides later.</p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="hubs" className="block text-sm font-medium text-foreground mb-1.5">
                  Number of Hubs
                </label>
                <Select
                  value={String(formState.numberOfHubs)}
                  onValueChange={(value) => handleFieldChange("numberOfHubs", parseInt(value))}
                >
                  <SelectTrigger id="hubs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Hubs</SelectItem>
                    <SelectItem value="3">3 Hubs</SelectItem>
                    <SelectItem value="4">4 Hubs</SelectItem>
                    <SelectItem value="5">5 Hubs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="collections" className="block text-sm font-medium text-foreground mb-1.5">
                  Collections per Hub
                </label>
                <Select
                  value={String(formState.collectionsPerHub)}
                  onValueChange={(value) => handleFieldChange("collectionsPerHub", parseInt(value))}
                >
                  <SelectTrigger id="collections">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="guides" className="block text-sm font-medium text-foreground mb-1.5">
                  Guide Ideas per Collection
                </label>
                <Select
                  value={String(formState.guideIdeasPerCollection)}
                  onValueChange={(value) => handleFieldChange("guideIdeasPerCollection", parseInt(value))}
                >
                  <SelectTrigger id="guides">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Optional Context</h2>
            <p className="text-sm text-muted-foreground">Any additional notes or preferences</p>

            <Textarea
              placeholder="e.g. Focus on PvP builds. Include code examples. Avoid spoilers."
              value={formState.optionalNotes}
              onChange={(e) => handleFieldChange("optionalNotes", e.target.value)}
              className="w-full min-h-20"
            />
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="lg"
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              Generate Proposal
            </>
          )}
        </Button>
      </div>

      {/* Helper Text */}
      <Card className="border-blue-500/30 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> This will generate a reviewable proposal. Nothing is saved or published automatically. You can edit any aspect of the proposal before saving.
        </p>
      </Card>
    </div>
  )
}
