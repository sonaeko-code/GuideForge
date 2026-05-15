/**
 * GuideForge Generation Schemas
 *
 * TypeScript interfaces for AI-generated structured data.
 * These describe the output shape that an AI generator (OpenAI, Claude, etc.)
 * would produce when given a prompt and forge rules.
 *
 * These are separate from the persistent types in types.ts because:
 *   1. Generated data may be partial (missing optional fields)
 *   2. Generated data needs explicit source/tracking for audit trails
 *   3. Generated data schema may evolve independently of persistent schema
 *
 * Future flow:
 *   1. User enters prompt + selects hub/collection
 *   2. AI generator produces GeneratedGuide matching this schema
 *   3. User reviews JSON preview
 *   4. "Send to Editor" creates a Guide record in Supabase
 *   5. Public templates render from persisted Guide data
 */

import type {
  DifficultyLevel,
  GuideType,
  VerificationStatus,
  GuideSectionKind,
  NetworkType,
  ThemeDirection,
  Visibility,
} from "./types"

// ---------- Author Placeholder ----------

export interface GeneratedAuthor {
  displayName: string
  handle: string
}

// ---------- Generated Guide Section ----------

export interface GeneratedGuideSection {
  title: string
  kind: GuideSectionKind
  body: string
  /** Optional callout, e.g. "Requires patch 4.2+". */
  callout?: string
  isSpoiler?: boolean
}

// ---------- Generated Guide ----------

/**
 * AI-generated guide data.
 * This is what comes out of the OpenAI call or mock generator.
 * It may be partial — the editor can fill in missing fields.
 */
export interface GeneratedGuide {
  /** Generated content fields. */
  title: string
  slug: string
  summary: string

  type: GuideType
  difficulty: DifficultyLevel

  /** Optional: estimated read time in minutes. */
  estimatedMinutes?: number

  /** Array of generated sections/steps. */
  sections: GeneratedGuideSection[]

  /** Optional: generated requirements list. */
  requirements?: string[]

  /** Optional: generated warnings list. */
  warnings?: string[]

  /** Optional: game patch or doc version. */
  version?: string

  /** Generated author placeholders (can be customized in editor). */
  author: GeneratedAuthor
  reviewer?: GeneratedAuthor

  /** Metadata for tracking. */
  generatedAt: string
  generatedBy: "mock" | "openai" | "claude" | "other"
  generationPrompt?: string
  generationModelUsed?: string

  /** Tags or topics for categorization. */
  tags?: string[]

  /** Which network/hub/collection this is being generated for. */
  targetNetworkId?: string
  targetHubId?: string
  targetCollectionId?: string
}

// ---------- Generated Collection ----------

export interface GeneratedCollection {
  name: string
  slug: string
  description: string
  defaultGuideType: GuideType

  /** Metadata for tracking. */
  generatedAt: string
  generatedBy: "mock" | "openai" | "claude" | "other"
}

// ---------- Generated Hub ----------

export interface GeneratedHub {
  name: string
  slug: string
  description: string
  tagline?: string

  hubKind: "game" | "product" | "department" | "topic" | "channel" | "other"

  /** Optional: guide collection suggestions for this hub. */
  suggestedCollections?: GeneratedCollection[]

  /** Metadata for tracking. */
  generatedAt: string
  generatedBy: "mock" | "openai" | "claude" | "other"
}

// ---------- Generated Network ----------

export interface GeneratedNetwork {
  name: string
  slug: string
  description: string

  type: NetworkType
  theme: ThemeDirection
  visibility: Visibility

  /** Optional: suggested domain. */
  domain?: string

  /** Optional: hub suggestions for this network. */
  suggestedHubs?: GeneratedHub[]

  /** Metadata for tracking. */
  generatedAt: string
  generatedBy: "mock" | "openai" | "claude" | "other"
}

// ---------- Generated Patch / News Post ----------

export interface GeneratedPatchPost {
  title: string
  slug: string
  body: string

  type: "patch-notes" | "news"

  /** Which game hub this is for (for QuestLine networks). */
  hubId?: string

  /** Who authored this. */
  author: GeneratedAuthor

  /** Optional: patch version (e.g. "4.2", "1.3.5"). */
  version?: string

  /** Tags for filtering (e.g. "balance", "nerfs", "quality-of-life"). */
  tags?: string[]

  /** Metadata for tracking. */
  generatedAt: string
  generatedBy: "mock" | "openai" | "claude" | "other"
}

// ---------- Network Skeleton Generation Request ----------

/**
 * Shape of data for generating a complete network skeleton.
 * Includes network, hubs, collections, guide ideas, and rules.
 */
export interface NetworkSkeletonGenerationRequest {
  // Network basics
  networkTopic: string          // e.g. "RPG Game Builds", "Software Documentation"
  intendedAudience: string      // e.g. "New players", "Developers"
  networkPurpose: string        // e.g. "Help players master builds", "Onboard new contributors"
  
  // Style & tone
  tone: string                  // e.g. "friendly", "technical", "narrative"
  referenceStyle: string        // e.g. "questline", "minimal", "comprehensive"
  
  // Structure
  numberOfHubs: number          // e.g. 3, 5
  collectionsPerHub: number     // e.g. 2, 3
  guideIdeasPerCollection: number // e.g. 3, 4
  
  // Preferences
  guideTypeEmphasis: string[]   // e.g. ["character-build", "beginner-guide"]
  optionalNotes: string         // User's custom notes/context
}

// ---------- Network Skeleton Generation Response ----------

/**
 * AI-generated network skeleton proposal.
 * Includes network, hubs, collections, guide ideas, and rule suggestions.
 */
export interface NetworkSkeletonGenerationResponse {
  network: GeneratedNetworkSkeleton
  hubs: GeneratedHubWithCollections[]
  forgeRulesSuggestions: ForgeRulesSuggestions
  guideDNASuggestions: GuideDNASuggestions
  assumptions: string[]
  missingInfo: string[]
  success: boolean
  error?: string
}

/**
 * Extended GeneratedNetwork with additional skeleton fields.
 */
export interface GeneratedNetworkSkeleton extends GeneratedNetwork {
  audience: string
  tone: string
}

/**
 * Hub with nested collections and guide ideas.
 */
export interface GeneratedHubWithCollections extends GeneratedHub {
  collections: GeneratedCollectionWithGuides[]
}

/**
 * Collection with guide ideas.
 */
export interface GeneratedCollectionWithGuides extends GeneratedCollection {
  guideIdeas: GeneratedGuideIdea[]
}

/**
 * Guide idea (not yet a full guide).
 */
export interface GeneratedGuideIdea {
  title: string
  slug: string
  summary: string
  audience: string
  difficulty: DifficultyLevel
  guideType: GuideType
  tags: string[]
}

/**
 * Forge Rules suggestions for the network.
 */
export interface ForgeRulesSuggestions {
  global: string[]
  networkSpecific: string[]
}

/**
 * Guide DNA suggestions for the network.
 */
export interface GuideDNASuggestions {
  tone: string
  layoutStyle: string
  contentPriorities: string[]
  badgeLanguage: string
}

// ---------- Generation Request / Response ----------

export interface GenerationRequest {
  prompt: string
  guideType: GuideType
  preferredDifficulty: DifficultyLevel
  targetHubId: string
  targetCollectionId?: string
  forgeRuleContext?: string
}

export interface GenerationResponse {
  guide: GeneratedGuide
  success: boolean
  error?: string
}

// ---------- Generation Session ----------

/**
 * Tracks a single generation session in the UI.
 * Used by the mock generator preview route.
 */
export interface GenerationSession {
  id: string
  createdAt: string
  request: GenerationRequest
  response?: GenerationResponse
  status: "idle" | "generating" | "done" | "error"
  error?: string
}

// ---------- Structured Asset Types & Contracts ----------

export type StructuredAssetType = "single_guide" | "recipe" | "checklist" | "sop" | "troubleshooting_flow"

// Single Guide
export interface GeneratedSingleGuide {
  assetType: "single_guide"
  title: string
  summary: string
  audience: string
  difficulty: DifficultyLevel
  requirements: string[]
  warnings: string[]
  steps: Array<{
    title: string
    body: string
    successCondition: string | null
    tip: string | null
    warning: string | null
  }>
  tags: string[]
  assumptions: string[]
  missingInfo: string[]
}

// Recipe
export interface GeneratedRecipe {
  assetType: "recipe"
  title: string
  summary: string
  servings: string
  prepTime: string | null
  cookTime: string | null
  ingredients: Array<{
    name: string
    amount: string | null
    notes: string | null
  }>
  steps: Array<{
    title: string
    body: string
    tip: string | null
  }>
  dietaryNotes: string[]
  warnings: string[]
  tags: string[]
  assumptions: string[]
  missingInfo: string[]
}

// Checklist
export interface GeneratedChecklist {
  assetType: "checklist"
  title: string
  summary: string
  sections: Array<{
    title: string
    items: Array<{
      label: string
      description: string | null
      required: boolean
    }>
  }>
  completionCriteria: string[]
  tags: string[]
  assumptions: string[]
  missingInfo: string[]
  /** Source metadata - for tracking generation method (Phase 6) */
  generatedBy?: "mock" | "openai" | "claude" | "other"
}

// SOP / Procedure
export interface GeneratedSOP {
  assetType: "sop"
  title: string
  purpose: string
  scope: string
  owner: string | null
  requirements: string[]
  procedureSteps: Array<{
    title: string
    body: string
    responsibleRole: string | null
    warning: string | null
  }>
  reviewNotes: string[]
  tags: string[]
  assumptions: string[]
  missingInfo: string[]
}

// Troubleshooting Flow
export interface GeneratedTroubleshootingFlow {
  assetType: "troubleshooting_flow"
  title: string
  symptom: string
  summary: string
  checks: Array<{
    title: string
    question: string
    ifYes: string | null
    ifNo: string | null
  }>
  likelyCauses: string[]
  fixSteps: Array<{
    title: string
    body: string
    escalateIfFailed: string | null
  }>
  warnings: string[]
  tags: string[]
  assumptions: string[]
  missingInfo: string[]
}

export type GeneratedStructuredAsset =
  | GeneratedSingleGuide
  | GeneratedRecipe
  | GeneratedChecklist
  | GeneratedSOP
  | GeneratedTroubleshootingFlow

// Intake requests
export interface SingleGuideIntakeRequest {
  title: string
  audience: string
  purpose: string
  goal?: string
  useCase?: string
  tone: string
  difficulty: DifficultyLevel
  guideType: GuideType
  numberOfSteps: number
  hasWarnings: boolean
  hasPrerequisites: boolean
  optionalContext: string
}

export interface RecipeIntakeRequest {
  title: string
  audience: string
  purpose: string
  tone: string
  cuisine: string
  servings: string
  prepTime: string
  cookTime: string
  dietaryNotes: string
  optionalContext: string
}

export interface ChecklistIntakeRequest {
  title: string
  audience: string
  purpose: string
  tone: string
  goal: string
  numberOfSections: number
  itemsPerSection: number
  useCase: string
  optionalContext: string
}

export interface SOPIntakeRequest {
  title: string
  audience: string
  purpose: string
  tone: string
  owner: string
  department: string
  requiredTools: string
  complianceNotes: string
  reviewFrequency: string
  optionalContext: string
}

export interface TroubleshootingFlowIntakeRequest {
  title: string
  audience: string
  symptom: string
  environment: string
  likelyCauses: string
  riskLevel: string
  escalationPath: string
  optionalContext: string
}
