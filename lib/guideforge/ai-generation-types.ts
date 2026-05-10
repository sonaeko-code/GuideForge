/**
 * AI Generation Types & Interfaces
 *
 * Defines the boundary between client and server for AI generation.
 * Supports multiple providers (mock, OpenAI, Claude, etc.).
 */

import type { GeneratedStructuredAsset, GeneratedChecklist } from "./generation-schemas"

export type GenerationProvider = "mock" | "ai"

export interface AIGenerationConfig {
  provider: GenerationProvider
  apiKey?: string
  model?: string
}

export interface AIGenerationRequest<T extends Record<string, any>> {
  provider: GenerationProvider
  assetType: string
  intake: T
}

export interface AIGenerationResponse<T extends GeneratedStructuredAsset = GeneratedStructuredAsset> {
  success: boolean
  asset?: T
  error?: string
  provider: GenerationProvider
}

/**
 * Validation schema for generated structured assets.
 * Used to validate AI output before displaying to user.
 */
export interface ValidationRules {
  requireFields: string[]
  arrayFields: Record<string, { minItems?: number; maxItems?: number }>
  constraints?: Record<string, (value: any) => boolean>
}

// ========== Checklist-Specific Types ==========

export interface ChecklistGenerationRequest {
  title: string
  audience: string
  purpose: string
  goal: string
  useCase: string
  tone: "practical" | "formal" | "casual" | "technical"
  numberOfSections: number
  itemsPerSection: number
  optionalContext?: string
}

export interface ChecklistGenerationResponse extends AIGenerationResponse<GeneratedChecklist> {}
