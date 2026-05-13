"use client"

/**
 * Step 4 — Forge Rules Editor
 *
 * Reads the unified WizardDraft from sessionStorage, lets the user pick
 * lightweight governance metadata (verification level, content standard,
 * AI policy, trust badges, contributor mode), writes those choices back
 * to the draft, and then performs the FINAL network creation:
 *
 *   1. Build a ScaffoldTemplate from `draft.scaffold`
 *   2. Call `createNetworkScaffold` with networkType, networkTheme,
 *      networkVisibility, and networkPrimaryColor explicitly passed so
 *      the `networks.type NOT NULL` constraint cannot be violated and
 *      the theme flows through to `branding.theme` on the public page.
 *   3. Clear the wizard draft from sessionStorage on success.
 *   4. Route the user to Step 5 — the new network's dashboard.
 *
 * Forge Rules themselves are NOT persisted to Supabase yet — there is no
 * schema column for them. They are saved into the wizard draft only and
 * the UI surfaces this limitation in a clear "setup metadata" banner.
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { createNetworkScaffold } from "@/lib/guideforge/create-network-scaffold"
import type { ScaffoldTemplate } from "@/lib/guideforge/starter-scaffolds"
import { resolveDbType, getRegistryTypeById } from "@/lib/guideforge/network-types"
import {
  clearWizardDraft,
  mergeWizardDraft,
  readWizardDraft,
  validateWizardDraft,
  writeWizardDraft,
  type AiPolicy,
  type ContentStandard,
  type ContributorMode,
  type ForgeRulesDraft,
  type ScaffoldDraft,
  type TrustBadgeConfig,
  type VerificationLevel,
  type WizardDraft,
} from "@/lib/guideforge/wizard-state"

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; draft: WizardDraft }

/**
 * Convert the editable wizard scaffold draft into a ScaffoldTemplate
 * shape that `createNetworkScaffold` understands.
 */
function scaffoldDraftToTemplate(
  draft: WizardDraft,
  scaffold: ScaffoldDraft,
): ScaffoldTemplate {
  return {
    id: `wizard-${draft.type}`,
    name: draft.name,
    description: draft.description,
    icon: "wizard",
    networkTemplate: {
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
    },
    hubs: scaffold.hubs.map((hub) => ({
      hub: {
        name: hub.name.trim(),
        slug: hub.slug.trim(),
        description: hub.description.trim(),
      },
      collections: hub.collections.map((col) => ({
        name: col.name.trim(),
        slug: col.slug.trim(),
        description: col.description.trim(),
      })),
    })),
  }
}

export function ForgeRulesEditor() {
  const router = useRouter()
  const [load, setLoad] = useState<LoadState>({ kind: "loading" })
  const [rules, setRules] = useState<ForgeRulesDraft | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load wizard draft once on mount. If missing, send the user back to Step 2.
  useEffect(() => {
    const draft = readWizardDraft()
    if (!draft) {
      console.log("[v0] ForgeRulesEditor: no wizard draft, redirecting to Step 2")
      setLoad({ kind: "missing" })
      router.replace("/builder/network/new")
      return
    }
    setRules(draft.forgeRules)
    setLoad({ kind: "ready", draft })
  }, [router])

  // Re-validate the scaffold so we can warn the user before final submit.
  const scaffoldValidation = useMemo(() => {
    if (load.kind !== "ready") return null
    return validateWizardDraft(load.draft)
  }, [load])

  function updateRules(patch: Partial<ForgeRulesDraft>) {
    setRules((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      // Persist to draft as the user changes options so Step 3 ↔ Step 4
      // round-trips preserve state.
      mergeWizardDraft({ forgeRules: next })
      return next
    })
  }

  function updateTrustBadges(patch: Partial<TrustBadgeConfig>) {
    setRules((prev) => {
      if (!prev) return prev
      const nextBadges: TrustBadgeConfig = { ...prev.trustBadges, ...patch }
      const next: ForgeRulesDraft = { ...prev, trustBadges: nextBadges }
      mergeWizardDraft({ forgeRules: next })
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (load.kind !== "ready" || !rules) return

    setError(null)

    // Sync latest forge-rules choices into the draft before final create.
    const latest = mergeWizardDraft({ forgeRules: rules })
    const draft = latest ?? load.draft

    // Validate before persisting. We block on scaffold problems but allow
    // empty descriptions etc. (those are not in validateWizardDraft).
    const validation = validateWizardDraft(draft)
    if (!validation.valid) {
      const msg = `Cannot create network: ${validation.errors.join(" ")}`
      console.error("[v0] ForgeRulesEditor: validation failed:", validation.errors)
      setError(msg)
      return
    }

    // Hard guards against the previous null-type bug.
    if (!draft.type) {
      setError("Network type is missing. Go back to Step 2 and select a type.")
      return
    }
    if (!draft.theme) {
      setError("Network theme is missing. Go back to Step 2 and select a theme.")
      return
    }

    setSubmitting(true)
    try {
      const template = scaffoldDraftToTemplate(draft, draft.scaffold)

      console.log("[v0] ForgeRulesEditor: submitting final create:", {
        name: draft.name,
        slug: draft.slug,
        type: draft.type,
        theme: draft.theme,
        visibility: draft.visibility,
        hubs: template.hubs.length,
        collections: template.hubs.reduce((s, h) => s + h.collections.length, 0),
      })

      const result = await createNetworkScaffold(template, {
        networkName: draft.name,
        networkSlug: draft.slug,
        networkDescription: draft.description,
        networkType: resolveDbType(draft.type),
        networkTheme: draft.theme,
        networkVisibility: draft.visibility,
        networkPrimaryColor: draft.theme === "ember" ? "#f97316" : "#6366f1",
      })

      if (!result.success || !result.network?.id) {
        const message = result.error || "Failed to create network"
        console.error("[v0] ForgeRulesEditor: final create failed:", message)
        setError(message)
        return
      }

      console.log(
        "[v0] ForgeRulesEditor: created network",
        result.network.id,
        "type:",
        result.network.type,
        "theme:",
        result.network.branding?.theme,
      )

      // Persist forge rules locally for now (no Supabase column yet).
      // Keep the data on the draft until after navigation, then clear.
      writeWizardDraft({ ...draft, forgeRules: rules })
      clearWizardDraft()

      router.push(`/builder/network/${result.network.id}/dashboard`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] ForgeRulesEditor: exception:", message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (load.kind === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading your draft...
      </div>
    )
  }

  if (load.kind === "missing" || !rules) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find your wizard draft. Let&apos;s start from Step 2.
        </p>
        <Button asChild className="mt-4">
          <Link href="/builder/network/new">Back to Step 2</Link>
        </Button>
      </Card>
    )
  }

  const draft = load.draft

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Persistence-deferred banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <Info className="mt-0.5 size-4 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-foreground">
            Forge Rules are saved as setup metadata for now.
          </p>
          <p className="mt-1 text-muted-foreground">
            Full governance persistence will be added later. Your choices below
            will be applied to the network you&apos;re about to create and stored
            locally for now &mdash; they won&apos;t roundtrip from the database
            until that schema lands.
          </p>
        </div>
      </div>

      {/* Network summary */}
      <Card className="border-border/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          You&apos;re about to create
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">{draft.name}</p>
        <p className="text-xs text-muted-foreground">
          {draft.slug}.guideforge.app &middot; {getRegistryTypeById(draft.type)?.label ?? draft.type} &middot; theme: {draft.theme}{" "}
          &middot; {draft.scaffold.hubs.length} hubs,{" "}
          {draft.scaffold.hubs.reduce((s, h) => s + h.collections.length, 0)} collections
        </p>
        {scaffoldValidation && !scaffoldValidation.valid && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Scaffold has validation issues:{" "}
            {scaffoldValidation.errors.slice(0, 2).join(" ")}{" "}
            <Link
              href="/builder/network/starter-pages"
              className="underline underline-offset-2"
            >
              Fix in Step 3
            </Link>
          </p>
        )}
      </Card>

      {/* Verification level */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">
          Verification level
        </legend>
        <p className="text-sm text-muted-foreground">
          Controls how strictly new guides must be reviewed before they&apos;re
          marked as Verified.
        </p>
        <RadioGroup
          value={rules.verificationLevel}
          onValueChange={(v) =>
            updateRules({ verificationLevel: v as VerificationLevel })
          }
          className="space-y-2"
        >
          {[
            {
              value: "open" as VerificationLevel,
              label: "Open drafts",
              description: "Anyone with edit access can publish without review.",
            },
            {
              value: "moderated" as VerificationLevel,
              label: "Creator reviewed",
              description:
                "Network owner reviews every new guide before publish.",
            },
            {
              value: "verified-only" as VerificationLevel,
              label: "Trusted review",
              description:
                "Designated reviewers vouch for every published guide. Council UI lands later.",
            },
          ].map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-border"
            >
              <RadioGroupItem
                value={option.value}
                id={`verification-${option.value}`}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {/* Content standard */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">
          Content standard
        </legend>
        <p className="text-sm text-muted-foreground">
          Sets the editorial bar for guides published in this network.
        </p>
        <RadioGroup
          value={rules.contentStandard}
          onValueChange={(v) =>
            updateRules({ contentStandard: v as ContentStandard })
          }
          className="space-y-2"
        >
          {[
            {
              value: "lenient" as ContentStandard,
              label: "Quick & practical",
              description: "Short, action-first guides. Minimal structure required.",
            },
            {
              value: "standard" as ContentStandard,
              label: "Detailed instructional",
              description:
                "Step-by-step explanations with prerequisites and tips.",
            },
            {
              value: "strict" as ContentStandard,
              label: "Editorial / guidebook",
              description:
                "High polish, consistent voice, fully fact-checked. Suited to long-form or safety-critical content.",
            },
          ].map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-border"
            >
              <RadioGroupItem
                value={option.value}
                id={`standard-${option.value}`}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {/* AI policy */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">
          AI content policy
        </legend>
        <p className="text-sm text-muted-foreground">
          How AI-generated drafts are handled in your network.
        </p>
        <RadioGroup
          value={rules.aiPolicy}
          onValueChange={(v) => updateRules({ aiPolicy: v as AiPolicy })}
          className="space-y-2"
        >
          {[
            {
              value: "allowed" as AiPolicy,
              label: "AI drafts allowed, manual review required",
              description:
                "AI can draft any guide, but a human must review and publish.",
            },
            {
              value: "disclosed" as AiPolicy,
              label: "AI drafts allowed, visible as provisional",
              description:
                "AI drafts publish with a visible \"provisional\" badge until reviewed.",
            },
            {
              value: "disallowed" as AiPolicy,
              label: "Manual-only publishing",
              description:
                "AI may assist editing, but only manually written guides can publish.",
            },
          ].map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-border"
            >
              <RadioGroupItem
                value={option.value}
                id={`ai-${option.value}`}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {/* Trust badges */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">
          Public trust badges
        </legend>
        <p className="text-sm text-muted-foreground">
          Show contextual badges on every public guide so readers can judge
          freshness and authority at a glance.
        </p>
        <div className="space-y-2">
          {[
            {
              key: "showVerified" as const,
              label: "Show Draft / Reviewed / Verified labels",
              description:
                "Display the guide's lifecycle status as a badge on its public page.",
            },
            {
              key: "showLastUpdated" as const,
              label: "Show \"Last updated\" timestamp",
              description: "Help readers see how recent the guide is.",
            },
            {
              key: "showAuthor" as const,
              label: "Show author byline",
              description: "Display the guide author publicly.",
            },
          ].map((option) => (
            <Label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-border"
            >
              <Checkbox
                checked={rules.trustBadges[option.key]}
                onCheckedChange={(checked) =>
                  updateTrustBadges({ [option.key]: checked === true })
                }
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          ))}
        </div>
      </fieldset>

      {/* Contributor mode */}
      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">
          Contributor mode
        </legend>
        <p className="text-sm text-muted-foreground">
          Who can submit guides to this network.
        </p>
        <RadioGroup
          value={rules.contributorMode}
          onValueChange={(v) =>
            updateRules({ contributorMode: v as ContributorMode })
          }
          className="space-y-2"
        >
          {[
            {
              value: "owner-only" as ContributorMode,
              label: "Owner only",
              description: "Only you can create or edit guides.",
            },
            {
              value: "invite" as ContributorMode,
              label: "Invited contributors",
              description: "Owner invites specific people as contributors.",
            },
            {
              value: "open" as ContributorMode,
              label: "Community submissions (later)",
              description:
                "Anyone can submit a guide for review. Network owner approves before publish.",
            },
          ].map((option) => (
            <Label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 p-3 transition hover:border-border"
            >
              <RadioGroupItem
                value={option.value}
                id={`contributor-${option.value}`}
                className="mt-1"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button asChild variant="ghost" type="button" disabled={submitting}>
          <Link href="/builder/network/starter-pages">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Starter Pages
          </Link>
        </Button>
        <Button type="submit" size="lg" className="gap-2" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating Network...
            </>
          ) : (
            <>
              Create Network
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
