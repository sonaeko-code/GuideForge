/**
 * Save Structured Asset as Draft
 *
 * Converts generated structured assets into draft guides.
 * Uses existing createAndSaveGuideDraft helper.
 *
 * For MVP: Requires user to select a network/hub/collection before saving.
 * Future: Could auto-create a "Generated" collection for user if preferred.
 */

import type { GeneratedStructuredAsset } from "./generation-schemas"
import type { GuideStep } from "./types"
import { createAndSaveGuideDraft } from "./create-and-save-guide-draft"
import { supabase } from "./supabase-client"

export interface SaveStructuredAssetResult {
  success: boolean
  guideId?: string
  networkId?: string
  hubId?: string
  collectionId?: string
  error?: string
  requiresSelection?: string
}

/**
 * Convert structured asset into guide steps format.
 */function assetToGuideSteps(asset: GeneratedStructuredAsset): Partial<GuideStep>[] {
  switch (asset.assetType) {
    case "single_guide":
      return asset.steps.map((step, idx) => ({
        order: idx,
        title: step.title,
        body: step.body,
        tip: step.tip,
        warning: step.warning,
      }))

    case "recipe":
      const recipeSteps: Partial<GuideStep>[] = []
      // Ingredients section
      recipeSteps.push({
        order: 0,
        title: "Ingredients",
        body: asset.ingredients
          .map((ing) => `• ${ing.name}${ing.amount ? ` (${ing.amount})` : ""}${ing.notes ? ` - ${ing.notes}` : ""}`)
          .join("\n"),
      })
      // Recipe steps
      asset.steps.forEach((step, idx) => {
        recipeSteps.push({
          order: idx + 1,
          title: step.title,
          body: step.body,
          tip: step.tip,
        })
      })
      return recipeSteps

    case "checklist":
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

    case "sop":
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

    case "troubleshooting_flow":
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

    default:
      return []
  }
}

/**
 * Save structured asset as a draft guide.
 * For MVP, requires the user to select network/hub/collection.
 * This is a placeholder that shows what's needed.
 */
export async function saveStructuredAssetAsDraft(
  asset: GeneratedStructuredAsset
): Promise<SaveStructuredAssetResult> {
  try {
    console.log("[v0] saveStructuredAssetAsDraft: Starting save for", asset.assetType, asset.title)

    // For MVP: User must select network/hub/collection before saving
    // In a full implementation, we'd show a selection modal here
    // For now, we'll return an error indicating what's needed

    // Get user's first network/hub/collection as fallback
    const { data: networks, error: nErr } = await supabase
      .from("networks")
      .select("id")
      .limit(1)
      .single()

    if (nErr || !networks) {
      return {
        success: false,
        error: "No network found. Please create a network first or select where to save this asset.",
        requiresSelection: "create a network or select a destination",
      }
    }

    const { data: hubs, error: hErr } = await supabase
      .from("hubs")
      .select("id")
      .eq("network_id", networks.id)
      .limit(1)
      .single()

    if (hErr || !hubs) {
      return {
        success: false,
        error: "No hub found in your network. Please create a hub first.",
        requiresSelection: "create a hub",
      }
    }

    const { data: collections, error: cErr } = await supabase
      .from("collections")
      .select("id")
      .eq("hub_id", hubs.id)
      .limit(1)
      .single()

    if (cErr || !collections) {
      return {
        success: false,
        error: "No collection found in this hub. Please create a collection first.",
        requiresSelection: "create a collection",
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
      networkId: networks.id,
      hubId: hubs.id,
      collectionId: collections.id,
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
      networkId: networks.id,
      hubId: hubs.id,
      collectionId: collections.id,
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
