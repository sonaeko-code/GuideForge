"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { getEnabledNetworkTypes } from "@/lib/guideforge/network-types-config"
import { getScaffoldTemplate, type ScaffoldTemplate } from "@/lib/guideforge/starter-scaffolds"
import { getAllNetworkThemes, getNetworkTheme } from "@/lib/guideforge/network-themes"
import { smartFillNetwork, type SmartFillScaffoldSuggestion } from "@/lib/guideforge/smart-fill-network"
import {
  getDefaultForgeRulesDraft,
  makeCollectionClientId,
  makeHubClientId,
  readWizardDraft,
  writeWizardDraft,
  type ScaffoldDraft,
  type ScaffoldHubDraft,
  type WizardDraft,
} from "@/lib/guideforge/wizard-state"
import { slugify as slugifyUtil } from "@/lib/guideforge/utils"
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

/**
 * Generic fallback hub list per type, used when no rich ScaffoldTemplate
 * exists for the selected network type (creator / training / community).
 */
const GENERIC_HUBS_BY_TYPE: Record<NetworkType, { name: string; collections: string[] }[]> = {
  gaming: [
    { name: "Beginner Guides", collections: ["Getting Started", "Core Concepts"] },
    { name: "Builds & Loadouts", collections: ["Starter Builds", "Endgame Builds"] },
    { name: "Boss Guides", collections: ["Early Bosses", "Late Bosses"] },
  ],
  repair: [
    { name: "Common Issues", collections: ["Quick Fixes", "Recurring Problems"] },
    { name: "Diagnostics", collections: ["Initial Triage", "Deep Diagnostics"] },
    { name: "Tools & Safety", collections: ["Required Tools", "Safety Procedures"] },
  ],
  sop: [
    { name: "Onboarding", collections: ["First Day", "First Week"] },
    { name: "Daily Operations", collections: ["Opening", "Closing"] },
    { name: "Compliance", collections: ["Internal Policies", "External Requirements"] },
  ],
  creator: [
    { name: "Fundamentals", collections: ["Core Concepts", "First Steps"] },
    { name: "Intermediate", collections: ["Common Patterns", "Building Skills"] },
    { name: "Advanced Topics", collections: ["Deep Dives", "Expert Techniques"] },
  ],
  training: [
    { name: "Onboarding", collections: ["First Day", "First Week"] },
    { name: "Core Curriculum", collections: ["Foundations", "Applied Practice"] },
    { name: "Assessments", collections: ["Knowledge Checks", "Certifications"] },
  ],
  community: [
    { name: "Getting Started", collections: ["Quickstart", "First Project"] },
    { name: "Best Practices", collections: ["Do This", "Avoid This"] },
    { name: "Community Highlights", collections: ["Top Creators", "Hot Takes"] },
  ],
}

/** Build a scaffold draft from a rich ScaffoldTemplate (gaming/repair/sop). */
function scaffoldDraftFromTemplate(template: ScaffoldTemplate): ScaffoldDraft {
  return {
    hubs: template.hubs.map<ScaffoldHubDraft>((hubGroup) => ({
      clientId: makeHubClientId(),
      name: hubGroup.hub.name,
      slug: hubGroup.hub.slug,
      description: hubGroup.hub.description,
      collections: hubGroup.collections.map((col) => ({
        clientId: makeCollectionClientId(),
        name: col.name,
        slug: col.slug,
        description: col.description,
      })),
    })),
  }
}

/** Build a scaffold draft from a Smart Fill scaffold suggestion. */
function scaffoldDraftFromSmartFill(suggestion: SmartFillScaffoldSuggestion): ScaffoldDraft {
  return {
    hubs: suggestion.hubs.map<ScaffoldHubDraft>((hub) => ({
      clientId: makeHubClientId(),
      name: hub.name,
      slug: hub.slug,
      description: hub.description,
      collections: hub.collections.map((col) => ({
        clientId: makeCollectionClientId(),
        name: col.name,
        slug: col.slug,
        description: col.description,
      })),
    })),
  }
}

/** Build a generic fallback scaffold for types without a rich template. */
function scaffoldDraftFromGeneric(type: NetworkType): ScaffoldDraft {
  const hubsSpec = GENERIC_HUBS_BY_TYPE[type] || GENERIC_HUBS_BY_TYPE.creator
  return {
    hubs: hubsSpec.map<ScaffoldHubDraft>((spec) => ({
      clientId: makeHubClientId(),
      name: spec.name,
      slug: slugifyUtil(spec.name),
      description: `${spec.name} for your ${type} network.`,
      collections: spec.collections.map((colName) => ({
        clientId: makeCollectionClientId(),
        name: colName,
        slug: slugifyUtil(colName),
        description: "",
      })),
    })),
  }
}

/** Build the default scaffold draft for any network type. */
function buildDefaultScaffoldDraft(type: NetworkType): ScaffoldDraft {
  const scaffoldId = SCAFFOLD_TEMPLATE_MAP[type]
  if (scaffoldId) {
    const template = getScaffoldTemplate(scaffoldId)
    if (template) return scaffoldDraftFromTemplate(template)
  }
  return scaffoldDraftFromGeneric(type)
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

  // Unified scaffold draft — populated from defaults, Smart Fill, or type-change.
  // Mutated in Step 3 after this form hands off via sessionStorage.
  const [scaffoldDraft, setScaffoldDraft] = useState<ScaffoldDraft>(() =>
    buildDefaultScaffoldDraft(initialType)
  )
  // Tracks whether the scaffold is still the unedited default for `scaffoldSourceType`.
  // Used to decide whether type-change can silently regenerate the scaffold.
  const [scaffoldIsDefaultForType, setScaffoldIsDefaultForType] = useState(true)
  const [scaffoldSourceType, setScaffoldSourceType] = useState<NetworkType>(initialType)

  // Restore the in-progress draft on mount if the user is returning from
  // Step 3 or Step 4 (via browser back, or by deep-linking back into Step 2).
  // We only run this once and only if a draft already exists; fresh entries
  // from /builder/network/welcome keep the type-based defaults.
  const didHydrateRef = useRef(false)
  useEffect(() => {
    if (didHydrateRef.current) return
    didHydrateRef.current = true
    const existing = readWizardDraft()
    if (!existing) return
    console.log("[v0] CreateNetworkForm: restoring wizard draft for Step 2:", {
      name: existing.name,
      type: existing.type,
      hubs: existing.scaffold.hubs.length,
    })
    setName(existing.name)
    setType(existing.type)
    setDescription(existing.description)
    setTheme(existing.theme)
    setVisibility(existing.visibility)
    setDomainPrefix(existing.slug)
    // The slug was previously persisted by Step 2's own slugify pass, so
    // mark it as manually edited so the auto-slug doesn't overwrite it
    // unless the user changes the name.
    setDomainPrefixManuallyEdited(true)
    setScaffoldDraft(existing.scaffold)
    setScaffoldIsDefaultForType(existing.scaffoldIsDefaultForType)
    setScaffoldSourceType(existing.scaffoldSourceType ?? existing.type)
  }, [])

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
      // Smart Fill: merge results, preserving manual selections for invalid Smart Fill outputs.
      // Only update fields where Smart Fill provided meaningful values.
      if (result.name && result.name.trim()) {
        setName(result.name)
      }
      if (result.description && result.description.trim()) {
        setDescription(result.description)
      }
      // Preserve manual type if Smart Fill didn't return valid one
      let nextType: NetworkType = type
      if (result.type && ["gaming", "repair", "sop", "creator", "training", "community"].includes(result.type)) {
        nextType = result.type
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

      // Replace the scaffold draft with the Smart Fill scaffold suggestion.
      // This is intentional: Smart Fill is the user opting into a generated scaffold.
      if (result.suggestedScaffold && result.suggestedScaffold.hubs.length > 0) {
        setScaffoldDraft(scaffoldDraftFromSmartFill(result.suggestedScaffold))
        setScaffoldIsDefaultForType(true) // treat Smart Fill output as a fresh baseline
        setScaffoldSourceType(nextType)
      } else if (nextType !== scaffoldSourceType) {
        // No scaffold suggestion but type changed — fall back to the new type's default.
        setScaffoldDraft(buildDefaultScaffoldDraft(nextType))
        setScaffoldIsDefaultForType(true)
        setScaffoldSourceType(nextType)
      }

      setRoughIdea("")
      setError(null)
      console.log("[v0] Smart Fill Network: Applied results", { type: result.type, theme: result.theme, name: result.name })
    } else {
      setError("Could not parse your idea. Try being more specific.")
    }
  }

  function handleTypeChange(newType: NetworkType) {
    if (newType === type) return

    // If the user has edited the scaffold, confirm before regenerating to the new type's defaults.
    // This preserves user work (confirmation #3).
    if (!scaffoldIsDefaultForType) {
      const confirmed =
        typeof window === "undefined" ||
        window.confirm(
          `Reset scaffold to the ${newType} defaults? Your current hub and collection edits will be replaced.`
        )
      if (!confirmed) {
        return
      }
    }

    const newDefaults = DEFAULTS_BY_TYPE[newType]
    setType(newType)
    setName(newDefaults.name)
    setDescription(newDefaults.description)
    setTheme(newDefaults.theme)
    setDomainPrefix(newDefaults.slug)
    setDomainPrefixManuallyEdited(false)
    setScaffoldDraft(buildDefaultScaffoldDraft(newType))
    setScaffoldIsDefaultForType(true)
    setScaffoldSourceType(newType)
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
      // Validate required fields before handing off to Step 3.
      if (!name.trim()) {
        throw new Error("Network name is required")
      }
      if (!slug.trim()) {
        throw new Error("Subdomain is required")
      }
      if (!type || !["gaming", "repair", "sop", "creator", "training", "community"].includes(type)) {
        throw new Error(`Invalid network type: ${type}.`)
      }
      if (!theme || !["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(theme)) {
        throw new Error(`Invalid theme: ${theme}.`)
      }
      if (!scaffoldDraft.hubs || scaffoldDraft.hubs.length === 0) {
        throw new Error("Scaffold has no hubs. Use Smart Fill or pick a different network type.")
      }

      // Persist the wizard draft to sessionStorage and hand off to Step 3.
      // The actual Supabase create happens at the end of Step 4.
      // Preserve forge rules if the user has already visited Step 4 and come back.
      const existingDraft = readWizardDraft()
      const draft: WizardDraft = {
        version: 1,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        type,
        theme,
        visibility,
        scaffoldIsDefaultForType,
        scaffoldSourceType,
        scaffold: scaffoldDraft,
        forgeRules: existingDraft?.forgeRules ?? getDefaultForgeRulesDraft(),
        createdAt: existingDraft?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      console.log("[v0] CreateNetworkForm: Writing wizard draft and routing to Step 3:", {
        name: draft.name,
        type: draft.type,
        hubs: draft.scaffold.hubs.length,
      })

      writeWizardDraft(draft)
      router.push("/builder/network/starter-pages")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] CreateNetworkForm: Step 2 submit exception:", message)
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
                  Determines the default scaffold (hubs and collections) and the starter Forge Rules for this network.
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

      {step === "preview" && scaffoldDraft.hubs.length > 0 && (() => {
        const previewTheme = getNetworkTheme(theme)
        const totalCollections = scaffoldDraft.hubs.reduce(
          (sum, h) => sum + h.collections.length,
          0,
        )
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
                {scaffoldDraft.hubs.map((hub) => (
                  <div
                    key={hub.clientId}
                    className={`rounded-md p-3 border ${previewTheme.cardClasses} ${previewTheme.borderClasses}`}
                  >
                    <p className={`text-sm font-semibold ${previewTheme.accentClasses}`}>{hub.name}</p>
                    {hub.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{hub.description}</p>
                    )}
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {hub.collections.map((collection) => (
                        <li key={collection.clientId}>
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs ${previewTheme.badgeClasses}`}
                          >
                            {collection.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Will create: <strong>{scaffoldDraft.hubs.length}</strong> hubs and{" "}
                <strong>{totalCollections}</strong> collections
                {" · "}Theme: <strong>{previewTheme.label}</strong>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                You&apos;ll be able to edit, add, or remove hubs and collections on the next step before anything is saved.
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
              <Button
                type="button"
                size="lg"
                className="gap-2"
                onClick={handleContinueToPreview}
                disabled={submitting || !name.trim()}
              >
                Preview Scaffold
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => setStep("configure")}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Button>
              <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
                {submitting ? "Saving..." : "Continue to Starter Pages"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
