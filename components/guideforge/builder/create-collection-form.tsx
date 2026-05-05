"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createCollection } from "@/lib/guideforge/supabase-networks"
import type { NormalizedHub } from "@/lib/guideforge/supabase-networks"
import { slugify } from "@/lib/guideforge/utils"

interface CreateCollectionFormProps {
  networkId: string
  hubs: NormalizedHub[]
  onCollectionCreated?: () => void
}

export function CreateCollectionForm({
  networkId,
  hubs,
  onCollectionCreated,
}: CreateCollectionFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHubId, setSelectedHubId] = useState<string>("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const safeHubs = Array.isArray(hubs) ? hubs : []
  const hasHubs = safeHubs.length > 0

  // Auto-sync slug from name unless manually edited
  const displaySlug = slugManuallyEdited ? slug : slugify(name)

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (!slugManuallyEdited) {
      setSlug("")
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value)
    setSlugManuallyEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!hasHubs) {
      setError("No hubs available. Create a hub first.")
      return
    }

    if (!selectedHubId) {
      setError("Please select a hub.")
      return
    }

    if (!name.trim()) {
      setError("Collection name is required.")
      return
    }

    if (!displaySlug.trim()) {
      setError("Collection slug is required.")
      return
    }

    setIsSubmitting(true)

    try {
      console.log("[v0] CreateCollectionForm: Creating collection:", {
        networkId,
        hubId: selectedHubId,
        name,
        slug: displaySlug,
        description,
      })

      const result = await createCollection(networkId, selectedHubId, {
        name,
        slug: displaySlug,
        description,
        defaultGuideType: "how-to",
      })

      if (result.error) {
        setError(result.error)
        setIsSubmitting(false)
        return
      }

      console.log("[v0] Collection created successfully:", result.collection.id)
      setSuccessMessage("Collection created successfully!")

      // Reset form
      setName("")
      setDescription("")
      setSlug("")
      setSlugManuallyEdited(false)
      setSelectedHubId("")

      // Close form after brief delay
      setTimeout(() => {
        setIsOpen(false)
        setSuccessMessage(null)
        router.refresh()
        onCollectionCreated?.()
      }, 1000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Collection creation error:", message)
      setError(message)
      setIsSubmitting(false)
    }
  }

  const selectedHub = safeHubs.find((h) => h.id === selectedHubId)

  if (!hasHubs) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Create a hub first before adding collections.</p>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" aria-hidden="true" />
        Create Collection
      </Button>
    )
  }

  return (
    <Card className="border-border/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Create Collection</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false)
            setError(null)
            setSuccessMessage(null)
          }}
          aria-label="Close form"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 mb-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hub Selection */}
        <div>
          <label htmlFor="collection-hub" className="block text-sm font-medium text-foreground mb-1">
            Hub
          </label>
          <Select value={selectedHubId} onValueChange={setSelectedHubId}>
            <SelectTrigger id="collection-hub">
              <SelectValue placeholder="Select a hub" />
            </SelectTrigger>
            <SelectContent>
              {safeHubs.map((hub) => (
                <SelectItem key={hub.id} value={hub.id}>
                  {hub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedHub && (
            <p className="text-xs text-muted-foreground mt-1">{selectedHub.description}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="collection-name" className="block text-sm font-medium text-foreground mb-1">
            Collection Name
          </label>
          <input
            id="collection-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g., Getting Started"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSubmitting}
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="collection-slug" className="block text-sm font-medium text-foreground mb-1">
            Slug
          </label>
          <input
            id="collection-slug"
            type="text"
            value={displaySlug}
            onChange={handleSlugChange}
            placeholder="auto-generated from name"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {slugManuallyEdited ? "Manually edited" : "Auto-generated from name"}
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="collection-description" className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this collection"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false)
              setError(null)
              setSuccessMessage(null)
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !hasHubs}>
            {isSubmitting ? "Creating..." : "Create Collection"}
          </Button>
        </div>
      </form>
    </Card>
  )
}

