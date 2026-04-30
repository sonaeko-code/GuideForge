import type { ForgeRule, NetworkType } from "./types"

/**
 * GuideForge — Starter Forge Rules
 *
 * Forge Rules are opinionated standards that guides must satisfy.
 * They are intentionally pluggable per network type so that
 * gaming, repair/support, business SOP, training, etc. can all
 * share the same engine but enforce different conventions.
 *
 * TODO: Persist rule overrides per Network in Supabase.
 * TODO: Allow OpenAI to validate generated guides against the
 *       active rule set before marking them "ready".
 */

// ---------- Gaming ----------

const GAMING_RULES: ForgeRule[] = [
  {
    id: "gaming.include-game-name",
    label: "Include game name",
    description:
      "Every guide must clearly state which game it belongs to so it can be routed to the correct hub.",
    category: "metadata",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.include-patch-version",
    label: "Include patch or version when relevant",
    description:
      "Add the patch number a guide was written for. This powers the 'Updated for X' badge on the public page.",
    category: "metadata",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.include-difficulty",
    label: "Include difficulty",
    description:
      "Tag the guide as Beginner, Intermediate, Advanced, or Expert so readers can self-select.",
    category: "metadata",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.include-requirements",
    label: "Include requirements",
    description:
      "List required level, gear, unlocks, or DLC at the top of the guide.",
    category: "structure",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.beginner-summary",
    label: "Include a beginner-friendly summary",
    description:
      "Open with a 2-3 sentence summary that a new player can understand without prior context.",
    category: "tone",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.spoiler-tagging",
    label: "Mark spoiler sections clearly",
    description:
      "Sections that reveal late-game content must be tagged so they can be hidden behind a spoiler toggle.",
    category: "safety",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
  {
    id: "gaming.show-status",
    label: "Show guide status",
    description:
      "Surface Draft, In Review, Ready, or Published so readers know how trustworthy the guide is.",
    category: "lifecycle",
    appliesTo: ["gaming"],
    required: true,
    enabled: true,
  },
]

// ---------- Repair / Support (placeholder, expandable) ----------

const REPAIR_RULES: ForgeRule[] = [
  {
    id: "repair.include-product-model",
    label: "Include product and model",
    description:
      "Every repair procedure must specify the product line and model it applies to.",
    category: "metadata",
    appliesTo: ["repair"],
    required: true,
    enabled: true,
  },
  {
    id: "repair.safety-warnings",
    label: "Surface safety warnings",
    description:
      "Steps that involve power, heat, or chemicals must include a visible warning callout.",
    category: "safety",
    appliesTo: ["repair"],
    required: true,
    enabled: true,
  },
]

// ---------- Business SOP (placeholder, expandable) ----------

const SOP_RULES: ForgeRule[] = [
  {
    id: "sop.include-owner",
    label: "Include process owner",
    description:
      "Every SOP must list the team or role that owns the process.",
    category: "metadata",
    appliesTo: ["sop"],
    required: true,
    enabled: true,
  },
  {
    id: "sop.include-revision",
    label: "Include revision number",
    description:
      "Each SOP must show the current revision so readers don't follow stale procedures.",
    category: "lifecycle",
    appliesTo: ["sop"],
    required: true,
    enabled: true,
  },
]

// ---------- Registry ----------

const RULE_REGISTRY: Record<NetworkType, ForgeRule[]> = {
  gaming: GAMING_RULES,
  repair: REPAIR_RULES,
  sop: SOP_RULES,
  creator: [],
  training: [],
  community: [],
}

/**
 * Returns the default Forge Rule set for a given network type.
 * Returned rules are deep-cloned so callers can safely mutate
 * `enabled` without affecting the registry.
 */
export function getDefaultForgeRules(type: NetworkType): ForgeRule[] {
  return RULE_REGISTRY[type].map((rule) => ({ ...rule }))
}

/**
 * Returns the union of all rules across all network types.
 * Useful for the global Forge Rules library view.
 */
export function getAllForgeRules(): ForgeRule[] {
  return Object.values(RULE_REGISTRY)
    .flat()
    .map((rule) => ({ ...rule }))
}

export function getForgeRuleById(id: string): ForgeRule | undefined {
  const all = getAllForgeRules()
  return all.find((rule) => rule.id === id)
}
