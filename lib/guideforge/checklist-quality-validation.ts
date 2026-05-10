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
  // Additional generic item labels to reject
  genericItemLabels: [
    /^review requirements$/i,
    /^verify details$/i,
    /^complete setup$/i,
    /^confirm configuration$/i,
    /^validate integration$/i,
  ],
}

/**
 * Validate checklist quality - reject placeholder/generic content
 */
export function validateChecklistQuality(asset: GeneratedChecklist): QualityValidationResult {
  const errors: string[] = []
  let totalItems = 0
  let genericItemCount = 0

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

      totalItems++

      // Generic item label patterns
      if (GENERIC_PATTERNS.itemLabel.test(label)) {
        errors.push(
          `section[${sIdx}].items[${iIdx}].label is too generic: "${label}". Use specific, actionable labels.`
        )
        genericItemCount++
      }

      // Check against common generic item labels
      for (const pattern of GENERIC_PATTERNS.genericItemLabels) {
        if (pattern.test(label)) {
          errors.push(
            `section[${sIdx}].items[${iIdx}].label is too generic: "${label}". Use specific, actionable labels.`
          )
          genericItemCount++
          break
        }
      }

      // Item label too short
      if (label.length < 5) {
        errors.push(
          `section[${sIdx}].items[${iIdx}].label is too short: "${label}". Minimum 5 characters.`
        )
      }

      // Generic item description
      if (desc && GENERIC_PATTERNS.itemDescription.test(desc)) {
        // Safely truncate description for logging
        const descPreview = (typeof desc === "string" ? desc : String(desc)).substring(0, 40)
        errors.push(
          `section[${sIdx}].items[${iIdx}].description is too generic: "${descPreview}...". Use specific details.`
        )
      }

      // Description that only repeats section name
      if (desc && desc.toLowerCase().includes(title.toLowerCase()) && label.toLowerCase() === desc.toLowerCase()) {
        errors.push(
          `section[${sIdx}].items[${iIdx}] description should not just repeat the section title.`
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

  // Check for excessive generic items (more than 30%)
  if (totalItems > 0 && genericItemCount / totalItems > 0.3) {
    errors.push(
      `Too many generic item labels (${genericItemCount}/${totalItems}). More than 30% are placeholder/common patterns.`
    )
  }

  // Check summary
  const summary = asset.summary.trim()
  
  // Summary that starts with "This checklist helps [audience] make sure [goal]" pattern
  if (
    summary.match(/^This checklist helps .+ make sure .+\. For .+\. Tone: .+\.?$/i) ||
    summary.match(/^A comprehensive checklist for .+\. Use this for .+\.$/i)
  ) {
    errors.push(
      `Summary appears to be a generic template: "${summary}". Provide natural, specific summary.`
    )
  }

  if (summary.includes("..") || summary.includes("//")) {
    // Safely truncate summary for logging
    const summaryPreview = (typeof summary === "string" ? summary : String(summary)).substring(0, 60)
    errors.push(
      `summary has formatting issues: "${summaryPreview}..."`
    )
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
