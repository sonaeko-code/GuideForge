"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Globe, Lock, Check, Zap } from "lucide-react"
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
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionCard } from "@/components/guideforge/shared"
import { generateMockNetworkDraft } from "@/lib/guideforge/mock-generator"
import { createNetwork } from "@/lib/guideforge/supabase-networks"
import { createNetworkScaffold } from "@/lib/guideforge/create-network-scaffold"
import { getEnabledNetworkTypes } from "@/lib/guideforge/network-types-config"
import { getScaffoldTemplate } from "@/lib/guideforge/starter-scaffolds"
import { getAllNetworkThemes, getNetworkTheme } from "@/lib/guideforge/network-themes"
import { smartFillNetwork } from "@/lib/guideforge/smart-fill-network"
import type {
  NetworkType,
  ThemeDirection,
  Visibility,
} from "@/lib/guideforge/types"

interface CreateNetworkFormProps {
  initialType: NetworkType
}

const SCAFFOLD_TEMPLATE_MAP: Partial<Record<NetworkType, string>> = {
  gaming: "gaming",
  repair: "repair",
  sop: "sop",
}

const NETWORK_TYPE_LABEL: Record<NetworkType, string> = {
  gaming: "Gaming Guide Network",
  repair: "Repair / Support Platform",
  sop: "Business SOP Portal",
  creator: "Creator Guide Hub",
  training: "Training Library",
  community: "Community Knowledge Base",
}

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
  // Future: Network Settings should allow editing network name, slug, description, hubs, and collections.
  const defaults = DEFAULTS_BY_TYPE[initialType]
  const router = useRouter()

  const [step, setStep] = useState<"configure" | "preview">("configure")
  const [name, setName] = useState(defaults.name)
  const [type, setType] = useState<NetworkType>(initialType)
  const [description, setDescription] = useState(defaults.description)
  const [theme, setTheme] = useState<ThemeDirection>(defaults.theme)
  const [visibility, setVisibility] = useState<Visibility>("public")
  const [domainPrefix, setDomainPrefix] = useState(defaults.slug)
  const [domainPrefixManuallyEdited, setDomainPrefixManuallyEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roughIdea, setRoughIdea] = useState("")

  // Compute current scaffold template based on current type (not initialType)
  const currentScaffoldId = SCAFFOLD_TEMPLATE_MAP[type]
  const scaffoldTemplate = currentScaffoldId ? getScaffoldTemplate(currentScaffoldId) : null

  // Auto-sync slug from name unless user manually edited it
  const slug = useMemo(() => {
    if (domainPrefixManuallyEdited) {
      return slugify(domainPrefix || name)
    }
    return slugify(name)
  }, [name, domainPrefix, domainPrefixManuallyEdited])

  function handleAutofill() {
    const draft = generateMockNetworkDraft(type)
    setName(draft.name)
    setDescription(draft.description)
    setTheme(draft.themeDirection)
    setDomainPrefix(draft.subdomainSuggestion)
    setDomainPrefixManuallyEdited(false)
  }

  function handleSmartFill() {
    if (!roughIdea.trim()) {
      setError("Please describe your network idea")
      return
    }

    const result = smartFillNetwork(roughIdea)
    if (result.success) {
      // Smart Fill: merge results, preserving manual selections for invalid Smart Fill outputs
      // Only update fields where Smart Fill provided meaningful values
      if (result.name && result.name.trim()) {
        setName(result.name)
      }
      if (result.description && result.description.trim()) {
        setDescription(result.description)
      }
      // Preserve manual type if Smart Fill didn't return valid one
      if (result.type && ["gaming", "repair", "sop", "creator", "training", "community"].includes(result.type)) {
        setType(result.type)
      }
      // Preserve manual theme if Smart Fill didn't return valid one
      if (result.theme && ["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(result.theme)) {
        setTheme(result.theme)
      }
      if (result.slug && result.slug.trim()) {
        setDomainPrefix(result.slug)
        setDomainPrefixManuallyEdited(false)
      }
      setRoughIdea("")
      setError(null)
      console.log("[v0] Smart Fill Network: Applied results", { type: result.type, theme: result.theme, name: result.name })
    } else {
      setError("Could not parse your idea. Try being more specific.")
    }
  }

  function handleTypeChange(newType: NetworkType) {
    const newDefaults = DEFAULTS_BY_TYPE[newType]
    setType(newType)
    setName(newDefaults.name)
    setDescription(newDefaults.description)
    setTheme(newDefaults.theme)
    setDomainPrefix(newDefaults.slug)
    setDomainPrefixManuallyEdited(false)
    setStep("configure")
  }

  function handleContinueToPreview() {
    if (!name.trim()) {
      setError("Network name is required")
      return
    }
    if (!slug.trim()) {
      setError("Subdomain is required")
      return
    }
    setError(null)
    setStep("preview")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validate required fields before save
      if (!name.trim()) {
        throw new Error("Network name is required")
      }
      if (!slug.trim()) {
        throw new Error("Subdomain is required")
      }
      if (!type || !["gaming", "repair", "sop", "creator", "training", "community"].includes(type)) {
        throw new Error(`Invalid network type: ${type}. Using default 'gaming'.`)
      }
      if (!theme || !["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(theme)) {
        throw new Error(`Invalid theme: ${theme}. Using default 'parchment'.`)
      }

      console.log("[v0] CreateNetworkForm: Pre-save validation:", { name, type, theme, slug })

      // Check if this is a scaffold type
      if (currentScaffoldId) {
        if (!scaffoldTemplate) {
          throw new Error(`Invalid scaffold template: ${currentScaffoldId}`)
        }

        console.log("[v0] CreateNetworkForm: Creating scaffold network:", { name, type, slug, scaffoldId: currentScaffoldId })

        const result = await createNetworkScaffold(scaffoldTemplate, {
          networkName: name,
          networkSlug: slug,
          networkDescription: description,
        })

        if (!result.success || !result.network?.id) {
          console.error("[v0] CreateNetworkForm: Scaffold creation failed:", result.error)
          setError(result.error || "Failed to create network scaffold")
          return
        }

        console.log("[v0] CreateNetworkForm: Scaffold created:", result.network.id)
        console.log("[v0] CreateNetworkForm: Created", result.hubs?.length || 0, "hubs and", result.collections?.length || 0, "collections")

        // Route to the new network's dashboard
        router.push(`/builder/network/${result.network.id}/dashboard`)
      } else {
        // Create blank network for non-scaffold types
        console.log("[v0] CreateNetworkForm: Creating blank network:", { name, type, slug, theme })

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
          console.error("[v0] CreateNetworkForm: Network creation error:", createError)
          setError(createError || "Failed to create network")
          return
        }

        console.log("[v0] CreateNetworkForm: Blank network created:", network.id)
        console.log("[v0] CreateNetworkForm: Routing to network dashboard:", network.id)

        // Route to the new network's dashboard
        router.push(`/builder/network/${network.id}/dashboard`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] CreateNetworkForm: Creation exception:", message)
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

      {step === "configure" && (
        <>
          {/* Smart Fill Panel — always visible, primary flow */}
          <Card className="p-5 border-amber-500/30 bg-amber-500/5">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Start with a rough idea</p>
                <p className="text-xs text-muted-foreground">
                  Describe the network you want to build and GuideForge will fill in the name, type, theme, hubs, and slug.
                </p>
              </div>
              <Textarea
                value={roughIdea}
                onChange={(e) => setRoughIdea(e.target.value)}
                placeholder={`e.g. "A gaming guide network for a survival RPG — beginner guides, crafting, builds, boss fights, patch notes, and community strategies."`}
                rows={3}
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSmartFill()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Quick Example
                </button>
                <Button type="button" size="sm" onClick={handleSmartFill} className="gap-1.5">
                  <Zap className="size-3.5" aria-hidden="true" />
                  Smart Fill Network
                </Button>
              </div>
            </div>
          </Card>

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
                  onValueChange={(value) => handleTypeChange(value as NetworkType)}
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
                  {SCAFFOLD_TEMPLATE_MAP[type] ? "Will create a scaffold with pre-configured hubs and collections." : "Determines starter Forge Rules and starter pages."}
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
            description="Pick a starting theme. Visual themes help personalize your network's identity. You can fully customize branding later."
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="network-theme">Theme direction</FieldLabel>
                <FieldDescription className="mb-4">
                  Select a visual direction for your network. Each theme has its own color palette and styling. The preview below updates as you select.
                </FieldDescription>
                
                {/* Visual Theme Cards */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
                  {getAllNetworkThemes().map((themeOption) => (
                    <button
                      key={themeOption.id}
                      type="button"
                      onClick={() => setTheme(themeOption.id)}
                      className={`group relative rounded-lg p-3 border-2 transition-all ${
                        theme === themeOption.id
                          ? `border-foreground ${themeOption.borderClasses} ${themeOption.bgClasses}`
                          : "border-border/50 hover:border-foreground/30"
                      }`}
                    >
                      {/* Preview background */}
                      <div className={`absolute inset-0 rounded-lg ${themeOption.previewClasses} opacity-40 group-hover:opacity-60 transition-opacity`} />
                      
                      {/* Content */}
                      <div className="relative flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{themeOption.label}</h4>
                          {theme === themeOption.id && (
                            <Check className="size-4 text-foreground flex-shrink-0" aria-hidden="true" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground text-left">{themeOption.hint}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Theme Preview Panel */}
              <div className="mt-6 p-4 rounded-lg border border-border/50 overflow-hidden">
                {(() => {
                  const selectedTheme = getAllNetworkThemes().find((t) => t.id === theme)
                  if (!selectedTheme) return null
                  
                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Theme Preview</h4>
                      
                      {/* Sample Network Header */}
                      <div className={`rounded-md p-4 ${selectedTheme.previewClasses} ${selectedTheme.borderClasses} border`}>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${selectedTheme.bgClasses} border ${selectedTheme.borderClasses}`} />
                            <div>
                              <p className={`text-sm font-bold ${selectedTheme.accentClasses}`}>{name || "Network Name"}</p>
                              <p className="text-xs text-muted-foreground">Sample network header</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sample Cards */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Hub Card */}
                        <div className={`rounded-md p-3 ${selectedTheme.cardClasses} border ${selectedTheme.borderClasses}`}>
                          <p className="text-xs font-semibold text-foreground mb-1">Sample Hub</p>
                          <p className={`text-xs ${selectedTheme.accentClasses}`}>3 Collections</p>
                        </div>
                        
                        {/* Guide Card */}
                        <div className={`rounded-md p-3 ${selectedTheme.cardClasses} border ${selectedTheme.borderClasses}`}>
                          <p className="text-xs font-semibold text-foreground mb-1">Sample Guide</p>
                          <Badge className={`text-xs ${selectedTheme.badgeClasses}`}>Draft</Badge>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        <strong>Best for:</strong> {selectedTheme.bestFor.join(", ")}
                      </p>
                    </div>
                  )
                })()}
              </div>

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
                  value={slug}
                  onChange={(e) => {
                    setDomainPrefix(e.target.value)
                    setDomainPrefixManuallyEdited(true)
                  }}
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
        </>
      )}

      {step === "preview" && scaffoldTemplate && (() => {
        const previewTheme = getNetworkTheme(theme)
        return (
          <>
            {/* Themed scaffold preview — matches what the created network page will look like */}
            <div className={`rounded-xl border p-6 ${previewTheme.cardClasses} ${previewTheme.borderClasses}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Scaffold Preview
              </p>

              {/* Network header mock */}
              <div className={`rounded-lg p-4 mb-4 ${previewTheme.previewClasses} border ${previewTheme.borderClasses}`}>
                <p className={`text-lg font-black tracking-tight ${previewTheme.accentClasses}`}>{name || "Network Name"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {slug}.guideforge.app
                </p>
              </div>

              {/* Hub list */}
              <div className="space-y-2 mb-4">
                {scaffoldTemplate.hubs.map((hubGroup, hubIdx) => (
                  <div key={hubIdx} className={`rounded-md p-3 border ${previewTheme.cardClasses} ${previewTheme.borderClasses}`}>
                    <p className={`text-sm font-semibold ${previewTheme.accentClasses}`}>{hubGroup.hub.name}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {hubGroup.collections.map((collection, colIdx) => (
                        <li key={colIdx}>
                          <span className={`inline-block rounded px-2 py-0.5 text-xs ${previewTheme.badgeClasses}`}>
                            {collection.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Will create:{" "}
                <strong>{scaffoldTemplate.hubs.length}</strong> hubs and{" "}
                <strong>{scaffoldTemplate.hubs.reduce((sum, h) => sum + h.collections.length, 0)}</strong> collections
                {" · "}Theme: <strong>{previewTheme.label}</strong>
              </p>
            </div>
          </>
        )
      })()}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button asChild variant="ghost" type="button">
          <Link href="/builder/welcome">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          {step === "configure" && (
            <>
              <Button type="button" size="lg" className="gap-2" onClick={handleContinueToPreview} disabled={submitting || !name.trim()}>
                {scaffoldTemplate ? "Preview Scaffold" : "Continue"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button type="button" size="lg" variant="outline" className="gap-2" onClick={() => setStep("configure")} disabled={submitting}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
                {submitting ? (scaffoldTemplate ? "Creating Scaffold..." : "Creating Network...") : "Create Network"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
