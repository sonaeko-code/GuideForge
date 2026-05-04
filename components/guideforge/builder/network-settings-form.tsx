"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Network } from "@/lib/guideforge/types"
import { updateNetwork } from "@/lib/guideforge/supabase-networks"

interface NetworkSettingsFormProps {
  network: Network
  networkId: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
}

export function NetworkSettingsForm({ network, networkId }: NetworkSettingsFormProps) {
  const router = useRouter()
  const [name, setName] = useState(network.name)
  const [slug, setSlug] = useState(network.slug)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState(network.description)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Theme is coming soon (not in current schema)
  const themeDisabled = true
  // Visibility is coming soon (not in current schema)
  const visibilityDisabled = true

  // Auto-sync slug from name unless user manually edited it
  const computedSlug = useMemo(() => {
    if (slugManuallyEdited) {
      return slugify(slug || name)
    }
    return slugify(name)
  }, [name, slug, slugManuallyEdited])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      if (!name.trim()) {
        setError("Network name is required")
        setSaving(false)
        return
      }

      if (!computedSlug.trim()) {
        setError("Network slug is required")
        setSaving(false)
        return
      }

      console.log("[v0] NetworkSettingsForm: Updating network:", {
        networkId,
        name,
        slug: computedSlug,
        description,
      })

      const { network: updated, error: updateError } = await updateNetwork(
        networkId,
        {
          name,
          slug: computedSlug,
          description,
        }
      )

      if (updateError || !updated) {
        console.error("[v0] NetworkSettingsForm: Update failed:", updateError)
        setError(updateError || "Failed to update network")
        setSaving(false)
        return
      }

      console.log("[v0] NetworkSettingsForm: Network updated successfully")
      setSuccess(true)
      setSaving(false)

      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] NetworkSettingsForm: Exception:", message)
      setError(message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Network settings updated successfully.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Network Details</h2>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="network-name">Network name</FieldLabel>
              <Input
                id="network-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="QuestLine"
                required
              />
              <FieldDescription>
                Shown in the header of your hosted guide site.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="network-slug">Subdomain / Slug</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="network-slug"
                  value={computedSlug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setSlugManuallyEdited(true)
                  }}
                  placeholder="questline"
                />
                <InputGroupAddon align="inline-end">
                  .guideforge.app
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Used in URLs and as a unique identifier. Automatically syncs from network name until manually edited.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="network-description">Description</FieldLabel>
              <Textarea
                id="network-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this network cover?"
              />
              <FieldDescription>
                Used on the network landing page and in social previews.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>

        <div className="border-t border-border pt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Coming Soon</h2>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="network-theme">Theme direction</FieldLabel>
              <Select disabled={themeDisabled}>
                <SelectTrigger id="network-theme">
                  <SelectValue placeholder="Theme editing coming soon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parchment">Parchment</SelectItem>
                  <SelectItem value="copper">Copper</SelectItem>
                  <SelectItem value="ember">Ember</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Theme selection is coming in Phase 2.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="network-visibility">Visibility</FieldLabel>
              <Select disabled={visibilityDisabled}>
                <SelectTrigger id="network-visibility">
                  <SelectValue placeholder="Visibility settings coming soon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Visibility control is coming in Phase 2.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <Button asChild variant="ghost" type="button">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </form>
  )
}
