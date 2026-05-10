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
    // Generate context-aware sections based on the goal and use case
    const sections = generateContextAwareChecklistSections(request)

    const asset: GeneratedChecklist = {
      assetType: "checklist",
      title: request.title,
      summary: generateChecklistSummary(request),
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

/**
 * Generate context-aware checklist sections based on user input
 */
function generateContextAwareChecklistSections(
  request: ChecklistIntakeRequest
): Array<{
  title: string
  items: Array<{ label: string; description: string | null; required: boolean }>
}> {
  const lowerGoal = request.goal.toLowerCase()
  const lowerPurpose = request.purpose.toLowerCase()
  const lowerUseCase = request.useCase.toLowerCase()
  const lowerContext = (request.optionalContext || "").toLowerCase()

  // Detect domain from keywords
  const isGameLaunch =
    lowerContext.includes("game") ||
    lowerContext.includes("steam") ||
    lowerContext.includes("launch") ||
    lowerPurpose.includes("launch") ||
    lowerGoal.includes("launch")

  const isQA =
    lowerContext.includes("qa") ||
    lowerContext.includes("test") ||
    lowerContext.includes("quality") ||
    lowerGoal.includes("catch issues") ||
    lowerGoal.includes("bugs")

  const isDeployment =
    lowerContext.includes("deploy") ||
    lowerContext.includes("release") ||
    lowerContext.includes("patch") ||
    lowerPurpose.includes("deploy") ||
    lowerGoal.includes("deploy")

  const isBackup =
    lowerContext.includes("backup") ||
    lowerContext.includes("rollback") ||
    lowerContext.includes("restore") ||
    lowerGoal.includes("backup")

  const isCommunity =
    lowerContext.includes("community") ||
    lowerContext.includes("announcement") ||
    lowerContext.includes("communication") ||
    lowerGoal.includes("announce")

  const isMonitoring =
    lowerContext.includes("monitor") ||
    lowerContext.includes("incident") ||
    lowerContext.includes("response") ||
    lowerGoal.includes("monitor")

  // Build sections based on detected domain
  const sectionTemplates: Array<{
    title: string
    items: Array<{ label: string; description?: string; required?: boolean }>
  }> = []

  // Game launch specialized sections
  if (isGameLaunch && (isQA || isDeployment)) {
    sectionTemplates.push(
      {
        title: "QA & Regression Testing",
        items: [
          { label: "Verify all critical bugs are resolved or documented", required: true },
          { label: "Test core gameplay loops on target platform", required: true },
          { label: "Confirm no regressions in recent fixes", required: true },
          { label: "Validate performance under expected load", required: false },
          { label: "Check all platform-specific features", required: false },
        ],
      },
      {
        title: "Build Backup & Rollback Preparation",
        items: [
          { label: "Back up the current live build before deployment", required: true },
          { label: "Prepare rollback instructions for critical failures", required: true },
          { label: "Document rollback testing procedure", required: false },
          { label: "Confirm backup integrity and recoverability", required: true },
          { label: "Brief ops team on rollback procedure", required: false },
        ],
      },
      {
        title: "Patch Notes & Store Readiness",
        items: [
          { label: "Confirm patch notes match the final build", required: true },
          { label: "Update store page with patch details if needed", required: false },
          { label: "Review marketing messaging for accuracy", required: false },
          { label: "Finalize all public-facing documentation", required: true },
        ],
      },
      {
        title: "Community Announcement & Monitoring",
        items: [
          { label: "Schedule community announcement posts", required: true },
          { label: "Prepare FAQ for known issues and workarounds", required: false },
          { label: "Set up monitoring alerts for live environment", required: true },
          { label: "Brief community managers on launch timeline", required: false },
          { label: "Configure incident response channels", required: true },
        ],
      }
    )
  }
  // Standard QA sections
  else if (isQA) {
    sectionTemplates.push(
      {
        title: "Planning & Scope",
        items: [
          { label: "Define test scenarios and acceptance criteria", required: true },
          { label: "Identify all components to be tested", required: true },
          { label: "Document known limitations or constraints", required: false },
        ],
      },
      {
        title: "Execution & Testing",
        items: [
          { label: "Execute all planned test scenarios", required: true },
          { label: "Log issues with clear reproduction steps", required: true },
          { label: "Verify fixes for previously logged issues", required: true },
          { label: "Check edge cases and boundary conditions", required: false },
        ],
      },
      {
        title: "Verification & Sign-Off",
        items: [
          { label: "Confirm all critical items passed", required: true },
          { label: "Document any remaining known issues", required: true },
          { label: "Obtain sign-off from stakeholders", required: true },
        ],
      }
    )
  }
  // Standard deployment sections
  else if (isDeployment) {
    sectionTemplates.push(
      {
        title: "Pre-Deployment Checklist",
        items: [
          { label: "Verify all code changes are committed and reviewed", required: true },
          { label: "Confirm deployment environment configuration", required: true },
          { label: "Validate data migration or update scripts if needed", required: false },
          { label: "Brief all team members on deployment plan", required: true },
        ],
      },
      {
        title: "Deployment Execution",
        items: [
          { label: "Execute deployment steps in order", required: true },
          { label: "Monitor application health during deployment", required: true },
          { label: "Verify critical functionality is working", required: true },
          { label: "Update monitoring and alerting if needed", required: false },
        ],
      },
      {
        title: "Post-Deployment Verification",
        items: [
          { label: "Run smoke tests on deployed application", required: true },
          { label: "Confirm all metrics and logs are flowing normally", required: true },
          { label: "Document deployment completion and any issues", required: true },
        ],
      }
    )
  }
  // Backup/rollback sections
  else if (isBackup) {
    sectionTemplates.push(
      {
        title: "Backup Preparation",
        items: [
          { label: "Identify all systems and data to be backed up", required: true },
          { label: "Verify backup storage space and access", required: true },
          { label: "Confirm backup tool functionality", required: true },
        ],
      },
      {
        title: "Backup Execution",
        items: [
          { label: "Execute full backup of all systems", required: true },
          { label: "Verify backup completion and integrity", required: true },
          { label: "Test restoration from backup", required: false },
          { label: "Document backup location and access procedure", required: true },
        ],
      },
      {
        title: "Rollback Readiness",
        items: [
          { label: "Prepare rollback plan with clear steps", required: true },
          { label: "Brief team on rollback procedure", required: true },
          { label: "Verify all prerequisites for rollback are ready", required: true },
          { label: "Document rollback testing results", required: false },
        ],
      }
    )
  }
  // Community-focused sections
  else if (isCommunity) {
    sectionTemplates.push(
      {
        title: "Message Preparation",
        items: [
          { label: "Draft announcement message", required: true },
          { label: "Review message for clarity and tone", required: true },
          { label: "Identify target audience and channels", required: true },
        ],
      },
      {
        title: "Announcement & Engagement",
        items: [
          { label: "Post announcement to all planned channels", required: true },
          { label: "Monitor community responses and feedback", required: true },
          { label: "Respond to questions and concerns promptly", required: false },
          { label: "Pin important announcements or FAQs", required: false },
        ],
      },
      {
        title: "Measurement & Follow-Up",
        items: [
          { label: "Track engagement metrics for announcement", required: false },
          { label: "Document community sentiment and feedback", required: false },
          { label: "Plan follow-up communication if needed", required: false },
        ],
      }
    )
  }
  // Monitoring-focused sections
  else if (isMonitoring) {
    sectionTemplates.push(
      {
        title: "Monitoring Setup",
        items: [
          { label: "Define key metrics and alert thresholds", required: true },
          { label: "Configure monitoring alerts and notifications", required: true },
          { label: "Verify all monitoring systems are operational", required: true },
          { label: "Test alert delivery to response channels", required: true },
        ],
      },
      {
        title: "Incident Response",
        items: [
          { label: "Document incident response procedures", required: true },
          { label: "Brief response team on escalation process", required: true },
          { label: "Prepare incident communication templates", required: false },
          { label: "Confirm contact information for all responders", required: true },
        ],
      },
      {
        title: "Post-Incident Review",
        items: [
          { label: "Collect incident timeline and impact data", required: false },
          { label: "Conduct post-incident review meeting", required: false },
          { label: "Document lessons learned and action items", required: false },
        ],
      }
    )
  }

  // Fallback: generic universal sections
  if (sectionTemplates.length === 0) {
    sectionTemplates.push(
      {
        title: "Planning & Scope",
        items: [
          { label: "Define objectives and success criteria", required: true },
          { label: "Identify required resources and materials", required: true },
          { label: "Document assumptions and constraints", required: false },
        ],
      },
      {
        title: "Preparation",
        items: [
          { label: "Gather all necessary materials and access", required: true },
          { label: "Review procedures and prerequisites", required: true },
          { label: "Confirm team readiness and communication", required: false },
        ],
      },
      {
        title: "Execution",
        items: [
          { label: "Execute planned steps in sequence", required: true },
          { label: "Monitor progress and address issues", required: true },
          { label: "Document any deviations or incidents", required: false },
        ],
      },
      {
        title: "Verification & Completion",
        items: [
          { label: "Verify all critical objectives met", required: true },
          { label: "Confirm no unexpected issues remain", required: true },
          { label: "Document completion and next steps", required: true },
        ],
      }
    )
  }

  // Format sections to match request count and items per section
  const numSections = Math.max(2, Math.min(request.numberOfSections, sectionTemplates.length))
  const numItemsPerSection = Math.max(2, Math.min(request.itemsPerSection, 12))

  return sectionTemplates.slice(0, numSections).map((section) => ({
    title: section.title,
    items: section.items.slice(0, numItemsPerSection).map((item) => ({
      label: item.label,
      description: item.description || null,
      required: item.required !== false,
    })),
  }))
}

/**
 * Generate a natural checklist summary based on context
 */
function generateChecklistSummary(request: ChecklistIntakeRequest): string {
  const lowerPurpose = request.purpose.toLowerCase()

  // Try to construct a natural summary using the user's input
  if (lowerPurpose && request.useCase) {
    return `This checklist helps ${request.audience} ensure ${request.goal.toLowerCase()} as part of ${request.useCase}.`
  }

  if (request.goal && request.audience) {
    return `A practical checklist for ${request.audience} focused on ${request.goal.toLowerCase()}.`
  }

  return `This checklist guides ${request.audience} through ${request.purpose.toLowerCase()} in a ${request.tone} manner.`
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
