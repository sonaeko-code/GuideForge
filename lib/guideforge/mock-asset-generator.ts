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

// ── Topic-aware step generation ───────────────────────────────────────────────

type GuideDomain = "youtube" | "gaming" | "business" | "tech" | "cooking" | "writing" | "general"

function detectGuideDomain(text: string): GuideDomain {
  const t = text.toLowerCase()
  if (/youtube|video channel|content creator|vlog|twitch|streaming|subscriber|thumbnail|podcast/.test(t)) return "youtube"
  if (/\bgame\b|build|class|character|boss|raid|dungeon|quest|leveling|farming|pvp|pve|rpg|mmorpg|fps|minecraft|warcraft|elden ring|fortnite|valorant|diablo/.test(t)) return "gaming"
  if (/business|sop\b|procedure|process|workflow|onboarding|compliance|department|employee|operations/.test(t)) return "business"
  if (/install|setup|configure|deploy|server|docker|api|database|integration|software|coding|developer|cloud|infrastructure/.test(t)) return "tech"
  if (/recipe|cooking|baking|ingredient|\bmeal\b|food|kitchen|cuisine|\bdish\b/.test(t)) return "cooking"
  if (/\bwriting\b|article|blog|essay|copywriting|fiction|\bstory\b|novelist|script/.test(t)) return "writing"
  return "general"
}

function extractGuideSubject(title: string): string {
  const cleaned = title
    .replace(/^(how to|guide to|a guide to|complete guide to|beginner'?s guide to|beginner guide to|getting started with|introduction to|the )\s*/i, "")
    .trim()
  return cleaned || title
}

type StepTemplate = { title: string; body: string; tip: string | null; warning: string | null }

function getDomainStepTemplates(subject: string, domain: GuideDomain): StepTemplate[] {
  switch (domain) {
    case "youtube":
      return [
        { title: "Define Your Content Concept", body: `Outline the core idea for your ${subject} content. Define your unique angle, target audience, and the one takeaway you want viewers to leave with.`, tip: "Write your single-sentence value proposition before scripting — it keeps every decision focused.", warning: null },
        { title: "Plan Your Production Setup", body: `Choose a recording environment suited to ${subject}. Clear audio matters more than camera quality for most viewers — prioritize a good microphone first.`, tip: "Test audio and lighting with a 30-second sample clip before your full recording session.", warning: null },
        { title: "Script and Record", body: `Record your ${subject} content in manageable segments. A bullet-point outline works better than a word-for-word script — it keeps delivery natural.`, tip: "Record extra takes for complex sections. Raw footage is cheap; reshoots are expensive.", warning: null },
        { title: "Edit for Clarity and Pace", body: `Cut dead air, filler words, and off-topic sections from your ${subject} video. Add chapter markers and on-screen text to reinforce key moments.`, tip: "Check audience retention in Analytics — sharp drop-off points show exactly where to improve.", warning: null },
        { title: "Optimize for Discovery", body: `Write a keyword-rich title, description, and tags for your ${subject} content. Your thumbnail should be legible at small sizes and clearly communicate the video's value.`, tip: "Use YouTube's search autocomplete for keyword research — those suggestions are real queries from your audience.", warning: null },
        { title: "Publish and Promote", body: `Publish your ${subject} content on a consistent schedule. Share it in relevant communities and respond to early comments to signal engagement.`, tip: "The first 24 hours of engagement heavily influence long-term reach — prioritize early interaction.", warning: null },
      ]

    case "gaming":
      return [
        { title: "Overview", body: `${subject} rewards understanding the core mechanics before attempting advanced techniques. This guide covers everything from setup to advanced optimization.`, tip: "Read the full guide before making changes — individual steps make more sense in context.", warning: null },
        { title: "Prerequisites and Gear", body: `Confirm your character meets the baseline for ${subject}: level, gear tier, and required ability unlocks. Underpowered gear is the most common reason this strategy underperforms.`, tip: "Check your gear score first. If you're significantly below the recommended level, gear up before proceeding.", warning: null },
        { title: "Core Mechanics", body: `${subject} revolves around a specific mechanic or rotation. Understanding why each step works — not just what to do — separates average from skilled execution.`, tip: "Practice in a low-risk environment first until the mechanic becomes muscle memory.", warning: null },
        { title: "Execution and Rotation", body: `Execute ${subject} by establishing your opener, applying buffs and debuffs in order, then cycling through primary abilities. Manage resources actively throughout.`, tip: "Track cooldowns at all times — off-cycle cooldowns are the single biggest performance loss in most builds.", warning: null },
        { title: "Common Mistakes", body: `Frequent mistakes with ${subject}: skipping the setup phase, ignoring positioning, and mismanaging resources. Fixing these three things will improve your results immediately.`, tip: "Record a run and review it — mistakes are far easier to spot on playback than in the moment.", warning: null },
        { title: "Advanced Optimizations", body: `Once you've mastered the basics of ${subject}, explore advanced layers: adapt to different enemy compositions, chain synergistic mechanics, and optimize secondary stats for your content type.`, tip: "Check community guides and top player VODs — optimizations are often discovered in community spaces before anywhere else.", warning: null },
      ]

    case "business":
      return [
        { title: "Purpose and Scope", body: `This guide covers ${subject} for the relevant team members and stakeholders. Clear scope prevents confusion and ensures consistent execution.`, tip: "If you're unsure whether this applies to your situation, clarify with your supervisor before proceeding.", warning: null },
        { title: "Prerequisites and Access", body: `Before beginning ${subject}, verify you have the required system access, tools, and approvals. Missing access causes delays — request it at least 1–3 business days in advance.`, tip: "Keep a list of required credentials updated — access gaps are the most common blocker.", warning: "Do not attempt steps requiring access you don't have. Unauthorized actions may be logged or irreversible." },
        { title: "Step-by-Step Procedure", body: `Complete each step of ${subject} in order. Do not skip steps even if they appear optional — each one validates conditions required for the next step.`, tip: "Check off each step as you go. Incomplete steps are the most common source of errors and rework.", warning: null },
        { title: "Quality Checks and Verification", body: `After completing the main steps for ${subject}, verify your output against the defined acceptance criteria. Common issues: incomplete data entry, missed approvals, and formatting inconsistencies.`, tip: "A second review before submission catches the majority of preventable issues.", warning: null },
        { title: "Exceptions and Escalation", body: `If you encounter a situation during ${subject} not covered by this guide, document it and escalate to the process owner. Logging exceptions helps improve the procedure over time.`, tip: "Track recurring exceptions in the team log — patterns reveal gaps in the procedure.", warning: null },
        { title: "Completion and Handoff", body: `Once ${subject} is complete, update relevant systems, notify required stakeholders, and file all required documentation. Confirm the handoff has been acknowledged before closing.`, tip: "Set a follow-up reminder if you don't receive acknowledgment within one business day.", warning: null },
      ]

    case "tech":
      return [
        { title: "Prerequisites", body: `Before setting up ${subject}, verify your environment meets the minimum requirements: correct software versions, necessary permissions, and required credentials.`, tip: "Take a system snapshot or backup before making configuration changes — it makes rollback painless.", warning: "Verify all requirements before starting. Incompatible environments cause errors that are difficult to diagnose." },
        { title: "Installation", body: `Install ${subject} using the recommended method for your OS and environment. Follow documentation for your specific version — older guides often reference deprecated steps.`, tip: "Test the installation in a sandbox environment before applying it to production.", warning: null },
        { title: "Configuration", body: `Configure ${subject} by updating the required settings and environment variables. Use the provided configuration template as a baseline and customize for your environment.`, tip: "Store your working configuration in version control so the next person doesn't have to reconstruct it.", warning: "Double-check all values for production. Incorrect configuration is the most common post-install failure mode." },
        { title: "Verification and Testing", body: `Confirm ${subject} is working correctly by running health checks or smoke tests. Verify integrations are responding and error handling works as expected.`, tip: "Test the failure case deliberately — trigger an expected error to confirm your alerting and error handling work.", warning: null },
        { title: "Troubleshooting", body: `If ${subject} isn't working as expected, start with logs, then verify environment variables and permissions. Common causes: port conflicts, missing dependencies, incorrect credentials, and network rules.`, tip: "Search the exact error message — most common failures have documented solutions in official docs or community forums.", warning: null },
        { title: "Next Steps and Maintenance", body: `Now that ${subject} is running, set up monitoring, alerts, and automated health checks. Document your setup for the team and consider scripting it for reproducibility.`, tip: "Add your setup steps to the team runbook so the next person doesn't start from scratch.", warning: null },
      ]

    case "cooking":
      return [
        { title: "Gather and Prep Ingredients", body: `Collect and measure all ingredients for ${subject} before you start. Mise en place — having everything ready ahead of time — is the most important habit for consistent results.`, tip: "Read the full recipe before starting. Surprises mid-cook cause mistakes.", warning: null },
        { title: "Set Up Your Kitchen", body: `Prepare your workspace for ${subject}: preheat the oven or pan as needed, prep your cutting board, and have all utensils within reach.`, tip: "Clean as you go — it reduces end-of-cook chaos and keeps your workspace organized.", warning: null },
        { title: "Cook the Main Components", body: `Follow the cooking steps for ${subject} carefully. Heat levels and timing are the most critical variables — they affect texture, flavor, and food safety.`, tip: "Taste as you cook and adjust seasoning gradually. It's easier to add than to fix over-seasoning.", warning: "Never leave hot oil unattended on the stovetop." },
        { title: "Assemble and Plate", body: `Assemble ${subject} while it's at the right temperature. Even simple, intentional plating elevates the experience significantly.`, tip: "Add garnishes just before serving. Wilted garnish undermines an otherwise well-prepared dish.", warning: null },
        { title: "Serve and Store", body: `Serve ${subject} immediately for best results. If storing, cool to room temperature before refrigerating. Label containers with the date and reheating instructions.`, tip: "Most cooked dishes keep 3–5 days when stored correctly. When in doubt, smell and taste before reheating.", warning: null },
      ]

    case "writing":
      return [
        { title: "Define Your Goal and Audience", body: `Before writing ${subject}, clarify what you want the reader to know, feel, or do after reading. A clear goal shapes every word choice and structural decision.`, tip: "Write your single-sentence goal at the top of the document — check every paragraph against it.", warning: null },
        { title: "Research and Outline", body: `Gather sources and evidence for ${subject}. Build an outline that flows from hook → context → body → conclusion before writing prose.`, tip: "Your outline is a starting point, not a cage — deviate when the writing demands it, but start with structure.", warning: null },
        { title: "Write the First Draft", body: `Write your first draft of ${subject} without stopping to edit. The goal is words on the page — speed matters here, not quality. You can't revise a blank document.`, tip: "Turn off autocorrect for the first draft. Corrections interrupt flow and slow you down.", warning: null },
        { title: "Revise for Clarity", body: `Revise ${subject} with fresh eyes — after a break if possible. Cut anything that doesn't serve the reader, simplify complex sentences, and eliminate filler language.`, tip: "Read it aloud — your ear catches what your eyes skip when reading silently.", warning: null },
        { title: "Proofread and Polish", body: `Proofread ${subject} for grammar, spelling, consistency, and formatting. Verify all links and references are accurate. Check headings create a clear logical hierarchy.`, tip: "Use a grammar tool as a second pass, not a first — it's better for catching what you've already missed.", warning: null },
        { title: "Publish and Distribute", body: `Publish ${subject} and share it through relevant channels. Track engagement to learn what resonates for future pieces.`, tip: "Repurpose one piece across multiple formats — an article becomes a thread, a newsletter section, a short video script.", warning: null },
      ]

    default:
      return [
        { title: `What Is ${subject}?`, body: `${subject} is a process or skill that benefits from a structured approach. This guide covers everything you need to get started and see results.`, tip: "Read the full guide before beginning so you understand how each step connects.", warning: null },
        { title: "Before You Begin", body: `Prepare for ${subject} by gathering required materials, confirming access or permissions, and reviewing the prerequisites. Good preparation eliminates the most common sources of frustration.`, tip: "Skipping preparation is the most common reason people need to restart from the beginning.", warning: null },
        { title: `Getting Started with ${subject}`, body: `Begin ${subject} by completing the initial setup steps carefully and in order. This foundation phase sets up everything that follows — rushing through it causes problems that are hard to trace later.`, tip: "If anything seems unclear, review the previous step before continuing.", warning: null },
        { title: "Core Process", body: `The core of ${subject} involves steps that build on each other. Follow them in sequence and verify completion before moving on — partial completion is a common source of errors.`, tip: "If a step isn't working, return to the previous step and verify it was completed correctly.", warning: null },
        { title: "Common Mistakes and Fixes", body: `Most frequent problems with ${subject}: rushing through setup, skipping verification, and working from incomplete information. Slow down, check your work, and you'll avoid 90% of issues.`, tip: "When troubleshooting, start from the beginning — it's faster than debugging halfway through.", warning: null },
        { title: "Next Steps", body: `Now that you've completed ${subject}, consider documenting what you learned, exploring advanced techniques, or applying the same approach to a related challenge.`, tip: "Document your experience while it's fresh — even brief notes save significant time the next time you revisit this.", warning: null },
      ]
  }
}

function buildTopicSteps(
  request: SingleGuideIntakeRequest,
  count: number
): Array<{ title: string; body: string; successCondition: string | null; tip: string | null; warning: string | null }> {
  const combinedText = `${request.title} ${request.purpose} ${request.optionalContext || ""}`
  const domain = detectGuideDomain(combinedText)
  const subject = extractGuideSubject(request.title)
  const templates = getDomainStepTemplates(subject, domain)

  const result = []
  for (let i = 0; i < count; i++) {
    const t = templates[i % templates.length]
    result.push({
      title: t.title,
      body: t.body,
      tip: t.tip,
      warning: request.hasWarnings ? (t.warning ?? (i === 0 ? "Review all prerequisites before proceeding." : null)) : null,
      successCondition: null,
    })
  }
  return result
}

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
    const steps = buildTopicSteps(request, Math.max(3, request.numberOfSteps))

    const asset: GeneratedSingleGuide = {
      assetType: "single_guide",
      title: request.title,
      summary: request.purpose.trim()
        ? request.purpose.trim()
        : `A ${request.difficulty} guide for ${request.audience} covering ${extractGuideSubject(request.title).toLowerCase()}.`,
      audience: request.audience,
      difficulty: request.difficulty,
      requirements: request.hasPrerequisites
        ? [
            `Basic familiarity with ${extractGuideSubject(request.title).toLowerCase()}`,
            "Required tools or access confirmed before starting",
            "Estimated time: 15–30 minutes to complete",
          ]
        : [],
      warnings: request.hasWarnings
        ? [
            "Review all steps before beginning — some actions may be difficult to reverse.",
            "Ensure you have the necessary permissions or access before proceeding.",
          ]
        : [],
      steps,
      tags: [request.guideType, request.difficulty],
      assumptions: [],
      missingInfo: request.optionalContext.trim() ? [] : ["Adding domain-specific context in the optional field will improve the relevance of generated steps."],
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
      assumptions: [],
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
      tags: [request.useCase, "checklist"],
      assumptions: [],
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
      scope: request.optionalContext || "General scope",
      owner: request.owner || "Process Owner",
      requirements: [
        request.requiredTools,
        request.complianceNotes,
        "Authorization from supervisor",
      ].filter((r) => r.trim()),
      procedureSteps: [
        {
          title: "Initiate and Authorize",
          body: `Begin ${request.purpose || "the procedure"} with proper authorization. Confirm all prerequisites are met and required documentation is in place before proceeding.`,
          responsibleRole: request.owner || "Process Owner",
          warning: null,
        },
        {
          title: "Execute Procedure",
          body: `Follow the defined steps for ${request.purpose || "this process"} according to specifications. Document any deviations or exceptions as they occur.`,
          responsibleRole: "Operator",
          warning: "Ensure compliance with all applicable requirements. Escalate if you encounter an undocumented situation.",
        },
        {
          title: "Verify and Document",
          body: "Confirm all steps were completed correctly. Document results, any exceptions encountered, and confirm the outcome meets acceptance criteria.",
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
      assumptions: [],
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
      assumptions: [],
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
