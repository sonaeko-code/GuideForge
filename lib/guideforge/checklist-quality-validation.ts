/**
 * Checklist Quality Validation
 *
 * Beyond schema validation, ensure AI-generated content is useful and specific.
 * Catches placeholder content, generic sections/items, and poor summaries.
 */

import type { GeneratedChecklist } from "./generation-schemas"

export interface QualityValidationResult {
  valid: boolean
  errors: string[]
}

const GENERIC_PATTERNS = {
  sectionTitle: /^section \d+/i,
  itemLabel: /^item \d+/i,
  itemDescription: /^(complete this task|follow this|this is item|do the task|placeholder|todo|example|item \d+)/i,
  singleChar: /^[a-z]$/i,
}

/**
 * Validate checklist quality - reject placeholder/generic content
 */
export function validateChecklistQuality(asset: GeneratedChecklist): QualityValidationResult {
  const errors: string[] = []

  // Check section titles
  asset.sections.forEach((section, sIdx) => {
    const title = section.title.trim()

    // Single character sections (the P/r/e/p bug)
    if (GENERIC_PATTERNS.singleChar.test(title)) {
      errors.push(
        `section[${sIdx}].title is a single character "${title}". Must be a meaningful phrase.`
      )
    }

    // Generic section patterns
    if (GENERIC_PATTERNS.sectionTitle.test(title)) {
      errors.push(
        `section[${sIdx}].title is too generic: "${title}". Use specific domain-related titles.`
      )
    }

    // Section title too short
    if (title.length < 3) {
      errors.push(
        `section[${sIdx}].title is too short: "${title}". Minimum 3 characters.`
      )
    }

    // Check item labels and descriptions
    section.items.forEach((item, iIdx) => {
      const label = item.label.trim()
      const desc = item.description?.trim() || ""

      // Generic item label patterns
      if (GENERIC_PATTERNS.itemLabel.test(label)) {
        errors.push(
          `section[${sIdx}].items[${iIdx}].label is too generic: "${label}". Use specific, actionable labels.`
        )
      }

      // Item label too short
      if (label.length < 5) {
        errors.push(
          `section[${sIdx}].items[${iIdx}].label is too short: "${label}". Minimum 5 characters.`
        )
      }

      // Generic item description
      if (desc && GENERIC_PATTERNS.itemDescription.test(desc)) {
        errors.push(
          `section[${sIdx}].items[${iIdx}].description is too generic: "${desc.substring(0, 40)}...". Use specific details.`
        )
      }

      // Check for repeated similar labels in same section
      const sameLabels = section.items.filter((i) => i.label.trim() === label)
      if (sameLabels.length > 1) {
        errors.push(
          `section[${sIdx}] has duplicate labels: "${label}". Each item should be unique.`
        )
      }
    })
  })

  // Check summary
  const summary = asset.summary.trim()
  if (summary.startsWith("A comprehensive checklist for")) {
    // This pattern is allowed but should be checked for grammatical correctness
    // Only reject if it looks malformed
    if (summary.includes("..") || summary.includes("//")) {
      errors.push(
        `summary has formatting issues: "${summary.substring(0, 60)}..."`
      )
    }
  }

  // Check for double periods
  if (summary.includes("..")) {
    errors.push("summary contains double periods (..) - fix formatting")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
