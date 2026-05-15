/**
 * AI Prompts for GuideForge Generation
 *
 * Builds carefully crafted prompts for structured asset generation.
 * Ensures AI output matches GuideForge schemas and rules.
 */

import type { ChecklistGenerationRequest, SingleGuideGenerationRequest } from "./ai-generation-types"
import type { GeneratedChecklist } from "./generation-schemas"

const CHECKLIST_SCHEMA = `{
  "assetType": "checklist",
  "title": "string - the checklist title",
  "summary": "string - brief description of the checklist",
  "sections": [
    {
      "title": "string - section name",
      "items": [
        {
          "label": "string - item text",
          "description": "string or null - optional details",
          "required": boolean - whether this item is required
        }
      ]
    }
  ],
  "completionCriteria": ["string - criteria for completion"],
  "tags": ["string - tags for categorization"],
  "assumptions": ["string - assumptions made"],
  "missingInfo": ["string - any info gaps or clarifications needed"]
}`

export function buildChecklistPrompt(request: ChecklistGenerationRequest): string {
  const sections = Math.min(Math.max(request.numberOfSections || 3, 1), 8)
  const itemsPerSection = Math.min(Math.max(request.itemsPerSection || 5, 1), 12)

  return `You are a structured checklist generator for GuideForge. Generate high-quality, practical checklists with specific, actionable content.

CRITICAL RULES - DO NOT VIOLATE:
1. Section titles MUST be meaningful phrases, not "Section 1", "Section 2", "P", "r", "e", "p", or single characters.
2. Section titles MUST be specific to the topic, audience, and use case.
3. Item labels MUST be actionable and specific, not "Item 1", "Item 2", "Complete this task".
4. Item descriptions MUST be useful and specific, not generic placeholders like "This is item X" or "Follow this carefully".
5. NEVER use placeholder text like "TODO", "Example item", "Placeholder", or "[fill in]".
6. Return ONLY valid JSON matching the schema below. No markdown, explanations, or text outside JSON.
7. Each section must have 1-12 items (usually ${itemsPerSection}).
8. All section titles must be at least 3 characters long and describe a distinct aspect of the checklist goal.
9. All item labels must be at least 5 characters long and start with a verb when possible (e.g., "Verify", "Complete", "Document", "Schedule").
10. Summary should be grammatically correct and avoid awkward patterns like "A comprehensive checklist for [verb phrase]".

CHECKLIST REQUEST:
- Title: ${request.title}
- Intended Audience: ${request.audience}
- Goal: ${request.goal}
- Purpose: ${request.purpose}
- Use Case/Context: ${request.useCase}
- Tone: ${request.tone}
- Number of Sections: ${sections} (max 8, aim for meaningful section groupings)
- Items per Section: approximately ${itemsPerSection} (max 12 per section, varies by section importance)
${request.optionalContext ? `- Additional Context: ${request.optionalContext}` : ""}

REQUIRED JSON SCHEMA:
${CHECKLIST_SCHEMA}

EXAMPLE GOOD OUTPUT STRUCTURE:
For a game launch checklist for an indie developer, good section titles would be:
- "QA & Regression Testing" (not "Section 1")
- "Build Backup & Rollback Preparation" (not "P")
- "Patch Notes & Store Page" (not "r")
- "Community Announcement" (not "e")
- "Launch Monitoring & Incident Response" (not "p")

Example good item labels for QA section:
- "Verify all critical bugs are resolved or documented" (not "Item 1")
- "Test core gameplay loops on target platform" (not "Complete this task for section")
- "Confirm no regressions in recent fixes" (not "Do the task")

Generate a practical, domain-specific checklist with meaningful sections and actionable items. Do not use generic or placeholder content.`
}

export function buildChecklistRepairPrompt(
  request: ChecklistGenerationRequest,
  invalidOutput: any,
  validationErrors: string[]
): string {
  return `You are a GuideForge checklist quality specialist. Fix the following checklist that failed validation.

CRITICAL: Replace all placeholder and generic content with specific, useful, domain-appropriate content.

ORIGINAL REQUEST:
- Title: ${request.title}
- Audience: ${request.audience}
- Goal: ${request.goal}
- Purpose: ${request.purpose}
- Use Case: ${request.useCase}
- Tone: ${request.tone}

BROKEN OUTPUT:
${JSON.stringify(invalidOutput, null, 2)}

VALIDATION & QUALITY ERRORS:
${validationErrors.map((e) => `- ${e}`).join("\n")}

REQUIRED SCHEMA (fix to match exactly):
${CHECKLIST_SCHEMA}

REPAIR RULES (DO NOT VIOLATE):
1. Fix ALL errors listed above
2. Replace placeholder section titles like "Section 1", "P", "r", "e", "p", or single letters with specific titles relevant to the goal
3. Replace placeholder item labels like "Item 1", "Item 2" with specific, actionable items (minimum 5 characters, start with verb)
4. Replace generic descriptions like "Complete this task for section X" or "Follow this carefully" with specific, useful descriptions
5. Remove all instances of "TODO", "Placeholder", "Example item", "[fill in]", etc.
6. Ensure all section titles are at least 3 characters and meaningful
7. Ensure all item labels are at least 5 characters and actionable
8. Ensure summary is grammatically correct and avoids "A comprehensive checklist for [verb]" unless it reads naturally
9. Return ONLY valid JSON, no explanations or markdown

EXAMPLE OF FIX:
Bad sections: ["Section 1: P", "Section 2: r", "Section 3: e", "Section 4: p"]
Good sections: ["QA & Testing", "Build Preparation", "Store Page & Patch Notes", "Community Communication"]

Bad items: ["Item 1 in section 1", "Complete this task for section 1", "Item 2 in section 1"]
Good items: ["Verify all critical bugs are resolved", "Test core gameplay loops", "Confirm no regressions in fixes"]

Repair the checklist with specific, meaningful content based on the original request.`
}

// ========== Single Guide Prompt ==========

const SINGLE_GUIDE_SCHEMA = `{
  "assetType": "single_guide",
  "title": "string - the guide title",
  "summary": "string - 1-2 sentence description of what this guide covers and who it is for",
  "audience": "string - the intended audience",
  "difficulty": "string - beginner | intermediate | advanced | expert",
  "requirements": ["string - prerequisite or requirement (empty array if none)"],
  "warnings": ["string - safety warning or caution (empty array if none)"],
  "steps": [
    {
      "title": "string - step title, specific and action-oriented",
      "body": "string - detailed step instructions, at least 2-3 sentences",
      "successCondition": "string or null - how the user knows this step is complete",
      "tip": "string or null - optional pro tip or shortcut",
      "warning": "string or null - optional step-level warning"
    }
  ],
  "tags": ["string - relevant tags"],
  "assumptions": ["string - assumptions made during generation"],
  "missingInfo": ["string - information gaps that would improve the guide"]
}`

export function buildSingleGuidePrompt(request: SingleGuideGenerationRequest): string {
  const numSteps = Math.min(Math.max(request.numberOfSteps || 5, 2), 20)

  // Build context lines for optional fields
  const contextLines: string[] = []
  if (request.goal?.trim()) contextLines.push(`- Goal: ${request.goal.trim()}`)
  if (request.useCase?.trim()) contextLines.push(`- Use Case / Context: ${request.useCase.trim()}`)
  if (request.optionalContext?.trim()) contextLines.push(`- Additional Context / Topics to Cover: ${request.optionalContext.trim()}`)
  if (request.hasPrerequisites) contextLines.push(`- Include prerequisites: Yes — list what the reader needs before starting`)
  if (request.hasWarnings) contextLines.push(`- Include warnings: Yes — add relevant safety warnings or cautions`)

  const guideTypeDescription: Record<string, string> = {
    guide: "a practical how-to guide with clear steps",
    tutorial: "a step-by-step tutorial walking the reader through a complete workflow",
    reference: "a reference guide the reader can look up quickly",
    explanation: "an explanation-focused guide covering the why and how behind the topic",
  }
  const guideTypeDesc = guideTypeDescription[request.guideType] || "a structured guide"

  const toneDescription: Record<string, string> = {
    "beginner-friendly": "Write in a warm, encouraging, beginner-friendly tone. Avoid jargon. Explain terms when first used. Use short sentences.",
    "technical": "Write in a precise, technical tone suitable for experienced practitioners. Use correct terminology.",
    "practical": "Write in a practical, direct tone. Skip unnecessary explanation. Focus on what to do.",
    "helpful": "Write in a helpful, friendly tone. Be encouraging but efficient.",
    "detailed": "Write in a thorough, detailed tone. Explain each step fully with context.",
    "minimal": "Write in a minimal, concise tone. Keep steps short. Avoid padding.",
  }
  const toneInstruction = toneDescription[request.tone] || `Write in a ${request.tone} tone.`

  return `You are a structured guide generator for GuideForge. Generate a high-quality, practical guide with specific, actionable content.

CRITICAL RULES — DO NOT VIOLATE:
1. Step titles MUST be specific and action-oriented (e.g., "Set Up Your Recording Software", not "Step 1" or "Configure").
2. Step bodies MUST contain real, useful instructions — at least 2-3 sentences. No placeholder text.
3. NEVER use placeholder text like "TODO", "Follow this carefully", "Do this step", "Complete this action", or "[fill in]".
4. Generate EXACTLY ${numSteps} steps.
5. If "Additional Context / Topics to Cover" is provided, distribute those topics across the steps — do not ignore them.
6. Return ONLY valid JSON matching the schema below. No markdown, no explanations, no text outside JSON.
7. All step titles must be at least 5 characters and describe a distinct action.
8. The summary must be 1-2 sentences and sound natural — avoid "A comprehensive guide for [verb phrase]".
9. tags must be lowercase and relevant to the guide topic.
10. ${toneInstruction}

GUIDE REQUEST:
- Title: ${request.title}
- Intended Audience: ${request.audience}
- Purpose: ${request.purpose}
${contextLines.join("\n")}
- Tone: ${request.tone}
- Difficulty: ${request.difficulty}
- Guide Type: ${guideTypeDesc}
- Number of Steps: ${numSteps}

REQUIRED JSON SCHEMA:
${SINGLE_GUIDE_SCHEMA}

EXAMPLE OF GOOD STEP QUALITY (for a YouTube upload guide):
{
  "title": "Write a Click-Worthy Title and Description",
  "body": "Your video title should include your main keyword within the first 60 characters, since YouTube truncates titles beyond that in search results. Write a description of at least 200 words: start with 2-3 sentences summarizing the video, then add timestamps, links, and relevant keywords in a natural way. Avoid keyword stuffing — YouTube's algorithm penalizes descriptions that feel spammy.",
  "successCondition": "Title is under 60 characters and contains your primary keyword. Description is at least 200 words with a timestamp list.",
  "tip": "Use a tool like TubeBuddy or vidIQ to score your title before publishing.",
  "warning": null
}

Generate a complete, domain-specific guide with meaningful steps relevant to the title, audience, and context above. Do not use generic or placeholder content.`
}

// ========== Network Guide Prompt ==========

export interface NetworkGuidePromptRequest {
  prompt: string
  guideType: string
  preferredDifficulty: string
  networkName?: string
  targetHubId?: string
  forgeRuleContext?: string
}

const NETWORK_GUIDE_SCHEMA = `{
  "title": "string - guide title (5-80 characters)",
  "summary": "string - 1-2 sentence description of what this guide covers and who it is for",
  "type": "one of: character-build | walkthrough | boss-guide | beginner-guide | patch-notes | news | repair-procedure | sop | tutorial | reference",
  "difficulty": "one of: beginner | intermediate | advanced | expert",
  "estimatedMinutes": number (5-120),
  "sections": [
    {
      "title": "string - meaningful section title, 3-60 characters",
      "kind": "one of: overview | strengths | weaknesses | gear | skill-priority | rotation | leveling | mistakes | patch-notes | final-tips | requirements | warning | custom",
      "body": "string - at least 3 full sentences of detailed, actionable content"
    }
  ],
  "requirements": ["string - prerequisite (empty array if none)"],
  "warnings": ["string - safety warning or important caveat (empty array if none)"],
  "tags": ["string - lowercase tags for categorization"],
  "version": "string or null - patch/version this guide is current for"
}`

const GUIDE_TYPE_DESCRIPTIONS: Record<string, string> = {
  "character-build": "Character Build Guide — covers stats, gear, skills, and rotation",
  "walkthrough": "Walkthrough — step-by-step progression guide",
  "boss-guide": "Boss Guide — mechanics, phase breakdown, strategies, and execution",
  "beginner-guide": "Beginner Guide — foundational concepts for new players or users",
  "patch-notes": "Patch Notes Analysis — summarizes recent changes and their impact",
  "tutorial": "Tutorial — teaches a specific system, mechanic, or skill",
  "reference": "Reference Guide — quick-lookup facts and data tables",
  "repair-procedure": "Repair Procedure — technical step-by-step repair instructions",
  "sop": "Standard Operating Procedure — formal documented process",
  "news": "News / Update Post — announcement or news coverage",
}

const SECTION_COUNT_BY_TYPE: Record<string, number> = {
  "character-build": 7,
  "boss-guide": 6,
  "beginner-guide": 6,
  "walkthrough": 7,
  "patch-notes": 3,
  "tutorial": 6,
  "reference": 5,
  "repair-procedure": 6,
  "sop": 5,
  "news": 3,
}

const SUGGESTED_KINDS_BY_TYPE: Record<string, string> = {
  "character-build": "overview, strengths, weaknesses, gear, skill-priority, rotation, final-tips",
  "boss-guide": "overview, requirements, gear, rotation, mistakes, final-tips",
  "beginner-guide": "overview, requirements, leveling, gear, mistakes, final-tips",
  "walkthrough": "overview, requirements, leveling, gear, rotation, mistakes, final-tips",
  "patch-notes": "patch-notes, overview, final-tips",
  "tutorial": "overview, requirements, leveling, rotation, mistakes, final-tips",
  "reference": "overview, gear, skill-priority, requirements, final-tips",
  "repair-procedure": "overview, requirements, warning, leveling, rotation, final-tips",
  "sop": "overview, requirements, rotation, warning, final-tips",
  "news": "patch-notes, overview, final-tips",
}

export function buildNetworkGuidePrompt(request: NetworkGuidePromptRequest): string {
  const guideTypeDesc = GUIDE_TYPE_DESCRIPTIONS[request.guideType] || `Guide (type: ${request.guideType})`
  const targetSections = SECTION_COUNT_BY_TYPE[request.guideType] || 5
  const suggestedKinds = SUGGESTED_KINDS_BY_TYPE[request.guideType] || "overview, custom, final-tips"
  const networkLine = request.networkName ? `- Network: ${request.networkName}` : ""
  const forgeRulesSection = request.forgeRuleContext
    ? `\nFORGE RULES (apply these to the guide):\n${request.forgeRuleContext}\n`
    : ""

  return `You are a structured guide generator for GuideForge. Generate a high-quality, well-organized guide based on the user's idea.

CRITICAL RULES — DO NOT VIOLATE:
1. Return ONLY valid JSON matching the schema below. No markdown, no explanations, no text outside JSON.
2. "title" must be 5-80 characters — specific to the topic, never a generic placeholder.
3. "summary" must be 1-2 natural sentences. Avoid starting with "A comprehensive guide for [verb phrase]".
4. "sections" must have exactly ${targetSections} sections (±1 allowed for natural fit).
5. The first section "kind" MUST be "overview". The last section "kind" MUST be "final-tips".
6. Every section "body" must be at least 3 full sentences of specific, actionable content. No placeholder text.
7. Section "title" must be specific and descriptive (e.g., "Combat Rotation", "Required Gear") — never "Section 1".
8. "difficulty" must exactly be one of: beginner, intermediate, advanced, expert.
9. "type" must exactly match the requested guide type.
10. NEVER use placeholder text like "TODO", "[fill in]", "This section covers X", "Follow this carefully".
${forgeRulesSection}
GUIDE REQUEST:
- Guide Type: ${guideTypeDesc}
- Difficulty: ${request.preferredDifficulty}
${networkLine}
- Target Section Count: ${targetSections}
- Suggested Section Kinds (in order): ${suggestedKinds}

USER'S GUIDE IDEA:
${request.prompt}

REQUIRED JSON SCHEMA:
${NETWORK_GUIDE_SCHEMA}

Generate a complete, specific guide directly based on the user's idea. Content must be relevant to the topic described — not generic filler.`
}

/**
 * Example response that validates - for reference/testing.
 */
export const EXAMPLE_CHECKLIST_RESPONSE: GeneratedChecklist = {
  assetType: "checklist",
  title: "Pre-Launch Deployment Checklist",
  summary:
    "A comprehensive checklist for DevOps engineers to ensure nothing is missed before launching to production.",
  sections: [
    {
      title: "Infrastructure Verification",
      items: [
        {
          label: "Database backup verified",
          description: "Confirm backups completed in last 24 hours",
          required: true,
        },
        {
          label: "Load balancer health checked",
          description: "Verify all instances passing health checks",
          required: true,
        },
        {
          label: "DNS records updated",
          description: "New DNS entries propagated (may take up to 48 hours)",
          required: false,
        },
      ],
    },
    {
      title: "Code & Configuration",
      items: [
        {
          label: "All tests passing",
          description: "Run full test suite, no failures",
          required: true,
        },
        {
          label: "Environment variables set",
          description: "Production env vars configured on all servers",
          required: true,
        },
        {
          label: "Feature flags reviewed",
          description: "Confirm flags are in correct state for launch",
          required: true,
        },
      ],
    },
    {
      title: "Monitoring & Alerting",
      items: [
        {
          label: "Monitoring dashboards created",
          description: "Real-time metrics visible for critical systems",
          required: true,
        },
        {
          label: "Alerts configured",
          description: "Notify on-call team of issues",
          required: true,
        },
        {
          label: "Runbook prepared",
          description: "Incident response procedures documented",
          required: false,
        },
      ],
    },
  ],
  completionCriteria: [
    "All required items checked off",
    "Infrastructure passes verification",
    "Code changes tested and reviewed",
    "Monitoring and alerting active",
  ],
  tags: ["DevOps", "Deployment", "Production", "Pre-launch"],
  assumptions: [
    "Blue-green deployment environment available",
    "Team has deployment access",
    "Rollback procedure in place",
    "Communication channel open with stakeholders",
  ],
  missingInfo: [
    "Specific load testing thresholds",
    "Database migration strategy details",
    "Team contact information for escalation",
  ],
}
