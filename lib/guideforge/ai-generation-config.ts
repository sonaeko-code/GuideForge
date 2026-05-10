/**
 * AI Generation Configuration
 *
 * Centralized configuration for AI model selection and parameters.
 * Currently uses OpenAI's gpt-4-turbo.
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
 * Current choice: gpt-4-turbo
 * - Reliable JSON output with structured format
 * - Good balance of capability and cost
 * - Supports 128k context (useful for complex prompts)
 *
 * If you want to switch models:
 * 1. Update DEFAULT_CHECKLIST_MODEL below
 * 2. Test with new model to ensure JSON output quality
 * 3. Monitor validation failure rates
 * 4. Consider cost implications
 */
export const DEFAULT_CHECKLIST_MODEL = "gpt-4-turbo"

/**
 * AI generation temperature (creativity/randomness).
 * 0.7 provides good balance between consistency and variety.
 * Lower (0.0-0.5) = more predictable, higher (0.7-1.0) = more creative
 */
export const GENERATION_TEMPERATURE = 0.7

/**
 * Maximum tokens for a single generation.
 * Checklists typically use 1000-1500 tokens.
 * Set to 2000 for safety margin.
 */
export const MAX_GENERATION_TOKENS = 2000

/**
 * Maximum repair attempts for malformed output.
 * Currently: 1 repair attempt allowed
 * If first repair fails, return user error instead of looping
 */
export const MAX_REPAIR_ATTEMPTS = 1
