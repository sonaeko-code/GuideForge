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

// ---------- Generation Request ----------

/**
 * Shape of data sent to the AI generator.
 * This is what the builder UI collects from the user.
 */
export interface GenerationRequest {
  /** Free-form or structured prompt. */
  prompt: string

  /** Which guide type to generate. */
  guideType: GuideType

  /** Optional: target hub for gaming networks. */
  targetHubId?: string

  /** Optional: target collection. */
  targetCollectionId?: string

  /** Optional: difficulty preference. */
  preferredDifficulty?: DifficultyLevel

  /** Forge rules to apply as context. */
  forgeRuleContext?: string

  /** Model to use (for future OpenAI integration). */
  model?: "gpt-4" | "gpt-4-turbo" | "gpt-3.5-turbo" | "claude-3"

  /** Max tokens for generation. */
  maxTokens?: number
}

// ---------- Generation Response ----------

/**
 * What the generator returns.
 */
export interface GenerationResponse {
  /** The generated guide. */
  guide: GeneratedGuide

  /** Optional: suggested related guides. */
  relatedGuideIds?: string[]

  /** Optional: warnings or notes about the generation. */
  generationNotes?: string[]

  /** Whether the generation succeeded. */
  success: boolean

  /** If failed, the error message. */
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
