/**
 * GuideForge — Wizard Draft State
 *
 * SessionStorage-backed draft used to carry the in-progress network setup
 * across Steps 2 (create network) → 3 (starter pages) → 4 (forge rules).
 *
 * The network is NOT persisted to Supabase until the user submits Step 4.
 * Until then, the entire draft lives in sessionStorage under WIZARD_DRAFT_KEY.
 *
 * Steps 3 and 4 read the draft on mount, mutate it locally, and write it back.
 * Step 4 builds a ScaffoldTemplate from `draft.scaffold` and calls
 * `createNetworkScaffold`. On success, the draft is cleared and the user is
 * routed to the live network dashboard (Step 5).
 *
 * Forge Rules (`draft.forgeRules`) are governance metadata captured in this
 * draft. There is no Supabase column for them yet, so they are persisted
 * only locally for now. The Step 4 UI explicitly surfaces this limitation.
 */

import type { NetworkType, ThemeDirection, Visibility } from "./types"

export const WIZARD_DRAFT_KEY = "guideforge:wizard-draft"
export const WIZARD_DRAFT_VERSION = 1

// ---------- Forge Rules governance metadata ----------

export type VerificationLevel = "open" | "moderated" | "verified-only"
export type ContentStandard = "lenient" | "standard" | "strict"
export type AiPolicy = "allowed" | "disclosed" | "disallowed"
export type ContributorMode = "owner-only" | "invite" | "open"

export interface TrustBadgeConfig {
  showVerified: boolean
  showLastUpdated: boolean
  showAuthor: boolean
}

export interface ForgeRulesDraft {
  verificationLevel: VerificationLevel
  contentStandard: ContentStandard
  aiPolicy: AiPolicy
  trustBadges: TrustBadgeConfig
  contributorMode: ContributorMode
  /** Per-rule enable map, keyed by ForgeRule.id. */
  ruleEnableMap: Record<string, boolean>
}

export function getDefaultForgeRulesDraft(): ForgeRulesDraft {
  return {
    verificationLevel: "moderated",
    contentStandard: "standard",
    aiPolicy: "disclosed",
    trustBadges: {
      showVerified: true,
      showLastUpdated: true,
      showAuthor: true,
    },
    contributorMode: "invite",
    ruleEnableMap: {},
  }
}

// ---------- Scaffold draft (the editable hub/collection tree) ----------

export interface ScaffoldCollectionDraft {
  /** Stable client-side id so list reorders/edits stay keyed. */
  clientId: string
  name: string
  slug: string
  description: string
}

export interface ScaffoldHubDraft {
  clientId: string
  name: string
  slug: string
  description: string
  collections: ScaffoldCollectionDraft[]
}

export interface ScaffoldDraft {
  hubs: ScaffoldHubDraft[]
}

// ---------- Top-level Wizard Draft ----------

export interface WizardDraft {
  version: number
  // Step 2 fields
  name: string
  slug: string
  description: string
  type: NetworkType
  theme: ThemeDirection
  visibility: Visibility
  /** When true, the scaffold is the unedited default for the current type
   * (so a type change can safely regenerate without losing user edits). */
  scaffoldIsDefaultForType: boolean
  /** Captures which type's defaults the scaffold was generated from. */
  scaffoldSourceType: NetworkType | null
  // Step 3 — unified scaffold (edited in Step 3, previewed in Step 2)
  scaffold: ScaffoldDraft
  // Step 4 — local governance metadata (no Supabase column yet)
  forgeRules: ForgeRulesDraft
  // Bookkeeping
  createdAt: string
  updatedAt: string
}

// ---------- Client-id helper ----------

let _nextLocalId = 0
function makeClientId(prefix: string): string {
  _nextLocalId += 1
  // Combines a counter with a short random suffix for uniqueness across mounts.
  return `${prefix}_${Date.now().toString(36)}_${_nextLocalId.toString(36)}`
}

export function makeHubClientId(): string {
  return makeClientId("hub")
}

export function makeCollectionClientId(): string {
  return makeClientId("col")
}

// ---------- SessionStorage I/O ----------

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

export function readWizardDraft(): WizardDraft | null {
  if (!isBrowser()) return null
  try {
    const raw = window.sessionStorage.getItem(WIZARD_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WizardDraft
    if (!parsed || typeof parsed !== "object" || parsed.version !== WIZARD_DRAFT_VERSION) {
      // Stale/incompatible draft — drop it.
      return null
    }
    return parsed
  } catch (err) {
    console.warn("[v0] readWizardDraft: failed to parse draft, ignoring.", err)
    return null
  }
}

export function writeWizardDraft(draft: WizardDraft): void {
  if (!isBrowser()) return
  try {
    const stamped: WizardDraft = {
      ...draft,
      version: WIZARD_DRAFT_VERSION,
      updatedAt: new Date().toISOString(),
    }
    window.sessionStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(stamped))
  } catch (err) {
    console.warn("[v0] writeWizardDraft: failed to write draft.", err)
  }
}

export function mergeWizardDraft(patch: Partial<WizardDraft>): WizardDraft | null {
  const current = readWizardDraft()
  if (!current) return null
  const next: WizardDraft = { ...current, ...patch }
  writeWizardDraft(next)
  return next
}

export function clearWizardDraft(): void {
  if (!isBrowser()) return
  try {
    window.sessionStorage.removeItem(WIZARD_DRAFT_KEY)
  } catch (err) {
    console.warn("[v0] clearWizardDraft: failed to clear draft.", err)
  }
}

// ---------- Validation ----------

export interface WizardDraftValidation {
  valid: boolean
  errors: string[]
  hubsWithoutCollections: string[]
}

export function validateWizardDraft(draft: WizardDraft): WizardDraftValidation {
  const errors: string[] = []
  const hubsWithoutCollections: string[] = []

  if (!draft.name.trim()) errors.push("Network name is required.")
  if (!draft.slug.trim()) errors.push("Network slug is required.")

  if (!draft.scaffold.hubs || draft.scaffold.hubs.length === 0) {
    errors.push("At least one hub is required.")
  } else {
    draft.scaffold.hubs.forEach((hub, hubIdx) => {
      const label = hub.name.trim() || `Hub ${hubIdx + 1}`
      if (!hub.name.trim()) {
        errors.push(`Hub ${hubIdx + 1} needs a name.`)
      }
      if (!hub.slug.trim()) {
        errors.push(`Hub "${label}" needs a slug.`)
      }
      if (!hub.collections || hub.collections.length === 0) {
        hubsWithoutCollections.push(label)
      } else {
        hub.collections.forEach((col, colIdx) => {
          if (!col.name.trim()) {
            errors.push(`Hub "${label}", Collection ${colIdx + 1} needs a name.`)
          }
          if (!col.slug.trim()) {
            errors.push(`Hub "${label}", Collection ${colIdx + 1} needs a slug.`)
          }
        })
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    hubsWithoutCollections,
  }
}
