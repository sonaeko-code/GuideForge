/**
 * Mock Structured Asset Generator
 *
 * Generates realistic asset proposals for UI testing.
 * Supports: Single Guide, Recipe, Checklist, SOP, Troubleshooting Flow
 *
 * Future: Replace with real OpenAI/Claude API calls.
 */

import type {
  SingleGuideIntakeRequest,
  RecipeIntakeRequest,
  ChecklistIntakeRequest,
  SOPIntakeRequest,
  TroubleshootingFlowIntakeRequest,
  GeneratedSingleGuide,
  GeneratedRecipe,
  GeneratedChecklist,
  GeneratedSOP,
  GeneratedTroubleshootingFlow,
  GeneratedStructuredAsset,
} from "./generation-schemas"
import { slugify } from "./utils"

export interface GenerateAssetResult<T extends GeneratedStructuredAsset = GeneratedStructuredAsset> {
  success: boolean
  asset?: T
  error?: string
}

// Single Guide Generator
export async function generateSingleGuideMock(
  request: SingleGuideIntakeRequest
): Promise<GenerateAssetResult<GeneratedSingleGuide>> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const steps = Array.from({ length: Math.max(3, request.numberOfSteps) }).map((_, idx) => ({
      title: `Step ${idx + 1}: ${["Initialize", "Configure", "Execute", "Verify", "Optimize"][idx] || "Continue"}`,
      body: `This is step ${idx + 1} of the guide. Follow this carefully to proceed.`,
      successCondition: idx < request.numberOfSteps - 1 ? `Step ${idx + 1} completed` : null,
      tip: idx % 2 === 0 ? `Pro tip for step ${idx + 1}` : null,
      warning: request.hasWarnings && idx % 3 === 0 ? `⚠️ Warning for step ${idx + 1}` : null,
    }))

    const asset: GeneratedSingleGuide = {
      assetType: "single_guide",
      title: request.title,
      summary: `A comprehensive ${request.difficulty} guide for ${request.audience}. ${request.purpose}`,
      audience: request.audience,
      difficulty: request.difficulty,
      requirements: request.hasPrerequisites
        ? [
            "Basic familiarity with the topic",
            "Required tools or access",
            "Time to complete: ~15-30 minutes",
          ]
        : [],
      warnings: request.hasWarnings
        ? [
            "This process may have irreversible consequences if done incorrectly.",
            "Proceed only if you have the necessary permissions.",
          ]
        : [],
      steps,
      tags: [request.guideType, request.difficulty, request.tone],
      assumptions: [
        `Target audience: ${request.audience}`,
        `Tone: ${request.tone}`,
        `Guide type: ${request.guideType}`,
      ],
      missingInfo: request.optionalContext.trim() ? [] : ["Consider providing domain-specific context for more targeted generation."],
    }

    return { success: true, asset }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}

// Recipe Generator
export async function generateRecipeMock(
  request: RecipeIntakeRequest
): Promise<GenerateAssetResult<GeneratedRecipe>> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const asset: GeneratedRecipe = {
      assetType: "recipe",
      title: request.title,
      summary: `A delicious ${request.cuisine} recipe. ${request.purpose}`,
      servings: request.servings,
      prepTime: request.prepTime || null,
      cookTime: request.cookTime || null,
      ingredients: [
        { name: "Main ingredient", amount: "2 cups", notes: "Or to taste" },
        { name: "Seasoning", amount: "1 tsp", notes: null },
        { name: "Finishing touch", amount: "1 tbsp", notes: "Fresh herbs" },
      ],
      steps: [
        { title: "Prepare", body: "Gather and prepare all ingredients.", tip: "Mise en place saves time." },
        {
          title: "Cook",
          body: "Follow standard cooking procedures.",
          tip: "Cook at medium heat for best results.",
        },
        { title: "Serve", body: "Plate and serve while hot.", tip: "Garnish before serving." },
      ],
      dietaryNotes: request.dietaryNotes.trim() ? [request.dietaryNotes] : [],
      warnings: [],
      tags: [request.cuisine, "recipe", "homemade"],
      assumptions: [
        `Cuisine: ${request.cuisine}`,
        `Audience: ${request.audience}`,
        `Purpose: ${request.purpose}`,
      ],
      missingInfo: [],
    }

    return { success: true, asset }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}

// Checklist Generator
export async function generateChecklistMock(
  request: ChecklistIntakeRequest
): Promise<GenerateAssetResult<GeneratedChecklist>> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    // Fixed: Use proper string split instead of character indexing
    const sectionNames = "Preparation,Setup,Execution,Verification,Cleanup".split(",")
    const sections = Array.from({ length: Math.max(2, request.numberOfSections) }).map((_, sIdx) => ({
      title: `${sectionNames[sIdx] || "Additional Tasks"}`,
      items: Array.from({ length: Math.max(2, request.itemsPerSection) }).map((_, iIdx) => ({
        label: `${["Review", "Verify", "Complete", "Confirm", "Validate", "Check", "Test", "Prepare", "Plan", "Execute"][iIdx % 10]} ${["requirements", "details", "setup", "configuration", "integration", "testing", "deployment", "documentation", "dependencies", "status"][iIdx % 10]}`,
        description: iIdx === 0 ? `Start with this essential task for ${sectionNames[sIdx]}` : null,
        required: iIdx === 0 || iIdx === Math.floor(request.itemsPerSection / 2),
      })),
    }))

    const asset: GeneratedChecklist = {
      assetType: "checklist",
      title: request.title,
      summary: `This checklist helps ${request.audience} ${request.purpose.toLowerCase()}. For ${request.useCase}. Tone: ${request.tone}.`,
      sections,
      completionCriteria: [
        "All required items completed",
        "All verification passed",
        "Documentation updated",
      ],
      tags: [request.useCase, "checklist", request.tone],
      assumptions: [
        `Goal: ${request.goal}`,
        `Use case: ${request.useCase}`,
        `Audience: ${request.audience}`,
      ],
      missingInfo: [],
      generatedBy: "mock",
    }

    return { success: true, asset }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}

// SOP Generator
export async function generateSOPMock(
  request: SOPIntakeRequest
): Promise<GenerateAssetResult<GeneratedSOP>> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const asset: GeneratedSOP = {
      assetType: "sop",
      title: request.title,
      purpose: request.purpose,
      scope: request.scope,
      owner: request.owner || "Process Owner",
      requirements: [
        request.requiredTools,
        request.complianceNotes,
        "Authorization from supervisor",
      ].filter((r) => r.trim()),
      procedureSteps: [
        {
          title: "Step 1: Initiate",
          body: "Begin the procedure with proper authorization and documentation.",
          responsibleRole: request.owner || "Process Owner",
          warning: null,
        },
        {
          title: "Step 2: Execute",
          body: "Follow the procedure according to specifications.",
          responsibleRole: "Operator",
          warning: "Ensure compliance with all requirements.",
        },
        {
          title: "Step 3: Verify",
          body: "Verify completion and document results.",
          responsibleRole: "Supervisor",
          warning: null,
        },
      ],
      reviewNotes: [
        `Review frequency: ${request.reviewFrequency}`,
        "Update when process changes",
        "Document all exceptions",
      ].filter((n) => n.trim()),
      tags: [request.department, "sop", "procedure"],
      assumptions: [
        `Owner: ${request.owner}`,
        `Department: ${request.department}`,
        `Purpose: ${request.purpose}`,
      ],
      missingInfo: [],
    }

    return { success: true, asset }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}

// Troubleshooting Flow Generator
export async function generateTroubleshootingFlowMock(
  request: TroubleshootingFlowIntakeRequest
): Promise<GenerateAssetResult<GeneratedTroubleshootingFlow>> {
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const asset: GeneratedTroubleshootingFlow = {
      assetType: "troubleshooting_flow",
      title: request.title,
      symptom: request.symptom,
      summary: `Troubleshooting guide for: ${request.symptom}. Environment: ${request.environment}`,
      checks: [
        {
          title: "Check 1",
          question: "Have you verified the basic requirements?",
          ifYes: "Check 2",
          ifNo: "See Fix 1",
        },
        {
          title: "Check 2",
          question: "Are all services running?",
          ifYes: "Check 3",
          ifNo: "See Fix 2",
        },
        {
          title: "Check 3",
          question: "Is the configuration correct?",
          ifYes: "Issue resolved",
          ifNo: "See Fix 3",
        },
      ],
      likelyCauses: request.likelyCauses.trim()
        ? [request.likelyCauses]
        : ["Misconfiguration", "Service outage", "Permission issues"],
      fixSteps: [
        {
          title: "Fix 1: Basic Setup",
          body: "Ensure all prerequisites are met and services are initialized.",
          escalateIfFailed: "Contact support if issue persists.",
        },
        {
          title: "Fix 2: Service Restart",
          body: "Restart all relevant services and verify they start correctly.",
          escalateIfFailed: "Check service logs for errors.",
        },
        {
          title: "Fix 3: Configuration Review",
          body: "Review and update configuration according to documentation.",
          escalateIfFailed: request.escalationPath || "Escalate to senior support.",
        },
      ],
      warnings: [
        `Risk level: ${request.riskLevel}`,
        "Back up all data before attempting fixes",
        "Document your steps for troubleshooting",
      ],
      tags: [request.environment, "troubleshooting", request.riskLevel],
      assumptions: [
        `Environment: ${request.environment}`,
        `Risk level: ${request.riskLevel}`,
        `Audience: ${request.audience}`,
      ],
      missingInfo: [],
    }

    return { success: true, asset }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Generation failed",
    }
  }
}
