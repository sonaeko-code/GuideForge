"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Globe, Lock, Loader2, Zap } from "lucide-react"
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
import { readIntakeSession, clearIntakeSession } from "@/lib/guideforge/intake-session"
import {
  getEnabledRegistryTypes,
  getRegistryTypeById,
  getDefaultRegistryId,
  VALID_REGISTRY_IDS,
  type NetworkTypeEntry,
} from "@/lib/guideforge/network-types"
import { slugify as slugifyUtil } from "@/lib/guideforge/utils"
import type { ThemeDirection, Visibility } from "@/lib/guideforge/types"

// ---------------------------------------------------------------------------
// Scaffold template map — keyed by registry type id, value = ScaffoldTemplate.id
// ---------------------------------------------------------------------------

const SCAFFOLD_TEMPLATE_MAP: Record<string, string> = {
  gaming: "gaming",
  tech_repair: "repair",
  home_systems: "home_systems",
  small_business: "sop",
  restaurant_training: "sop",
}

// ---------------------------------------------------------------------------
// Scaffold builder helpers
// ---------------------------------------------------------------------------

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
 * Per-type generic hub+collection specs used when no rich ScaffoldTemplate exists.
 * Keys are registry type ids.
 */
const GENERIC_HUBS_BY_TYPE: Record<string, { name: string; collections: string[] }[]> = {
  gaming: [
    { name: "Beginner Guides", collections: ["Getting Started", "Core Concepts"] },
    { name: "Builds & Loadouts", collections: ["Starter Builds", "Endgame Builds"] },
    { name: "Boss Guides", collections: ["Early Bosses", "Late Bosses"] },
  ],
  tech_repair: [
    { name: "Common Issues", collections: ["Quick Fixes", "Recurring Problems"] },
    { name: "Diagnostics", collections: ["Initial Triage", "Deep Diagnostics"] },
    { name: "Tools & Safety", collections: ["Required Tools", "Safety Procedures"] },
  ],
  small_business: [
    { name: "Launch Checklist", collections: ["Branding Basics", "Legal & Admin"] },
    { name: "Client Onboarding", collections: ["Intro Workflow", "Contracts & Billing"] },
    { name: "Operations", collections: ["Daily SOPs", "Team Handoffs"] },
  ],
  wellness_training: [
    { name: "Programs", collections: ["Beginner Plans", "Intermediate Plans"] },
    { name: "Nutrition", collections: ["Meal Planning", "Supplement Basics"] },
    { name: "Habits & Mindset", collections: ["Daily Habits", "Recovery"] },
  ],
  home_systems: [
    { name: "Family Routines", collections: ["Daily Routines", "School & Activities"] },
    { name: "Medications & Health", collections: ["Medication Schedules", "Allergies"] },
    { name: "Emergency & Safety", collections: ["Emergency Contacts", "Emergency Plans"] },
    { name: "Seasonal Maintenance", collections: ["Spring Tasks", "Fall Tasks"] },
    { name: "Baby & Infant Care", collections: ["Supplies", "Feeding & Nutrition"] },
  ],
  restaurant_training: [
    { name: "Onboarding", collections: ["First Day", "First Week"] },
    { name: "Daily Operations", collections: ["Opening Procedures", "Closing Procedures"] },
    { name: "Food Safety", collections: ["Temperature Logs", "Sanitation Checklists"] },
  ],
  creator_workflow: [
    { name: "Content Planning", collections: ["Content Calendar", "Topic Ideation"] },
    { name: "Production", collections: ["Filming Checklist", "Editing Workflow"] },
    { name: "Publishing", collections: ["Upload Checklist", "Promotion Workflow"] },
  ],
  personal_knowledge: [
    { name: "Daily Planning", collections: ["Morning Routine", "Weekly Review"] },
    { name: "Projects", collections: ["Active Projects", "On-Hold Projects"] },
    { name: "Learning & Goals", collections: ["Learning Notes", "Long-Term Goals"] },
  ],
  general: [
    { name: "Getting Started", collections: ["Quickstart", "Key Concepts"] },
    { name: "Reference", collections: ["Data & Tables", "Glossary"] },
    { name: "Resources", collections: ["Recommended Reading", "Tools & Templates"] },
  ],
}

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

function scaffoldDraftFromGeneric(typeId: string): ScaffoldDraft {
  const hubsSpec = GENERIC_HUBS_BY_TYPE[typeId] || GENERIC_HUBS_BY_TYPE.general
  return {
    hubs: hubsSpec.map<ScaffoldHubDraft>((spec) => ({
      clientId: makeHubClientId(),
      name: spec.name,
      slug: slugifyUtil(spec.name),
      description: `${spec.name} for your network.`,
      collections: spec.collections.map((colName) => ({
        clientId: makeCollectionClientId(),
        name: colName,
        slug: slugifyUtil(colName),
        description: "",
      })),
    })),
  }
}

function buildDefaultScaffoldDraft(typeId: string): ScaffoldDraft {
  const scaffoldId = SCAFFOLD_TEMPLATE_MAP[typeId]
  if (scaffoldId) {
    const template = getScaffoldTemplate(scaffoldId)
    if (template) return scaffoldDraftFromTemplate(template)
  }
  return scaffoldDraftFromGeneric(typeId)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CreateNetworkFormProps {
  initialType: string
}

export function CreateNetworkForm({ initialType }: CreateNetworkFormProps) {
  const router = useRouter()

  // Ensure initialType is always a valid registry id
  const safeInitialType = VALID_REGISTRY_IDS.has(initialType)
    ? initialType
    : getDefaultRegistryId()

  const initialEntry = getRegistryTypeById(safeInitialType)!

  const [step, setStep] = useState<"configure" | "preview">("configure")
  const [name, setName] = useState(initialEntry.defaultName)
  const [typeId, setTypeId] = useState<string>(safeInitialType)
  const [description, setDescription] = useState(initialEntry.defaultDescription)
  const [theme, setTheme] = useState<ThemeDirection>(initialEntry.defaultTheme)
  const [visibility, setVisibility] = useState<Visibility>("public")
  const [domainPrefix, setDomainPrefix] = useState(initialEntry.defaultSlug)
  const [domainPrefixManuallyEdited, setDomainPrefixManuallyEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roughIdea, setRoughIdea] = useState("")
  const [isSmartFilling, setIsSmartFilling] = useState(false)

  const [scaffoldDraft, setScaffoldDraft] = useState<ScaffoldDraft>(() =>
    buildDefaultScaffoldDraft(safeInitialType)
  )
  const [scaffoldIsDefaultForType, setScaffoldIsDefaultForType] = useState(true)
  const [scaffoldSourceType, setScaffoldSourceType] = useState<string>(safeInitialType)

  // Restore draft if returning from Step 3/4
  const didHydrateRef = useRef(false)
  const didAutoSmartFillRef = useRef(false)
  
  useEffect(() => {
    if (didHydrateRef.current) return
    didHydrateRef.current = true
    const existing = readWizardDraft()
    if (!existing) {
      // No existing draft; check for intake session from welcome
      const intakeSession = readIntakeSession()
      
      if (intakeSession.idea) {
        setRoughIdea(intakeSession.idea)
      }

      if (intakeSession.routerResult) {
        const routerResult = intakeSession.routerResult
        // Auto-apply the recommended network type and theme if available
        if (
          routerResult.recommendedNetworkTypeId &&
          VALID_REGISTRY_IDS.has(routerResult.recommendedNetworkTypeId)
        ) {
          setTypeId(routerResult.recommendedNetworkTypeId)
        }
        if (
          routerResult.suggestedThemeId &&
          ["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(
            routerResult.suggestedThemeId
          )
        ) {
          setTheme(routerResult.suggestedThemeId)
        }
      }

      // Clear intake session after hydration
      clearIntakeSession()
      return
    }
    // readWizardDraft already sanitizes type to a valid registry id
    setName(existing.name)
    setTypeId(existing.type)
    setDescription(existing.description)
    setTheme(existing.theme)
    setVisibility(existing.visibility)
    setDomainPrefix(existing.slug)
    setDomainPrefixManuallyEdited(true)
    setScaffoldDraft(existing.scaffold)
    setScaffoldIsDefaultForType(existing.scaffoldIsDefaultForType)
    setScaffoldSourceType(existing.scaffoldSourceType ?? existing.type)
    // Also restore roughIdea if it was stored in the draft
    if (existing.roughIdea) {
      setRoughIdea(existing.roughIdea)
    }
  }, [])

  // Auto-run Smart Fill once on first mount if we just hydrated from welcome with an idea
  // Do NOT run on existing wizard draft restores
  useEffect(() => {
    if (didAutoSmartFillRef.current) return
    if (!didHydrateRef.current) return
    
    const existing = readWizardDraft()
    if (existing) {
      // Existing draft — do NOT auto-Smart-Fill
      return
    }

    // Check if we have roughIdea from intake hydration
    if (roughIdea.trim() && roughIdea.length > 10) {
      didAutoSmartFillRef.current = true
      console.log('[v0] CreateNetworkForm: Auto-running Smart Fill on welcome intake hydration')
      
      const result = smartFillNetwork(roughIdea)
      if (!result.success) {
        console.log('[v0] Auto-Smart-Fill could not parse the idea, leaving defaults')
        return
      }

      if (result.name && result.name.trim()) setName(result.name)
      if (result.description && result.description.trim()) setDescription(result.description)

      // Apply detected type if valid
      let nextTypeId = typeId
      if (result.type && VALID_REGISTRY_IDS.has(result.type)) {
        nextTypeId = result.type
        setTypeId(result.type)
      }

      // Apply theme
      if (
        result.theme &&
        ["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(
          result.theme
        )
      ) {
        setTheme(result.theme)
      }

      // Apply slug
      if (result.slug && result.slug.trim()) {
        setDomainPrefix(result.slug)
        setDomainPrefixManuallyEdited(false)
      }

      // Apply scaffold
      if (result.suggestedScaffold && result.suggestedScaffold.hubs.length > 0) {
        setScaffoldDraft(scaffoldDraftFromSmartFill(result.suggestedScaffold))
        setScaffoldIsDefaultForType(true)
        setScaffoldSourceType(nextTypeId)
      } else if (nextTypeId !== scaffoldSourceType) {
        setScaffoldDraft(buildDefaultScaffoldDraft(nextTypeId))
        setScaffoldIsDefaultForType(true)
        setScaffoldSourceType(nextTypeId)
      }
    }
  }, [roughIdea, typeId, scaffoldSourceType])

  const slug = useMemo(() => {
    if (domainPrefixManuallyEdited) return slugify(domainPrefix || name)
    return slugify(name)
  }, [name, domainPrefix, domainPrefixManuallyEdited])

  // Current registry entry (always defined — typeId is always valid)
  const currentEntry: NetworkTypeEntry =
    getRegistryTypeById(typeId) ?? getRegistryTypeById(getDefaultRegistryId())!

  function handleAutofill() {
    const draft = generateMockNetworkDraft(currentEntry.dbType)
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

    setIsSmartFilling(true)
    setError(null)

    // Defer to next tick so the loading state renders before the synchronous work
    setTimeout(() => {
      try {
        const result = smartFillNetwork(roughIdea)
        if (!result.success) {
          setError("Could not parse your idea. Try being more specific.")
          setIsSmartFilling(false)
          return
        }

        if (result.name && result.name.trim()) setName(result.name)
        if (result.description && result.description.trim()) setDescription(result.description)

        // Smart Fill returns a registry id (after our update below).
        // Only apply if it's a valid registry id; preserve the user's selection otherwise.
        let nextTypeId = typeId
        if (result.type && VALID_REGISTRY_IDS.has(result.type)) {
          nextTypeId = result.type
          setTypeId(result.type)
        }

        if (
          result.theme &&
          ["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(
            result.theme
          )
        ) {
          setTheme(result.theme)
        }

        if (result.slug && result.slug.trim()) {
          setDomainPrefix(result.slug)
          setDomainPrefixManuallyEdited(false)
        }

        // Replace scaffold from Smart Fill suggestion, or regenerate for new type
        if (result.suggestedScaffold && result.suggestedScaffold.hubs.length > 0) {
          setScaffoldDraft(scaffoldDraftFromSmartFill(result.suggestedScaffold))
          setScaffoldIsDefaultForType(true)
          setScaffoldSourceType(nextTypeId)
        } else if (nextTypeId !== scaffoldSourceType) {
          setScaffoldDraft(buildDefaultScaffoldDraft(nextTypeId))
          setScaffoldIsDefaultForType(true)
          setScaffoldSourceType(nextTypeId)
        }

        setRoughIdea("")
        setError(null)
      } catch (err) {
        setError("Smart Fill failed. Please try again or fill in the fields manually.")
      } finally {
        setIsSmartFilling(false)
      }
    }, 0)
  }

  function handleTypeChange(newTypeId: string) {
    if (!VALID_REGISTRY_IDS.has(newTypeId) || newTypeId === typeId) return

    if (!scaffoldIsDefaultForType) {
      const newEntry = getRegistryTypeById(newTypeId)
      const confirmed =
        typeof window === "undefined" ||
        window.confirm(
          `Reset scaffold to the "${newEntry?.label ?? newTypeId}" defaults? ` +
            "Your current hub and collection edits will be replaced."
        )
      if (!confirmed) return
    }

    const newEntry = getRegistryTypeById(newTypeId)!
    setTypeId(newTypeId)
    setName(newEntry.defaultName)
    setDescription(newEntry.defaultDescription)
    setTheme(newEntry.defaultTheme)
    setDomainPrefix(newEntry.defaultSlug)
    setDomainPrefixManuallyEdited(false)
    setScaffoldDraft(buildDefaultScaffoldDraft(newTypeId))
    setScaffoldIsDefaultForType(true)
    setScaffoldSourceType(newTypeId)
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
    if (!VALID_REGISTRY_IDS.has(typeId)) {
      setError("Please select a valid network type.")
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
      if (!name.trim()) throw new Error("Network name is required")
      if (!slug.trim()) throw new Error("Subdomain is required")
      if (!VALID_REGISTRY_IDS.has(typeId)) {
        throw new Error(`Please select a valid network type (received: "${typeId}").`)
      }
      if (
        !theme ||
        !["parchment", "copper", "neutral", "industrial", "soft", "arcane", "ember"].includes(
          theme
        )
      ) {
        throw new Error(`Invalid theme: ${theme}.`)
      }
      if (!scaffoldDraft.hubs || scaffoldDraft.hubs.length === 0) {
        throw new Error(
          "Scaffold has no hubs. Use Smart Fill or pick a different network type."
        )
      }

      const existingDraft = readWizardDraft()
      const draft: WizardDraft = {
        version: 1,
        roughIdea: roughIdea.trim(),
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        type: typeId,
        theme,
        visibility,
        scaffoldIsDefaultForType,
        scaffoldSourceType,
        scaffold: scaffoldDraft,
        forgeRules: existingDraft?.forgeRules ?? getDefaultForgeRulesDraft(),
        createdAt: existingDraft?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      writeWizardDraft(draft)
      router.push("/builder/network/starter-pages")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const enabledTypes = getEnabledRegistryTypes()

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {step === "configure" && (
        <>
          {/* Smart Fill Panel */}
          <Card className="p-5 border-amber-500/30 bg-amber-500/5">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Start with a rough idea
                </p>
                <p className="text-xs text-muted-foreground">
                  Describe the network you want to build and GuideForge will fill in the name,
                  type, theme, hubs, and slug.
                </p>
              </div>
              <Textarea
                value={roughIdea}
                onChange={(e) => setRoughIdea(e.target.value)}
                placeholder='e.g. "A personal knowledge network for organizing life, projects, routines, and learning goals"'
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
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSmartFill}
                  disabled={isSmartFilling || !roughIdea.trim()}
                  className="gap-1.5"
                >
                  {isSmartFilling ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Zap className="size-3.5" aria-hidden="true" />
                  )}
                  {isSmartFilling ? "Filling..." : "Smart Fill Network"}
                </Button>
              </div>
            </div>
          </Card>

          <SectionCard
            title="Network basics"
            description="Name your network and tell readers what it covers."
          >
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
                <FieldDescription>Shown in the header of your hosted guide site.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="network-type">Network type</FieldLabel>
                <Select value={typeId} onValueChange={handleTypeChange}>
                  <SelectTrigger id="network-type">
                    <SelectValue placeholder="Select a network type" />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledTypes.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Determines the default scaffold, theme, and starter Forge Rules.
                </FieldDescription>
              </Field>

              {/* Type details panel — Best for examples */}
              {currentEntry && (
                <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">{currentEntry.label}</p>
                  <p className="text-xs text-muted-foreground">{currentEntry.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {currentEntry.bestFor.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="text-xs font-normal px-1.5 py-0"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    You can edit hubs and collections on the next step before anything is saved.
                  </p>
                </div>
              )}

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
                <FieldDescription className="mb-4">
                  Each theme has its own color palette and styling. The preview updates as you
                  select.
                </FieldDescription>

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
                      <div
                        className={`absolute inset-0 rounded-lg ${themeOption.previewClasses} opacity-40 group-hover:opacity-60 transition-opacity`}
                      />
                      <div className="relative z-10 space-y-1">
                        <p
                          className={`text-xs font-semibold ${
                            theme === themeOption.id
                              ? themeOption.accentClasses
                              : "text-foreground"
                          }`}
                        >
                          {themeOption.label}
                        </p>
                        {theme === themeOption.id && (
                          <p className="text-xs text-muted-foreground">Selected</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Theme Preview Panel */}
              <div className="mt-2 p-4 rounded-lg border border-border/50 overflow-hidden">
                {(() => {
                  const selectedTheme = getAllNetworkThemes().find((t) => t.id === theme)
                  if (!selectedTheme) return null
                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Theme Preview
                      </h4>
                      <div
                        className={`rounded-md p-4 ${selectedTheme.previewClasses} ${selectedTheme.borderClasses} border`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full ${selectedTheme.bgClasses} border ${selectedTheme.borderClasses}`}
                          />
                          <div>
                            <p
                              className={`text-sm font-bold ${selectedTheme.accentClasses}`}
                            >
                              {name || "Network Name"}
                            </p>
                            <p className="text-xs text-muted-foreground">Sample network header</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className={`rounded-md p-3 ${selectedTheme.cardClasses} border ${selectedTheme.borderClasses}`}
                        >
                          <p className="text-xs font-semibold text-foreground mb-1">Sample Hub</p>
                          <p className={`text-xs ${selectedTheme.accentClasses}`}>3 Collections</p>
                        </div>
                        <div
                          className={`rounded-md p-3 ${selectedTheme.cardClasses} border ${selectedTheme.borderClasses}`}
                        >
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
                  <FieldLabel htmlFor="network-visibility">Public network</FieldLabel>
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
                <InputGroupAddon align="inline-end">.guideforge.app</InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                You can connect a custom domain after publishing. Resolved slug:{" "}
                <span className="font-mono text-foreground">{slug || "—"}</span>
              </FieldDescription>
            </Field>
          </SectionCard>
        </>
      )}

      {step === "preview" && scaffoldDraft.hubs.length > 0 &&
        (() => {
          const previewTheme = getNetworkTheme(theme)
          const totalCollections = scaffoldDraft.hubs.reduce(
            (sum, h) => sum + h.collections.length,
            0
          )
          return (
            <div
              className={`rounded-xl border p-6 ${previewTheme.cardClasses} ${previewTheme.borderClasses}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Scaffold Preview
              </p>

              <div
                className={`rounded-lg p-4 mb-4 ${previewTheme.previewClasses} border ${previewTheme.borderClasses}`}
              >
                <p
                  className={`text-lg font-black tracking-tight ${previewTheme.accentClasses}`}
                >
                  {name || "Network Name"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{slug}.guideforge.app</p>
              </div>

              <div className="space-y-2 mb-4">
                {scaffoldDraft.hubs.map((hub) => (
                  <div
                    key={hub.clientId}
                    className={`rounded-md p-3 border ${previewTheme.cardClasses} ${previewTheme.borderClasses}`}
                  >
                    <p className={`text-sm font-semibold ${previewTheme.accentClasses}`}>
                      {hub.name}
                    </p>
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
                {" · "}Type: <strong>{currentEntry.label}</strong>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                You&apos;ll be able to edit, add, or remove hubs and collections on the next
                step before anything is saved.
              </p>
            </div>
          )
        })()}

      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          {/* No back button from form to welcome - users should use browser back or go to dashboard */}
        </div>
        <div className="flex gap-2">
          {step === "configure" && (
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
