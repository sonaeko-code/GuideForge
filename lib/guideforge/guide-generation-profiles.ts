/**
 * Guide Generation Profiles
 *
 * Domain-aware profile registry that shapes how individual guides are generated
 * inside the Network Guide Generator (both Mock Preview and AI Generate).
 *
 * The profile is resolved from networkType / guideType / prompt / hub / collection
 * BEFORE generation runs. It is purely guidance — it influences the AI prompt
 * and the mock section layout, but does NOT auto-publish, persist content, or
 * skip the user review step.
 *
 * Profiles intentionally cover only the domains the rest of GuideForge already
 * scaffolds for. They are proposal-only and editable downstream in the guide
 * editor.
 */

import { getRegistryIdFromDbType } from "./network-types"
import type { NetworkType } from "./types"

// ─── Types ───────────────────────────────────────────────────────────────────

export type GuideGenerationDomain =
  | "gaming"
  | "tech_repair"
  | "small_business"
  | "home_systems"
  | "creator_workflow"
  | "general"

export interface GuideGenerationProfile {
  id: GuideGenerationDomain
  label: string
  tone: string
  mustInclude: string[]
  avoid: string[]
  preferredSections: string[]
  safetyNotes?: string[]
  qualityRules: string[]
}

// ─── Registry ────────────────────────────────────────────────────────────────

const PROFILES: Record<GuideGenerationDomain, GuideGenerationProfile> = {
  gaming: {
    id: "gaming",
    label: "QuestLine-style Gaming",
    tone: "Player-facing, clear, useful. Patch-aware when the topic touches builds, gear, or balance.",
    mustInclude: [
      "Who this guide is for",
      "When to use it",
      "Beginner-friendly explanation when difficulty is beginner",
      "Concrete, practical steps",
      "Common mistakes",
      "Patch / update awareness when the topic is build, boss, gear, or patch",
    ],
    avoid: [
      "Generic filler like 'Section 1: Initialize'",
      "Long lore dumps when the guide is about practical play",
      "Spoilers without a warning",
    ],
    preferredSections: [
      "Overview",
      "When to Use This",
      "Requirements / Setup",
      "Step-by-Step Strategy",
      "Common Mistakes",
      "Quick Reference",
      "Next Steps",
    ],
    qualityRules: [
      "Make the first section orient a new reader in two sentences",
      "Cite a specific patch only if the prompt mentions one",
    ],
  },

  tech_repair: {
    id: "tech_repair",
    label: "Techsperts-style Tech Repair",
    tone: "Diagnosis-first, safety-first, practical, calm, support-oriented.",
    mustInclude: [
      "Safety warnings where relevant (electrical, battery, sharp components)",
      "Tools and materials required",
      "Symptoms the user is seeing",
      "Before-you-start checks",
      "Diagnostic steps BEFORE any fix steps",
      "Clear escalation criteria for cases that exceed home / junior-tech scope",
      "A verification step after the fix",
    ],
    avoid: [
      "Jumping straight to a fix without diagnosis",
      "Promising the fix is guaranteed",
      "Unsafe electrical or battery advice without a caution",
    ],
    preferredSections: [
      "Safety First",
      "Symptoms",
      "Tools & Requirements",
      "Initial Triage",
      "Step-by-Step Fix",
      "Verify the Repair",
      "When to Escalate",
      "Documentation Notes",
    ],
    safetyNotes: [
      "Treat AI-generated repair guidance as provisional until reviewed by a qualified technician.",
      "Power down and unplug devices before opening enclosures unless the procedure explicitly requires otherwise.",
    ],
    qualityRules: [
      "Always lead with a safety section when the topic involves power, batteries, or moving parts",
      "Use plain language; assume the reader may be a home user or junior tech",
    ],
  },

  small_business: {
    id: "small_business",
    label: "SOP / Business Process",
    tone: "Operational, repeatable, checklist-oriented.",
    mustInclude: [
      "Owner / responsible role",
      "Trigger that starts the procedure",
      "Inputs required to run it",
      "Numbered procedure steps",
      "A quality check",
      "Escalation path",
    ],
    avoid: [
      "Vague language like 'as appropriate'",
      "Skipping the owner / responsible-role declaration",
    ],
    preferredSections: [
      "Purpose",
      "When to Use This SOP",
      "Owner / Roles",
      "Inputs Required",
      "Procedure",
      "Quality Check",
      "Escalation",
      "Review Cadence",
    ],
    qualityRules: [
      "Procedure steps must be sequential and individually verifiable",
      "Include a review cadence so the SOP doesn't go stale",
    ],
  },

  home_systems: {
    id: "home_systems",
    label: "Home / Family Systems",
    tone: "Practical, household-friendly, simple, repeatable.",
    mustInclude: [
      "Frequency / cadence when the task is recurring",
      "Supplies needed",
      "Family roles or responsibilities",
      "A simple checklist",
      "A fallback or what-if plan",
    ],
    avoid: [
      "Jargon that assumes professional contractor knowledge",
      "Medical or legal claims",
    ],
    preferredSections: [
      "Goal",
      "When to Do This",
      "Supplies",
      "Steps",
      "Family Roles",
      "Troubleshooting",
      "Repeat Schedule",
    ],
    qualityRules: [
      "Steps should be doable by a non-specialist adult in the home",
      "Surface the cadence (weekly / monthly / seasonal) when relevant",
    ],
  },

  creator_workflow: {
    id: "creator_workflow",
    label: "Creator / Community Workflow",
    tone: "Creator-friendly, workflow-oriented, platform-aware.",
    mustInclude: [
      "Goal of the workflow",
      "Platform or context (YouTube, Discord, newsletter, etc.)",
      "Prep assets (script, thumbnail, links)",
      "Publishing or release steps",
      "Post-launch review or follow-up",
    ],
    avoid: [
      "Promising audience or revenue outcomes",
      "Tactics that violate platform terms of service",
    ],
    preferredSections: [
      "Goal",
      "Before You Start",
      "Workflow",
      "Publishing Checklist",
      "Community Follow-Up",
      "Analytics Review",
      "Reuse Template",
    ],
    qualityRules: [
      "Steps should be repeatable for every release, not one-off",
      "Call out which step belongs to creator vs community manager when both exist",
    ],
  },

  general: {
    id: "general",
    label: "General",
    tone: "Clear, structured, practical.",
    mustInclude: [
      "Overview of what this guide covers",
      "Concrete steps or sections",
      "Success criteria",
    ],
    avoid: ["Generic filler", "Placeholder text"],
    preferredSections: [
      "Overview",
      "Requirements",
      "Steps",
      "Tips",
      "Success Criteria",
      "Next Steps",
    ],
    qualityRules: ["Be specific to the user's actual prompt"],
  },
}

// ─── Domain detection helpers ────────────────────────────────────────────────

/**
 * UI registry ids that map directly to a profile. Any other registry id
 * (e.g. wellness_training, restaurant_training, personal_knowledge) falls back
 * to the closest profile or `general`.
 */
const REGISTRY_ID_TO_DOMAIN: Record<string, GuideGenerationDomain> = {
  gaming: "gaming",
  tech_repair: "tech_repair",
  small_business: "small_business",
  restaurant_training: "small_business", // restaurants share SOP/checklist shape
  home_systems: "home_systems",
  creator_workflow: "creator_workflow",
}

/**
 * Try to normalize an arbitrary networkType string into a `GuideGenerationDomain`.
 * Accepts either a UI registry id (e.g. "tech_repair") OR a DB NetworkType
 * value (e.g. "repair") — these are different namespaces in this codebase.
 */
function networkTypeToDomain(networkType: string | null | undefined): GuideGenerationDomain | null {
  if (!networkType) return null
  const trimmed = networkType.trim().toLowerCase()
  if (!trimmed) return null

  // Direct UI registry id match
  if (REGISTRY_ID_TO_DOMAIN[trimmed]) return REGISTRY_ID_TO_DOMAIN[trimmed]

  // DB NetworkType match → reverse-map to UI registry id, then to domain
  const DB_NETWORK_TYPES = new Set([
    "gaming",
    "repair",
    "sop",
    "creator",
    "training",
    "community",
  ])
  if (DB_NETWORK_TYPES.has(trimmed)) {
    const uiId = getRegistryIdFromDbType(trimmed as NetworkType)
    if (REGISTRY_ID_TO_DOMAIN[uiId]) return REGISTRY_ID_TO_DOMAIN[uiId]
  }

  return null
}

/**
 * Fall back to prompt / hub / collection keyword sniffing when no networkType
 * is supplied (e.g. standalone single-guide builder, manual generator entry).
 */
function detectDomainFromText(text: string): GuideGenerationDomain | null {
  const lower = text.toLowerCase()

  // Tech repair signals
  if (
    /\b(repair|troubleshoot(?:ing)?|diagnos(?:tic|tics)|fix|broken|phone|laptop|computer|wi-?fi|printer|hardware|battery|technician)\b/.test(
      lower
    )
  ) {
    return "tech_repair"
  }

  // SOP / business signals
  if (
    /\b(sop|procedure|customer intake|onboarding|escalation|quality control|workflow|operations|client onboarding)\b/.test(
      lower
    )
  ) {
    return "small_business"
  }

  // Creator / community signals
  if (
    /\b(youtube|tiktok|twitch|discord|community management|content calendar|publishing|sponsorship|newsletter|podcast)\b/.test(
      lower
    )
  ) {
    return "creator_workflow"
  }

  // Home / family signals
  if (
    /\b(family|household|chore|meal plan(?:ning)?|kids|school|budget(?:ing)?|hvac|seasonal maintenance)\b/.test(
      lower
    )
  ) {
    return "home_systems"
  }

  // Gaming signals
  if (
    /\b(game|gaming|build|boss|raid|patch|loadout|pve|pvp|character build|dungeon|esports|tier list)\b/.test(
      lower
    )
  ) {
    return "gaming"
  }

  return null
}

/**
 * Resolve a generation profile from whatever context is available.
 *
 * Precedence:
 *   1. networkType (UI registry id OR DB NetworkType)
 *   2. keyword detection in prompt + hub + collection
 *   3. "general" fallback
 *
 * Never throws. Always returns a valid profile.
 */
export function resolveGuideGenerationProfile(input: {
  networkType?: string | null
  guideType?: string | null
  prompt?: string | null
  hubName?: string | null
  collectionName?: string | null
}): GuideGenerationProfile {
  // 1. Network type wins when present
  const fromNetworkType = networkTypeToDomain(input.networkType)
  if (fromNetworkType) return PROFILES[fromNetworkType]

  // 2. Otherwise sniff prompt + hub + collection
  const combinedText = [input.prompt, input.hubName, input.collectionName]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .join(" ")
  if (combinedText) {
    const detected = detectDomainFromText(combinedText)
    if (detected) return PROFILES[detected]
  }

  // 3. Default
  return PROFILES.general
}

/**
 * Render a compact instruction block describing the profile, suitable for
 * pasting into an AI prompt. Kept short on purpose so we don't blow the
 * generation token budget.
 */
export function renderProfileForPrompt(profile: GuideGenerationProfile): string {
  const lines: string[] = []
  lines.push(`GENERATION PROFILE: ${profile.label}`)
  lines.push(`Tone: ${profile.tone}`)
  if (profile.mustInclude.length > 0) {
    lines.push("Must include:")
    for (const item of profile.mustInclude) lines.push(`- ${item}`)
  }
  if (profile.avoid.length > 0) {
    lines.push("Avoid:")
    for (const item of profile.avoid) lines.push(`- ${item}`)
  }
  if (profile.preferredSections.length > 0) {
    lines.push(
      `Preferred section structure (use as a guide, adapt to the topic): ${profile.preferredSections.join(", ")}`
    )
  }
  if (profile.qualityRules.length > 0) {
    lines.push("Quality rules:")
    for (const item of profile.qualityRules) lines.push(`- ${item}`)
  }
  if (profile.safetyNotes && profile.safetyNotes.length > 0) {
    lines.push("Safety notes (include where appropriate):")
    for (const item of profile.safetyNotes) lines.push(`- ${item}`)
  }
  return lines.join("\n")
}

/**
 * Look up a profile by id for callers that already know which one they want.
 * Returns `general` if the id is not recognized.
 */
export function getProfileById(id: string): GuideGenerationProfile {
  return PROFILES[id as GuideGenerationDomain] ?? PROFILES.general
}
