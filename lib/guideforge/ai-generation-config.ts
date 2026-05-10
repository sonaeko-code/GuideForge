/**
 * AI Generation Configuration
 *
 * Centralized configuration for AI model selection and parameters.
 * Currently uses OpenAI's gpt-4o-mini for MVP speed.
 *
 * TODO: Future enhancements:
 * - Support multiple models (gpt-4, gpt-3.5-turbo, Claude, etc.)
 * - Cost tracking per model
 * - User-level model selection
 * - A/B testing different models
 */

/**
 * Default AI model for checklist generation.
 *
 * Current choice: gpt-4o-mini (MVP speed optimization)
 * - 3-5x faster than gpt-4-turbo
 * - Excellent JSON structured output
 * - Perfect for MVP and testing
 * - Lower cost
 *
 * If you want to switch models:
 * 1. Update DEFAULT_CHECKLIST_MODEL below
 * 2. Test with new model to ensure JSON output quality
 * 3. Monitor validation failure rates
 * 4. Consider cost implications
 */
export const DEFAULT_CHECKLIST_MODEL = "gpt-4o-mini"

/**
 * AI generation temperature (creativity/randomness).
 * 0.7 provides good balance between consistency and variety.
 * Lower (0.0-0.5) = more predictable, higher (0.7-1.0) = more creative
 */
export const GENERATION_TEMPERATURE = 0.7

/**
 * Maximum tokens for a single generation (MVP concise output).
 * gpt-4o-mini can produce good checklists in 800-1000 tokens.
 * Set to 1000 for MVP to keep responses fast.
 */
export const MAX_GENERATION_TOKENS = 1000

/**
 * Maximum repair attempts for malformed output (DISABLED for MVP).
 * Currently: 0 (no repairs during MVP testing)
 * AI Generate must return quickly on first pass.
 * Re-enable after base AI call is stable.
 */
export const MAX_REPAIR_ATTEMPTS = 0

/**
 * Maximum sections for AI Generate MVP (hard cap).
 * Even if form allows up to 8, clamp to 4 for speed.
 */
export const MAX_SECTIONS_AI_MVP = 4

/**
 * Maximum items per section for AI Generate MVP (hard cap).
 * Even if form allows up to 12, clamp to 5 for speed.
 */
export const MAX_ITEMS_AI_MVP = 5

/**
 * OpenAI request timeout in milliseconds (10 seconds for MVP).
 * If OpenAI doesn't respond in 10s, abort and return JSON error.
 * Must be well before Vercel timeout.
 */
export const OPENAI_REQUEST_TIMEOUT_MS = 10000

