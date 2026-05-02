"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Globe, Lock, Sparkles, CheckCircle2 } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { SectionCard } from "@/components/guideforge/shared"
import { generateMockNetworkDraft } from "@/lib/guideforge/mock-generator"
import { createNetwork } from "@/lib/guideforge/supabase-networks"
import { getEnabledNetworkTypes } from "@/lib/guideforge/network-types-config"
import type {
  NetworkType,
  ThemeDirection,
  Visibility,
} from "@/lib/guideforge/types"

interface CreateNetworkFormProps {
  initialType: NetworkType
}

const NETWORK_TYPE_LABEL: Record<NetworkType, string> = {
  gaming: "Gaming Guide Network",
  repair: "Repair / Support Platform",
  sop: "Business SOP Portal",
  creator: "Creator Guide Hub",
  training: "Training Library",
  community: "Community Knowledge Base",
}

const THEME_OPTIONS: { value: ThemeDirection; label: string; hint: string }[] =
  [
    { value: "parchment", label: "Parchment", hint: "Warm cream + graphite, calm and crafted" },
    { value: "copper", label: "Copper", hint: "Muted copper accent on warm neutrals" },
    { value: "neutral", label: "Neutral", hint: "Brand-agnostic baseline" },
    { value: "industrial", label: "Industrial", hint: "Repair / SOP feel" },
    { value: "soft", label: "Soft", hint: "Creator and training networks" },
    { value: "arcane", label: "Arcane", hint: "Cool slate with violet edges" },
    { value: "ember", label: "Ember", hint: "Warm amber, gaming-leaning" },
  ]

const DEFAULTS_BY_TYPE: Record<
  NetworkType,
  { name: string; description: string; theme: ThemeDirection; slug: string }
> = {
  gaming: {
    name: "QuestLine",
    description:
      "A structured gaming guide network for builds, walkthroughs, news, and community knowledge.",
    theme: "ember",
    slug: "questline",
  },
  repair: {
    name: "FieldFix",
    description:
      "Procedural repair guides with safety callouts, model targeting, and revision history.",
    theme: "industrial",
    slug: "fieldfix",
  },
  sop: {
    name: "Runbook",
    description:
      "Process owners, revision numbers, and structured SOPs your team will actually follow.",
    theme: "industrial",
    slug: "runbook",
  },
  creator: {
    name: "My Guide Hub",
    description:
      "A personal teaching network for tutorials, courses, and reference material.",
    theme: "soft",
    slug: "my-guide-hub",
  },
  training: {
    name: "Atlas",
    description:
      "Curriculum-shaped collections with audience targeting and prerequisites.",
    theme: "parchment",
    slug: "atlas",
  },
  community: {
    name: "Commons",
    description:
      "Structured community guides with trust tiers and contributor credit.",
    theme: "copper",
    slug: "commons",
  },
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

export function CreateNetworkForm({ initialType }: CreateNetworkFormProps) {
  const defaults = DEFAULTS_BY_TYPE[initialType]
  const router = useRouter()

  const [name, setName] = useState(defaults.name)
  const [type, setType] = useState<NetworkType>(initialType)
  const [description, setDescription] = useState(defaults.description)
  const [theme, setTheme] = useState<ThemeDirection>(defaults.theme)
  const [visibility, setVisibility] = useState<Visibility>("public")
  const [domainPrefix, setDomainPrefix] = useState(defaults.slug)
  const [submitting, setSubmitting] = useState(false)
  const [autofilled, setAutofilled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = useMemo(() => slugify(domainPrefix || name), [domainPrefix, name])

  function handleAutofill() {
    const draft = generateMockNetworkDraft(type)
    setName(draft.name)
    setDescription(draft.description)
    setTheme(draft.themeDirection)
    setDomainPrefix(draft.subdomainSuggestion)
    setAutofilled(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      console.log("[v0] Creating network:", { name, type, slug })

      const { network, error: createError } = await createNetwork({
        name,
        type,
        description,
        theme,
        visibility,
        slug,
        primaryColor: theme === "ember" ? "#f97316" : "#6366f1",
      })

      if (createError || !network.id) {
        console.error("[v0] Network creation error:", createError)
        setError(createError || "Failed to create network")
        return
      }

      console.log("[v0] Network created:", network.id)
      console.log("[v0] Routing to network dashboard:", network.id)

      // Route to the new network's dashboard
      router.push(`/builder/network/${network.id}/dashboard`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Network creation exception:", message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Autofill with GuideForge:</span> Generate a network draft with starter name and theme based on your network type. <span className="text-xs text-muted-foreground">Mock generation — no credits used.</span>
            </p>
          </div>
          {autofilled && (
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
        </div>
        {autofilled && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Network draft generated. You can edit anything before continuing.</p>
        )}
      </div>

      <SectionCard title="Network basics" description="Name your network and tell readers what it covers.">
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
            <FieldLabel htmlFor="network-type">Network type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => setType(value as NetworkType)}
            >
              <SelectTrigger id="network-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getEnabledNetworkTypes().map((networkType) => (
                  <SelectItem key={networkType.id} value={networkType.id as NetworkType}>
                    {networkType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Determines starter Forge Rules and starter pages.
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
      </SectionCard>

      <SectionCard
        title="Theme and visibility"
        description="Pick a starting theme. You can fully customize branding later."
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="network-theme">Theme direction</FieldLabel>
            <Select
              value={theme}
              onValueChange={(value) => setTheme(value as ThemeDirection)}
            >
              <SelectTrigger id="network-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} — {opt.hint}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="network-visibility">
                Public network
              </FieldLabel>
              <FieldDescription>
                {visibility === "public"
                  ? "Anyone with the link can read this network."
                  : "Only you can see this network for now."}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="network-visibility"
              checked={visibility === "public"}
              onCheckedChange={(checked) =>
                setVisibility(checked ? "public" : "private")
              }
              aria-label="Toggle public visibility"
            />
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard
        title="Domain"
        description="A placeholder subdomain for the hosted guide site."
      >
        <Field>
          <FieldLabel htmlFor="network-domain">Subdomain</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              {visibility === "public" ? (
                <Globe className="size-4" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              id="network-domain"
              value={domainPrefix}
              onChange={(e) => setDomainPrefix(e.target.value)}
              placeholder="questline"
            />
            <InputGroupAddon align="inline-end">
              .guideforge.app
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            You can connect a custom domain after publishing. Resolved slug:{" "}
            <span className="font-mono text-foreground">{slug || "—"}</span>
          </FieldDescription>
        </Field>
      </SectionCard>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button asChild variant="ghost" type="button">
          <Link href="/builder/welcome">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button type="button" size="lg" variant="secondary" className="gap-2" onClick={handleAutofill} disabled={submitting}>
            <Sparkles className="size-4" aria-hidden="true" />
            Autofill Network
          </Button>
          <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
            {submitting ? "Creating Network..." : "Create Network"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </form>
  )
}
