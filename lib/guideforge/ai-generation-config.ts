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
 * Current choice: gpt-4o-mini
 * - Lightweight, fast, and cost-effective
 * - Reliable JSON output with structured format
 * - Excellent balance of capability and speed
 * - ~1/5 the cost of gpt-4-turbo
 *
 * If you want to switch models:
 * 1. Update DEFAULT_CHECKLIST_MODEL below
 * 2. Test with new model to ensure JSON output quality
 * 3. Monitor validation failure rates
 * 4. Consider cost implications
 */
export const DEFAULT_CHECKLIST_MODEL = "gpt-4o-mini"

/**
 * Default AI model for single guide generation.
 * Uses the same model as checklist for consistency and cost efficiency.
 */
export const DEFAULT_SINGLE_GUIDE_MODEL = "gpt-4o-mini"

/**
 * AI generation temperature (creativity/randomness).
 * 0.3 provides deterministic, reliable output suitable for structured JSON generation.
 * Lower values (0.0-0.5) produce more predictable, repeatable results.
 * Matches Techsperts pattern for consistency.
 */
export const GENERATION_TEMPERATURE = 0.3

/**
 * Maximum tokens for a single generation.
 * Checklists with 4 sections and 5 items per section typically use 1500-2000 tokens.
 * Set to 2200 to ensure adequate output without excessive token usage.
 */
export const MAX_GENERATION_TOKENS = 2200
