/**
 * AI Generation Validation
 *
 * Validates generated structured assets before displaying to user.
 * Ensures AI output matches GuideForge schemas.
 */

import type { GeneratedChecklist } from "./generation-schemas"

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a generated Checklist matches GuideForge schema.
 *
 * Rules:
 * - assetType must be "checklist"
 * - title and summary must be non-empty strings
 * - sections must be non-empty array
 * - each section must have non-empty title
 * - each item must have non-empty label
 * - required must be boolean
 * - completionCriteria, tags, assumptions, missingInfo must be arrays
 * - max 8 sections, max 12 items per section
 */
export function validateGeneratedChecklist(asset: any): ValidationResult {
  const errors: string[] = []

  // Basic structure
  if (!asset || typeof asset !== "object") {
    errors.push("Asset must be an object")
    return { valid: false, errors }
  }

  if (asset.assetType !== "checklist") {
    errors.push(`assetType must be "checklist", got "${asset.assetType}"`)
  }

  if (typeof asset.title !== "string" || !asset.title.trim()) {
    errors.push("title must be a non-empty string")
  }

  if (typeof asset.summary !== "string" || !asset.summary.trim()) {
    errors.push("summary must be a non-empty string")
  }

  // Sections validation
  if (!Array.isArray(asset.sections)) {
    errors.push("sections must be an array")
  } else {
    if (asset.sections.length === 0) {
      errors.push("sections must have at least one section")
    }
    if (asset.sections.length > 8) {
      errors.push(`sections has ${asset.sections.length} sections, max is 8`)
    }

    asset.sections.forEach((section: any, idx: number) => {
      if (typeof section.title !== "string" || !section.title.trim()) {
        errors.push(`section[${idx}].title must be a non-empty string`)
      }

      if (!Array.isArray(section.items)) {
        errors.push(`section[${idx}].items must be an array`)
      } else {
        if (section.items.length === 0) {
          errors.push(`section[${idx}] must have at least one item`)
        }
        if (section.items.length > 12) {
          errors.push(
            `section[${idx}] has ${section.items.length} items, max is 12`
          )
        }

        section.items.forEach((item: any, iIdx: number) => {
          if (typeof item.label !== "string" || !item.label.trim()) {
            errors.push(
              `section[${idx}].items[${iIdx}].label must be a non-empty string`
            )
          }

          if (item.description !== null && typeof item.description !== "string") {
            errors.push(
              `section[${idx}].items[${iIdx}].description must be a string or null`
            )
          }

          if (typeof item.required !== "boolean") {
            errors.push(
              `section[${idx}].items[${iIdx}].required must be a boolean`
            )
          }
        })
      }
    })
  }

  // Array fields
  if (!Array.isArray(asset.completionCriteria)) {
    errors.push("completionCriteria must be an array")
  }
  if (!Array.isArray(asset.tags)) {
    errors.push("tags must be an array")
  }
  if (!Array.isArray(asset.assumptions)) {
    errors.push("assumptions must be an array")
  }
  if (!Array.isArray(asset.missingInfo)) {
    errors.push("missingInfo must be an array")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
