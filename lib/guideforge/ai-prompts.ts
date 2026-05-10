/**
 * AI Prompts for GuideForge Generation
 *
 * Builds carefully crafted prompts for structured asset generation.
 * Ensures AI output matches GuideForge schemas and rules.
 */

import type { ChecklistGenerationRequest } from "./ai-generation-types"
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
