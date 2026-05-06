/**
 * GuideForge — Core Type Definitions
 *
 * GuideForge is a standalone hosted guide-world builder.
 * The runtime data model is a strict 5-level hierarchy:
 *
 *   Network -> Hub -> Collection -> Guide -> GuideStep
 *
 * These types are intentionally multi-network from day one.
 * Nothing here assumes a single network.
 *
 * NOTE: For the MVP pass, all data is mocked locally.
 * TODO: Connect Supabase — these types will become the source of
 *       truth for table shapes (snake_case mapping at the boundary).
 *       See /builder/network/[networkId]/generate/page.tsx for
 *       where generated data will be persisted.
 * TODO: Connect OpenAI — guide and section generation will produce
 *       partial Guide/GuideStep payloads matching these shapes.
 *       See /lib/guideforge/mock-generator.ts for where the
 *       OpenAI API call will replace mock generation.
 */

// ---------- Enums (string unions) ----------

export type NetworkType =
  | "gaming"
  | "repair"
  | "sop"
  | "creator"
  | "training"
  | "community"

export type GuideType =
  | "character-build"
  | "walkthrough"
  | "boss-guide"
  | "beginner-guide"
  | "patch-notes"
  | "news"
  | "repair-procedure"
  | "sop"
  | "tutorial"
  | "reference"

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert"

/**
 * GuideForge-native lifecycle status for a guide.
 * Replaces any prior "council" terminology.
 */
export type GuideStatus =
  | "draft"
  | "in-review"
  | "ready"
  | "published"
  | "needs-update"
  | "deprecated"
  | "archived"

/**
 * GuideForge-native trust/quality tier.
 * Forward-looking concept — the MVP only renders these as visual badges.
 * "forged" is reserved as the highest trust tier (passed all required
 * Forge Rules + review for its network).
 */
export type VerificationStatus =
  | "unverified"
  | "reviewed"
  | "expert-reviewed"
  | "community-proven"
  | "forge-verified"
  | "forged"

/**
 * Theme directions for a Network's branding.
 * "parchment" and "copper" lean into the GuideForge builder feel.
 * "ember" remains available for gaming networks like QuestLine.
 */
export type ThemeDirection =
  | "parchment"
  | "copper"
  | "neutral"
  | "industrial"
  | "soft"
  | "arcane"
  | "ember"

export type Visibility = "public" | "private" | "unlisted"

// ---------- Governance (Phase 2+) ----------

/**
 * Canonical roles used across network governance.
 * Each network can customize display_name (e.g., "Owner" → "Guildmaster").
 */
export type CanonicalRole =
  | "owner"
  | "admin"
  | "reviewer"
  | "contributor"
  | "member"
  | "viewer"

export interface NetworkRoleDefinition {
  id: string
  networkId: string
  canonicalRole: CanonicalRole
  displayName: string
  reviewWeight: number
  canSubmitGuides: boolean
  canVoteOnReviews: boolean
  canManageMembers: boolean
  canPublishOverride: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NetworkMember {
  id: string
  networkId: string
  userId: string
  canonicalRole: CanonicalRole
  displayName?: string
  createdAt: string
  updatedAt: string
}

// ---------- Forge Rules ----------

export type ForgeRuleCategory =
  | "metadata"
  | "structure"
  | "tone"
  | "safety"
  | "lifecycle"

export interface ForgeRule {
  id: string
  /** Short human-readable label, e.g. "Include game name". */
  label: string
  /** Longer explanation shown in the rule editor. */
  description: string
  category: ForgeRuleCategory
  /** Which network types this rule applies to by default. */
  appliesTo: NetworkType[]
  /** Whether the rule is required for a Guide to be publishable. */
  required: boolean
  /** Whether the rule is enabled in the current network's ruleset. */
  enabled: boolean
}

// ---------- Guide internals ----------

export type GuideSectionKind =
  | "overview"
  | "strengths"
  | "weaknesses"
  | "gear"
  | "skill-priority"
  | "rotation"
  | "leveling"
  | "mistakes"
  | "patch-notes"
  | "final-tips"
  | "requirements"
  | "warning"
  | "custom"

/**
 * A GuideStep is a single section/step inside a Guide.
 * The name "step" is intentional — it keeps the 5-level model crisp:
 *   Network -> Hub -> Collection -> Guide -> Step
 */
export interface GuideStep {
  id: string
  guideId: string
  order: number
  kind: GuideSectionKind
  title: string
  body: string
  isSpoiler?: boolean
  /** Optional callout, e.g. "Requires patch 4.2+". */
  callout?: string
}

// ---------- Guide ----------

export interface GuideAuthor {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string
}

export interface Guide {
  id: string
  collectionId: string
  hubId: string
  networkId: string

  slug: string
  title: string
  summary: string

  type: GuideType
  difficulty: DifficultyLevel
  status: GuideStatus
  verification: VerificationStatus

  /** Free-form requirements list shown at the top of the public page. */
  requirements: string[]
  /** Optional warnings (spoilers, dangerous repair steps, etc.). */
  warnings: string[]
  /** Target audience tags (e.g., "Beginner", "PvP", "Hardcore"). */
  audience?: string[]

  /** Game patch / SOP version / doc revision. */
  version?: string
  /** Estimated read or completion time in minutes. */
  estimatedMinutes?: number

  steps: GuideStep[]

  author: GuideAuthor
  reviewer?: GuideAuthor

  /** Forge Rules check results - persisted with draft. */
  forgeRulesCheckResult?: any[]
  /** Timestamp of last Forge Rules check (for staleness detection). */
  forgeRulesCheckTimestamp?: number

  createdAt: string
  updatedAt: string
  publishedAt?: string
}

// ---------- Collection ----------

export interface Collection {
  id: string
  hubId: string
  networkId: string
  slug: string
  name: string
  description: string
  /** Default guide type for new guides created in this collection. */
  defaultGuideType: GuideType
  guideIds: string[]
}

// ---------- Hub ----------

export interface Hub {
  id: string
  networkId: string
  slug: string
  name: string
  description: string
  /** Short tagline for hub cards. */
  tagline?: string
  bannerUrl?: string
  /**
   * For gaming networks this is the "game". For repair networks
   * it might be a product line. For SOP networks, a department.
   */
  hubKind: "game" | "product" | "department" | "topic" | "channel" | "other"
  collectionIds: string[]
}

// ---------- Network ----------

export interface NetworkBranding {
  primaryColor: string
  accentColor?: string
  theme: ThemeDirection
  logoUrl?: string
}

export interface Network {
  id: string
  slug: string
  name: string
  description: string
  type: NetworkType
  visibility: Visibility
  /** Domain or subdomain placeholder, e.g. "questline.guideforge.app". */
  domain?: string
  branding: NetworkBranding
  forgeRuleIds: string[]
  hubIds: string[]
  createdAt: string
  updatedAt: string
  /** Ownership Phase 2: Owner user ID from auth.users(id). Nullable for legacy networks and signed-out creation. */
  ownerUserId?: string | null
}

// ---------- Wizard / builder helpers ----------

export interface WizardStepMeta {
  id: string
  label: string
  href: string
}

/**
 * A lightweight selection payload used by the builder wizard
 * before a real Network record exists.
 * TODO: Replace with server-persisted draft once Supabase is wired.
 */
export interface NetworkDraft {
  name: string
  type: NetworkType
  description: string
  theme: ThemeDirection
  visibility: Visibility
  domain?: string
}

// ---------- Starter pages ----------

/** Identifier for one of the starter page templates a network can include. */
export type StarterPageId =
  | "home"
  | "directory"
  | "hub"
  | "primary-guide"
  | "news"
  | "beginner-guide"
