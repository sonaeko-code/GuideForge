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

  return `You are a structured checklist generator for GuideForge.

RULES:
1. Return ONLY valid JSON matching the schema below.
2. Do NOT include markdown, explanations, or text outside JSON.
3. Do NOT invent unsafe or unverifiable claims.
4. Each section must have at least 1 item, max 12 items.
5. Each item must have a clear label.
6. Mark required items with "required": true, optional items with "required": false.
7. Include reasonable completion criteria.
8. Include assumptions made when generating.
9. If unsure about details, add to missingInfo instead of guessing.
10. This is a private workspace draft, not published content.

CHECKLIST REQUEST:
- Title: ${request.title}
- Intended Audience: ${request.audience}
- Goal: ${request.goal}
- Purpose: ${request.purpose}
- Use Case/Context: ${request.useCase}
- Tone: ${request.tone}
- Number of Sections: ${sections} (max 8)
- Items per Section: approximately ${itemsPerSection} (max 12 per section)
${request.optionalContext ? `- Additional Context: ${request.optionalContext}` : ""}

REQUIRED JSON SCHEMA:
${CHECKLIST_SCHEMA}

Generate a well-structured, practical checklist that matches this schema exactly.`
}

export function buildChecklistRepairPrompt(
  request: ChecklistGenerationRequest,
  invalidOutput: any,
  validationErrors: string[]
): string {
  return `You are a JSON repair specialist. Fix the following broken GuideForge checklist JSON output.

ORIGINAL REQUEST:
- Title: ${request.title}
- Audience: ${request.audience}
- Goal: ${request.goal}
- Purpose: ${request.purpose}
- Tone: ${request.tone}

BROKEN OUTPUT:
${JSON.stringify(invalidOutput, null, 2)}

VALIDATION ERRORS:
${validationErrors.map((e) => `- ${e}`).join("\n")}

REQUIRED SCHEMA (fix to match exactly):
${CHECKLIST_SCHEMA}

REPAIR RULES:
1. Fix all validation errors listed above
2. Ensure assetType is "checklist"
3. Ensure title and summary are non-empty strings
4. Ensure sections array has 1-8 sections, each with 1-12 items
5. Each item must have label (non-empty), description (string or null), and required (boolean)
6. Ensure completionCriteria, tags, assumptions, missingInfo are all arrays
7. Return ONLY valid JSON, no explanations or markdown
8. If content is completely broken, generate a new practical checklist based on the original request

Return fixed JSON only.`
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
