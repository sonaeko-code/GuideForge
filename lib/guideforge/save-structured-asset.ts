/**
 * Save Structured Asset as Draft
 *
 * Two paths:
 * 1. User provides network/hub/collection (via destination selector)
 * 2. Error if no destination selected
 *
 * For MVP: Requires explicit destination selection.
 * Future: Could support account-bound drafts with dedicated storage.
 */

import type { GeneratedStructuredAsset } from "./generation-schemas"
import type { GuideStep } from "./types"
import { createAndSaveGuideDraft } from "./create-and-save-guide-draft"

export interface SaveStructuredAssetResult {
  success: boolean
  guideId?: string
  networkId?: string
  hubId?: string
  collectionId?: string
  error?: string
  requiresDestinationSelection?: boolean
}

/**
 * Convert structured asset into guide steps format.
 */
function assetToGuideSteps(asset: GeneratedStructuredAsset): Partial<GuideStep>[] {
  switch (asset.assetType) {
    case "single_guide":
      return asset.steps.map((step, idx) => ({
        order: idx,
        title: step.title,
        body: step.body,
        tip: step.tip,
        warning: step.warning,
      }))

    case "recipe": {
      const recipeSteps: Partial<GuideStep>[] = []
      recipeSteps.push({
        order: 0,
        title: "Ingredients",
        body: asset.ingredients
          .map((ing) => `• ${ing.name}${ing.amount ? ` (${ing.amount})` : ""}${ing.notes ? ` - ${ing.notes}` : ""}`)
          .join("\n"),
      })
      asset.steps.forEach((step, idx) => {
        recipeSteps.push({
          order: idx + 1,
          title: step.title,
          body: step.body,
          tip: step.tip,
        })
      })
      return recipeSteps
    }

    case "checklist": {
      const checklistSteps: Partial<GuideStep>[] = []
      asset.sections.forEach((section, sIdx) => {
        checklistSteps.push({
          order: sIdx,
          title: section.title,
          body: section.items
            .map(
              (item) =>
                `[ ] ${item.label}${item.description ? ` - ${item.description}` : ""}${item.required ? " (Required)" : ""}`
            )
            .join("\n"),
        })
      })
      return checklistSteps
    }

    case "sop": {
      const sopSteps: Partial<GuideStep>[] = []
      sopSteps.push({
        order: 0,
        title: "Purpose & Scope",
        body: `**Purpose:** ${asset.purpose}\n\n**Scope:** ${asset.scope}${asset.owner ? `\n\n**Owner:** ${asset.owner}` : ""}`,
      })
      if (asset.requirements.length > 0) {
        sopSteps.push({
          order: 1,
          title: "Requirements",
          body: asset.requirements.map((req) => `• ${req}`).join("\n"),
        })
      }
      asset.procedureSteps.forEach((step, idx) => {
        sopSteps.push({
          order: idx + 2,
          title: step.title,
          body: step.body,
          warning: step.warning,
        })
      })
      return sopSteps
    }

    case "troubleshooting_flow": {
      const troubleshootSteps: Partial<GuideStep>[] = []
      troubleshootSteps.push({
        order: 0,
        title: "Symptom",
        body: asset.symptom,
      })
      troubleshootSteps.push({
        order: 1,
        title: "Diagnosis",
        body: asset.checks.map((check) => `• **${check.title}**: ${check.question}`).join("\n"),
      })
      if (asset.likelyCauses.length > 0) {
        troubleshootSteps.push({
          order: 2,
          title: "Likely Causes",
          body: asset.likelyCauses.map((cause) => `• ${cause}`).join("\n"),
        })
      }
      asset.fixSteps.forEach((fix, idx) => {
        troubleshootSteps.push({
          order: idx + 3,
          title: fix.title,
          body: fix.body,
          warning: fix.escalateIfFailed || undefined,
        })
      })
      return troubleshootSteps
    }

    default:
      return []
  }
}

/**
 * Save structured asset as a draft guide.
 * Requires explicit networkId/hubId/collectionId from destination selector.
 */
export async function saveStructuredAssetAsDraft(
  asset: GeneratedStructuredAsset,
  networkId: string,
  hubId: string,
  collectionId: string
): Promise<SaveStructuredAssetResult> {
  try {
    console.log("[v0] saveStructuredAssetAsDraft: Starting save for", asset.assetType, asset.title)

    if (!networkId || !hubId || !collectionId) {
      return {
        success: false,
        error: "Network, hub, and collection are required. Please select a destination.",
        requiresDestinationSelection: true,
      }
    }

    // Convert asset to guide steps
    const steps = assetToGuideSteps(asset)

    // Determine guide type from asset
    const guideTypeMap: Record<GeneratedStructuredAsset["assetType"], string> = {
      single_guide: "guide",
      recipe: "recipe",
      checklist: "checklist",
      sop: "sop",
      troubleshooting_flow: "troubleshooting",
    }

    // Save as draft
    const result = await createAndSaveGuideDraft({
      title: asset.title,
      summary: asset.summary,
      guideType: guideTypeMap[asset.assetType] as any,
      difficulty: asset.assetType === "single_guide" ? asset.difficulty : "intermediate",
      networkId,
      hubId,
      collectionId,
      steps,
      warnings: "warnings" in asset ? asset.warnings : undefined,
      requirements:
        "requirements" in asset
          ? asset.requirements
          : "ingredients" in asset
            ? asset.ingredients.map((i) => i.name)
            : undefined,
    })

    if (!result.verified) {
      return {
        success: false,
        error: result.error || "Failed to save guide draft",
      }
    }

    return {
      success: true,
      guideId: result.id,
      networkId,
      hubId,
      collectionId,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] saveStructuredAssetAsDraft error:", err)
    return {
      success: false,
      error: `Save failed: ${msg}`,
    }
  }
}
